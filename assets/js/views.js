/* AtriaERP — Views: dashboard + generic entity (list/CRUD) view */
(function (global) {
  "use strict";
  var U = global.UI;

  /* ---------- Generic entity view (drives most modules) ---------- */
  function renderEntity(entityKey, mount) {
    var def = Schema.ENTITIES[entityKey];
    var state = { q: "", sortF: null, sortDir: 1, filter: "" };

    function rows() {
      var all = Store.list(entityKey, { scope: def.scope });
      var q = state.q.toLowerCase().trim();
      if (q) {
        all = all.filter(function (r) {
          return def.columns.some(function (c) { return String(r[c.f] == null ? "" : r[c.f]).toLowerCase().indexOf(q) >= 0; });
        });
      }
      if (state.filter) {
        var fcol = def.columns.find(function (c) { return c.type === "badge"; });
        if (fcol) all = all.filter(function (r) { return r[fcol.f] === state.filter; });
      }
      if (state.sortF) {
        all.sort(function (a, b) {
          var x = a[state.sortF], y = b[state.sortF];
          if (typeof x === "number" || typeof y === "number") return ((x || 0) - (y || 0)) * state.sortDir;
          return String(x || "").localeCompare(String(y || "")) * state.sortDir;
        });
      }
      return all;
    }

    function openForm(record) {
      var built = U.buildForm(def.fields, record, function (data) {
        Store.upsert(entityKey, data, def.scope);
        U.Modal.close();
        U.Toast.show((record ? "Updated" : "Added") + " " + def.singular, "good");
        draw();
      }, record ? "Update" : "Add " + def.singular);
      U.Modal.open((record ? "Edit " : "New ") + def.singular, built.form, built.foot);
    }

    function draw() {
      mount.innerHTML = "";
      var scopeNote = def.scope === "project" ? (Store.currentProject() ? Store.currentProject().name : "—")
        : def.scope === "company" ? Store.currentCompany().name : "All";

      var actions = U.el('<div class="row-flex"></div>');
      if (global.DataIO) {
        var impBtn = U.el('<button class="btn" title="Bulk import from Excel/CSV">⬆ Import</button>');
        impBtn.onclick = function () { DataIO.openImport(entityKey, draw); };
        var expBtn = U.el('<button class="btn" title="Export to CSV/Excel">⬇ Export</button>');
        expBtn.onclick = function () { DataIO.exportEntity(entityKey); };
        actions.appendChild(impBtn); actions.appendChild(expBtn);
      }
      var addBtn = U.el('<button class="btn primary">+ New ' + U.esc(def.singular) + "</button>");
      addBtn.onclick = function () { openForm(null); };
      actions.appendChild(addBtn);
      mount.appendChild(U.pageHead(def.title, def.desc + "  •  Scope: " + scopeNote, actions));

      if (def.tally) mount.appendChild(tallyBanner(entityKey, draw));

      // toolbar
      var toolbar = U.el('<div class="toolbar"></div>');
      var search = U.el('<div class="search"><input type="search" placeholder="Search ' + U.esc(def.title.toLowerCase()) + '…" /></div>');
      search.querySelector("input").value = state.q;
      search.querySelector("input").oninput = function (e) { state.q = e.target.value; drawTable(); };
      toolbar.appendChild(search);

      var badgeCol = def.columns.find(function (c) { return c.type === "badge"; });
      if (badgeCol) {
        var vals = {};
        Store.list(entityKey, { scope: def.scope }).forEach(function (r) { if (r[badgeCol.f]) vals[r[badgeCol.f]] = 1; });
        var sel = U.el('<select><option value="">All ' + U.esc(badgeCol.label) + "</option></select>");
        Object.keys(vals).forEach(function (v) { var o = U.el("<option>" + U.esc(v) + "</option>"); if (v === state.filter) o.selected = true; sel.appendChild(o); });
        sel.onchange = function (e) { state.filter = e.target.value; drawTable(); };
        toolbar.appendChild(sel);
      }
      var count = U.el('<div class="muted" style="margin-left:auto"></div>');
      toolbar.appendChild(count);
      mount.appendChild(toolbar);

      var tableHost = U.el("<div></div>");
      mount.appendChild(tableHost);

      function drawTable() {
        var data = rows();
        count.textContent = data.length + " record" + (data.length === 1 ? "" : "s");
        tableHost.innerHTML = "";
        var tbl = U.dataTable(data, def.columns, {
          actions: true,
          emptyText: "No " + def.title.toLowerCase() + " yet. Click “New " + def.singular + "”.",
          onEdit: openForm,
          onDelete: function (r) {
            U.confirmDialog("Delete this " + def.singular.toLowerCase() + "? This cannot be undone.", function () {
              Store.remove(entityKey, r.id); U.Toast.show("Deleted", "bad"); draw();
            });
          }
        });
        // header sort
        tbl.querySelectorAll("th[data-f]").forEach(function (th) {
          th.onclick = function () {
            var f = th.getAttribute("data-f");
            if (state.sortF === f) state.sortDir *= -1; else { state.sortF = f; state.sortDir = 1; }
            drawTable();
          };
        });
        tableHost.appendChild(tbl);
      }
      drawTable();

      // money summary footer if any money column
      var moneyCol = def.columns.find(function (c) { return c.type === "money"; });
      if (moneyCol) {
        var total = rows().reduce(function (s, r) { return s + (Number(r[moneyCol.f]) || 0); }, 0);
        mount.appendChild(U.el('<div class="muted" style="margin-top:10px">Total ' + U.esc(moneyCol.label) + ": <b>" + U.inr(total) + "</b> (" + U.inrShort(total) + ")</div>"));
      }
    }
    draw();
  }

  function tallyBanner(entityKey, redraw) {
    var integ = Store.raw().meta.integrations.tally;
    var box = U.el('<div class="notice ' + (integ.connected ? "" : "warn") + '"><span class="ni">🔌</span><div style="flex:1"></div></div>');
    var info = box.querySelector("div");
    info.innerHTML = integ.connected
      ? "Connected to <b>Tally</b> at " + U.esc(integ.host) + ". Last sync: " + (integ.lastSync ? U.fmtDate(integ.lastSync) : "—") + "."
      : "<b>Tally not connected.</b> Showing locally entered ledgers. Connect Tally to auto-pull this list.";
    var btn = U.el('<button class="btn sm">' + (integ.connected ? "Sync now" : "Connect & Sync") + "</button>");
    btn.onclick = function () { Integrations.tallySync(entityKey, redraw); };
    box.appendChild(btn);
    return box;
  }

  /* ---------- Dashboard ---------- */
  function renderDashboard(mount) {
    mount.innerHTML = "";
    var co = Store.currentCompany(), pr = Store.currentProject();
    mount.appendChild(U.pageHead("Dashboard", co.name + (pr ? "  •  " + pr.name : "")));
    mount.appendChild(U.el('<div class="muted" style="margin:-8px 0 14px;font-size:12px">Tip: click any card below to open that module.</div>'));

    function link(node, route) { node.classList.add("clickable-card"); node.title = "Open"; node.addEventListener("click", function () { App.route(route); }); return node; }

    // KPIs
    var units = Store.list("units", { scope: "project" });
    var available = units.filter(function (u) { return u.status === "Available"; }).length;
    var leads = Store.list("leads", { scope: "project" });
    var openLeads = leads.filter(function (l) { return ["New", "Contacted", "Site Visit", "Negotiation"].indexOf(l.stage) >= 0; }).length;
    var pays = Store.list("payments", { scope: "project" });
    var due = pays.filter(function (p) { return p.status !== "Paid"; }).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
    var received = pays.filter(function (p) { return p.status === "Paid"; }).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
    var creditors = Store.list("creditors", { scope: "company" }).reduce(function (s, c) { return s + (Number(c.outstanding) || 0); }, 0);
    var salesValue = units.filter(function (u) { return ["Booked", "Sold", "Registered"].indexOf(u.status) >= 0; }).reduce(function (s, u) { return s + (Number(u.price) || 0); }, 0);

    var kpis = U.el('<div class="cards grid-4"></div>');
    kpis.appendChild(link(U.kpiCard("Units Available", available + " / " + units.length, "in " + (pr ? pr.name : "project"), "🏢"), "units"));
    kpis.appendChild(link(U.kpiCard("Open Leads", openLeads, leads.length + " total in funnel", "🎯"), "leads"));
    kpis.appendChild(link(U.kpiCard("Sales Booked", U.inrShort(salesValue), "value of booked/sold units", "📈"), "reports"));
    kpis.appendChild(link(U.kpiCard("Payments Due", U.inrShort(due), U.inrShort(received) + " received", "💰"), "collections"));
    mount.appendChild(kpis);

    // second row
    var row2 = U.el('<div class="cards grid-3" style="margin-top:16px"></div>');

    // Sales funnel
    var funnel = U.el('<div class="card"><div class="card-section-head"><h3>Sales Funnel</h3><span class="muted">' + leads.length + ' leads</span></div></div>');
    var stages = Schema.sets.LEAD_STAGES;
    var maxC = Math.max.apply(null, stages.map(function (s) { return leads.filter(function (l) { return l.stage === s; }).length; }).concat([1]));
    stages.forEach(function (st) {
      var c = leads.filter(function (l) { return l.stage === st; }).length;
      funnel.appendChild(U.el('<div class="bar-row"><div class="bar-label">' + st + '</div><div class="bar-track"><div class="bar-fill" style="width:' + (c / maxC * 100) + '%"></div></div><div class="bar-val">' + c + "</div></div>"));
    });
    row2.appendChild(link(funnel, "leads"));

    // Inventory status
    var inv = U.el('<div class="card"><div class="card-section-head"><h3>Inventory Status</h3></div></div>');
    var statuses = ["Available", "Booked", "Sold", "Registered", "Blocked"];
    var maxU = Math.max.apply(null, statuses.map(function (s) { return units.filter(function (u) { return u.status === s; }).length; }).concat([1]));
    statuses.forEach(function (st) {
      var c = units.filter(function (u) { return u.status === st; }).length;
      inv.appendChild(U.el('<div class="bar-row"><div class="bar-label">' + st + '</div><div class="bar-track"><div class="bar-fill" style="width:' + (c / maxU * 100) + '%"></div></div><div class="bar-val">' + c + "</div></div>"));
    });
    row2.appendChild(link(inv, "units"));

    // Finance snapshot
    var fin = U.el('<div class="card"><div class="card-section-head"><h3>Finance Snapshot (' + U.esc(co.name.split(" ")[0]) + ')</h3></div></div>');
    var debtors = Store.list("debtors", { scope: "company" }).reduce(function (s, x) { return s + (Number(x.outstanding) || 0); }, 0);
    var gstPending = Store.list("gst", { scope: "company" }).filter(function (g) { return g.returnStatus !== "Filed"; }).length;
    var tdsPending = Store.list("tds", { scope: "company" }).filter(function (t) { return t.challanStatus !== "Deposited"; }).length;
    [["Receivables (Debtors)", U.inr(debtors)], ["Payables (Creditors)", U.inr(creditors)], ["Payments received (project)", U.inr(received)], ["GST returns pending", gstPending], ["TDS challans pending", tdsPending]]
      .forEach(function (p) { fin.appendChild(U.el('<div class="stat-line"><span>' + p[0] + '</span><b>' + p[1] + "</b></div>")); });
    row2.appendChild(link(fin, "collections"));
    mount.appendChild(row2);

    // third row: reminders + activity
    var row3 = U.el('<div class="cards grid-2" style="margin-top:16px"></div>');

    var reminders = U.el('<div class="card"><div class="card-section-head"><h3>⏰ Reminders & Alerts</h3></div></div>');
    var alerts = collectReminders();
    if (!alerts.length) reminders.appendChild(U.el('<div class="muted">Nothing urgent. 🎉</div>'));
    var ul = U.el('<ul class="list-plain"></ul>');
    alerts.slice(0, 8).forEach(function (a) {
      var li = U.el('<li style="cursor:pointer"><span class="dotmark" style="background:' + a.color + '"></span><div><div>' + U.esc(a.text) + '</div><small class="muted">' + U.esc(a.meta) + "</small></div></li>");
      li.onclick = function () { App.route(a.route || "calendar"); };
      ul.appendChild(li);
    });
    reminders.appendChild(ul);
    var calBtn = U.el('<button class="btn sm" style="margin-top:10px">Open Calendar →</button>'); calBtn.onclick = function () { App.route("calendar"); };
    reminders.appendChild(calBtn);
    row3.appendChild(reminders);

    var construction = U.el('<div class="card"><div class="card-section-head"><h3>🏗️ Construction Progress</h3></div></div>');
    var stagesC = Store.list("construction", { scope: "project" });
    if (!stagesC.length) construction.appendChild(U.el('<div class="muted">No construction updates for this project.</div>'));
    stagesC.forEach(function (s) {
      construction.appendChild(U.el('<div style="margin:12px 0"><div class="spread"><b>' + U.esc(s.block) + '</b><span class="badge info">' + U.esc(s.stage) + '</span></div><div class="progress" style="margin-top:6px"><span style="width:' + (s.progress || 0) + '%"></span></div><small class="muted">' + (s.progress || 0) + "% • updated " + U.fmtDate(s.updatedOn) + "</small></div>"));
    });
    row3.appendChild(link(construction, "construction"));
    mount.appendChild(row3);
  }

  function collectReminders() {
    var out = [];
    Store.list("payments", { scope: "project" }).forEach(function (p) {
      var dd = U.daysFromNow(p.dueDate);
      if (p.status !== "Paid" && dd != null && dd <= 7) {
        out.push({ route: "collections", sort: dd, color: dd < 0 ? "#dc2626" : "#d97706", text: (dd < 0 ? "Overdue payment" : "Payment due") + ": " + p.customer + " — " + U.inrShort(p.amount), meta: p.unit + " • " + p.milestone + " • " + U.fmtDate(p.dueDate) });
      }
    });
    Store.list("schedule", { scope: "project" }).forEach(function (s) {
      var dd = U.daysFromNow(s.end);
      if (s.status !== "Done" && dd != null && dd <= 5) {
        out.push({ route: "schedule", sort: dd, color: dd < 0 ? "#dc2626" : "#1f6feb", text: (dd < 0 ? "Schedule overdue" : "Task due") + ": " + s.task, meta: s.contractor + " • due " + U.fmtDate(s.end) });
      }
    });
    Store.list("land", { scope: "company" }).forEach(function (l) {
      var dd = U.daysFromNow(l.reminderDate);
      if (dd != null && dd <= 7) out.push({ route: "landdesk", sort: dd, color: "#14b8a6", text: "Land reminder: " + l.parcel, meta: l.stage + " • " + U.fmtDate(l.reminderDate) });
    });
    Store.list("liaisoning", { scope: "project" }).forEach(function (a) {
      if (a.status === "Query Raised") out.push({ route: "liaisoning", sort: -1, color: "#d97706", text: "Approval query: " + a.approval, meta: a.authority + " • " + (a.fileNo || "") });
      var dd = U.daysFromNow(a.nextFollowUp);
      if (dd != null && dd <= 7 && a.status !== "Approved") out.push({ route: "liaisoning", sort: dd, color: "#1f6feb", text: "Liaison follow-up: " + a.approval, meta: a.authority + " • " + U.fmtDate(a.nextFollowUp) });
    });
    Store.list("rentals", { scope: "company" }).forEach(function (r) {
      var dd = U.daysFromNow(r.leaseEnd);
      if (dd != null && dd <= 90 && r.status !== "Vacated") out.push({ route: "rentdesk", sort: dd, color: "#d97706", text: "Lease ending: " + r.tenant, meta: r.unit + " • " + U.fmtDate(r.leaseEnd) });
    });
    out.sort(function (a, b) { return a.sort - b.sort; });
    return out;
  }

  global.Views = { renderEntity: renderEntity, renderDashboard: renderDashboard, tallyBanner: tallyBanner };
})(window);
