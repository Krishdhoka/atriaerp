/* AtriaERP — Integration & special views
 * These screens model the real integrations (Tally, Axis Bank, Net Banking, WhatsApp, Email,
 * e-Courts, Vendor Portal). Sync actions are SIMULATED locally and clearly marked, with the
 * exact connection settings exposed so they can be wired to live APIs later.
 */
(function (global) {
  "use strict";
  var U = global.UI;

  function stubNotice(text) {
    return U.el('<div class="notice"><span class="ni">🧪</span><div><b>Simulation mode.</b> ' + U.esc(text) + ' No real data leaves this PC until live credentials are configured.</div></div>');
  }

  /* ---------- Tally sync (used by creditors/debtors) ---------- */
  function tallySync(entityKey, redraw) {
    var integ = Store.raw().meta.integrations.tally;
    integ.connected = true; integ.lastSync = Store.todayISO();
    // simulate pulling a couple of fresh ledgers
    var extra = entityKey === "creditors"
      ? { name: "Kone Elevators India", gstin: "27AAACK1234E1Z2", outstanding: 1450000, ageDays: 22, lastBill: Store.todayISO() }
      : { name: "New Booking — Farah Khan", gstin: "", outstanding: 4370000, ageDays: 0, lastBill: Store.todayISO() };
    Store.upsert(entityKey, extra, "company");
    Store.save();
    U.Toast.show("Tally sync complete — ledgers refreshed", "good");
    if (redraw) redraw();
  }

  /* ---------- Bank balances (Axis API) ---------- */
  function renderBank(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Bank Balances — Axis Bank API", "Live current/escrow account balances pulled via Axis Bank Corporate API."));
    mount.appendChild(stubNotice("“Refresh Balances” simulates an Axis Bank API call and updates balances/transactions below."));

    var co = Store.currentCompany();
    var accounts = bankAccounts(co.id);

    var refresh = U.el('<button class="btn primary">⟳ Refresh Balances</button>');
    var toolbar = U.el('<div class="toolbar"></div>');
    toolbar.appendChild(U.el('<div class="muted">Company: <b>' + U.esc(co.name) + "</b></div>"));
    var spacer = U.el('<div style="margin-left:auto"></div>'); spacer.appendChild(refresh); toolbar.appendChild(spacer);
    mount.appendChild(toolbar);

    var cards = U.el('<div class="cards grid-3"></div>');
    accounts.forEach(function (a) {
      var card = U.el('<div class="card"><div class="spread"><h3 style="margin:0">' + U.esc(a.label) + '</h3><span class="badge ' + (a.type === "Escrow" ? "info" : "good") + '">' + a.type + '</span></div>' +
        '<div class="muted" style="font-size:12px;margin:6px 0">A/C ' + U.esc(a.acno) + ' • Axis Bank</div>' +
        '<div class="kpi-value" style="font-size:24px">' + U.inr(a.balance) + '</div>' +
        '<div class="muted" style="font-size:12px">Available • as of ' + U.fmtDate(Store.todayISO()) + "</div></div>");
      cards.appendChild(card);
    });
    mount.appendChild(cards);

    var total = accounts.reduce(function (s, a) { return s + a.balance; }, 0);
    mount.appendChild(U.el('<div class="card" style="margin-top:16px"><div class="spread"><h3 style="margin:0">Total Bank Position</h3><div class="kpi-value" style="font-size:22px;margin:0">' + U.inr(total) + "</div></div></div>"));

    refresh.onclick = function () {
      var db = Store.raw();
      db.meta.integrations.axis.connected = true; db.meta.integrations.axis.lastSync = new Date().toISOString();
      db._bank = db._bank || {};
      db._bank[co.id] = accounts.map(function (a) {
        return Object.assign({}, a, { balance: Math.max(0, Math.round(a.balance * (0.96 + Math.random() * 0.08))) });
      });
      Store.save();
      U.Toast.show("Balances refreshed from Axis Bank API", "good");
      renderBank(mount);
    };
  }
  function bankAccounts(companyId) {
    var db = Store.raw();
    if (db._bank && db._bank[companyId]) return db._bank[companyId];
    var seedMap = {
      co_atria: [
        { label: "Current Account", acno: "9180•••2201", type: "Current", balance: 28450000 },
        { label: "RERA Escrow (Atria Heights)", acno: "9180•••7745", type: "Escrow", balance: 61200000 },
        { label: "RERA Escrow (Atria Grand)", acno: "9180•••7746", type: "Escrow", balance: 18900000 }
      ],
      co_skyline: [{ label: "Current Account", acno: "9181•••3320", type: "Current", balance: 7400000 }, { label: "RERA Escrow", acno: "9181•••8890", type: "Escrow", balance: 15600000 }],
      co_green: [{ label: "Current Account", acno: "9182•••1180", type: "Current", balance: 4200000 }]
    };
    return seedMap[companyId] || [{ label: "Current Account", acno: "—", type: "Current", balance: 0 }];
  }

  /* ---------- Net Banking payments ---------- */
  function renderNetBanking(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Net Banking Payments", "Initiate vendor/contractor payouts via Axis Bank Internet Banking (NEFT/RTGS/IMPS)."));
    mount.appendChild(stubNotice("Creating a payment records it as a pending instruction. In production this posts to the bank’s payment API with maker-checker approval."));

    var co = Store.currentCompany();
    var creditors = Store.list("creditors", { scope: "company" });
    var queue = (Store.raw()._payqueue && Store.raw()._payqueue[co.id]) || [];

    var newBtn = U.el('<button class="btn primary">+ New Payment</button>');
    newBtn.onclick = function () {
      var fields = [
        { f: "payee", label: "Payee", type: "select", options: creditors.map(function (c) { return c.name; }).concat(["Other"]), req: true },
        { f: "amount", label: "Amount (₹)", type: "money", req: true },
        { f: "mode", label: "Mode", type: "select", options: ["NEFT", "RTGS", "IMPS"], def: "RTGS" },
        { f: "account", label: "Beneficiary A/C", type: "text" },
        { f: "ifsc", label: "IFSC", type: "text" },
        { f: "remarks", label: "Narration", type: "text", full: true }
      ];
      var built = U.buildForm(fields, null, function (data) {
        data.status = "Pending Approval"; data.date = Store.todayISO(); data.ref = "AXIS" + Math.floor(Math.random() * 1e6);
        var db = Store.raw(); db._payqueue = db._payqueue || {}; db._payqueue[co.id] = db._payqueue[co.id] || [];
        db._payqueue[co.id].unshift(data); Store.save();
        U.Modal.close(); U.Toast.show("Payment instruction created (pending approval)", "good"); renderNetBanking(mount);
      }, "Create Instruction");
      U.Modal.open("New Net Banking Payment", built.form, built.foot);
    };
    mount.appendChild(U.pageHead("", "", null)); // spacing noop
    var bar = U.el('<div class="toolbar"></div>'); bar.appendChild(U.el('<div class="muted">From: <b>' + U.esc(co.name) + '</b> • Axis Bank Corporate</div>'));
    var sp = U.el('<div style="margin-left:auto"></div>'); sp.appendChild(newBtn); bar.appendChild(sp); mount.appendChild(bar);

    var cols = [
      { f: "date", label: "Date", type: "date" }, { f: "payee", label: "Payee" }, { f: "mode", label: "Mode" },
      { f: "amount", label: "Amount", type: "money" }, { f: "ref", label: "UTR/Ref" },
      { f: "status", label: "Status", type: "badge", map: { Paid: "good", "Pending Approval": "warn", Approved: "info", Failed: "bad" } }
    ];
    var host = U.el("<div></div>");
    function drawQ() {
      host.innerHTML = "";
      var q = (Store.raw()._payqueue && Store.raw()._payqueue[co.id]) || [];
      var tbl = U.dataTable(q, cols, {
        actions: true, emptyText: "No payment instructions yet.",
        onEdit: function (r) {
          if (r.status === "Pending Approval") { r.status = "Approved"; Store.save(); U.Toast.show("Approved — releasing to bank", "good"); setTimeout(function () { r.status = "Paid"; Store.save(); drawQ(); }, 600); }
          else U.Toast.show("Already " + r.status, "");
          drawQ();
        },
        onDelete: function (r) {
          var arr = Store.raw()._payqueue[co.id]; var i = arr.indexOf(r); if (i >= 0) arr.splice(i, 1); Store.save(); drawQ();
        }
      });
      tbl.querySelectorAll("th").forEach(function (th, i) { if (i === cols.length) th.textContent = "Approve / Cancel"; });
      tbl.querySelectorAll(".row-actions").forEach(function (box) {
        var b = box.querySelectorAll("button"); if (b[0]) b[0].textContent = "Approve"; if (b[1]) b[1].textContent = "Cancel";
      });
      host.appendChild(tbl);
    }
    drawQ();
    mount.appendChild(host);
  }

  /* ---------- WhatsApp Blast ---------- */
  function renderWhatsApp(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("WhatsApp Blast", "Send a templated WhatsApp broadcast to leads or customers."));
    mount.appendChild(stubNotice("“Send Blast” simulates delivery via WhatsApp Business API and logs it below."));
    var leads = Store.list("leads", { scope: "project" });

    var card = U.el('<div class="card"></div>');
    card.appendChild(U.el('<h3>Compose Broadcast</h3>'));
    var form = U.el('<div class="form-grid"></div>');
    form.appendChild(U.el('<div class="field full"><label>Audience</label><select id="waAud"><option value="all">All leads (' + leads.length + ')</option><option value="open">Open leads only</option><option value="sitevisit">Site Visit stage</option></select></div>'));
    form.appendChild(U.el('<div class="field full"><label>Message</label><textarea id="waMsg">🏠 Atria Heights — Limited 2 & 3 BHK sea-facing homes now open for booking! Book a site visit this weekend & get an exclusive offer. Reply YES to know more.</textarea></div>'));
    card.appendChild(form);
    var send = U.el('<button class="btn primary" style="margin-top:12px">📤 Send Blast</button>');
    card.appendChild(send);
    mount.appendChild(card);

    var logHost = U.el('<div style="margin-top:16px"></div>');
    mount.appendChild(logHost);
    function drawLog() {
      var log = (Store.raw()._walog) || [];
      logHost.innerHTML = "";
      var c = U.el('<div class="card"><div class="card-section-head"><h3>Broadcast History</h3></div></div>');
      if (!log.length) c.appendChild(U.el('<div class="muted">No broadcasts sent yet.</div>'));
      log.slice(0, 10).forEach(function (l) {
        c.appendChild(U.el('<div class="stat-line"><span>' + U.fmtDate(l.date) + ' • ' + U.esc(l.audience) + '</span><b>' + l.count + ' sent ✓</b></div>'));
      });
      logHost.appendChild(c);
    }
    drawLog();
    send.onclick = function () {
      var aud = card.querySelector("#waAud").value;
      var n = aud === "all" ? leads.length : aud === "open" ? leads.filter(function (l) { return ["New", "Contacted", "Site Visit", "Negotiation"].indexOf(l.stage) >= 0; }).length : leads.filter(function (l) { return l.stage === "Site Visit"; }).length;
      var db = Store.raw(); db._walog = db._walog || []; db._walog.unshift({ date: Store.todayISO(), audience: aud, count: n }); Store.save();
      U.Toast.show("WhatsApp blast sent to " + n + " contacts", "good"); drawLog();
    };
  }

  /* ---------- Email (EmailJS) ---------- */
  function emailCfg() { return (Store.raw().meta.integrations || {}).email || {}; }
  function emailConfigured() { var e = emailCfg(); return !!(e.serviceId && e.templateId && e.publicKey); }
  function sendOneEmail(params) {
    var e = emailCfg();
    return fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_id: e.serviceId, template_id: e.templateId, user_id: e.publicKey, template_params: params })
    }).then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error(t || ("HTTP " + r.status)); }); return true; });
  }

  function renderEmail(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Email Campaigns", "Send newsletters, demand notices and updates to your contacts."));
    var live = emailConfigured();
    if (live) mount.appendChild(U.el('<div class="notice"><span class="ni">📧</span><div><b>Connected to EmailJS.</b> Emails below are sent for real to each recipient.</div></div>'));
    else mount.appendChild(U.el('<div class="notice warn"><span class="ni">🧪</span><div><b>Simulation mode.</b> Add your EmailJS keys in <a href="#" id="goSettings">Settings &amp; Integrations</a> to send real emails. Until then, sends are just logged.</div></div>'));

    var co = Store.currentCompany();
    var leads = Store.list("leads", { scope: "project" }).filter(function (l) { return l.email; });
    var card = U.el('<div class="card"></div>');
    card.innerHTML = "<h3>Compose Email</h3>";
    var form = U.el('<div class="form-grid"></div>');
    form.appendChild(U.el('<div class="field"><label>To</label><select id="emAud"><option value="leads">Leads with email (' + leads.length + ")</option></select></div>"));
    form.appendChild(U.el('<div class="field"><label>Subject</label><input id="emSub" value="Update from ' + U.esc(co.name) + '" /></div>'));
    form.appendChild(U.el('<div class="field full"><label>Body</label><textarea id="emBody">Dear {{to_name}},\n\nThank you for your interest. We are pleased to share our latest offers.\n\nRegards,\n' + U.esc(co.name) + "</textarea></div>"));
    card.appendChild(form);
    var send = U.el('<button class="btn primary" style="margin-top:12px">✉️ ' + (live ? "Send Emails" : "Send (simulated)") + "</button>");
    var progress = U.el('<span class="muted" style="margin-left:10px"></span>');
    card.appendChild(send); card.appendChild(progress); mount.appendChild(card);

    var logHost = U.el('<div style="margin-top:16px"></div>'); mount.appendChild(logHost);
    function drawLog() {
      logHost.innerHTML = ""; var log = Store.raw()._emlog || [];
      var c = U.el('<div class="card"><div class="card-section-head"><h3>Sent Campaigns</h3></div></div>');
      if (!log.length) c.appendChild(U.el('<div class="muted">No campaigns sent yet.</div>'));
      log.slice(0, 10).forEach(function (l) { c.appendChild(U.el('<div class="stat-line"><span>' + U.fmtDate(l.date) + " • " + U.esc(l.subject) + (l.failed ? ' <span class="badge bad">' + l.failed + " failed</span>" : "") + '</span><b>' + l.count + " sent ✓</b></div>")); });
      logHost.appendChild(c);
    }
    drawLog();
    var gs = mount.querySelector("#goSettings"); if (gs) gs.onclick = function (e) { e.preventDefault(); App.route("settings"); };

    send.onclick = function () {
      var subject = card.querySelector("#emSub").value, body = card.querySelector("#emBody").value;
      if (!live) {
        var db = Store.raw(); db._emlog = db._emlog || []; db._emlog.unshift({ date: Store.todayISO(), subject: subject, count: leads.length }); Store.save();
        U.Toast.show("Simulated: logged " + leads.length + " emails", "good"); drawLog(); return;
      }
      if (!leads.length) { U.Toast.show("No recipients with an email address", "bad"); return; }
      send.disabled = true; var ok = 0, fail = 0, i = 0;
      function next() {
        if (i >= leads.length) {
          var db = Store.raw(); db._emlog = db._emlog || []; db._emlog.unshift({ date: Store.todayISO(), subject: subject, count: ok, failed: fail }); Store.save();
          U.Toast.show("Sent " + ok + " email(s)" + (fail ? ", " + fail + " failed" : ""), fail ? "bad" : "good");
          send.disabled = false; progress.textContent = ""; drawLog(); return;
        }
        var l = leads[i++]; progress.textContent = "Sending " + i + "/" + leads.length + "…";
        sendOneEmail({ to_email: l.email, to_name: l.name, subject: subject, message: body.replace(/\{\{to_name\}\}/g, l.name), from_name: co.name, reply_to: (Store.raw().meta.ownerEmail || "") })
          .then(function () { ok++; }).catch(function (e) { fail++; console.warn("Email to " + l.email + " failed:", e.message); })
          .then(function () { setTimeout(next, 350); });
      }
      next();
    };
  }

  /* ---------- E-Courts ---------- */
  function renderECourts(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("E-Courts Integration", "Track litigation & case status linked to land parcels and legal matters."));
    mount.appendChild(stubNotice("“Fetch Status” simulates an eCourts services lookup by CNR number and updates the hearing details."));
    var cases = Store.raw()._cases || defaultCases();
    Store.raw()._cases = cases;

    var caseFields = [
      { f: "title", label: "Case title", type: "text", req: true },
      { f: "cnr", label: "CNR number", type: "text", req: true },
      { f: "court", label: "Court", type: "text" },
      { f: "matter", label: "Linked matter (parcel/unit)", type: "text" },
      { f: "nextHearing", label: "Next hearing", type: "date" },
      { f: "status", label: "Status", type: "select", options: ["Pending", "Disposed", "Stayed", "Adjourned"], def: "Pending" }
    ];
    var addBtn = U.el('<button class="btn primary">+ Add Case</button>');
    addBtn.onclick = function () {
      var built = U.buildForm(caseFields, null, function (data) {
        cases.unshift(data); Store.save(); U.Modal.close(); U.Toast.show("Case added", "good"); renderECourts(mount);
      }, "Add Case");
      U.Modal.open("New Court Case", built.form, built.foot);
    };
    var bar = U.el('<div class="toolbar"></div>'); var sp = U.el('<div style="margin-left:auto"></div>'); sp.appendChild(addBtn); bar.appendChild(sp); mount.appendChild(bar);

    var statusMap = { Disposed: "good", Pending: "warn", Stayed: "info", Adjourned: "muted" };
    var wrap = U.el('<div class="table-wrap"></div>');
    if (!cases.length) { wrap.appendChild(U.el('<div class="empty-state"><div class="big">👨‍⚖️</div><div>No cases tracked.</div></div>')); mount.appendChild(wrap); return; }
    var table = U.el('<table class="data"></table>');
    table.appendChild(U.el('<thead><tr><th>Case</th><th>CNR</th><th>Court</th><th>Matter</th><th>Next Hearing</th><th>Status</th><th class="num">Actions</th></tr></thead>'));
    var tb = U.el("<tbody></tbody>");
    cases.forEach(function (r) {
      var tr = U.el("<tr></tr>");
      [r.title, r.cnr, r.court, r.matter].forEach(function (v) { tr.appendChild(U.el("<td>" + U.esc(v == null ? "—" : v) + "</td>")); });
      tr.appendChild(U.el("<td>" + U.fmtDate(r.nextHearing) + "</td>"));
      tr.appendChild(U.el('<td><span class="badge ' + (statusMap[r.status] || "muted") + '">' + U.esc(r.status || "—") + "</span></td>"));
      var act = U.el('<td class="num"><div class="row-actions"></div></td>'); var box = act.querySelector(".row-actions");
      var ed = U.el('<button class="btn sm">✎ Edit</button>');
      ed.onclick = function () {
        var built = U.buildForm(caseFields, r, function (data) { Object.assign(r, data); Store.save(); U.Modal.close(); U.Toast.show("Case updated", "good"); renderECourts(mount); }, "Update Case");
        U.Modal.open("Edit Case", built.form, built.foot);
      };
      var fetch = U.el('<button class="btn sm">⟳ Fetch Status</button>');
      fetch.onclick = function () { r.nextHearing = nextWeek(); r.status = "Adjourned"; Store.save(); U.Toast.show("eCourts: status fetched for " + r.cnr, "good"); renderECourts(mount); };
      var del = U.el('<button class="btn sm danger">×</button>');
      del.onclick = function () { var i = cases.indexOf(r); if (i >= 0) cases.splice(i, 1); Store.save(); renderECourts(mount); };
      box.appendChild(ed); box.appendChild(fetch); box.appendChild(del); tr.appendChild(act); tb.appendChild(tr);
    });
    table.appendChild(tb); wrap.appendChild(table); mount.appendChild(wrap);
  }
  function defaultCases() {
    return [
      { title: "Boundary dispute — Gut 145", cnr: "MHTH030001452026", court: "Civil Court, Thane", matter: "Ghodbunder Parcel 2", nextHearing: nextWeek(), status: "Pending" },
      { title: "Title objection — CTS 88/A", cnr: "MHMU010008872025", court: "Bombay High Court", matter: "Atria Grand Land", nextHearing: nextWeek(14), status: "Adjourned" }
    ];
  }
  function nextWeek(extra) { var d = new Date(); d.setDate(d.getDate() + (extra || 7)); return d.toISOString().slice(0, 10); }

  /* ---------- Vendor Portal ---------- */
  function renderVendorPortal(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Vendor / Supplier Portal", "Self-service portal where suppliers submit invoices and track payment status."));
    mount.appendChild(stubNotice("This is the internal preview of the vendor-facing portal. Vendors would log in to submit bills; here you can review submissions."));
    var vendors = Store.list("vendors", { scope: "company" });

    var grid = U.el('<div class="cards grid-3"></div>');
    vendors.forEach(function (v) {
      var card = U.el('<div class="card"><div class="spread"><h3 style="margin:0">' + U.esc(v.name) + '</h3><span class="badge ' + ({ A: "good", B: "info", C: "warn" })[v.rating] + '">Grade ' + U.esc(v.rating || "B") + '</span></div></div>');
      card.appendChild(U.el('<div class="muted" style="font-size:12px;margin:6px 0">' + U.esc(v.category || "") + ' • ' + U.esc(v.contact || "") + "</div>"));
      card.appendChild(U.el('<div class="stat-line"><span>Outstanding</span><b>' + U.inr(v.outstanding) + "</b></div>"));
      card.appendChild(U.el('<div class="stat-line"><span>GSTIN</span><b style="font-weight:600">' + U.esc(v.gstin || "—") + "</b></div>"));
      var btn = U.el('<button class="btn sm" style="margin-top:10px">Submit Bill (as vendor)</button>');
      btn.onclick = function () {
        var fields = [{ f: "billNo", label: "Bill no.", type: "text", req: true }, { f: "amount", label: "Amount (₹)", type: "money", req: true }, { f: "desc", label: "Description", type: "text", full: true }];
        var built = U.buildForm(fields, null, function (data) {
          v.outstanding = (Number(v.outstanding) || 0) + (Number(data.amount) || 0);
          Store.upsert("vendors", v, "company");
          U.Modal.close(); U.Toast.show("Bill submitted by " + v.name, "good"); renderVendorPortal(mount);
        }, "Submit");
        U.Modal.open("Vendor bill — " + v.name, built.form, built.foot);
      };
      var actRow = U.el('<div class="row-flex" style="margin-top:10px;flex-wrap:wrap"></div>');
      var editV = U.el('<button class="btn sm">✎ Edit</button>');
      editV.onclick = function () {
        var built = U.buildForm(Schema.ENTITIES.vendors.fields, v, function (data) {
          data.id = v.id; Store.upsert("vendors", data, "company"); U.Modal.close(); U.Toast.show("Vendor updated", "good"); renderVendorPortal(mount);
        }, "Update Vendor");
        U.Modal.open("Edit Vendor — " + v.name, built.form, built.foot);
      };
      if (v.gstin && window.Verify) {
        var vchk = U.el('<button class="btn sm">🪪 Verify GSTIN</button>');
        vchk.onclick = function () { var r = Verify.gstin(v.gstin); card.appendChild(Verify.resultNode(r)); U.Toast.show((r.ok ? "✓ " : "✗ ") + r.message, r.ok ? "good" : "bad"); };
        actRow.appendChild(vchk);
      }
      actRow.appendChild(editV); actRow.appendChild(btn);
      card.appendChild(actRow);
      grid.appendChild(card);
    });
    if (!vendors.length) grid.appendChild(U.el('<div class="muted">No vendors yet. Add them under Procurement → Vendors.</div>'));
    mount.appendChild(grid);
  }

  /* ---------- Data Manager ---------- */
  function renderDataManager(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Data Manager", "Backup, restore, import and reset all AtriaERP data stored on this PC."));

    var stats = U.el('<div class="cards grid-4"></div>');
    var totalRecords = 0;
    Object.keys(Schema.ENTITIES).forEach(function (k) { totalRecords += (Store.raw().records[k] || []).length; });
    stats.appendChild(U.kpiCard("Companies", Store.listCompanies().length, "", "🏢"));
    stats.appendChild(U.kpiCard("Projects", Store.raw().projects.length, "", "📍"));
    stats.appendChild(U.kpiCard("Total Records", totalRecords, "across all modules", "🗂️"));
    var size = (JSON.stringify(Store.raw()).length / 1024).toFixed(1);
    stats.appendChild(U.kpiCard("Data Size", size + " KB", "in browser storage", "💾"));
    mount.appendChild(stats);

    var card = U.el('<div class="card" style="margin-top:16px"><h3>Backup & Restore</h3><p class="muted" style="font-size:13px">Your data lives only in this browser. Export regularly to keep a safe copy you can move to another PC.</p></div>');
    var actions = U.el('<div class="row-flex" style="flex-wrap:wrap;gap:10px"></div>');
    var exp = U.el('<button class="btn primary">⬇ Export Backup (.json)</button>');
    exp.onclick = function () {
      var blob = new Blob([Store.exportJSON()], { type: "application/json" });
      var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
      a.download = "atriaerp-backup-" + Store.todayISO() + ".json"; a.click();
      U.Toast.show("Backup downloaded", "good");
    };
    var imp = U.el('<button class="btn">⬆ Import Backup</button>');
    var file = U.el('<input type="file" accept="application/json" style="display:none" />');
    imp.onclick = function () { file.click(); };
    file.onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        try { Store.importJSON(reader.result); U.Toast.show("Data imported", "good"); App.refreshContext(); App.route("datamanager"); }
        catch (err) { U.Toast.show("Import failed: " + err.message, "bad"); }
      };
      reader.readAsText(f);
    };
    var reseed = U.el('<button class="btn">↺ Reload Demo Data</button>');
    reseed.onclick = function () {
      U.confirmDialog("Replace ALL current data with fresh demo data? Export a backup first if needed.", function () {
        Store.setRaw(Seed.buildSeed()); App.refreshContext(); App.route("dashboard"); U.Toast.show("Demo data reloaded", "good");
      }, "Reload Demo");
    };
    var wipe = U.el('<button class="btn danger">🗑 Erase All Data</button>');
    wipe.onclick = function () {
      U.confirmDialog("Permanently erase ALL AtriaERP data on this PC? This cannot be undone.", function () {
        Store.resetAll(); Store.setRaw(Seed.buildSeed()); App.refreshContext(); App.route("dashboard"); U.Toast.show("Data reset", "bad");
      }, "Erase Everything");
    };
    actions.appendChild(exp); actions.appendChild(imp); actions.appendChild(file); actions.appendChild(reseed); actions.appendChild(wipe);
    card.appendChild(actions);
    mount.appendChild(card);

    // Cloud migration (only in cloud mode)
    if (window.Cloud && Cloud.enabled && Cloud.enabled()) {
      var cloudCard = U.el('<div class="card" style="margin-top:16px"><h3>☁ Cloud</h3><p class="muted" style="font-size:13px">Push the data currently in this browser up to the shared cloud database (one-time migration / seeding).</p></div>');
      var push = U.el('<button class="btn primary">⬆ Upload current data to cloud</button>');
      push.onclick = function () {
        U.confirmDialog("Upload all data currently loaded to the cloud? Existing cloud rows with the same ID will be overwritten.", function () {
          push.disabled = true; push.textContent = "Uploading…";
          Cloud.pushAll(Store.raw()).then(function (n) { U.Toast.show("Uploaded " + n + " records to cloud", "good"); App.refreshFromCloud(); })
            .catch(function (e) { U.Toast.show("Upload failed: " + e.message, "bad"); push.disabled = false; push.textContent = "⬆ Upload current data to cloud"; });
        }, "Upload");
      };
      var demo = U.el('<button class="btn" style="margin-left:8px">🌱 Load demo data into cloud</button>');
      demo.onclick = function () {
        U.confirmDialog("Push the sample demo data (3 companies, projects, records) into your cloud database so you have something to explore?", function () {
          demo.disabled = true; demo.textContent = "Loading…";
          Cloud.pushAll(Seed.buildSeed()).then(function (n) { U.Toast.show("Loaded " + n + " demo records into cloud", "good"); App.refreshFromCloud(); })
            .catch(function (e) { U.Toast.show("Failed: " + e.message, "bad"); demo.disabled = false; demo.textContent = "🌱 Load demo data into cloud"; });
        }, "Load Demo");
      };
      cloudCard.appendChild(push); cloudCard.appendChild(demo);
      mount.appendChild(cloudCard);
    }

    // per-module counts
    var breakdown = U.el('<div class="card" style="margin-top:16px"><h3>Records by Module</h3></div>');
    Object.keys(Schema.ENTITIES).forEach(function (k) {
      var e = Schema.ENTITIES[k];
      breakdown.appendChild(U.el('<div class="stat-line"><span>' + e.icon + " " + U.esc(e.title) + '</span><b>' + (Store.raw().records[k] || []).length + "</b></div>"));
    });
    mount.appendChild(breakdown);
  }

  /* ---------- Setup: companies & projects ---------- */
  function renderSetup(mount) {
    mount.innerHTML = "";
    var addCo = U.el('<button class="btn primary">+ New Company</button>');
    addCo.onclick = function () {
      var fields = [
        { f: "name", label: "Company name", type: "text", req: true }, { f: "gstin", label: "GSTIN", type: "text" },
        { f: "pan", label: "PAN", type: "text" }, { f: "city", label: "City", type: "text" }, { f: "state", label: "State", type: "text" }
      ];
      var built = U.buildForm(fields, null, function (data) {
        Store.addCompany(data); U.Modal.close(); U.Toast.show("Company added", "good"); App.refreshContext(); renderSetup(mount);
      }, "Add Company");
      U.Modal.open("New Company", built.form, built.foot);
    };
    mount.appendChild(U.pageHead("Companies & Projects", "Manage the entities and projects in your group.", addCo));

    var companyFields = [
      { f: "name", label: "Company name", type: "text", req: true }, { f: "gstin", label: "GSTIN", type: "text" },
      { f: "pan", label: "PAN", type: "text" }, { f: "city", label: "City", type: "text" }, { f: "state", label: "State", type: "text" }
    ];
    var projectFields = [
      { f: "name", label: "Project name", type: "text", req: true }, { f: "location", label: "Location", type: "text" }, { f: "reraNo", label: "MahaRERA no.", type: "text" }
    ];

    Store.listCompanies().forEach(function (co) {
      var card = U.el('<div class="card" style="margin-top:14px"></div>');
      var headRow = U.el('<div class="spread"><div><h3 style="margin:0">🏢 ' + U.esc(co.name) + '</h3><div class="muted" style="font-size:12px">GSTIN ' + U.esc(co.gstin || "—") + ' • ' + U.esc(co.city || "") + "</div></div></div>");
      var editCo = U.el('<button class="btn sm">✎ Edit</button>');
      editCo.onclick = function () {
        var built = U.buildForm(companyFields, co, function (data) {
          data.id = co.id; Store.updateCompany(data); U.Modal.close(); U.Toast.show("Company updated", "good"); App.refreshContext(); renderSetup(mount);
        }, "Update Company");
        U.Modal.open("Edit Company", built.form, built.foot);
      };
      headRow.appendChild(editCo);
      card.appendChild(headRow);

      var projs = Store.listProjects(co.id);
      var list = U.el('<ul class="list-plain" style="margin-top:8px"></ul>');
      projs.forEach(function (p) {
        var li = U.el('<li><span class="dotmark"></span><div style="flex:1"><div><b>' + U.esc(p.name) + '</b></div><small class="muted">' + U.esc(p.location || "") + " • RERA " + U.esc(p.reraNo || "—") + "</small></div></li>");
        var acts = U.el('<div class="row-flex"></div>');
        var ed = U.el('<button class="btn sm">✎ Edit</button>');
        ed.onclick = function () {
          var built = U.buildForm(projectFields, p, function (data) {
            data.id = p.id; Store.updateProject(data); U.Modal.close(); U.Toast.show("Project updated", "good"); App.refreshContext(); renderSetup(mount);
          }, "Update Project");
          U.Modal.open("Edit Project — " + p.name, built.form, built.foot);
        };
        var del = U.el('<button class="btn sm danger">Delete</button>');
        del.onclick = function () {
          U.confirmDialog("Delete project “" + p.name + "”? Records already entered under it are not removed.", function () {
            Store.removeProject(p.id); U.Toast.show("Project deleted", "bad"); App.refreshContext(); renderSetup(mount);
          }, "Delete Project");
        };
        acts.appendChild(ed); acts.appendChild(del); li.appendChild(acts);
        list.appendChild(li);
      });
      if (!projs.length) list.appendChild(U.el('<li class="muted">No projects yet.</li>'));
      card.appendChild(list);
      var addPr = U.el('<button class="btn sm" style="margin-top:8px">+ Add Project to ' + U.esc(co.name.split(" ")[0]) + "</button>");
      addPr.onclick = function () {
        var built = U.buildForm(projectFields, null, function (data) {
          data.companyId = co.id; Store.addProject(data); U.Modal.close(); U.Toast.show("Project added", "good"); App.refreshContext(); renderSetup(mount);
        }, "Add Project");
        U.Modal.open("New Project — " + co.name, built.form, built.foot);
      };
      card.appendChild(addPr);
      mount.appendChild(card);
    });
  }

  /* ---------- Settings & Integrations ---------- */
  function renderSettings(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Settings & Integrations", "Connect AtriaERP to outside services. Add them one at a time."));
    var integ = Store.raw().meta.integrations; integ.upi = integ.upi || {};

    // --- UPI Payment Collection (LIVE, no signup) ---
    var upiCard = U.el('<div class="card"></div>');
    upiCard.appendChild(U.el('<div class="spread"><h3 style="margin:0">💳 UPI Payment Collection</h3><span class="badge ' + (integ.upi.vpa ? "good" : "muted") + '">' + (integ.upi.vpa ? "Connected" : "Not set") + "</span></div>"));
    upiCard.appendChild(U.el('<p class="muted" style="font-size:13px">Enter your business UPI ID once. Customers then get a “Pay via UPI” button + QR on every due amount in Collections. No fees, no signup — money lands directly in your account.</p>'));
    var f = U.el('<div class="form-grid"></div>');
    f.appendChild(U.el('<div class="field req"><label>Business UPI ID (VPA)</label><input id="set_vpa" placeholder="e.g. atriarealty@hdfcbank" value="' + U.esc(integ.upi.vpa || "") + '"></div>'));
    f.appendChild(U.el('<div class="field"><label>Payee name (shown to customer)</label><input id="set_pn" placeholder="' + U.esc(Store.currentCompany().name) + '" value="' + U.esc(integ.upi.payeeName || "") + '"></div>'));
    upiCard.appendChild(f);
    var saveBtn = U.el('<button class="btn primary" style="margin-top:10px">Save UPI Settings</button>');
    saveBtn.onclick = function () {
      var vpa = upiCard.querySelector("#set_vpa").value.trim();
      if (vpa && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(vpa)) { U.Toast.show("That doesn't look like a valid UPI ID (name@bank)", "bad"); return; }
      integ.upi.vpa = vpa; integ.upi.payeeName = upiCard.querySelector("#set_pn").value.trim(); Store.save();
      U.Toast.show("UPI settings saved", "good"); renderSettings(mount);
    };
    upiCard.appendChild(saveBtn);
    if (integ.upi.vpa) {
      var testBtn = U.el('<button class="btn" style="margin-top:10px;margin-left:8px">Test a ₹1 link</button>');
      testBtn.onclick = function () { Collections.showUpi({ name: "Test", total: 1, unitList: "" }); };
      upiCard.appendChild(testBtn);
    }
    mount.appendChild(upiCard);

    // --- Email (EmailJS) ---
    integ.email = integ.email || {};
    var emConfigured = !!(integ.email.serviceId && integ.email.templateId && integ.email.publicKey);
    var emCard = U.el('<div class="card" style="margin-top:16px"></div>');
    emCard.appendChild(U.el('<div class="spread"><h3 style="margin:0">📧 Email (EmailJS)</h3><span class="badge ' + (emConfigured ? "good" : "muted") + '">' + (emConfigured ? "Connected" : "Not set") + "</span></div>"));
    emCard.appendChild(U.el('<p class="muted" style="font-size:13px">Send real emails from AtriaERP with no backend. Create a free account at <b>emailjs.com</b>, add an email service + a template, then paste the 3 values below. Your template should use variables: <code>{{to_email}}</code>, <code>{{to_name}}</code>, <code>{{subject}}</code>, <code>{{message}}</code>.</p>'));
    var ef = U.el('<div class="form-grid"></div>');
    ef.appendChild(U.el('<div class="field"><label>Service ID</label><input id="em_sid" placeholder="service_xxxxxxx" value="' + U.esc(integ.email.serviceId || "") + '"></div>'));
    ef.appendChild(U.el('<div class="field"><label>Template ID</label><input id="em_tid" placeholder="template_xxxxxxx" value="' + U.esc(integ.email.templateId || "") + '"></div>'));
    ef.appendChild(U.el('<div class="field"><label>Public Key</label><input id="em_pk" placeholder="xxxxxxxxxxxxxx" value="' + U.esc(integ.email.publicKey || "") + '"></div>'));
    ef.appendChild(U.el('<div class="field"><label>Reply-to (your email)</label><input id="em_reply" placeholder="you@company.com" value="' + U.esc(Store.raw().meta.ownerEmail || "") + '"></div>'));
    emCard.appendChild(ef);
    var emSave = U.el('<button class="btn primary" style="margin-top:10px">Save Email Settings</button>');
    emSave.onclick = function () {
      integ.email.serviceId = emCard.querySelector("#em_sid").value.trim();
      integ.email.templateId = emCard.querySelector("#em_tid").value.trim();
      integ.email.publicKey = emCard.querySelector("#em_pk").value.trim();
      Store.raw().meta.ownerEmail = emCard.querySelector("#em_reply").value.trim();
      Store.save(); U.Toast.show("Email settings saved", "good"); renderSettings(mount);
    };
    emCard.appendChild(emSave);
    if (emConfigured) {
      var emTest = U.el('<button class="btn" style="margin-top:10px;margin-left:8px">Send test email</button>');
      emTest.onclick = function () {
        var to = prompt("Send a test email to which address?", Store.raw().meta.ownerEmail || "");
        if (!to) return;
        emTest.disabled = true; emTest.textContent = "Sending…";
        sendOneEmail({ to_email: to, to_name: "Test", subject: "AtriaERP test email", message: "This is a test email from AtriaERP. EmailJS is working! 🎉", from_name: Store.currentCompany().name, reply_to: Store.raw().meta.ownerEmail || "" })
          .then(function () { U.Toast.show("Test email sent to " + to, "good"); })
          .catch(function (e) { U.Toast.show("Failed: " + e.message, "bad"); })
          .then(function () { emTest.disabled = false; emTest.textContent = "Send test email"; });
      };
      emCard.appendChild(emTest);
    }
    mount.appendChild(emCard);

    // --- Google Maps (Embed) ---
    integ.maps = integ.maps || {};
    var mapCard = U.el('<div class="card" style="margin-top:16px"></div>');
    mapCard.appendChild(U.el('<div class="spread"><h3 style="margin:0">🗺️ Google Maps</h3><span class="badge ' + (integ.maps.embedKey ? "good" : "muted") + '">' + (integ.maps.embedKey ? "Connected" : "Optional") + "</span></div>"));
    mapCard.appendChild(U.el('<p class="muted" style="font-size:13px">“Open in Google Maps” already works with no key. To show maps <b>inline</b> in the Locations screen, create a free <b>Maps Embed API</b> key (Google Cloud → APIs &amp; Services → enable “Maps Embed API”) and paste it here. The Embed API is free with no usage charges.</p>'));
    var mf = U.el('<div class="form-grid"></div>');
    mf.appendChild(U.el('<div class="field full"><label>Maps Embed API key</label><input id="map_key" placeholder="AIza..." value="' + U.esc(integ.maps.embedKey || "") + '"></div>'));
    mapCard.appendChild(mf);
    var mapSave = U.el('<button class="btn primary" style="margin-top:10px">Save Maps Settings</button>');
    mapSave.onclick = function () { integ.maps.embedKey = mapCard.querySelector("#map_key").value.trim(); Store.save(); U.Toast.show("Maps settings saved", "good"); renderSettings(mount); };
    mapCard.appendChild(mapSave);
    mount.appendChild(mapCard);

    // --- GSTIN / PAN verification (offline checksum, live now) ---
    var vCard = U.el('<div class="card" style="margin-top:16px"></div>');
    vCard.appendChild(U.el('<div class="spread"><h3 style="margin:0">🪪 GSTIN / PAN Verification</h3><span class="badge good">Live</span></div>'));
    vCard.appendChild(U.el('<p class="muted" style="font-size:13px">Instantly checks the <b>format &amp; official checksum</b> — catches typos and fake numbers. Works now, free.' + (window.Cloud && Cloud.enabled && Cloud.enabled() ? ' For the <b>registered legal name/address</b>, deploy the <code>gst-lookup</code> Edge Function (see cloud/EDGE-FUNCTIONS.md) — then a “Fetch live details” button appears after a valid GSTIN.' : ' <i>(Live government lookup needs cloud + a backend function.)</i>') + "</p>"));
    var vHost = U.el("<div></div>"); vCard.appendChild(vHost);
    if (window.Verify) Verify.renderQuick(vHost);
    mount.appendChild(vCard);

    // --- status list of other integrations ---
    var list = U.el('<div class="card" style="margin-top:16px"><h3>Other integrations</h3></div>');
    [
      ["💬 WhatsApp (one-tap reminders)", "Live", "good", "wa.me links work now — no setup."],
      ["🏦 Tally (Creditors/Debtors)", "Simulated", "warn", "Needs a Tally connector + cloud backend."],
      ["🏛️ Axis Bank (balances/payouts)", "Simulated", "warn", "Needs corporate API onboarding + cloud backend."],
      ["🧾 GST / e-Invoice", "Manual", "muted", "Add a GSP (ClearTax/Masters India) with cloud."],
      ["👨‍⚖️ e-Courts", "Simulated", "warn", "Add Surepass/Signzy with cloud."]
    ].forEach(function (r) {
      list.appendChild(U.el('<div class="stat-line"><span>' + r[0] + ' <small class="muted">— ' + r[3] + '</small></span><span class="badge ' + r[2] + '">' + r[1] + "</span></div>"));
    });
    mount.appendChild(list);
  }

  global.Integrations = {
    tallySync: tallySync, renderBank: renderBank, renderNetBanking: renderNetBanking,
    renderWhatsApp: renderWhatsApp, renderEmail: renderEmail, renderECourts: renderECourts,
    renderVendorPortal: renderVendorPortal, renderDataManager: renderDataManager, renderSetup: renderSetup,
    renderSettings: renderSettings
  };
})(window);
