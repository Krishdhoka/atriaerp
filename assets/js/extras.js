/* AtriaERP — Extra modules:
 *  • Customer 360  (lead → unit → agreement → payments → letters, unified)
 *  • Budget vs Actual (project cost control, Farvision-style)
 *  • Land Desk (In4Suite-style land schedules + litigation + reminders)
 *  • Document Vault (file attachments, stored locally as data URLs)
 */
(function (global) {
  "use strict";
  var U = global.UI;
  function cid() { return Store.getContext().companyId; }
  function pid() { return Store.getContext().projectId; }
  function byCompany(entity) { return (Store.raw().records[entity] || []).filter(function (r) { return r.companyId === cid(); }); }

  /* ============================ Customer 360 ============================ */
  function customerNames() {
    var set = {};
    byCompany("leads").forEach(function (r) { if (r.name) set[r.name] = 1; });
    byCompany("agreements").forEach(function (r) { if (r.customer) set[r.customer] = 1; });
    byCompany("payments").forEach(function (r) { if (r.customer) set[r.customer] = 1; });
    return Object.keys(set).sort();
  }

  function renderCustomer360(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Customer 360", "Everything about one customer — bookings, agreements, payments & letters in one place."));
    var names = customerNames();
    if (!names.length) { mount.appendChild(U.el('<div class="empty-state"><div class="big">👤</div><div>No customers yet. Add leads, agreements or payments first.</div></div>')); return; }

    var bar = U.el('<div class="toolbar"></div>');
    var sel = U.el('<select style="min-width:240px"></select>');
    names.forEach(function (n) { sel.appendChild(U.el("<option>" + U.esc(n) + "</option>")); });
    bar.appendChild(U.el('<div class="muted">Customer:</div>')); bar.appendChild(sel);
    mount.appendChild(bar);
    var host = U.el("<div></div>"); mount.appendChild(host);

    function draw(name) {
      host.innerHTML = "";
      var lead = byCompany("leads").find(function (r) { return r.name === name; }) || {};
      var ags = byCompany("agreements").filter(function (r) { return r.customer === name; });
      var pays = byCompany("payments").filter(function (r) { return r.customer === name; });
      var lets = byCompany("letters").filter(function (r) { return r.recipient === name; });
      var agValue = ags.reduce(function (s, r) { return s + (Number(r.value) || 0); }, 0);
      var received = pays.filter(function (p) { return p.status === "Paid"; }).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
      var outstanding = pays.filter(function (p) { return p.status !== "Paid"; }).reduce(function (s, p) { return s + (Number(p.amount) || 0); }, 0);
      var units = {}; ags.forEach(function (a) { if (a.unit) units[a.unit] = 1; }); pays.forEach(function (p) { if (p.unit) units[p.unit] = 1; });

      // header card
      var initials = name.split(" ").map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
      var head = U.el('<div class="card"><div class="party-top"><div class="party-avatar">' + U.esc(initials) + '</div><div class="party-meta"><div class="party-name" style="font-size:18px">' + U.esc(name) + '</div><div class="party-sub">' + (lead.phone ? "📱 " + U.esc(lead.phone) + "  " : "") + (lead.email ? "✉️ " + U.esc(lead.email) + "  " : "") + (lead.stage ? '<span class="badge info">' + U.esc(lead.stage) + "</span>" : "") + " " + Object.keys(units).map(function (u) { return '<span class="pill">' + U.esc(u) + "</span>"; }).join(" ") + "</div></div></div></div>");
      if (lead.phone) {
        var wa = U.el('<a class="btn sm" style="background:#25D366;border-color:#25D366;color:#fff;margin-top:10px" target="_blank">💬 Message on WhatsApp</a>');
        wa.href = Collections.waLink(lead.phone, "Dear " + name + ", warm greetings from " + Store.currentCompany().name + ".");
        head.appendChild(wa);
      }
      host.appendChild(head);

      var kpis = U.el('<div class="cards grid-3" style="margin-top:14px"></div>');
      kpis.appendChild(U.kpiCard("Agreement Value", U.inrShort(agValue), ags.length + " agreement(s)", "📄"));
      kpis.appendChild(U.kpiCard("Received", U.inrShort(received), pays.filter(function (p) { return p.status === "Paid"; }).length + " receipt(s)", "✅"));
      kpis.appendChild(U.kpiCard("Outstanding", U.inrShort(outstanding), "due / overdue", "⏳"));
      host.appendChild(kpis);

      var grid = U.el('<div class="cards grid-2" style="margin-top:16px"></div>');
      grid.appendChild(sectionCard("📄 Agreements", ags, ["agreementNo", "unit", "value", "registrationStatus"], { value: "money" }));
      grid.appendChild(sectionCard("💰 Payments", pays, ["milestone", "amount", "dueDate", "status"], { amount: "money", dueDate: "date" }));
      grid.appendChild(sectionCard("✉️ Letters", lets, ["type", "refNo", "issueDate", "status"], { issueDate: "date" }));
      // timeline
      var tl = U.el('<div class="card"><h3>🕑 Timeline</h3><div class="timeline"></div></div>');
      var events = [];
      ags.forEach(function (a) { events.push({ d: a.agreementDate || a.createdAt, t: "Agreement " + (a.agreementNo || "") + " — " + U.inrShort(a.value) }); });
      pays.forEach(function (p) { events.push({ d: p.receivedDate || p.dueDate || p.createdAt, t: (p.status === "Paid" ? "Received " : "Due ") + U.inrShort(p.amount) + " (" + (p.milestone || "") + ")" }); });
      lets.forEach(function (l) { events.push({ d: l.issueDate || l.createdAt, t: "Letter: " + l.type }); });
      if (lead.createdAt) events.push({ d: lead.createdAt, t: "Lead created (" + (lead.source || "") + ")" });
      events.sort(function (a, b) { return (b.d || "") < (a.d || "") ? -1 : 1; });
      var tlBox = tl.querySelector(".timeline");
      events.forEach(function (e) { tlBox.appendChild(U.el('<div class="tl-item"><div>' + U.esc(e.t) + '</div><small>' + U.fmtDate(e.d) + "</small></div>")); });
      if (!events.length) tlBox.appendChild(U.el('<div class="muted">No activity.</div>'));
      grid.appendChild(tl);
      host.appendChild(grid);
    }
    sel.onchange = function () { draw(sel.value); };
    draw(names[0]);
  }

  function sectionCard(title, rows, cols, types) {
    var card = U.el('<div class="card"><h3>' + title + " <span class='muted' style='font-weight:400;font-size:12px'>(" + rows.length + ")</span></h3></div>");
    if (!rows.length) { card.appendChild(U.el('<div class="muted">None.</div>')); return card; }
    var t = U.el('<table class="data" style="border:1px solid var(--line);border-radius:8px;overflow:hidden"></table>');
    var tb = U.el("<tbody></tbody>");
    rows.forEach(function (r) {
      var tr = U.el("<tr></tr>");
      cols.forEach(function (c) {
        var ty = types && types[c];
        var val = ty ? U.fmtCell(r[c], { type: ty }) : U.esc(r[c] == null ? "—" : r[c]);
        tr.appendChild(U.el('<td class="' + (ty === "money" ? "num" : "") + '">' + val + "</td>"));
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb); card.appendChild(t); return card;
  }

  /* ============================ Budget vs Actual ============================ */
  var DEFAULT_HEADS = ["Land & Approvals", "Civil / RCC", "MEP (Plumbing/Electrical)", "Finishing", "Lifts & Amenities", "Overheads & Marketing"];

  function renderBudget(mount) {
    mount.innerHTML = "";
    var pr = Store.currentProject();
    mount.appendChild(U.pageHead("Budget vs Actual", "Project cost control" + (pr ? " — " + pr.name : "")));
    if (!pr) { mount.appendChild(U.el('<div class="notice warn"><span class="ni">⚠️</span><div>Select a project to manage its budget.</div></div>')); return; }

    var heads = (Store.raw().records.budgets || []).filter(function (b) { return b.projectId === pr.id; });
    var committedPO = (Store.raw().records.purchases || []).filter(function (r) { return r.projectId === pr.id; }).reduce(function (s, r) { return s + (Number(r.amount) || 0); }, 0);
    var committedWO = (Store.raw().records.workorders || []).filter(function (r) { return r.projectId === pr.id; }).reduce(function (s, r) { return s + (Number(r.value) || 0); }, 0);

    var addBtn = U.el('<button class="btn primary">+ Add Head</button>');
    addBtn.onclick = function () { editHead(null); };
    var bar = U.el('<div class="toolbar"></div>');
    bar.appendChild(U.el('<div class="muted">Committed from POs + Work Orders: <b>' + U.inr(committedPO + committedWO) + "</b></div>"));
    var sp = U.el('<div style="margin-left:auto" class="row-flex"></div>');
    if (!heads.length) { var seed = U.el('<button class="btn sm">Set up default heads</button>'); seed.onclick = seedHeads; sp.appendChild(seed); }
    sp.appendChild(addBtn); bar.appendChild(sp); mount.appendChild(bar);

    function seedHeads() { DEFAULT_HEADS.forEach(function (h) { Store.upsert("budgets", { head: h, budgetAmount: 0, actualAmount: 0, projectId: pr.id }, "project"); }); U.Toast.show("Default heads added", "good"); renderBudget(mount); }
    function editHead(row) {
      var built = U.buildForm([
        { f: "head", label: "Budget head", type: "text", req: true },
        { f: "budgetAmount", label: "Budget (₹)", type: "money" },
        { f: "actualAmount", label: "Actual spent (₹)", type: "money" },
        { f: "remarks", label: "Remarks", type: "text", full: true }
      ], row, function (data) { data.projectId = pr.id; Store.upsert("budgets", data, "project"); U.Modal.close(); renderBudget(mount); }, row ? "Update" : "Add Head");
      U.Modal.open(row ? "Edit Head" : "New Budget Head", built.form, built.foot);
    }

    if (!heads.length) { mount.appendChild(U.el('<div class="empty-state"><div class="big">💹</div><div>No budget set. Click “Set up default heads” to start.</div></div>')); return; }

    var tB = 0, tA = 0;
    var wrap = U.el('<div class="table-wrap"></div>');
    var table = U.el('<table class="data"></table>');
    table.appendChild(U.el('<thead><tr><th>Head</th><th class="num">Budget</th><th class="num">Actual</th><th class="num">Variance</th><th style="width:180px">Used</th><th class="num">Actions</th></tr></thead>'));
    var tb = U.el("<tbody></tbody>");
    heads.forEach(function (h) {
      var b = Number(h.budgetAmount) || 0, a = Number(h.actualAmount) || 0; tB += b; tA += a;
      var pct = b ? Math.min(100, Math.round(a / b * 100)) : 0;
      var over = a > b && b > 0;
      var tr = U.el("<tr></tr>");
      tr.appendChild(U.el("<td><b>" + U.esc(h.head) + "</b></td>"));
      tr.appendChild(U.el('<td class="num">' + U.inr(b) + "</td>"));
      tr.appendChild(U.el('<td class="num">' + U.inr(a) + "</td>"));
      tr.appendChild(U.el('<td class="num" style="color:' + (b - a < 0 ? "var(--bad)" : "var(--good)") + '">' + U.inr(b - a) + "</td>"));
      tr.appendChild(U.el('<td><div class="progress"><span style="width:' + pct + '%;background:' + (over ? "var(--bad)" : "var(--brand)") + '"></span></div><small class="muted">' + pct + "%</small></td>"));
      var act = U.el('<td class="num"><div class="row-actions"></div></td>'); var box = act.querySelector(".row-actions");
      var ed = U.el('<button class="btn sm">Edit</button>'); ed.onclick = function () { editHead(h); };
      var del = U.el('<button class="btn sm danger">×</button>'); del.onclick = function () { Store.remove("budgets", h.id); renderBudget(mount); };
      box.appendChild(ed); box.appendChild(del); tr.appendChild(act);
      tb.appendChild(tr);
    });
    var pctT = tB ? Math.min(100, Math.round(tA / tB * 100)) : 0;
    tb.appendChild(U.el('<tr style="font-weight:700;background:var(--panel-2)"><td>TOTAL</td><td class="num">' + U.inr(tB) + '</td><td class="num">' + U.inr(tA) + '</td><td class="num">' + U.inr(tB - tA) + '</td><td><div class="progress"><span style="width:' + pctT + '%"></span></div><small class="muted">' + pctT + '% used</small></td><td></td></tr>'));
    table.appendChild(tb); wrap.appendChild(table); mount.appendChild(wrap);
  }

  /* ============================ Land Desk ============================ */
  function renderLandDesk(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Land Desk", "Land parcels with payment schedules, litigation & reminders.  •  " + Store.currentCompany().name));
    var parcels = byCompany("land");
    if (!parcels.length) { mount.appendChild(U.el('<div class="empty-state"><div class="big">🗺️</div><div>No land parcels. Add them under Legal & Land → Land Management.</div></div>')); return; }

    // upcoming reminders
    var rem = [];
    parcels.forEach(function (p) { var dd = U.daysFromNow(p.reminderDate); if (dd != null && dd <= 30) rem.push({ p: p, dd: dd }); });
    byCompany("liaisoning").forEach(function (l) { var dd = U.daysFromNow(l.nextFollowUp); if (dd != null && dd <= 30) rem.push({ liaison: l, dd: dd }); });
    if (rem.length) {
      var note = U.el('<div class="notice warn"><span class="ni">⏰</span><div><b>Upcoming actions:</b> ' + rem.sort(function (a, b) { return a.dd - b.dd; }).map(function (r) {
        return r.p ? (U.esc(r.p.parcel) + " (" + U.fmtDate(r.p.reminderDate) + ")") : ("Liaison: " + U.esc(r.liaison.approval) + " (" + U.fmtDate(r.liaison.nextFollowUp) + ")");
      }).join(" • ") + "</div></div>");
      mount.appendChild(note);
    }

    var grid = U.el('<div class="cards grid-2"></div>');
    parcels.forEach(function (p) {
      var sched = p.schedule || [];
      var paidFromSched = sched.filter(function (s) { return s.paid; }).reduce(function (a, s) { return a + (Number(s.amount) || 0); }, 0);
      var paid = sched.length ? paidFromSched : (Number(p.amountPaid) || 0);
      var total = Number(p.totalConsideration) || 0;
      var bal = total - paid;
      var litCls = { None: "good", Pending: "bad", Resolved: "info" }[p.litigation] || "muted";
      var card = U.el('<div class="card"></div>');
      card.appendChild(U.el('<div class="spread"><div><h3 style="margin:0">🗺️ ' + U.esc(p.parcel) + '</h3><div class="muted" style="font-size:12px">' + U.esc(p.village || "") + ' • ' + U.esc(p.surveyNo || "") + ' • ' + (p.area || "—") + ' acre</div></div><span class="badge info">' + U.esc(p.stage || "—") + '</span></div>'));
      card.appendChild(U.el('<div class="stat-line"><span>Consideration</span><b>' + U.inr(total) + "</b></div>"));
      card.appendChild(U.el('<div class="stat-line"><span>Paid</span><b style="color:var(--good)">' + U.inr(paid) + "</b></div>"));
      card.appendChild(U.el('<div class="stat-line"><span>Balance</span><b style="color:var(--bad)">' + U.inr(bal) + "</b></div>"));
      if (total) { var pct = Math.min(100, Math.round(paid / total * 100)); card.appendChild(U.el('<div class="progress" style="margin:8px 0"><span style="width:' + pct + '%;background:var(--good)"></span></div>')); }
      card.appendChild(U.el('<div class="row-flex" style="margin:8px 0"><span class="badge ' + litCls + '">Litigation: ' + U.esc(p.litigation || "None") + '</span>' + (p.courtRef ? '<span class="pill">CNR ' + U.esc(p.courtRef) + "</span>" : "") + (p.reminderDate ? '<span class="pill">⏰ ' + U.fmtDate(p.reminderDate) + "</span>" : "") + "</div>"));
      var actRow = U.el('<div class="row-flex" style="flex-wrap:wrap"></div>');
      var editB = U.el('<button class="btn sm">✎ Edit</button>');
      editB.onclick = function () {
        var built = U.buildForm(Schema.ENTITIES.land.fields, p, function (data) {
          data.id = p.id; Store.upsert("land", data, "company"); U.Modal.close(); U.Toast.show("Parcel updated", "good"); renderLandDesk(mount);
        }, "Update Parcel");
        U.Modal.open("Edit Parcel — " + p.parcel, built.form, built.foot);
      };
      var btn = U.el('<button class="btn sm primary">🗓 Payment Schedule (' + sched.length + ")</button>");
      btn.onclick = function () { openSchedule(p, mount); };
      actRow.appendChild(editB); actRow.appendChild(btn);
      card.appendChild(actRow);
      grid.appendChild(card);
    });
    mount.appendChild(grid);
  }

  function openSchedule(parcel, mount) {
    var body = U.el("<div></div>");
    function redraw() {
      body.innerHTML = "";
      var sched = parcel.schedule || [];
      if (!sched.length) body.appendChild(U.el('<div class="muted" style="margin-bottom:10px">No installments yet.</div>'));
      sched.forEach(function (s, i) {
        var row = U.el('<div class="spread" style="padding:8px 0;border-bottom:1px solid var(--line)"><div><b>' + U.esc(s.label || "Installment " + (i + 1)) + '</b><div class="muted" style="font-size:12px">' + U.inr(s.amount) + " • " + U.fmtDate(s.dueDate) + "</div></div></div>");
        var rt = U.el('<div class="row-flex"></div>');
        var tog = U.el('<button class="btn sm ' + (s.paid ? "" : "primary") + '">' + (s.paid ? "✓ Paid" : "Mark Paid") + "</button>");
        tog.onclick = function () { s.paid = !s.paid; persist(); redraw(); };
        var del = U.el('<button class="btn sm danger">×</button>'); del.onclick = function () { sched.splice(i, 1); persist(); redraw(); };
        rt.appendChild(tog); rt.appendChild(del); row.appendChild(rt); body.appendChild(row);
      });
      var addForm = U.el('<div class="form-grid" style="margin-top:14px"><div class="field"><label>Label</label><input id="sl" placeholder="e.g. On Agreement"></div><div class="field"><label>Amount (₹)</label><input id="sa" type="number"></div><div class="field"><label>Due date</label><input id="sd" type="date"></div></div>');
      body.appendChild(addForm);
      var add = U.el('<button class="btn primary" style="margin-top:6px">+ Add Installment</button>');
      add.onclick = function () {
        var l = addForm.querySelector("#sl").value, a = Number(addForm.querySelector("#sa").value) || 0, d = addForm.querySelector("#sd").value;
        if (!a) { U.Toast.show("Enter an amount", "bad"); return; }
        (parcel.schedule = parcel.schedule || []).push({ label: l, amount: a, dueDate: d, paid: false }); persist(); redraw();
      };
      body.appendChild(add);
    }
    function persist() {
      parcel.amountPaid = (parcel.schedule || []).filter(function (s) { return s.paid; }).reduce(function (a, s) { return a + (Number(s.amount) || 0); }, 0);
      Store.upsert("land", parcel, "company");
    }
    redraw();
    var foot = U.el('<div class="row-flex"></div>'); var close = U.el('<button class="btn primary">Done</button>'); close.onclick = function () { U.Modal.close(); renderLandDesk(mount); }; foot.appendChild(close);
    U.Modal.open("Payment Schedule — " + parcel.parcel, body, foot);
  }

  /* ============================ Document Vault ============================ */
  var MAX_BYTES = 1.5 * 1024 * 1024;
  function renderDocuments(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Document Vault", "Attach agreements, plans, 7/12 extracts, site photos & legal docs."));
    mount.appendChild(U.el('<div class="notice"><span class="ni">📎</span><div>Files are stored on this device (up to ~1.5 MB each). For large files & team-wide access, switch on cloud mode — then this becomes shared cloud storage.</div></div>'));

    var bar = U.el('<div class="toolbar"></div>');
    var up = U.el('<button class="btn primary">⬆ Upload Document</button>');
    var file = U.el('<input type="file" style="display:none" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx">');
    up.onclick = function () { file.click(); };
    file.onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      if (f.size > MAX_BYTES) { U.Toast.show("File too large (max 1.5 MB locally). Use cloud mode for big files.", "bad"); file.value = ""; return; }
      var reader = new FileReader();
      reader.onload = function () {
        var fields = [
          { f: "name", label: "Document name", type: "text", def: f.name, req: true },
          { f: "linkedTo", label: "Linked to (unit / parcel / party)", type: "text" },
          { f: "category", label: "Category", type: "select", options: ["Agreement", "Plan", "Legal", "7/12 Extract", "Site Photo", "Approval", "Invoice", "Other"], def: "Other" }
        ];
        var built = U.buildForm(fields, null, function (data) {
          data.fileType = f.type || "file"; data.size = f.size; data.dataUrl = reader.result; data.uploadedAt = Store.todayISO();
          Store.upsert("documents", data, "company"); U.Modal.close(); U.Toast.show("Document saved", "good"); renderDocuments(mount);
        }, "Save Document");
        U.Modal.open("Upload — " + f.name, built.form, built.foot);
      };
      reader.readAsDataURL(f); file.value = "";
    };
    var sp = U.el('<div style="margin-left:auto"></div>'); sp.appendChild(up); bar.appendChild(sp); bar.appendChild(file); mount.appendChild(bar);

    var docs = byCompany("documents");
    if (!docs.length) { mount.appendChild(U.el('<div class="empty-state"><div class="big">📂</div><div>No documents yet.</div></div>')); return; }
    var wrap = U.el('<div class="table-wrap"></div>');
    var table = U.el('<table class="data"></table>');
    table.appendChild(U.el('<thead><tr><th>Document</th><th>Category</th><th>Linked To</th><th class="num">Size</th><th>Uploaded</th><th class="num">Actions</th></tr></thead>'));
    var tb = U.el("<tbody></tbody>");
    docs.forEach(function (d) {
      var tr = U.el("<tr></tr>");
      tr.appendChild(U.el("<td>📄 " + U.esc(d.name) + "</td>"));
      tr.appendChild(U.el('<td><span class="badge muted">' + U.esc(d.category || "Other") + "</span></td>"));
      tr.appendChild(U.el("<td>" + U.esc(d.linkedTo || "—") + "</td>"));
      tr.appendChild(U.el('<td class="num">' + Math.round((d.size || 0) / 1024) + " KB</td>"));
      tr.appendChild(U.el("<td>" + U.fmtDate(d.uploadedAt) + "</td>"));
      var act = U.el('<td class="num"><div class="row-actions"></div></td>'); var box = act.querySelector(".row-actions");
      var dl = U.el('<a class="btn sm" download="' + U.esc(d.name) + '">Download</a>'); dl.href = d.dataUrl;
      var view = U.el('<button class="btn sm">View</button>'); view.onclick = function () { var w = window.open(); if (w) w.document.write('<iframe src="' + d.dataUrl + '" style="border:0;width:100%;height:100%"></iframe>'); };
      var edit = U.el('<button class="btn sm">✎ Edit</button>');
      edit.onclick = function () {
        var built = U.buildForm([
          { f: "name", label: "Document name", type: "text", req: true },
          { f: "linkedTo", label: "Linked to (unit / parcel / party)", type: "text" },
          { f: "category", label: "Category", type: "select", options: ["Agreement", "Plan", "Legal", "7/12 Extract", "Site Photo", "Approval", "Invoice", "Other"] }
        ], d, function (data) { data.id = d.id; Store.upsert("documents", data, "company"); U.Modal.close(); U.Toast.show("Document updated", "good"); renderDocuments(mount); }, "Update");
        U.Modal.open("Edit Document", built.form, built.foot);
      };
      var del = U.el('<button class="btn sm danger">×</button>'); del.onclick = function () { Store.remove("documents", d.id); renderDocuments(mount); };
      box.appendChild(view); box.appendChild(edit); box.appendChild(dl); box.appendChild(del); tr.appendChild(act);
      tb.appendChild(tr);
    });
    table.appendChild(tb); wrap.appendChild(table); mount.appendChild(wrap);
  }

  /* ============================ Locations Map ============================ */
  function mapsKey() { return ((Store.raw().meta.integrations || {}).maps || {}).embedKey || ""; }
  function gmapsSearch(q) { return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q); }
  function gmapsEmbed(q) { return "https://www.google.com/maps/embed/v1/place?key=" + encodeURIComponent(mapsKey()) + "&q=" + encodeURIComponent(q); }

  function renderLocations(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Locations Map", "Your properties & projects on the map."));
    var key = mapsKey();
    if (!key) mount.appendChild(U.el('<div class="notice"><span class="ni">🗺️</span><div>“Open in Google Maps” works right now with no setup. Add a free <b>Maps Embed API</b> key in <a href="#" id="goMapSettings">Settings</a> to show maps inline here.</div></div>'));

    var items = [];
    byCompany("properties").forEach(function (p) { items.push({ name: p.name, loc: p.location || p.name, sub: p.surveyNo || "", type: "Property" }); });
    Store.listProjects().forEach(function (p) { items.push({ name: p.name, loc: p.location || p.name, sub: p.reraNo ? "RERA " + p.reraNo : "", type: "Project" }); });
    if (!items.length) { mount.appendChild(U.el('<div class="empty-state"><div class="big">📍</div><div>No properties or projects with a location yet.</div></div>')); var g0 = mount.querySelector("#goMapSettings"); if (g0) g0.onclick = function (e) { e.preventDefault(); App.route("settings"); }; return; }

    var grid = U.el('<div class="cards grid-2"></div>');
    items.forEach(function (it) {
      var q = it.loc;
      var card = U.el('<div class="card"></div>');
      card.appendChild(U.el('<div class="spread"><div><h3 style="margin:0">' + U.esc(it.name) + '</h3><div class="muted" style="font-size:12px">📍 ' + U.esc(it.loc) + (it.sub ? " • " + U.esc(it.sub) : "") + '</div></div><span class="badge ' + (it.type === "Property" ? "info" : "muted") + '">' + it.type + "</span></div>"));
      if (key) {
        var ifr = U.el('<iframe loading="lazy" style="width:100%;height:220px;border:0;border-radius:10px;margin-top:10px" referrerpolicy="no-referrer-when-downgrade"></iframe>');
        ifr.src = gmapsEmbed(q);
        card.appendChild(ifr);
      }
      var open = U.el('<a class="btn sm" target="_blank" rel="noopener" style="margin-top:10px">📍 Open in Google Maps</a>');
      open.href = gmapsSearch(q);
      card.appendChild(open);
      grid.appendChild(card);
    });
    mount.appendChild(grid);
    var g = mount.querySelector("#goMapSettings"); if (g) g.onclick = function (e) { e.preventDefault(); App.route("settings"); };
  }

  global.Extras = { renderCustomer360: renderCustomer360, renderBudget: renderBudget, renderLandDesk: renderLandDesk, renderDocuments: renderDocuments, renderLocations: renderLocations };
})(window);
