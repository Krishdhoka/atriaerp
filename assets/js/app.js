/* AtriaERP — App controller: boot, nav, context switching, routing */
(function (global) {
  "use strict";
  var U = global.UI;
  var current = "dashboard";

  var SPECIALS = {
    dashboard: function (m) { Views.renderDashboard(m); },
    collections: function (m) { Collections.render(m); },
    reports: function (m) { Reports.renderReports(m); },
    group: function (m) { Reports.renderGroup(m); },
    approvals: function (m) { Reports.renderApprovals(m); },
    customer360: function (m) { Extras.renderCustomer360(m); },
    booking: function (m) { Workflows.renderBooking(m); },
    calendar: function (m) { Workflows.renderCalendar(m); },
    rentdesk: function (m) { Workflows.renderRentRoll(m); },
    letters: function (m) { Letters.render(m); },
    budget: function (m) { Extras.renderBudget(m); },
    landdesk: function (m) { Extras.renderLandDesk(m); },
    documents: function (m) { Extras.renderDocuments(m); },
    locations: function (m) { Extras.renderLocations(m); },
    whatsapp: function (m) { Integrations.renderWhatsApp(m); },
    email: function (m) { Integrations.renderEmail(m); },
    bank: function (m) { Integrations.renderBank(m); },
    netbanking: function (m) { Integrations.renderNetBanking(m); },
    ecourts: function (m) { Integrations.renderECourts(m); },
    vendorportal: function (m) { Integrations.renderVendorPortal(m); },
    datamanager: function (m) { Integrations.renderDataManager(m); },
    settings: function (m) { Integrations.renderSettings(m); },
    gst: function (m) { GstTds.renderGst(m); },
    tds: function (m) { GstTds.renderTds(m); },
    setup: function (m) { Integrations.renderSetup(m); }
  };

  function route(id) {
    current = id;
    var mount = document.getElementById("content");
    mount.scrollTop = 0;
    if (SPECIALS[id]) SPECIALS[id](mount);
    else if (Schema.ENTITIES[id]) Views.renderEntity(id, mount);
    else SPECIALS.dashboard(mount);
    markActive(id);
  }

  function markActive(id) {
    document.querySelectorAll(".nav-item").forEach(function (n) {
      n.classList.toggle("active", n.getAttribute("data-id") === id);
    });
  }

  function buildNav() {
    var nav = document.getElementById("navMenu");
    nav.innerHTML = "";
    var cloud = global.Cloud && Cloud.enabled && Cloud.enabled();
    Schema.NAV.forEach(function (grp) {
      if (cloud && global.Auth && !Auth.canSeeGroup(grp.group)) return; // role-based filtering
      nav.appendChild(U.el('<div class="nav-group-title">' + U.esc(grp.group) + "</div>"));
      grp.items.forEach(function (item) {
        var id, title, icon, badge = "";
        if (item.special) { id = item.id; title = item.title; icon = item.icon; }
        else if (item.entity) {
          var def = Schema.ENTITIES[item.entity];
          id = item.entity; title = def.title; icon = def.icon;
          var c = Store.list(item.entity, { scope: def.scope }).length;
          if (c) badge = '<span class="ni-badge">' + c + "</span>";
        }
        var node = U.el('<div class="nav-item" data-id="' + id + '"><span class="ni-icon">' + icon + '</span><span>' + U.esc(title) + "</span>" + badge + "</div>");
        node.onclick = function () { route(id); if (window.innerWidth < 900) document.getElementById("app").classList.add("nav-collapsed"); };
        nav.appendChild(node);
      });
    });
  }

  function buildContextSelectors() {
    var ctx = Store.getContext();
    var coSel = document.getElementById("companySelect");
    var prSel = document.getElementById("projectSelect");
    coSel.innerHTML = ""; prSel.innerHTML = "";
    Store.listCompanies().forEach(function (c) {
      var o = U.el("<option value='" + c.id + "'>" + U.esc(c.name) + "</option>");
      if (c.id === ctx.companyId) o.selected = true; coSel.appendChild(o);
    });
    var projs = Store.listProjects(ctx.companyId);
    if (!projs.length) prSel.appendChild(U.el("<option value=''>— no projects —</option>"));
    projs.forEach(function (p) {
      var o = U.el("<option value='" + p.id + "'>" + U.esc(p.name) + "</option>");
      if (p.id === ctx.projectId) o.selected = true; prSel.appendChild(o);
    });
    coSel.onchange = function () { Store.setCompany(coSel.value); refreshContext(); route(current); U.Toast.show("Switched company", ""); };
    prSel.onchange = function () { Store.setProject(prSel.value); buildNav(); route(current); };
  }

  function refreshContext() { buildContextSelectors(); buildNav(); }

  function globalSearch(q) {
    q = q.toLowerCase().trim();
    if (!q) return;
    var hits = [];
    Object.keys(Schema.ENTITIES).forEach(function (k) {
      var def = Schema.ENTITIES[k];
      (Store.raw().records[k] || []).forEach(function (r) {
        var match = def.columns.some(function (c) { return String(r[c.f] == null ? "" : r[c.f]).toLowerCase().indexOf(q) >= 0; });
        if (match) hits.push({ entity: k, def: def, row: r });
      });
    });
    var body = U.el("<div></div>");
    if (!hits.length) body.appendChild(U.el('<div class="empty-state"><div class="big">🔍</div><div>No matches for “' + U.esc(q) + "”.</div></div>"));
    else {
      body.appendChild(U.el('<div class="muted" style="margin-bottom:10px">' + hits.length + " result" + (hits.length === 1 ? "" : "s") + "</div>"));
      var ul = U.el('<ul class="list-plain"></ul>');
      hits.slice(0, 40).forEach(function (h) {
        var label = h.row[h.def.columns[0].f] || h.row.name || h.row.id;
        var li = U.el('<li style="cursor:pointer"><span class="ni-icon">' + h.def.icon + '</span><div><div><b>' + U.esc(label) + '</b></div><small class="muted">' + U.esc(h.def.title) + "</small></div></li>");
        li.onclick = function () { U.Modal.close(); route(h.entity); };
        ul.appendChild(li);
      });
      body.appendChild(ul);
    }
    U.Modal.open("Search: " + q, body);
  }

  function startUI() {
    // ensure context valid (tolerate an empty org with no companies yet)
    var ctx = Store.getContext();
    if (!Store.currentCompany() && Store.listCompanies().length) Store.setCompany(Store.listCompanies()[0].id);
    if (ctx.companyId && !Store.listProjects(ctx.companyId).some(function (p) { return p.id === ctx.projectId; })) {
      var projs = Store.listProjects(ctx.companyId); if (projs.length) Store.setProject(projs[0].id);
    }

    buildContextSelectors();
    buildNav();
    setupUserChip();
    route(Store.listCompanies().length ? "dashboard" : "setup");

    document.getElementById("navToggle").onclick = function () { document.getElementById("app").classList.toggle("nav-collapsed"); };
    document.getElementById("backupBtn").onclick = function () { route("datamanager"); };
    var gs = document.getElementById("globalSearch");
    gs.addEventListener("keydown", function (e) { if (e.key === "Enter") globalSearch(gs.value); });

    if (window.innerWidth < 900) document.getElementById("app").classList.add("nav-collapsed");

    if (global.Feedback) Feedback.mount();
  }

  function setupUserChip() {
    var cloud = global.Cloud && Cloud.enabled && Cloud.enabled();
    var nameEl = document.getElementById("userName");
    var chip = document.querySelector(".user-chip");
    if (cloud) {
      var u = Cloud.currentUser() || {};
      if (nameEl) nameEl.textContent = (u.full_name || u.email || "User").split("@")[0];
      var roleEl = chip && chip.querySelector(".user-meta small"); if (roleEl) roleEl.textContent = (u.role || "user").replace(/^./, function (c) { return c.toUpperCase(); });
      var av = chip && chip.querySelector(".avatar"); if (av) av.textContent = ((u.full_name || u.email || "U")[0] || "U").toUpperCase();
      if (chip) { chip.style.cursor = "pointer"; chip.title = "Click to sign out"; chip.onclick = function () { if (confirm("Sign out of AtriaERP?")) Auth.logout(); }; }
    }
  }

  function refreshFromCloud() {
    if (!(global.Cloud && Cloud.enabled && Cloud.enabled())) return;
    Cloud.loadAll().then(function (data) {
      Store.hydrateFromCloud(data); buildContextSelectors(); buildNav(); route(current);
    }).catch(function (e) {
      if (Cloud.isAuthError(e)) Cloud.refreshSession().catch(function () {}); // keep the session alive in the background
      else console.warn("Refresh failed:", e.message);
    });
  }

  function boot() {
    var cloud = global.Cloud && Cloud.enabled && Cloud.enabled();
    if (!cloud) {
      Store.load();
      if (!Store.hasData()) Store.setRaw(Seed.buildSeed());
      startUI();
      return;
    }
    // Cloud mode: require login, then load shared data
    var go = function (retried) {
      Cloud.loadAll().then(function (data) {
        Store.hydrateFromCloud(data);
        startUI();
        var secs = (global.AtriaConfig && AtriaConfig.POLL_SECONDS) || 30;
        if (secs > 0 && !go._polling) { go._polling = true; setInterval(refreshFromCloud, secs * 1000); }
      }).catch(function (e) {
        if (Cloud.isAuthError(e)) {
          if (!retried) {
            // token expired — try a silent refresh once, else ask to log in again
            Cloud.refreshSession().then(function () { go(true); }).catch(function () { Cloud.signOut(); Auth.showLogin(function () { go(false); }); });
          } else {
            Cloud.signOut(); Auth.showLogin(function () { go(false); });
          }
        } else {
          document.getElementById("content").innerHTML = '<div class="notice warn" style="margin:30px"><span class="ni">⚠️</span><div><b>Could not load cloud data.</b> ' + U.esc(e.message) + '<br>Check your internet, or that the database tables were created (cloud/supabase-setup.sql).</div></div>';
        }
      });
    };
    var session = Cloud.restoreSession();
    if (session && session.access_token) {
      Cloud.loadProfile().then(function () { go(false); }).catch(function () { go(false); });
    } else {
      Auth.showLogin(function () { go(false); });
    }
  }

  global.App = { route: route, refreshContext: refreshContext, refreshFromCloud: refreshFromCloud, boot: boot };
  document.addEventListener("DOMContentLoaded", boot);
})(window);
