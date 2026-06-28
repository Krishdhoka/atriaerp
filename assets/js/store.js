/* AtriaERP — Local data store
 * Persists everything to localStorage so the app works offline by double-clicking index.html.
 * Data shape: { meta, companies[], projects[], records: { <entityKey>: [ ...rows ] } }
 */
(function (global) {
  "use strict";

  var KEY = "atriaerp.db.v1";
  var listeners = [];

  var DB = null;
  function cloudOn() { return global.Cloud && global.Cloud.enabled && global.Cloud.enabled(); }
  function cloudSafe(fn) { try { var p = fn(); if (p && p.catch) p.catch(function (e) { console.warn("Cloud sync:", e.message); Toast && Toast.show && Toast.show("Cloud sync issue — will retry", "bad"); }); } catch (e) {} }

  function uid(prefix) {
    return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  }

  function todayISO() { return new Date().toISOString().slice(0, 10); }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) { DB = JSON.parse(raw); return; }
    } catch (e) { console.warn("Load failed, reseeding", e); }
    DB = null; // will be seeded by seed.js
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(DB));
    } catch (e) {
      console.error("Save failed", e);
      Toast && Toast.show && Toast.show("Could not save — storage may be full", "bad");
    }
    if (cloudOn() && DB && DB.meta) { try { localStorage.setItem("atriaerp.ctx", JSON.stringify(DB.meta.context)); } catch (e2) {} }
    emit();
  }

  function emit() { listeners.forEach(function (fn) { try { fn(DB); } catch (e) {} }); }
  function subscribe(fn) { listeners.push(fn); return function () { listeners = listeners.filter(function (f) { return f !== fn; }); }; }

  /* ---- context (selected company / project) ---- */
  function getContext() { return DB.meta.context; }
  function setCompany(companyId) {
    DB.meta.context.companyId = companyId;
    var projs = listProjects(companyId);
    DB.meta.context.projectId = projs.length ? projs[0].id : null;
    save();
  }
  function setProject(projectId) { DB.meta.context.projectId = projectId; save(); }

  function currentCompany() { return DB.companies.find(function (c) { return c.id === DB.meta.context.companyId; }) || DB.companies[0]; }
  function currentProject() { return DB.projects.find(function (p) { return p.id === DB.meta.context.projectId; }) || null; }

  /* ---- companies / projects ---- */
  function listCompanies() { return DB.companies.slice(); }
  function listProjects(companyId) {
    companyId = companyId || DB.meta.context.companyId;
    return DB.projects.filter(function (p) { return p.companyId === companyId; });
  }
  function addCompany(data) {
    var c = Object.assign({ id: uid("co"), createdAt: todayISO() }, data);
    DB.companies.push(c); save();
    if (cloudOn()) cloudSafe(function () { return Cloud.writeCompany(c); });
    return c;
  }
  function addProject(data) {
    var p = Object.assign({ id: uid("pr"), createdAt: todayISO() }, data);
    DB.projects.push(p); save();
    if (cloudOn()) cloudSafe(function () { return Cloud.writeProject(p); });
    return p;
  }
  function updateCompany(data) {
    var i = DB.companies.findIndex(function (c) { return c.id === data.id; });
    if (i < 0) return null;
    DB.companies[i] = Object.assign({}, DB.companies[i], data); save();
    if (cloudOn()) cloudSafe(function () { return Cloud.writeCompany(DB.companies[i]); });
    return DB.companies[i];
  }
  function updateProject(data) {
    var i = DB.projects.findIndex(function (p) { return p.id === data.id; });
    if (i < 0) return null;
    DB.projects[i] = Object.assign({}, DB.projects[i], data); save();
    if (cloudOn()) cloudSafe(function () { return Cloud.writeProject(DB.projects[i]); });
    return DB.projects[i];
  }
  function removeProject(id) {
    DB.projects = DB.projects.filter(function (p) { return p.id !== id; });
    if (DB.meta.context.projectId === id) { var ps = listProjects(); DB.meta.context.projectId = ps.length ? ps[0].id : null; }
    save();
  }

  /* ---- generic records ----
   * Each entity stored under records[entityKey]. Rows may carry companyId/projectId.
   */
  function bucket(entityKey) {
    if (!DB.records[entityKey]) DB.records[entityKey] = [];
    return DB.records[entityKey];
  }

  function list(entityKey, opts) {
    opts = opts || {};
    var rows = bucket(entityKey).slice();
    if (opts.scope === "company" || opts.scope === "project") {
      rows = rows.filter(function (r) { return r.companyId === DB.meta.context.companyId; });
    }
    if (opts.scope === "project" && DB.meta.context.projectId) {
      rows = rows.filter(function (r) { return !r.projectId || r.projectId === DB.meta.context.projectId; });
    }
    return rows;
  }

  function get(entityKey, id) { return bucket(entityKey).find(function (r) { return r.id === id; }); }

  function upsert(entityKey, data, scope) {
    var arr = bucket(entityKey);
    if (data.id) {
      var idx = arr.findIndex(function (r) { return r.id === data.id; });
      if (idx >= 0) {
        arr[idx] = Object.assign({}, arr[idx], data, { updatedAt: todayISO() }); save();
        if (cloudOn()) cloudSafe(function () { return Cloud.writeRecord(entityKey, arr[idx]); });
        return arr[idx];
      }
    }
    var row = Object.assign({ id: uid(entityKey.slice(0, 3)), createdAt: todayISO() }, data);
    if (scope === "company" || scope === "project") row.companyId = row.companyId || DB.meta.context.companyId;
    if (scope === "project") row.projectId = row.projectId || DB.meta.context.projectId;
    arr.push(row); save();
    if (cloudOn()) cloudSafe(function () { return Cloud.writeRecord(entityKey, row); });
    return row;
  }

  function remove(entityKey, id) {
    DB.records[entityKey] = bucket(entityKey).filter(function (r) { return r.id !== id; });
    save();
    if (cloudOn()) cloudSafe(function () { return Cloud.removeRecord(id); });
  }

  function counts(entityKey, opts) { return list(entityKey, opts).length; }

  /* ---- backup / restore ---- */
  function exportJSON() { return JSON.stringify(DB, null, 2); }
  function importJSON(text) {
    var parsed = JSON.parse(text);
    if (!parsed.companies || !parsed.records) throw new Error("Not a valid AtriaERP backup file");
    DB = parsed; save();
  }
  function resetAll() { localStorage.removeItem(KEY); DB = null; }

  function raw() { return DB; }
  function setRaw(db) { DB = db; save(); }
  function hasData() { return !!DB; }

  // Build the in-memory DB from cloud-loaded data, keeping the user's last-selected context.
  function hydrateFromCloud(cloudData) {
    var savedCtx = null;
    try { savedCtx = JSON.parse(localStorage.getItem("atriaerp.ctx") || "null"); } catch (e) {}
    DB = {
      meta: { appName: "AtriaERP", mode: "cloud", context: savedCtx || { companyId: null, projectId: null }, integrations: { tally: { connected: false, host: "localhost:9000" }, axis: {}, whatsapp: {}, email: {} } },
      companies: cloudData.companies || [],
      projects: cloudData.projects || [],
      records: cloudData.records || {}
    };
    if (!DB.meta.context.companyId && DB.companies.length) DB.meta.context.companyId = DB.companies[0].id;
    var projs = listProjects(DB.meta.context.companyId);
    if (!DB.meta.context.projectId && projs.length) DB.meta.context.projectId = projs[0].id;
    persistCtx();
  }
  function persistCtx() { try { localStorage.setItem("atriaerp.ctx", JSON.stringify(DB.meta.context)); } catch (e) {} }

  global.Store = {
    uid: uid, todayISO: todayISO, load: load, save: save, subscribe: subscribe,
    getContext: getContext, setCompany: setCompany, setProject: setProject,
    currentCompany: currentCompany, currentProject: currentProject,
    listCompanies: listCompanies, listProjects: listProjects, addCompany: addCompany, addProject: addProject,
    updateCompany: updateCompany, updateProject: updateProject, removeProject: removeProject,
    list: list, get: get, upsert: upsert, remove: remove, counts: counts,
    exportJSON: exportJSON, importJSON: importJSON, resetAll: resetAll,
    raw: raw, setRaw: setRaw, hasData: hasData, hydrateFromCloud: hydrateFromCloud
  };
})(window);
