/* AtriaERP — GST & TDS compliance
 *  • Return-filing tracker (filed / not filed, per period/quarter, ARN, overdue)
 *  • Liability computed from your entries (net GST payable, TDS payable)
 *  • Challan WORKSHEET (PDF) with amounts + deep links to the govt portals to pay/file
 *  • Auto-fetch GST filing status wired to a secure Edge Function (pending a provider)
 *
 * Note: paying & filing happen on gst.gov.in / income-tax portal (law needs OTP/DSC).
 */
(function (global) {
  "use strict";
  var U = global.UI;
  function cid() { return Store.getContext().companyId; }
  function co() { return Store.currentCompany(); }
  function byCo(entity) { return (Store.raw().records[entity] || []).filter(function (r) { return r.companyId === cid(); }); }

  var PORTAL = {
    gstLogin: "https://services.gst.gov.in/services/login",
    gstPay: "https://payment.gst.gov.in/",
    gstReturns: "https://return.gst.gov.in/",
    itPay: "https://eportal.incometax.gov.in/iec/foservices/#/e-pay-tax-prelogin/user-details",
    traces: "https://www.tdscpc.gov.in/"
  };
  function money(n) { return Number(n) || 0; }
  function statusBadge(s) { var m = { Filed: "good", "Not Filed": "warn", Overdue: "bad", "N/A": "muted" }; return '<span class="badge ' + (m[s] || "muted") + '">' + U.esc(s || "Not Filed") + "</span>"; }
  function extLink(label, href, cls) { var a = U.el('<a class="btn ' + (cls || "sm") + '" target="_blank" rel="noopener">' + label + "</a>"); a.href = href; return a; }

  /* ============================ GST ============================ */
  function gstReturnRec(period) {
    var r = byCo("gstreturns").find(function (x) { return x.period === period; });
    return r || { period: period, gstr1: "Not Filed", gstr3b: "Not Filed" };
  }
  function periodDue(period, day) {
    // period like "Jun-2026" -> due 'day' of next month (approx)
    var m = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
    var parts = String(period).split("-"); if (parts.length !== 2 || m[parts[0]] == null) return null;
    var d = new Date(Number(parts[1]), m[parts[0]] + 1, day); return d.toISOString().slice(0, 10);
  }

  function gstPeriods() {
    var map = {};
    byCo("gst").forEach(function (g) {
      var p = g.period || "(unspecified)";
      if (!map[p]) map[p] = { period: p, outCgst: 0, outSgst: 0, outIgst: 0, inCgst: 0, inSgst: 0, inIgst: 0, taxableOut: 0 };
      var t = map[p];
      if (g.type === "Input") { t.inCgst += money(g.cgst); t.inSgst += money(g.sgst); t.inIgst += money(g.igst); }
      else { t.outCgst += money(g.cgst); t.outSgst += money(g.sgst); t.outIgst += money(g.igst); t.taxableOut += money(g.taxable); }
    });
    return Object.keys(map).map(function (k) {
      var t = map[k];
      t.output = t.outCgst + t.outSgst + t.outIgst;
      t.itc = t.inCgst + t.inSgst + t.inIgst;
      t.netCgst = Math.max(0, t.outCgst - t.inCgst); t.netSgst = Math.max(0, t.outSgst - t.inSgst); t.netIgst = Math.max(0, t.outIgst - t.inIgst);
      t.netPayable = t.netCgst + t.netSgst + t.netIgst;
      return t;
    }).sort(function (a, b) { return a.period < b.period ? 1 : -1; });
  }

  function renderGst(mount) {
    mount.innerHTML = "";
    var c = co();
    var addBtn = U.el('<button class="btn primary">+ GST Entry</button>');
    addBtn.onclick = function () {
      var built = U.buildForm(Schema.ENTITIES.gst.fields, null, function (data) { Store.upsert("gst", data, "company"); U.Modal.close(); renderGst(mount); }, "Add");
      U.Modal.open("New GST Entry", built.form, built.foot);
    };
    var head = U.el('<div class="row-flex"></div>');
    head.appendChild(extLink("🏛️ GST Portal", PORTAL.gstLogin));
    head.appendChild(addBtn);
    mount.appendChild(U.pageHead("GST — Returns & Challans", "Filing status, liability & challan worksheets.  •  " + c.name + (c.gstin ? "  •  " + c.gstin : ""), head));

    mount.appendChild(U.el('<div class="notice"><span class="ni">ℹ️</span><div>This tracks status and prepares your figures + challan. <b>Payment & filing happen on the GST portal</b> (buttons open it). Auto-fetch of filing status turns on when a GST data provider is connected.</div></div>'));

    var periods = gstPeriods();
    var pendingG1 = 0, pendingG3 = 0, netDue = 0;
    periods.forEach(function (p) { var r = gstReturnRec(p.period); if (r.gstr1 !== "Filed") pendingG1++; if (r.gstr3b !== "Filed") { pendingG3++; netDue += p.netPayable; } });

    var kpis = U.el('<div class="cards grid-3"></div>');
    kpis.appendChild(U.kpiCard("Net GST Payable", U.inrShort(netDue), "on unfiled GSTR-3B", "💰"));
    kpis.appendChild(U.kpiCard("GSTR-1 Pending", pendingG1, "of " + periods.length + " periods", "📄"));
    kpis.appendChild(U.kpiCard("GSTR-3B Pending", pendingG3, "of " + periods.length + " periods", "🧾"));
    mount.appendChild(kpis);

    if (!periods.length) { mount.appendChild(U.el('<div class="empty-state"><div class="big">🧾</div><div>No GST entries yet. Click “+ GST Entry”.</div></div>')); return; }

    var wrap = U.el('<div class="table-wrap" style="margin-top:16px"></div>');
    var table = U.el('<table class="data"></table>');
    table.appendChild(U.el('<thead><tr><th>Period</th><th class="num">Output Tax</th><th class="num">ITC</th><th class="num">Net Payable</th><th>GSTR-1</th><th>GSTR-3B</th><th class="num">Manage</th></tr></thead>'));
    var tb = U.el("<tbody></tbody>");
    periods.forEach(function (p) {
      var r = gstReturnRec(p.period);
      var g1 = r.gstr1, g3 = r.gstr3b;
      if (g1 !== "Filed" && periodDue(p.period, 11) && U.daysFromNow(periodDue(p.period, 11)) < 0) g1 = "Overdue";
      if (g3 !== "Filed" && periodDue(p.period, 20) && U.daysFromNow(periodDue(p.period, 20)) < 0) g3 = "Overdue";
      var tr = U.el("<tr></tr>");
      tr.appendChild(U.el("<td><b>" + U.esc(p.period) + "</b></td>"));
      tr.appendChild(U.el('<td class="num">' + U.inr(p.output) + "</td>"));
      tr.appendChild(U.el('<td class="num">' + U.inr(p.itc) + "</td>"));
      tr.appendChild(U.el('<td class="num"><b>' + U.inr(p.netPayable) + "</b></td>"));
      tr.appendChild(U.el("<td>" + statusBadge(g1) + "</td>"));
      tr.appendChild(U.el("<td>" + statusBadge(g3) + "</td>"));
      var act = U.el('<td class="num"></td>');
      var mng = U.el('<button class="btn sm">Manage</button>'); mng.onclick = function () { manageGst(p, mount); };
      act.appendChild(mng); tr.appendChild(act); tb.appendChild(tr);
    });
    table.appendChild(tb); wrap.appendChild(table); mount.appendChild(wrap);
  }

  function manageGst(p, mount) {
    var r = gstReturnRec(p.period);
    var body = U.el("<div></div>");
    body.appendChild(U.el('<h3 style="margin-top:0">' + U.esc(p.period) + " — GST</h3>"));
    [["Output tax", U.inr(p.output)], ["Input credit (ITC)", U.inr(p.itc)], ["Net payable (cash)", U.inr(p.netPayable)],
     ["  · IGST", U.inr(p.netIgst)], ["  · CGST", U.inr(p.netCgst)], ["  · SGST", U.inr(p.netSgst)]]
      .forEach(function (x) { body.appendChild(U.el('<div class="stat-line"><span>' + x[0] + '</span><b>' + x[1] + "</b></div>")); });

    function statusRow(label, key, dueDay) {
      var row = U.el('<div class="spread" style="margin:10px 0"><div><b>' + label + "</b> " + statusBadge(r[key]) + '<div class="muted" style="font-size:11px">Due: ' + U.fmtDate(periodDue(p.period, dueDay)) + (r[key + "Arn"] ? " • ARN " + U.esc(r[key + "Arn"]) : "") + "</div></div></div>");
      var btn = U.el('<button class="btn sm ' + (r[key] === "Filed" ? "" : "primary") + '">' + (r[key] === "Filed" ? "Mark unfiled" : "Mark Filed") + "</button>");
      btn.onclick = function () {
        if (r[key] === "Filed") { r[key] = "Not Filed"; r[key + "Arn"] = ""; }
        else { var arn = prompt("Enter the ARN / acknowledgement no. (optional):", ""); r[key] = "Filed"; r[key + "Arn"] = arn || ""; r[key + "Date"] = Store.todayISO(); }
        r.period = p.period; Store.upsert("gstreturns", r, "company"); U.Modal.close(); renderGst(mount);
      };
      row.appendChild(btn); return row;
    }
    body.appendChild(statusRow("GSTR-1", "gstr1", 11));
    body.appendChild(statusRow("GSTR-3B", "gstr3b", 20));

    var foot = U.el('<div class="row-flex" style="flex-wrap:wrap"></div>');
    var challan = U.el('<button class="btn primary">⬇ Challan Worksheet (PMT-06)</button>');
    challan.onclick = function () {
      if (!window.Pdf) { U.Toast.show("PDF needs internet", "bad"); return; }
      var c = co();
      var text = "GST CHALLAN WORKSHEET (Form PMT-06)\n\nGSTIN: " + (c.gstin || "-") + "\nLegal name: " + c.name + "\nPeriod: " + p.period +
        "\n\nAmount payable in CASH:\n  IGST : Rs. " + p.netIgst.toFixed(2) + "\n  CGST : Rs. " + p.netCgst.toFixed(2) +
        "\n  SGST : Rs. " + p.netSgst.toFixed(2) + "\n  ----------------------------\n  TOTAL: Rs. " + p.netPayable.toFixed(2) +
        "\n\nUse these amounts to create the challan and pay at payment.gst.gov.in.\nThis worksheet is for your reference only.";
      Pdf.run(function () { return Pdf.letterPDF(c, "", "GST Challan Worksheet", text, "gst-challan-" + p.period + ".pdf"); });
    };
    foot.appendChild(challan);
    foot.appendChild(extLink("💳 Pay on GST Portal", PORTAL.gstPay, "sm"));
    foot.appendChild(extLink("📤 File Returns", PORTAL.gstReturns, "sm"));
    U.Modal.open("Manage GST Return", body, foot);
  }

  /* ============================ TDS ============================ */
  var QUARTERS = ["Q1 (Apr-Jun)", "Q2 (Jul-Sep)", "Q3 (Oct-Dec)", "Q4 (Jan-Mar)"];
  function tdsReturnRec(q) { var r = byCo("tdsreturns").find(function (x) { return x.quarter === q; }); return r || { quarter: q, status: "Not Filed" }; }

  function renderTds(mount) {
    mount.innerHTML = "";
    var c = co();
    var addBtn = U.el('<button class="btn primary">+ TDS Entry</button>');
    addBtn.onclick = function () { var built = U.buildForm(Schema.ENTITIES.tds.fields, null, function (data) { Store.upsert("tds", data, "company"); U.Modal.close(); renderTds(mount); }, "Add"); U.Modal.open("New TDS Entry", built.form, built.foot); };
    var head = U.el('<div class="row-flex"></div>'); head.appendChild(extLink("🏛️ Income-Tax e-Pay", PORTAL.itPay)); head.appendChild(addBtn);
    mount.appendChild(U.pageHead("TDS — Challans & Returns", "TDS deducted, deposited, challan (281) & quarterly returns.  •  " + c.name, head));
    mount.appendChild(U.el('<div class="notice"><span class="ni">ℹ️</span><div>Prepares your TDS figures + challan (ITNS-281). <b>Payment is on the income-tax portal</b> and <b>quarterly returns are filed via TRACES/RPU</b> (buttons open them).</div></div>'));

    var entries = byCo("tds");
    var deducted = entries.reduce(function (s, t) { return s + money(t.tdsAmount); }, 0);
    var deposited = entries.filter(function (t) { return t.challanStatus === "Deposited"; }).reduce(function (s, t) { return s + money(t.tdsAmount); }, 0);
    var pending = deducted - deposited;
    var kpis = U.el('<div class="cards grid-3"></div>');
    kpis.appendChild(U.kpiCard("TDS Deducted", U.inrShort(deducted), entries.length + " entries", "✂️"));
    kpis.appendChild(U.kpiCard("Deposited", U.inrShort(deposited), "challans paid", "✅"));
    kpis.appendChild(U.kpiCard("Pending Deposit", U.inrShort(pending), "to pay", "⏳"));
    mount.appendChild(kpis);

    // by section
    var bySec = {}; entries.forEach(function (t) { var s = t.section || "—"; bySec[s] = (bySec[s] || 0) + money(t.tdsAmount); });
    if (Object.keys(bySec).length) {
      var secCard = U.el('<div class="card" style="margin-top:16px"><h3>TDS by Section</h3></div>');
      Object.keys(bySec).forEach(function (s) { secCard.appendChild(U.el('<div class="stat-line"><span>Section ' + U.esc(s) + '</span><b>' + U.inr(bySec[s]) + "</b></div>")); });
      var pendGroup = entries.filter(function (t) { return t.challanStatus !== "Deposited"; });
      if (pendGroup.length) {
        var ch = U.el('<button class="btn primary" style="margin-top:10px">⬇ Challan Worksheet (ITNS-281)</button>');
        ch.onclick = function () {
          if (!window.Pdf) { U.Toast.show("PDF needs internet", "bad"); return; }
          var text = "TDS CHALLAN WORKSHEET (ITNS-281)\n\nDeductor: " + c.name + "\nTAN: " + (c.tan || "____________") +
            "\n\nTDS pending deposit by section:\n" + Object.keys(bySec).map(function (s) { return "  " + s + " : Rs. " + bySec[s].toFixed(2); }).join("\n") +
            "\n  ----------------------------\n  TOTAL: Rs. " + pending.toFixed(2) +
            "\n\nPay at eportal.incometax.gov.in (e-Pay Tax). This worksheet is for reference.";
          Pdf.run(function () { return Pdf.letterPDF(c, "", "TDS Challan Worksheet", text, "tds-challan.pdf"); });
        };
        secCard.appendChild(ch);
      }
      mount.appendChild(secCard);
    }

    // quarterly returns
    var qCard = U.el('<div class="card" style="margin-top:16px"><div class="card-section-head"><h3>Quarterly Return Status (26Q / 24Q)</h3></div></div>');
    QUARTERS.forEach(function (q) {
      var r = tdsReturnRec(q);
      var row = U.el('<div class="spread" style="margin:8px 0"><div><b>' + q + "</b> " + statusBadge(r.status) + (r.arn ? ' <span class="muted" style="font-size:11px">RRR/Token ' + U.esc(r.arn) + "</span>" : "") + "</div></div>");
      var btn = U.el('<button class="btn sm ' + (r.status === "Filed" ? "" : "primary") + '">' + (r.status === "Filed" ? "Mark unfiled" : "Mark Filed") + "</button>");
      btn.onclick = function () {
        if (r.status === "Filed") { r.status = "Not Filed"; r.arn = ""; } else { r.arn = prompt("Provisional receipt / token no. (optional):", "") || ""; r.status = "Filed"; r.date = Store.todayISO(); }
        r.quarter = q; Store.upsert("tdsreturns", r, "company"); renderTds(mount);
      };
      row.appendChild(btn); qCard.appendChild(row);
    });
    var links = U.el('<div class="row-flex" style="margin-top:10px;flex-wrap:wrap"></div>');
    links.appendChild(extLink("📤 TRACES (file returns)", PORTAL.traces, "sm"));
    links.appendChild(extLink("💳 e-Pay TDS", PORTAL.itPay, "sm"));
    qCard.appendChild(links);
    mount.appendChild(qCard);
  }

  global.GstTds = { renderGst: renderGst, renderTds: renderTds };
})(window);
