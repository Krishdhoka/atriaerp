/* AtriaERP — Workflows:
 *  • New Booking wizard (lead → unit → pricing → payment plan → agreement)
 *  • Follow-up Calendar (all reminders across modules, grouped by urgency)
 *  • Rent Roll (escalation, renewals, rent collection)
 */
(function (global) {
  "use strict";
  var U = global.UI;

  function addDays(n) { var d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

  /* ============================ Booking Wizard ============================ */
  var PLANS = {
    "Construction Linked": [
      { label: "On Booking", pct: 10, off: 0 }, { label: "On Agreement", pct: 20, off: 30 },
      { label: "On Plinth", pct: 15, off: 90 }, { label: "On Slabs", pct: 25, off: 180 },
      { label: "On Brickwork", pct: 10, off: 270 }, { label: "On Finishing", pct: 10, off: 330 },
      { label: "On Possession", pct: 10, off: 365 }
    ],
    "Down Payment": [
      { label: "On Booking", pct: 10, off: 0 }, { label: "Within 30 days", pct: 80, off: 30 }, { label: "On Possession", pct: 10, off: 365 }
    ],
    "Simple (20:80)": [
      { label: "On Booking", pct: 20, off: 0 }, { label: "Balance on Agreement", pct: 80, off: 30 }
    ]
  };

  function renderBooking(mount) {
    var pr = Store.currentProject();
    var st = { step: 1, leadId: "", customer: "", phone: "", email: "", unitId: "", discount: 0, otherCharges: 0, plan: "Construction Linked" };
    if (!pr) { mount.innerHTML = ""; mount.appendChild(U.pageHead("New Booking", "")); mount.appendChild(U.el('<div class="notice warn"><span class="ni">⚠️</span><div>Select a project first.</div></div>')); return; }

    function unit() { return Store.get("units", st.unitId); }
    function basePrice() { var u = unit(); return u ? Number(u.price) || 0 : 0; }
    function finalValue() { return Math.max(0, Math.round(basePrice() * (1 - (Number(st.discount) || 0) / 100) + (Number(st.otherCharges) || 0))); }

    function draw() {
      mount.innerHTML = "";
      mount.appendChild(U.pageHead("New Booking", "Book a unit end-to-end — customer, unit, price, payment plan & agreement."));
      var steps = ["Customer", "Unit", "Pricing", "Payment Plan", "Confirm"];
      var ind = U.el('<div class="seg" style="margin-bottom:16px"></div>');
      steps.forEach(function (s, i) { ind.appendChild(U.el('<button class="' + (i + 1 === st.step ? "active" : "") + '">' + (i + 1) + ". " + s + "</button>")); });
      mount.appendChild(ind);
      var card = U.el('<div class="card"></div>');
      mount.appendChild(card);
      [step1, step2, step3, step4, step5][st.step - 1](card);
      mount.appendChild(navButtons());
    }

    function navButtons() {
      var box = U.el('<div class="row-flex" style="margin-top:16px;justify-content:space-between"></div>');
      var back = U.el('<button class="btn">‹ Back</button>'); back.disabled = st.step === 1; back.onclick = function () { st.step--; draw(); };
      var next = U.el('<button class="btn primary">' + (st.step === 5 ? "✓ Confirm Booking" : "Next ›") + "</button>");
      next.onclick = function () {
        if (st.step === 1 && !st.customer) { U.Toast.show("Choose or enter a customer", "bad"); return; }
        if (st.step === 2 && !st.unitId) { U.Toast.show("Select a unit", "bad"); return; }
        if (st.step === 5) { confirmBooking(); return; }
        st.step++; draw();
      };
      box.appendChild(back); box.appendChild(next); return box;
    }

    function step1(card) {
      card.appendChild(U.el("<h3>Who is booking?</h3>"));
      var leads = Store.list("leads", { scope: "project" }).filter(function (l) { return ["Booked", "Lost"].indexOf(l.stage) < 0; });
      var sel = U.el('<select style="margin-bottom:12px"><option value="">— New customer (type below) —</option></select>');
      leads.forEach(function (l) { var o = U.el('<option value="' + l.id + '">' + U.esc(l.name) + " (" + U.esc(l.phone || "") + ")</option>"); if (l.id === st.leadId) o.selected = true; sel.appendChild(o); });
      var f = U.el('<div class="form-grid"></div>');
      var fn = U.el('<div class="field req"><label>Customer name</label><input id="bk_name" value="' + U.esc(st.customer) + '"></div>');
      var fp = U.el('<div class="field"><label>Phone</label><input id="bk_phone" value="' + U.esc(st.phone) + '"></div>');
      var fe = U.el('<div class="field"><label>Email</label><input id="bk_email" value="' + U.esc(st.email) + '"></div>');
      f.appendChild(fn); f.appendChild(fp); f.appendChild(fe);
      sel.onchange = function () { st.leadId = sel.value; var l = Store.get("leads", sel.value); if (l) { st.customer = l.name; st.phone = l.phone || ""; st.email = l.email || ""; } draw(); };
      card.appendChild(sel); card.appendChild(f);
      fn.querySelector("input").oninput = function (e) { st.customer = e.target.value; };
      fp.querySelector("input").oninput = function (e) { st.phone = e.target.value; };
      fe.querySelector("input").oninput = function (e) { st.email = e.target.value; };
    }

    function step2(card) {
      card.appendChild(U.el("<h3>Select a unit <span class='muted' style='font-weight:400;font-size:12px'>(available in " + U.esc(pr.name) + ")</span></h3>"));
      var avail = Store.list("units", { scope: "project" }).filter(function (u) { return u.status === "Available"; });
      if (!avail.length) { card.appendChild(U.el('<div class="muted">No available units in this project.</div>')); return; }
      var grid = U.el('<div class="cards grid-3"></div>');
      avail.forEach(function (u) {
        var c = U.el('<div class="card" style="cursor:pointer;border:2px solid ' + (u.id === st.unitId ? "var(--brand)" : "var(--line)") + '"><div class="spread"><b>' + U.esc(u.unitNo) + '</b><span class="badge good">' + U.esc(u.type) + '</span></div><div class="muted" style="font-size:12px;margin:6px 0">' + U.esc(u.tower || "") + " • " + (u.carpetArea || "—") + ' sqft • ' + U.esc(u.facing || "") + '</div><div style="font-weight:800">' + U.inrShort(u.price) + "</div></div>");
        c.onclick = function () { st.unitId = u.id; draw(); };
        grid.appendChild(c);
      });
      card.appendChild(grid);
    }

    function step3(card) {
      card.appendChild(U.el("<h3>Pricing</h3>"));
      var u = unit();
      card.appendChild(U.el('<div class="stat-line"><span>Base price (' + U.esc(u.unitNo) + ')</span><b>' + U.inr(basePrice()) + "</b></div>"));
      var f = U.el('<div class="form-grid" style="margin-top:12px"></div>');
      var fd = U.el('<div class="field"><label>Discount %</label><input type="number" id="bk_disc" value="' + (st.discount || 0) + '"></div>');
      var fo = U.el('<div class="field"><label>Other charges (parking, floor-rise) ₹</label><input type="number" id="bk_oth" value="' + (st.otherCharges || 0) + '"></div>');
      f.appendChild(fd); f.appendChild(fo); card.appendChild(f);
      var tot = U.el('<div class="stat-line" style="margin-top:12px;font-size:16px"><span><b>Final agreement value</b></span><b style="color:var(--brand)">' + U.inr(finalValue()) + "</b></div>");
      card.appendChild(tot);
      fd.querySelector("input").oninput = function (e) { st.discount = Number(e.target.value) || 0; tot.querySelector("b:last-child").textContent = U.inr(finalValue()); };
      fo.querySelector("input").oninput = function (e) { st.otherCharges = Number(e.target.value) || 0; tot.querySelector("b:last-child").textContent = U.inr(finalValue()); };
    }

    function step4(card) {
      card.appendChild(U.el("<h3>Payment plan</h3>"));
      var sel = U.el('<select style="margin-bottom:12px"></select>');
      Object.keys(PLANS).forEach(function (k) { var o = U.el("<option>" + k + "</option>"); if (k === st.plan) o.selected = true; sel.appendChild(o); });
      card.appendChild(sel);
      var host = U.el("<div></div>"); card.appendChild(host);
      function drawPlan() {
        host.innerHTML = "";
        var val = finalValue();
        var t = U.el('<table class="data" style="border:1px solid var(--line);border-radius:8px;overflow:hidden"></table>');
        t.appendChild(U.el('<thead><tr><th>Milestone</th><th class="num">%</th><th class="num">Amount</th><th>Due</th></tr></thead>'));
        var tb = U.el("<tbody></tbody>");
        PLANS[st.plan].forEach(function (m) {
          tb.appendChild(U.el('<tr><td>' + U.esc(m.label) + '</td><td class="num">' + m.pct + '%</td><td class="num">' + U.inr(Math.round(val * m.pct / 100)) + '</td><td>' + U.fmtDate(addDays(m.off)) + "</td></tr>"));
        });
        t.appendChild(tb); host.appendChild(t);
      }
      sel.onchange = function () { st.plan = sel.value; drawPlan(); };
      drawPlan();
    }

    function step5(card) {
      var u = unit(), val = finalValue();
      card.appendChild(U.el("<h3>Confirm booking</h3>"));
      [["Customer", st.customer + (st.phone ? " (" + st.phone + ")" : "")], ["Unit", u.unitNo + " — " + u.type + ", " + (u.tower || "")], ["Final value", U.inr(val)], ["Payment plan", st.plan + " (" + PLANS[st.plan].length + " milestones)"]]
        .forEach(function (p) { card.appendChild(U.el('<div class="stat-line"><span>' + p[0] + '</span><b>' + U.esc(String(p[1])) + "</b></div>")); });
      card.appendChild(U.el('<div class="notice" style="margin-top:14px"><span class="ni">ℹ️</span><div>Confirming will: mark unit <b>' + U.esc(u.unitNo) + '</b> as Booked, create a draft agreement, generate ' + PLANS[st.plan].length + ' payment demands, and update the lead.</div></div>'));
    }

    function confirmBooking() {
      var u = unit(), val = finalValue();
      u.status = "Booked"; Store.upsert("units", u, "project");
      if (st.leadId) { var l = Store.get("leads", st.leadId); if (l) { l.stage = "Booked"; Store.upsert("leads", l, "project"); } }
      var agNo = "ATR/AGR/" + new Date().getFullYear() + "/" + Math.floor(100 + Math.random() * 900);
      Store.upsert("agreements", { agreementNo: agNo, customer: st.customer, unit: u.unitNo, value: val, agreementDate: Store.todayISO(), registrationStatus: "Not Started" }, "project");
      PLANS[st.plan].forEach(function (m) {
        Store.upsert("payments", { customer: st.customer, unit: u.unitNo, milestone: m.label, amount: Math.round(val * m.pct / 100), dueDate: addDays(m.off), status: m.off === 0 ? "Due" : "Due", mode: "" }, "project");
      });
      U.Toast.show("Booking confirmed for " + u.unitNo + " 🎉", "good");
      App.route("customer360");
    }

    draw();
  }

  /* ============================ Follow-up Calendar ============================ */
  function collectEvents() {
    var ev = [];
    Store.list("leads", { scope: "project" }).forEach(function (l) { if (l.nextFollowUp && l.stage !== "Booked" && l.stage !== "Lost") ev.push({ d: l.nextFollowUp, type: "Lead", color: "#1f6feb", label: l.name + " — " + l.stage, route: "leads" }); });
    Store.list("payments", { scope: "project" }).forEach(function (p) { if (p.dueDate && p.status !== "Paid") ev.push({ d: p.dueDate, type: "Payment", color: "#16a34a", label: p.customer + " — " + U.inrShort(p.amount) + " (" + (p.milestone || "") + ")", route: "collections" }); });
    Store.list("schedule", { scope: "project" }).forEach(function (s) { if (s.end && s.status !== "Done") ev.push({ d: s.end, type: "Site Task", color: "#d97706", label: s.task + " — " + (s.contractor || ""), route: "schedule" }); });
    Store.list("liaisoning", { scope: "project" }).forEach(function (a) { if (a.nextFollowUp && a.status !== "Approved") ev.push({ d: a.nextFollowUp, type: "Liaison", color: "#7c3aed", label: a.approval + " — " + a.authority, route: "liaisoning" }); });
    (Store.raw().records.land || []).filter(function (l) { return l.companyId === Store.getContext().companyId; }).forEach(function (l) { if (l.reminderDate) ev.push({ d: l.reminderDate, type: "Land", color: "#0891b2", label: l.parcel + " — " + l.stage, route: "landdesk" }); });
    (Store.raw().records.rentals || []).filter(function (r) { return r.companyId === Store.getContext().companyId; }).forEach(function (r) { if (r.leaseEnd && r.status !== "Vacated") ev.push({ d: r.leaseEnd, type: "Lease", color: "#db2777", label: r.tenant + " — lease ends", route: "rentdesk" }); });
    return ev;
  }

  function renderCalendar(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Follow-up Calendar", "Every upcoming reminder across CRM, payments, site, liaison, land & leases."));
    var ev = collectEvents();
    var groups = { Overdue: [], Today: [], "Next 7 days": [], Later: [] };
    ev.forEach(function (e) { var dd = U.daysFromNow(e.d); if (dd == null) return; if (dd < 0) groups.Overdue.push(e); else if (dd === 0) groups.Today.push(e); else if (dd <= 7) groups["Next 7 days"].push(e); else groups.Later.push(e); });
    Object.keys(groups).forEach(function (k) { groups[k].sort(function (a, b) { return a.d < b.d ? -1 : 1; }); });

    var kpis = U.el('<div class="cards grid-4"></div>');
    kpis.appendChild(U.kpiCard("Overdue", groups.Overdue.length, "need attention", "🔴"));
    kpis.appendChild(U.kpiCard("Today", groups.Today.length, "due today", "🟠"));
    kpis.appendChild(U.kpiCard("Next 7 days", groups["Next 7 days"].length, "this week", "🔵"));
    kpis.appendChild(U.kpiCard("Later", groups.Later.length, "upcoming", "⚪"));
    mount.appendChild(kpis);

    // type filter
    var types = {}; ev.forEach(function (e) { types[e.type] = 1; });
    var bar = U.el('<div class="toolbar" style="margin-top:16px"></div>');
    var sel = U.el('<select><option value="">All types</option></select>');
    Object.keys(types).forEach(function (t) { sel.appendChild(U.el("<option>" + t + "</option>")); });
    bar.appendChild(U.el('<div class="muted">Filter:</div>')); bar.appendChild(sel); mount.appendChild(bar);

    var host = U.el("<div></div>"); mount.appendChild(host);
    function drawGroups(filter) {
      host.innerHTML = "";
      var any = false;
      ["Overdue", "Today", "Next 7 days", "Later"].forEach(function (k) {
        var list = groups[k].filter(function (e) { return !filter || e.type === filter; });
        if (!list.length) return; any = true;
        var card = U.el('<div class="card" style="margin-top:14px"><div class="card-section-head"><h3>' + (k === "Overdue" ? "🔴 " : k === "Today" ? "🟠 " : "📅 ") + k + ' <span class="muted" style="font-weight:400;font-size:12px">(' + list.length + ')</span></h3></div></div>');
        var ul = U.el('<ul class="list-plain"></ul>');
        list.forEach(function (e) {
          var li = U.el('<li style="cursor:pointer"><span class="dotmark" style="background:' + e.color + '"></span><div style="flex:1"><div>' + U.esc(e.label) + ' <span class="badge muted">' + U.esc(e.type) + '</span></div><small class="muted">' + U.fmtDate(e.d) + "</small></div></li>");
          li.onclick = function () { App.route(e.route); };
          ul.appendChild(li);
        });
        card.appendChild(ul); host.appendChild(card);
      });
      if (!any) host.appendChild(U.el('<div class="empty-state"><div class="big">🗓️</div><div>No upcoming follow-ups.</div></div>'));
    }
    sel.onchange = function () { drawGroups(sel.value); };
    drawGroups("");
  }

  /* ============================ Rent Roll ============================ */
  function escalatedRent(r) {
    var base = Number(r.monthlyRent) || 0, esc = Number(r.escalation) || 0;
    if (!r.leaseStart || !esc) return base;
    var yrs = Math.floor((Date.now() - new Date(r.leaseStart).getTime()) / (365 * 86400000));
    return Math.round(base * Math.pow(1 + esc / 100, Math.max(0, yrs)));
  }

  function renderRentRoll(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Rent Roll", "Leases with escalated rent, renewals & collection.  •  " + Store.currentCompany().name));
    var leases = (Store.raw().records.rentals || []).filter(function (r) { return r.companyId === Store.getContext().companyId; });
    if (!leases.length) { mount.appendChild(U.el('<div class="empty-state"><div class="big">🔑</div><div>No leases. Add them under Inventory & Property → Rental Management.</div></div>')); return; }

    var monthlyTotal = leases.filter(function (r) { return r.status !== "Vacated"; }).reduce(function (s, r) { return s + escalatedRent(r); }, 0);
    var depTotal = leases.reduce(function (s, r) { return s + (Number(r.deposit) || 0); }, 0);
    var expiring = leases.filter(function (r) { var dd = U.daysFromNow(r.leaseEnd); return dd != null && dd <= 90 && r.status !== "Vacated"; });

    var kpis = U.el('<div class="cards grid-3"></div>');
    kpis.appendChild(U.kpiCard("Monthly Rent Roll", U.inrShort(monthlyTotal), leases.filter(function (r) { return r.status !== "Vacated"; }).length + " active leases", "🔑"));
    kpis.appendChild(U.kpiCard("Deposits Held", U.inrShort(depTotal), "refundable", "🏦"));
    kpis.appendChild(U.kpiCard("Expiring ≤90d", expiring.length, "need renewal", "⏰"));
    mount.appendChild(kpis);
    if (expiring.length) mount.appendChild(U.el('<div class="notice warn"><span class="ni">⏰</span><div><b>Renewals due:</b> ' + expiring.map(function (r) { return U.esc(r.tenant) + " (" + U.fmtDate(r.leaseEnd) + ")"; }).join(" • ") + "</div></div>"));

    var wrap = U.el('<div class="table-wrap" style="margin-top:16px"></div>');
    var table = U.el('<table class="data"></table>');
    table.appendChild(U.el('<thead><tr><th>Tenant</th><th>Unit</th><th class="num">Base Rent</th><th class="num">Current Rent</th><th class="num">Deposit</th><th>Lease End</th><th>Status</th><th class="num">Collect</th></tr></thead>'));
    var tb = U.el("<tbody></tbody>");
    leases.forEach(function (r) {
      var cur = escalatedRent(r); var dd = U.daysFromNow(r.leaseEnd);
      var stCls = { Active: "good", "Notice Period": "warn", Vacated: "muted", Overdue: "bad" }[r.status] || "muted";
      var collected = (r.rentLog || []).length;
      var tr = U.el("<tr></tr>");
      tr.appendChild(U.el("<td><b>" + U.esc(r.tenant) + "</b></td>"));
      tr.appendChild(U.el("<td>" + U.esc(r.unit || "—") + "</td>"));
      tr.appendChild(U.el('<td class="num">' + U.inr(r.monthlyRent) + "</td>"));
      tr.appendChild(U.el('<td class="num"><b>' + U.inr(cur) + "</b></td>"));
      tr.appendChild(U.el('<td class="num">' + U.inr(r.deposit) + "</td>"));
      tr.appendChild(U.el("<td>" + U.fmtDate(r.leaseEnd) + (dd != null && dd <= 90 && dd >= 0 ? ' <span class="badge warn">' + dd + "d</span>" : "") + "</td>"));
      tr.appendChild(U.el('<td><span class="badge ' + stCls + '">' + U.esc(r.status || "—") + "</span></td>"));
      var act = U.el('<td class="num"><div class="row-actions"></div></td>'); var box = act.querySelector(".row-actions");
      var edit = U.el('<button class="btn sm">✎ Edit</button>');
      edit.onclick = function () {
        var built = U.buildForm(Schema.ENTITIES.rentals.fields, r, function (data) {
          data.id = r.id; Store.upsert("rentals", data, "company"); U.Modal.close(); U.Toast.show("Lease updated", "good"); renderRentRoll(mount);
        }, "Update Lease");
        U.Modal.open("Edit Lease — " + r.tenant, built.form, built.foot);
      };
      var btn = U.el('<button class="btn sm primary" title="' + collected + ' months collected">+ Rent</button>');
      btn.onclick = function () {
        (r.rentLog = r.rentLog || []).push({ month: Store.todayISO().slice(0, 7), amount: cur, on: Store.todayISO() });
        Store.upsert("rentals", r, "company"); U.Toast.show("Rent " + U.inr(cur) + " recorded for " + r.tenant, "good"); renderRentRoll(mount);
      };
      box.appendChild(edit); box.appendChild(btn); tr.appendChild(act); tb.appendChild(tr);
    });
    table.appendChild(tb); wrap.appendChild(table); mount.appendChild(wrap);
  }

  global.Workflows = { renderBooking: renderBooking, renderCalendar: renderCalendar, renderRentRoll: renderRentRoll };
})(window);
