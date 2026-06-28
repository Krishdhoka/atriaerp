/* AtriaERP — Collections & Reminders
 * Inspired by Khatabook + Biz Analyst: party-wise outstanding ("you'll get / you'll pay")
 * with REAL one-tap WhatsApp / SMS / Email reminders via deep links (wa.me, sms:, mailto:).
 */
(function (global) {
  "use strict";
  var U = global.UI;

  function sanitizePhone(p) {
    var d = String(p || "").replace(/\D/g, "");
    if (d.length === 10) d = "91" + d;          // assume India if 10 digits
    if (d.length === 11 && d[0] === "0") d = "91" + d.slice(1);
    return d;
  }
  function waLink(phone, msg) { return "https://wa.me/" + sanitizePhone(phone) + "?text=" + encodeURIComponent(msg); }
  function smsLink(phone, msg) { return "sms:" + sanitizePhone(phone) + "?&body=" + encodeURIComponent(msg); }
  function mailLink(email, subject, body) { return "mailto:" + (email || "") + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body); }

  function phoneForCustomer(name) {
    var lead = Store.list("leads", { scope: "company" }).find(function (l) { return l.name && name && l.name.toLowerCase() === String(name).toLowerCase(); });
    return lead ? { phone: lead.phone, email: lead.email } : { phone: "", email: "" };
  }

  // Aggregate receivables from unpaid payment demands, grouped by customer
  function receivables() {
    var map = {};
    Store.list("payments", { scope: "project" }).forEach(function (p) {
      if (p.status === "Paid") return;
      var amt = Number(p.amount) || 0; if (amt <= 0) return;
      var k = p.customer || "(unknown)";
      if (!map[k]) { var c = phoneForCustomer(k); map[k] = { name: k, phone: c.phone, email: c.email, total: 0, count: 0, oldest: p.dueDate, overdue: false, units: {} }; }
      map[k].total += amt; map[k].count++;
      if (p.unit) map[k].units[p.unit] = 1;
      if (p.dueDate && (!map[k].oldest || p.dueDate < map[k].oldest)) map[k].oldest = p.dueDate;
      if (p.status === "Overdue" || (U.daysFromNow(p.dueDate) != null && U.daysFromNow(p.dueDate) < 0)) map[k].overdue = true;
    });
    return Object.keys(map).map(function (k) { var r = map[k]; r.unitList = Object.keys(r.units).join(", "); return r; })
      .sort(function (a, b) { return b.total - a.total; });
  }

  // Payables from vendors with outstanding balances
  function payables() {
    return Store.list("vendors", { scope: "company" }).filter(function (v) { return (Number(v.outstanding) || 0) > 0; })
      .map(function (v) { return { name: v.name, phone: v.phone, email: v.email, total: Number(v.outstanding) || 0, ref: v.id, category: v.category }; })
      .sort(function (a, b) { return b.total - a.total; });
  }

  function reminderMsgReceivable(party) {
    var co = Store.currentCompany();
    var unit = party.unitList ? " against " + party.unitList : "";
    return "Dear " + party.name + ",\n\nGentle reminder from " + co.name + ": an amount of " + U.inr(party.total) +
      " is currently outstanding" + unit + (party.oldest ? " (due since " + U.fmtDate(party.oldest) + ")" : "") +
      ". Kindly arrange the payment at your earliest convenience.\n\nThank you,\n" + co.name;
  }
  function reminderMsgPayable(party) {
    var co = Store.currentCompany();
    return "Dear " + party.name + ",\n\nThis is " + co.name + ". Kindly share the pending invoice / account statement for the outstanding balance of " +
      U.inr(party.total) + " so we can process your payment.\n\nRegards,\n" + co.name;
  }

  function upiCfg() { return (Store.raw().meta.integrations || {}).upi || {}; }
  function upiLink(amount, note) {
    var u = upiCfg();
    return "upi://pay?pa=" + encodeURIComponent(u.vpa) + "&pn=" + encodeURIComponent(u.payeeName || Store.currentCompany().name) +
      "&am=" + (Number(amount) || 0).toFixed(2) + "&cu=INR&tn=" + encodeURIComponent(note || "");
  }
  function showUpi(party) {
    var cfg = upiCfg();
    if (!cfg.vpa) {
      U.confirmDialog("No UPI ID set yet. Open Settings to add your business UPI ID?", function () { App.route("settings"); }, "Open Settings");
      return;
    }
    var note = "Payment to " + (cfg.payeeName || Store.currentCompany().name) + (party.unitList ? " - " + party.unitList : "");
    var link = upiLink(party.total, note);
    var body = U.el("<div></div>");
    body.appendChild(U.el('<div class="spread" style="margin-bottom:12px"><div><div class="muted" style="font-size:12px">Amount</div><div style="font-size:24px;font-weight:800">' + U.inr(party.total) + '</div></div><div style="text-align:right"><div class="muted" style="font-size:12px">Pay to</div><b>' + U.esc(cfg.vpa) + "</b></div></div>"));
    var qrWrap = U.el('<div style="text-align:center;margin:10px 0"></div>');
    var qr = U.el('<img alt="UPI QR" width="220" height="220" style="border:1px solid var(--line);border-radius:10px;padding:6px;background:#fff">');
    qr.src = "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=" + encodeURIComponent(link);
    qr.onerror = function () { qrWrap.innerHTML = '<div class="muted" style="font-size:12px">QR needs internet. Use the buttons below instead.</div>'; };
    qrWrap.appendChild(qr);
    qrWrap.appendChild(U.el('<div class="muted" style="font-size:12px;margin-top:6px">Customer scans with any UPI app (GPay / PhonePe / Paytm)</div>'));
    body.appendChild(qrWrap);

    var foot = U.el('<div class="row-flex" style="flex-wrap:wrap"></div>');
    var open = U.el('<a class="btn primary">📱 Open UPI app</a>'); open.href = link;
    var wa = U.el('<a class="btn" style="background:#25D366;border-color:#25D366;color:#fff" target="_blank">💬 Send link on WhatsApp</a>');
    var waMsg = "Dear " + party.name + ", please pay " + U.inr(party.total) + " to " + (cfg.payeeName || Store.currentCompany().name) +
      ".\nTap to pay via UPI: " + link + "\n(or pay to UPI ID: " + cfg.vpa + ")";
    wa.href = "https://wa.me/" + sanitizePhone(party.phone) + "?text=" + encodeURIComponent(waMsg);
    var copy = U.el('<button class="btn">📋 Copy link</button>');
    copy.onclick = function () { try { navigator.clipboard.writeText(link); U.Toast.show("UPI link copied", "good"); } catch (e) { U.Toast.show(link, ""); } };
    foot.appendChild(open); foot.appendChild(wa); foot.appendChild(copy);
    U.Modal.open("Collect via UPI — " + party.name, body, foot);
  }

  function actionButtons(party, kind) {
    var msg = kind === "receivable" ? reminderMsgReceivable(party) : reminderMsgPayable(party);
    var subject = kind === "receivable" ? "Payment Reminder — " + Store.currentCompany().name : "Invoice Request — " + Store.currentCompany().name;
    var box = U.el('<div class="row-flex" style="flex-wrap:wrap;gap:6px"></div>');
    var wa = U.el('<a class="btn sm" style="background:#25D366;border-color:#25D366;color:#fff" target="_blank">💬 WhatsApp</a>');
    wa.href = waLink(party.phone, msg);
    var sms = U.el('<a class="btn sm" target="_blank">✉️ SMS</a>'); sms.href = smsLink(party.phone, msg);
    var mail = U.el('<a class="btn sm" target="_blank">📧 Email</a>'); mail.href = mailLink(party.email, subject, msg);
    box.appendChild(wa); box.appendChild(sms); box.appendChild(mail);
    if (kind === "receivable") {
      var upi = U.el('<button class="btn sm" style="background:#5b21b6;border-color:#5b21b6;color:#fff">💳 UPI</button>');
      upi.onclick = function () { showUpi(party); };
      box.appendChild(upi);
      var rec = U.el('<button class="btn sm primary">✓ Receipt</button>');
      rec.onclick = function () { recordReceipt(party); };
      box.appendChild(rec);
    } else {
      var pay = U.el('<button class="btn sm primary">✓ Pay</button>');
      pay.onclick = function () { recordVendorPayment(party); };
      box.appendChild(pay);
    }
    return box;
  }

  function recordReceipt(party) {
    var built = U.buildForm([
      { f: "amount", label: "Amount received (₹)", type: "money", def: party.total, req: true },
      { f: "mode", label: "Mode", type: "select", options: ["NEFT", "RTGS", "UPI", "Cheque", "Cash", "Home Loan"], def: "UPI" },
      { f: "date", label: "Date", type: "date", def: Store.todayISO() }
    ], null, function (data) {
      var remaining = Number(data.amount) || 0;
      // settle this customer's due payments oldest-first
      Store.list("payments", { scope: "project" }).filter(function (p) { return p.customer === party.name && p.status !== "Paid"; })
        .sort(function (a, b) { return (a.dueDate || "") < (b.dueDate || "") ? -1 : 1; })
        .forEach(function (p) {
          if (remaining <= 0) return;
          var amt = Number(p.amount) || 0;
          if (remaining >= amt) { p.status = "Paid"; p.receivedDate = data.date; p.mode = data.mode; remaining -= amt; }
          else { p.amount = amt - remaining; p.status = "Partially Paid"; remaining = 0; }
        });
      Store.save();
      U.Modal.close(); U.Toast.show("Receipt of " + U.inr(data.amount) + " recorded for " + party.name, "good");
      App.route("collections");
    }, "Record Receipt");
    U.Modal.open("Record Receipt — " + party.name, built.form, built.foot);
  }

  function recordVendorPayment(party) {
    var built = U.buildForm([
      { f: "amount", label: "Amount paid (₹)", type: "money", def: party.total, req: true },
      { f: "mode", label: "Mode", type: "select", options: ["NEFT", "RTGS", "IMPS", "Cheque", "Cash"], def: "RTGS" },
      { f: "date", label: "Date", type: "date", def: Store.todayISO() }
    ], null, function (data) {
      var v = Store.get("vendors", party.ref);
      if (v) { v.outstanding = Math.max(0, (Number(v.outstanding) || 0) - (Number(data.amount) || 0)); Store.upsert("vendors", v, "company"); }
      U.Modal.close(); U.Toast.show("Payment of " + U.inr(data.amount) + " recorded to " + party.name, "good");
      App.route("collections");
    }, "Record Payment");
    U.Modal.open("Pay Vendor — " + party.name, built.form, built.foot);
  }

  function partyCard(party, kind) {
    var initials = (party.name || "?").split(" ").map(function (w) { return w[0]; }).slice(0, 2).join("").toUpperCase();
    var card = U.el('<div class="party-card"></div>');
    var top = U.el('<div class="party-top"></div>');
    top.appendChild(U.el('<div class="party-avatar">' + U.esc(initials) + "</div>"));
    var meta = U.el('<div class="party-meta"></div>');
    meta.appendChild(U.el('<div class="party-name">' + U.esc(party.name) + "</div>"));
    var subBits = [];
    if (party.phone) subBits.push("📱 " + U.esc(party.phone));
    if (kind === "receivable" && party.unitList) subBits.push(U.esc(party.unitList));
    if (kind === "payable" && party.category) subBits.push(U.esc(party.category));
    meta.appendChild(U.el('<div class="party-sub">' + (subBits.join(" • ") || "&nbsp;") + "</div>"));
    top.appendChild(meta);
    var amt = U.el('<div class="party-amt ' + (kind === "receivable" ? "get" : "give") + '"><div class="amt">' + U.inrShort(party.total) + '</div><div class="amt-lbl">' + (kind === "receivable" ? "to collect" : "to pay") + "</div></div>");
    top.appendChild(amt);
    card.appendChild(top);
    if (kind === "receivable" && party.oldest) {
      var dd = U.daysFromNow(party.oldest);
      card.appendChild(U.el('<div class="party-aging ' + (party.overdue ? "bad" : "") + '">' + (party.overdue ? "⚠ Overdue" : "Due") + " • oldest " + U.fmtDate(party.oldest) + (dd != null && dd < 0 ? " (" + Math.abs(dd) + " days late)" : "") + "</div>"));
    }
    card.appendChild(actionButtons(party, kind));
    return card;
  }

  function render(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Collections & Reminders", "Party-wise outstanding with one-tap WhatsApp / SMS / Email reminders.  •  " + Store.currentCompany().name));

    var rec = receivables(), pay = payables();
    var totalGet = rec.reduce(function (s, r) { return s + r.total; }, 0);
    var totalGive = pay.reduce(function (s, r) { return s + r.total; }, 0);
    var overdueCount = rec.filter(function (r) { return r.overdue; }).length;

    var kpis = U.el('<div class="cards grid-3"></div>');
    kpis.appendChild(U.el('<div class="card kpi"><div class="kpi-icon" style="background:#e7f6ec">📥</div><div class="kpi-label">You\'ll Get (Receivables)</div><div class="kpi-value" style="color:#16a34a">' + U.inrShort(totalGet) + '</div><div class="kpi-sub">' + rec.length + ' parties • ' + overdueCount + ' overdue</div></div>'));
    kpis.appendChild(U.el('<div class="card kpi"><div class="kpi-icon" style="background:#fbe9e9">📤</div><div class="kpi-label">You\'ll Pay (Payables)</div><div class="kpi-value" style="color:#dc2626">' + U.inrShort(totalGive) + '</div><div class="kpi-sub">' + pay.length + ' vendors</div></div>'));
    var net = totalGet - totalGive;
    kpis.appendChild(U.el('<div class="card kpi"><div class="kpi-icon" style="background:#e8f0fe">⚖️</div><div class="kpi-label">Net Position</div><div class="kpi-value" style="color:' + (net >= 0 ? "#16a34a" : "#dc2626") + '">' + U.inrShort(Math.abs(net)) + '</div><div class="kpi-sub">' + (net >= 0 ? "net inflow expected" : "net outflow expected") + '</div></div>'));
    mount.appendChild(kpis);

    mount.appendChild(U.el('<div class="notice"><span class="ni">💬</span><div>Tapping <b>WhatsApp</b> opens WhatsApp (Web or the phone app) with the reminder pre-filled — this works for real, no setup needed. SMS/Email open your phone\'s default apps.</div></div>'));

    // segmented control
    var seg = U.el('<div class="seg" style="margin:4px 0 14px"><button class="active" data-k="receivable">📥 To Collect (' + rec.length + ')</button><button data-k="payable">📤 To Pay (' + pay.length + ')</button></div>');
    mount.appendChild(seg);
    var listHost = U.el('<div class="party-grid"></div>');
    mount.appendChild(listHost);

    function drawList(kind) {
      listHost.innerHTML = "";
      var data = kind === "receivable" ? rec : pay;
      if (!data.length) { listHost.appendChild(U.el('<div class="empty-state"><div class="big">🎉</div><div>Nothing ' + (kind === "receivable" ? "to collect" : "to pay") + " right now.</div></div>")); return; }
      data.forEach(function (p) { listHost.appendChild(partyCard(p, kind)); });
    }
    drawList("receivable");
    seg.querySelectorAll("button").forEach(function (b) {
      b.onclick = function () { seg.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active"); drawList(b.getAttribute("data-k")); };
    });
  }

  global.Collections = { render: render, waLink: waLink, showUpi: showUpi };
})(window);
