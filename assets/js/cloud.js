/* AtriaERP — Cloud backend (Supabase via REST, no SDK)
 * Talks to Supabase Auth + PostgREST with plain fetch so the app stays build-free.
 *
 * Data model in Supabase (see cloud/supabase-setup.sql):
 *   companies(id text pk, data jsonb)
 *   projects (id text pk, company_id text, data jsonb)
 *   records  (id text pk, entity text, company_id text, project_id text, data jsonb, updated_at)
 *   profiles (id uuid pk = auth user, email text, role text, full_name text)
 *
 * Each row's full app-object lives in `data`; the top-level columns are for
 * indexing / row-level security.
 */
(function (global) {
  "use strict";

  var cfg = global.AtriaConfig || {};
  var session = null;   // { access_token, refresh_token, user, profile }

  function enabled() { return !!cfg.cloudEnabled; }
  function base() { return cfg.SUPABASE_URL.replace(/\/$/, ""); }
  function authHeaders(extra) {
    var h = { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" };
    if (session && session.access_token) h.Authorization = "Bearer " + session.access_token;
    return Object.assign(h, extra || {});
  }

  /* ---------- auth ---------- */
  function signIn(email, password) {
    return fetch(base() + "/auth/v1/token?grant_type=password", {
      method: "POST", headers: { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email, password: password })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.j.error_description || res.j.msg || res.j.error || "Login failed");
        session = { access_token: res.j.access_token, refresh_token: res.j.refresh_token, user: res.j.user };
        persistSession();
        return loadProfile().then(function () { return session; });
      });
  }

  function loadProfile() {
    return fetch(base() + "/rest/v1/profiles?id=eq." + session.user.id + "&select=*", { headers: authHeaders() })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) {
        session.profile = (rows && rows[0]) || { id: session.user.id, email: session.user.email, role: "admin", full_name: session.user.email };
      }).catch(function () { session.profile = { role: "admin", email: session.user.email, full_name: session.user.email }; });
  }

  // Get a fresh access token using the refresh token (Supabase tokens expire ~hourly)
  function refreshSession() {
    if (!session || !session.refresh_token) return Promise.reject(new Error("No refresh token"));
    return fetch(base() + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST", headers: { apikey: cfg.SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok || !j.access_token) throw new Error(j.error_description || j.msg || "Session refresh failed");
        session.access_token = j.access_token;
        if (j.refresh_token) session.refresh_token = j.refresh_token;
        if (j.user) session.user = j.user;
        persistSession();
        return session;
      });
    });
  }
  function isAuthError(e) { return /jwt|expired|invalid|unauthor|401|refresh token/i.test(e && e.message || ""); }

  function persistSession() { try { localStorage.setItem("atriaerp.session", JSON.stringify(session)); } catch (e) {} }
  function restoreSession() {
    try { var raw = localStorage.getItem("atriaerp.session"); if (raw) { session = JSON.parse(raw); return session; } } catch (e) {}
    return null;
  }
  function signOut() { session = null; try { localStorage.removeItem("atriaerp.session"); } catch (e) {} }
  function currentUser() { return session ? session.profile : null; }

  /* ---------- data ---------- */
  function selectAll(table) {
    return fetch(base() + "/rest/v1/" + table + "?select=*", { headers: authHeaders() })
      .then(function (r) { if (!r.ok) return r.json().then(function (j) { throw new Error(j.message || ("Load " + table + " failed")); }); return r.json(); });
  }

  // Pull everything into the in-memory DB shape used by Store
  function loadAll() {
    return Promise.all([selectAll("companies"), selectAll("projects"), selectAll("records")])
      .then(function (res) {
        var companies = res[0].map(function (r) { return r.data; });
        var projects = res[1].map(function (r) { return r.data; });
        var records = {};
        res[2].forEach(function (r) { (records[r.entity] = records[r.entity] || []).push(r.data); });
        return { companies: companies, projects: projects, records: records };
      });
  }

  function upsert(table, body) {
    return fetch(base() + "/rest/v1/" + table, {
      method: "POST",
      headers: authHeaders({ Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify(body)
    }).then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error("Save failed: " + t); }); });
  }

  function writeRecord(entity, row) {
    return upsert("records", { id: row.id, entity: entity, company_id: row.companyId || null, project_id: row.projectId || null, data: row, updated_at: new Date().toISOString() });
  }
  function writeCompany(row) { return upsert("companies", { id: row.id, data: row }); }
  function writeProject(row) { return upsert("projects", { id: row.id, company_id: row.companyId || null, data: row }); }

  function removeRecord(id) {
    return fetch(base() + "/rest/v1/records?id=eq." + id, { method: "DELETE", headers: authHeaders() })
      .then(function (r) { if (!r.ok) throw new Error("Delete failed"); });
  }

  // Call a deployed Supabase Edge Function (secure server-side proxy for secret-key APIs).
  function invokeFunction(name, body) {
    return fetch(base() + "/functions/v1/" + name, {
      method: "POST", headers: authHeaders(), body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.text().then(function (t) {
        var j; try { j = JSON.parse(t); } catch (e) { j = { raw: t }; }
        if (!r.ok) throw new Error(j.error || j.message || ("HTTP " + r.status));
        return j;
      });
    });
  }

  // Push an entire local DB to the cloud (one-time migration / seeding).
  function pushAll(db) {
    var ops = [];
    (db.companies || []).forEach(function (c) { ops.push(writeCompany(c)); });
    (db.projects || []).forEach(function (p) { ops.push(writeProject(p)); });
    Object.keys(db.records || {}).forEach(function (ent) {
      (db.records[ent] || []).forEach(function (r) { ops.push(writeRecord(ent, r)); });
    });
    return Promise.all(ops).then(function () { return ops.length; });
  }

  global.Cloud = {
    enabled: enabled, signIn: signIn, signOut: signOut, restoreSession: restoreSession,
    refreshSession: refreshSession, isAuthError: isAuthError,
    currentUser: currentUser, loadProfile: loadProfile, loadAll: loadAll,
    writeRecord: writeRecord, writeCompany: writeCompany, writeProject: writeProject, removeRecord: removeRecord,
    pushAll: pushAll, invokeFunction: invokeFunction
  };
})(window);
