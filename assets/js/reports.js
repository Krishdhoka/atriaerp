/* AtriaERP — Reports & MIS (In4Suite/Farvision-style) + Approvals inbox (Pazy-style) */
(function (global) {
  "use strict";
  var U = global.UI;

  /* ---------- helpers ---------- */
  function csvDownload(name, headers, rows) {
    var esc = function (v) { v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [headers.map(esc).join(",")].concat(rows.map(function (r) { return r.map(esc).join(","); }));
    var blob = new Blob([lines.join("\n")], { type: "text/csv" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name + "-" + Store.todayISO() + ".csv"; a.click();
    U.Toast.show("CSV exported", "good");
  }

  function reportTable(headers, rows, opts) {
    opts = opts || {};
    var wrap = U.el('<div class="table-wrap" id="reportTable"></div>');
    var table = U.el('<table class="data"></table>');
    var thead = U.el("<thead><tr></tr></thead>"); var htr = thead.querySelector("tr");
    headers.forEach(function (h, i) { htr.appendChild(U.el('<th class="' + (opts.num && opts.num.indexOf(i) >= 0 ? "num" : "") + '">' + U.esc(h) + "</th>")); });
    table.appendChild(thead);
    var tb = U.el("<tbody></tbody>");
    rows.forEach(function (r, ri) {
      var isTotal = opts.totalRow && ri === rows.length - 1;
      var tr = U.el('<tr' + (isTotal ? ' style="font-weight:700;background:var(--panel-2)"' : "") + "></tr>");
      r.forEach(function (cell, i) { tr.appendChild(U.el('<td class="' + (opts.num && opts.num.indexOf(i) >= 0 ? "num" : "") + '">' + (cell == null ? "—" : U.esc(cell)) + "</td>")); });
      tb.appendChild(tr);
    });
    table.appendChild(tb); wrap.appendChild(table);
    return wrap;
  }

  function ageBucket(dueISO) {
    var dd = U.daysFromNow(dueISO);
    if (dd == null) return "Unknown";
    if (dd >= 0) return "Not Due";
    var od = -dd;
    if (od <= 30) return "0-30";
    if (od <= 60) return "31-60";
    if (od <= 90) return "61-90";
    return "90+";
  }
  var BUCKETS = ["Not Due", "0-30", "31-60", "61-90", "90+"];

  /* ---------- individual reports: return {headers, rows, opts, raw} ---------- */
  function repSalesMIS() {
    var rows = [], tU = 0, tA = 0, tB = 0, tV = 0;
    Store.listProjects().forEach(function (pr) {
      var units = (Store.raw().records.units || []).filter(function (u) { return u.projectId === pr.id; });
      var avail = units.filter(function (u) { return u.status === "Available"; }).length;
      var booked = units.filter(function (u) { return ["Booked", "Sold", "Registered"].indexOf(u.status) >= 0; });
      var value = booked.reduce(function (s, u) { return s + (Number(u.price) || 0); }, 0);
      rows.push([pr.name, units.length, avail, booked.length, U.inrShort(value)]);
      tU += units.length; tA += avail; tB += booked.length; tV += value;
    });
    rows.push(["TOTAL", tU, tA, tB, U.inrShort(tV)]);
    return { title: "Sales MIS (by project)", headers: ["Project", "Total Units", "Available", "Booked/Sold", "Sales Value"], rows: rows, opts: { num: [1, 2, 3, 4], totalRow: true } };
  }

  function repReceivablesAging() {
    var map = {};
    (Store.raw().records.payments || []).filter(function (p) { return p.companyId === Store.getContext().companyId && p.status !== "Paid"; })
      .forEach(function (p) {
        var k = p.customer || "(unknown)";
        if (!map[k]) { map[k] = { name: k }; BUCKETS.forEach(function (b) { map[k][b] = 0; }); map[k].total = 0; }
        var b = ageBucket(p.dueDate); var amt = Number(p.amount) || 0;
        map[k][b] += amt; map[k].total += amt;
      });
    var rows = [], totals = {}; BUCKETS.forEach(function (b) { totals[b] = 0; }); var gt = 0;
    Object.keys(map).forEach(function (k) {
      var r = map[k]; rows.push([r.name].concat(BUCKETS.map(function (b) { return r[b] ? U.inrShort(r[b]) : "—"; })).concat([U.inrShort(r.total)]));
      BUCKETS.forEach(function (b) { totals[b] += r[b]; }); gt += r.total;
    });
    rows.push(["TOTAL"].concat(BUCKETS.map(function (b) { return U.inrShort(totals[b]); })).concat([U.inrShort(gt)]));
    return { title: "Receivables Aging", headers: ["Customer"].concat(BUCKETS).concat(["Total"]), rows: rows, opts: { num: [1, 2, 3, 4, 5, 6], totalRow: true } };
  }

  function repPayablesAging() {
    var rows = [], totals = { "0-30": 0, "31-60": 0, "61-90": 0, "90+": 0 }, gt = 0;
    (Store.raw().records.creditors || []).filter(function (c) { return c.companyId === Store.getContext().companyId; }).forEach(function (c) {
      var age = Number(c.ageDays) || 0; var amt = Number(c.outstanding) || 0;
      var b = age <= 30 ? "0-30" : age <= 60 ? "31-60" : age <= 90 ? "61-90" : "90+";
      var cells = ["0-30", "31-60", "61-90", "90+"].map(function (x) { return x === b ? U.inrShort(amt) : "—"; });
      rows.push([c.name].concat(cells).concat([U.inrShort(amt)]));
      totals[b] += amt; gt += amt;
    });
    rows.push(["TOTAL"].concat(["0-30", "31-60", "61-90", "90+"].map(function (b) { return U.inrShort(totals[b]); })).concat([U.inrShort(gt)]));
    return { title: "Payables Aging (Creditors)", headers: ["Creditor", "0-30", "31-60", "61-90", "90+", "Total"], rows: rows, opts: { num: [1, 2, 3, 4, 5], totalRow: true } };
  }

  function repInventory() {
    var pr = Store.currentProject();
    var units = (Store.raw().records.units || []).filter(function (u) { return pr && u.projectId === pr.id; });
    var types = {}, statuses = ["Available", "Blocked", "Booked", "Sold", "Registered"];
    units.forEach(function (u) { types[u.type] = types[u.type] || {}; types[u.type][u.status] = (types[u.type][u.status] || 0) + 1; });
    var rows = [];
    Object.keys(types).forEach(function (t) {
      var row = [t]; var tot = 0; statuses.forEach(function (s) { var c = types[t][s] || 0; row.push(c || "—"); tot += c; }); row.push(tot); rows.push(row);
    });
    var totRow = ["TOTAL"]; statuses.forEach(function (s) { totRow.push(units.filter(function (u) { return u.status === s; }).length); }); totRow.push(units.length);
    rows.push(totRow);
    return { title: "Inventory Analysis" + (pr ? " — " + pr.name : ""), headers: ["Type"].concat(statuses).concat(["Total"]), rows: rows, opts: { num: [1, 2, 3, 4, 5, 6], totalRow: true } };
  }

  function repTax() {
    var cid = Store.getContext().companyId;
    var gst = (Store.raw().records.gst || []).filter(function (g) { return g.companyId === cid; });
    var output = gst.filter(function (g) { return g.type === "Output"; }).reduce(function (s, g) { return s + (Number(g.cgst) || 0) + (Number(g.sgst) || 0) + (Number(g.igst) || 0); }, 0);
    var input = gst.filter(function (g) { return g.type === "Input"; }).reduce(function (s, g) { return s + (Number(g.cgst) || 0) + (Number(g.sgst) || 0) + (Number(g.igst) || 0); }, 0);
    var tds = (Store.raw().records.tds || []).filter(function (t) { return t.companyId === cid; });
    var tdsDed = tds.reduce(function (s, t) { return s + (Number(t.tdsAmount) || 0); }, 0);
    var tdsPend = tds.filter(function (t) { return t.challanStatus !== "Deposited"; }).reduce(function (s, t) { return s + (Number(t.tdsAmount) || 0); }, 0);
    var rows = [
      ["GST Output (collected)", U.inr(output)],
      ["GST Input (credit)", U.inr(input)],
      ["Net GST Payable", U.inr(output - input)],
      ["TDS Deducted (total)", U.inr(tdsDed)],
      ["TDS Pending Deposit", U.inr(tdsPend)]
    ];
    return { title: "Tax Summary (GST & TDS)", headers: ["Particulars", "Amount"], rows: rows, opts: { num: [1] } };
  }

  var REPORTS = { sales: repSalesMIS, receivables: repReceivablesAging, payables: repPayablesAging, inventory: repInventory, tax: repTax };
  var REPORT_LABELS = [["sales", "Sales MIS"], ["receivables", "Receivables Aging"], ["payables", "Payables Aging"], ["inventory", "Inventory"], ["tax", "Tax Summary"]];

  function renderReports(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Reports & MIS", "Management reports from your live data.  •  " + Store.currentCompany().name));
    var state = { cur: "sales" };

    var bar = U.el('<div class="toolbar"></div>');
    var seg = U.el('<div class="seg"></div>');
    REPORT_LABELS.forEach(function (r) { var b = U.el('<button data-r="' + r[0] + '"' + (r[0] === state.cur ? ' class="active"' : "") + ">" + r[1] + "</button>"); seg.appendChild(b); });
    bar.appendChild(seg);
    var spacer = U.el('<div style="margin-left:auto" class="row-flex"></div>');
    var csvBtn = U.el('<button class="btn sm">⬇ CSV</button>');
    var printBtn = U.el('<button class="btn sm">🖨 Print</button>');
    spacer.appendChild(csvBtn); spacer.appendChild(printBtn); bar.appendChild(spacer);
    mount.appendChild(bar);

    var host = U.el('<div id="reportArea"></div>');
    mount.appendChild(host);

    function draw() {
      var rep = REPORTS[state.cur]();
      host.innerHTML = "";
      host.appendChild(U.el('<h3 style="margin:4px 0 12px">' + U.esc(rep.title) + ' <span class="muted" style="font-weight:400;font-size:12px">as on ' + U.fmtDate(Store.todayISO()) + "</span></h3>"));
      host.appendChild(reportTable(rep.headers, rep.rows, rep.opts));
      csvBtn.onclick = function () { csvDownload(rep.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase(), rep.headers, rep.rows); };
      printBtn.onclick = function () { window.print(); };
      seg.querySelectorAll("button").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-r") === state.cur); });
    }
    seg.querySelectorAll("button").forEach(function (b) { b.onclick = function () { state.cur = b.getAttribute("data-r"); draw(); }; });
    draw();
  }

  /* ---------- Approvals inbox (Pazy-style) ---------- */
  function pendingItems() {
    var cid = Store.getContext().companyId, items = [];
    (Store.raw().records.reimbursements || []).filter(function (r) { return r.companyId === cid && r.status === "Pending"; })
      .forEach(function (r) { items.push({ kind: "Reimbursement", entity: "reimbursements", id: r.id, who: r.claimant, what: r.category, amount: r.amount, next: "Approved", row: r, field: "status" }); });
    (Store.raw().records.payroll || []).filter(function (r) { return r.companyId === cid && r.status === "Pending"; })
      .forEach(function (r) { items.push({ kind: "Payroll", entity: "payroll", id: r.id, who: r.name, what: r.designation, amount: r.netPay, next: "Processed", row: r, field: "status" }); });
    (Store.raw().records.purchases || []).filter(function (r) { return r.companyId === cid && r.status === "Draft"; })
      .forEach(function (r) { items.push({ kind: "Purchase Order", entity: "purchases", id: r.id, who: r.vendor, what: r.item || r.poNo, amount: r.amount, next: "Ordered", row: r, field: "status" }); });
    return items;
  }

  function renderApprovals(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Approvals Inbox", "Pending items awaiting your approval across the company."));
    var items = pendingItems();
    var totalAmt = items.reduce(function (s, i) { return s + (Number(i.amount) || 0); }, 0);
    var kpis = U.el('<div class="cards grid-3"></div>');
    kpis.appendChild(U.kpiCard("Pending Approvals", items.length, "items in queue", "📨"));
    kpis.appendChild(U.kpiCard("Value Pending", U.inrShort(totalAmt), "total amount", "💸"));
    kpis.appendChild(U.kpiCard("Types", new Set(items.map(function (i) { return i.kind; })).size, "categories", "🗂️"));
    mount.appendChild(kpis);

    if (!items.length) { mount.appendChild(U.el('<div class="empty-state"><div class="big">✅</div><div>All caught up — nothing pending approval.</div></div>')); return; }

    var wrap = U.el('<div class="table-wrap" style="margin-top:16px"></div>');
    var table = U.el('<table class="data"></table>');
    table.appendChild(U.el('<thead><tr><th>Type</th><th>Party</th><th>Details</th><th class="num">Amount</th><th class="num">Action</th></tr></thead>'));
    var tb = U.el("<tbody></tbody>");
    items.forEach(function (it) {
      var tr = U.el("<tr></tr>");
      tr.appendChild(U.el('<td><span class="badge info">' + U.esc(it.kind) + "</span></td>"));
      tr.appendChild(U.el("<td>" + U.esc(it.who || "—") + "</td>"));
      tr.appendChild(U.el('<td class="muted">' + U.esc(it.what || "—") + "</td>"));
      tr.appendChild(U.el('<td class="num">' + U.inr(it.amount) + "</td>"));
      var act = U.el('<td class="num"><div class="row-actions"></div></td>'); var box = act.querySelector(".row-actions");
      var ap = U.el('<button class="btn sm primary">✓ Approve</button>');
      ap.onclick = function () { it.row[it.field] = it.next; Store.upsert(it.entity, it.row, "company"); U.Toast.show(it.kind + " approved", "good"); renderApprovals(mount); };
      var rj = U.el('<button class="btn sm danger">✕ Reject</button>');
      rj.onclick = function () { it.row[it.field] = it.kind === "Purchase Order" ? "Cancelled" : "Rejected"; Store.upsert(it.entity, it.row, "company"); U.Toast.show(it.kind + " rejected", "bad"); renderApprovals(mount); };
      box.appendChild(ap); box.appendChild(rj); tr.appendChild(act);
      tb.appendChild(tr);
    });
    table.appendChild(tb); wrap.appendChild(table); mount.appendChild(wrap);
  }

  global.Reports = { renderReports: renderReports, renderApprovals: renderApprovals };
})(window);
