/* AtriaERP — Letters & Formats: template-driven letter / NOC generation
 *  • Templates with {{merge_fields}} (editable — paste your own drafts here)
 *  • Issue: pick template -> auto-fill from customer/company -> preview -> Print / Download / Issue
 *  • Issued letters are saved to records.letters (also shown in Customer 360)
 */
(function (global) {
  "use strict";
  var U = global.UI;
  function cid() { return Store.getContext().companyId; }
  function co() { return Store.currentCompany(); }
  function proj() { return Store.currentProject(); }

  /* ---------- default templates (replace with your real drafts) ---------- */
  function defaultTemplates() {
    return [
      { id: Store.uid("tpl"), companyId: cid(), name: "Bank NOC (Mortgage)", type: "Bank NOC",
        body:
"NO OBJECTION CERTIFICATE\n\n" +
"Ref: {{refNo}}                                              Date: {{date}}\n\n" +
"To,\nThe Branch Manager,\n{{bank}}\n\n" +
"Sub: No Objection for mortgage of Unit {{unit}}, {{project}}.\n\n" +
"Dear Sir/Madam,\n\n" +
"This is to certify that {{customer}} has booked Unit No. {{unit}} in our project “{{project}}” developed by {{company}}.\n\n" +
"We have NO OBJECTION to the said unit being mortgaged to {{bank}} as security for the housing loan sanctioned to the customer, subject to the terms of the registered agreement and clearance of all dues payable to us.\n\n" +
"This certificate is issued at the request of the customer for loan purposes.\n\n" +
"For {{company}}\n\n\nAuthorised Signatory" },

      { id: Store.uid("tpl"), companyId: cid(), name: "Demand Letter", type: "Demand Letter",
        body:
"DEMAND LETTER\n\n" +
"Ref: {{refNo}}                                              Date: {{date}}\n\n" +
"To,\n{{customer}}\nUnit {{unit}}, {{project}}\n\n" +
"Sub: Demand towards {{milestone}}.\n\n" +
"Dear {{customer}},\n\n" +
"With reference to your booking of Unit No. {{unit}} in {{project}}, we wish to inform you that the {{milestone}} stage has been reached. Accordingly, an amount of Rs. {{amount}}/- is now due and payable.\n\n" +
"You are requested to make the payment within 7 (seven) days of this letter, by NEFT/RTGS/cheque in favour of “{{company}}”.\n\n" +
"For {{company}}\n\n\nAuthorised Signatory" },

      { id: Store.uid("tpl"), companyId: cid(), name: "Fit-out Permission", type: "Fit-out Permission",
        body:
"FIT-OUT PERMISSION LETTER\n\n" +
"Ref: {{refNo}}                                              Date: {{date}}\n\n" +
"To,\n{{customer}}\nUnit {{unit}}, {{project}}\n\n" +
"Dear {{customer}},\n\n" +
"Permission is hereby granted to you to commence interior fit-out works in Unit No. {{unit}}, {{project}}, subject to the following:\n" +
"1. All works to be carried out within the unit only, without affecting the structure or common areas.\n" +
"2. Fit-out deposit of Rs. {{amount}}/- to be paid (refundable).\n" +
"3. Working hours and society rules to be strictly followed.\n\n" +
"For {{company}}\n\n\nAuthorised Signatory" },

      { id: Store.uid("tpl"), companyId: cid(), name: "Parking Allotment", type: "Parking Allotment",
        body:
"PARKING ALLOTMENT LETTER\n\n" +
"Ref: {{refNo}}                                              Date: {{date}}\n\n" +
"To,\n{{customer}}\nUnit {{unit}}, {{project}}\n\n" +
"Dear {{customer}},\n\n" +
"We are pleased to allot Parking Space No. {{parkingNo}} to you in respect of your Unit No. {{unit}} in {{project}}.\n\n" +
"This allotment is part of and subject to the terms of your agreement for sale.\n\n" +
"For {{company}}\n\n\nAuthorised Signatory" },

      { id: Store.uid("tpl"), companyId: cid(), name: "Offer of Possession", type: "Possession Letter",
        body:
"OFFER OF POSSESSION\n\n" +
"Ref: {{refNo}}                                              Date: {{date}}\n\n" +
"To,\n{{customer}}\nUnit {{unit}}, {{project}}\n\n" +
"Dear {{customer}},\n\n" +
"We are happy to inform you that Unit No. {{unit}} in {{project}} is ready, and the Occupation Certificate has been received. We hereby offer you possession of the said unit.\n\n" +
"You are requested to clear all outstanding dues and complete the formalities to take possession within 15 days of this letter.\n\n" +
"For {{company}}\n\n\nAuthorised Signatory" }
    ];
  }

  function templates() {
    var list = (Store.raw().records.lettertemplates || []).filter(function (t) { return t.companyId === cid(); });
    if (!list.length) { defaultTemplates().forEach(function (t) { Store.upsert("lettertemplates", t, "company"); }); list = (Store.raw().records.lettertemplates || []).filter(function (t) { return t.companyId === cid(); }); }
    return list;
  }

  /* ---------- merge logic ---------- */
  function fieldsIn(body) {
    var set = {}, m, re = /\{\{\s*(\w+)\s*\}\}/g;
    while ((m = re.exec(body))) set[m[1]] = 1;
    return Object.keys(set);
  }
  var AUTO = ["company", "companygstin", "project"];
  function autoValue(field) {
    var f = field.toLowerCase();
    if (f === "company") return co().name;
    if (f === "companygstin") return co().gstin || "";
    if (f === "project") return proj() ? proj().name : "";
    return null;
  }
  function label(field) { return field.replace(/([A-Z])/g, " $1").replace(/^./, function (c) { return c.toUpperCase(); }); }

  function renderBody(body, values) {
    return body.replace(/\{\{\s*(\w+)\s*\}\}/g, function (_, f) {
      var v = values[f]; if (v == null || v === "") v = autoValue(f); return v == null ? "______" : v;
    });
  }

  function letterCSS() {
    return "body{margin:0;background:#eef1f6;font-family:'Times New Roman',Georgia,serif;color:#111}" +
      ".sheet{background:#fff;max-width:780px;margin:24px auto;padding:54px 60px;box-shadow:0 2px 12px rgba(0,0,0,.15);min-height:1000px}" +
      ".lh{border-bottom:3px solid #1f6feb;padding-bottom:12px;margin-bottom:28px}" +
      ".lh h1{margin:0;font-size:26px;letter-spacing:.5px;color:#0f1729}" +
      ".lh .sub{font-size:12px;color:#555;margin-top:4px}" +
      ".content{white-space:pre-wrap;font-size:15px;line-height:1.7}" +
      "@media print{body{background:#fff}.sheet{box-shadow:none;margin:0;max-width:none}@page{margin:18mm}}";
  }
  function letterHTML(tpl, values) {
    var c = co();
    var head = '<div class="lh"><h1>' + U.esc(c.name) + '</h1><div class="sub">' +
      (c.gstin ? "GSTIN: " + U.esc(c.gstin) + "  |  " : "") + U.esc([c.city, c.state].filter(Boolean).join(", ")) +
      (proj() ? "  |  Project: " + U.esc(proj().name) : "") + "</div></div>";
    return '<div class="sheet">' + head + '<div class="content">' + U.esc(renderBody(tpl.body, values)) + "</div></div>";
  }

  function printLetter(tpl, values) {
    var w = window.open("", "_blank");
    if (!w) { U.Toast.show("Allow pop-ups to print, or use Download", "bad"); return; }
    w.document.write("<html><head><title>" + U.esc(tpl.name) + "</title><style>" + letterCSS() + "</style></head><body>" + letterHTML(tpl, values) + "</body></html>");
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 250);
  }
  function downloadLetter(tpl, values) {
    var html = "<html><head><meta charset='utf-8'><title>" + U.esc(tpl.name) + "</title><style>" + letterCSS() + "</style></head><body>" + letterHTML(tpl, values) + "</body></html>";
    var blob = new Blob([html], { type: "text/html" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = (tpl.type + "-" + (values.customer || values.bank || "letter")).replace(/[^a-z0-9]+/gi, "-") + ".html"; a.click();
    U.Toast.show("Letter downloaded (open & Print to PDF)", "good");
  }

  /* ---------- main view ---------- */
  function render(mount) {
    mount.innerHTML = "";
    mount.appendChild(U.pageHead("Letters & Formats", "Generate NOCs, demand & permission letters from your templates.  •  " + co().name));
    var tabs = U.el('<div class="seg" style="margin-bottom:16px"><button class="active" data-t="issue">✍️ Issue Letter</button><button data-t="issued">📜 Issued</button><button data-t="templates">🧩 Templates</button></div>');
    mount.appendChild(tabs);
    var host = U.el("<div></div>"); mount.appendChild(host);
    tabs.querySelectorAll("button").forEach(function (b) { b.onclick = function () { tabs.querySelectorAll("button").forEach(function (x) { x.classList.remove("active"); }); b.classList.add("active"); draw(b.getAttribute("data-t")); }; });
    function draw(t) { host.innerHTML = ""; (t === "issued" ? drawIssued : t === "templates" ? drawTemplates : drawIssue)(host); }
    draw("issue");
  }

  function customerList() {
    var s = {};
    (Store.raw().records.agreements || []).filter(function (r) { return r.companyId === cid(); }).forEach(function (r) { if (r.customer) s[r.customer] = r.unit; });
    (Store.raw().records.payments || []).filter(function (r) { return r.companyId === cid(); }).forEach(function (r) { if (r.customer && !s[r.customer]) s[r.customer] = r.unit; });
    (Store.raw().records.leads || []).filter(function (r) { return r.companyId === cid(); }).forEach(function (r) { if (r.name && !(r.name in s)) s[r.name] = ""; });
    return s;
  }

  function drawIssue(host) {
    var tpls = templates();
    var st = { tplId: tpls[0] && tpls[0].id, values: {} };
    var custMap = customerList();

    var grid = U.el('<div class="cards grid-2" style="align-items:start"></div>');
    var left = U.el('<div class="card"></div>');
    var right = U.el('<div class="card" style="background:#f1f4f9"></div>');
    grid.appendChild(left); grid.appendChild(right); host.appendChild(grid);

    function tpl() { return tpls.find(function (t) { return t.id === st.tplId; }); }

    function drawForm() {
      left.innerHTML = "";
      left.appendChild(U.el("<h3>Details</h3>"));
      var tSel = U.el('<div class="field"><label>Template</label><select></select></div>');
      tpls.forEach(function (t) { var o = U.el('<option value="' + t.id + '">' + U.esc(t.name) + "</option>"); if (t.id === st.tplId) o.selected = true; tSel.querySelector("select").appendChild(o); });
      tSel.querySelector("select").onchange = function (e) { st.tplId = e.target.value; drawForm(); drawPreview(); };
      left.appendChild(tSel);

      // recipient/customer with datalist autofill
      var fields = fieldsIn(tpl().body).filter(function (f) { return AUTO.indexOf(f.toLowerCase()) < 0; });
      // ensure refNo + date prefilled
      if (st.values.refNo == null) st.values.refNo = (co().name.split(" ")[0].toUpperCase()) + "/LT/" + new Date().getFullYear() + "/" + Math.floor(100 + Math.random() * 900);
      if (st.values.date == null) st.values.date = U.fmtDate(Store.todayISO());

      var dl = U.el('<datalist id="custDL"></datalist>');
      Object.keys(custMap).forEach(function (n) { dl.appendChild(U.el('<option value="' + U.esc(n) + '">')); });
      left.appendChild(dl);

      var fg = U.el('<div class="form-grid"></div>');
      fields.forEach(function (f) {
        var wrap = U.el('<div class="field' + (f === "milestone" || f === "bank" ? " full" : "") + '"><label>' + U.esc(label(f)) + "</label></div>");
        var input;
        if (f === "customer") { input = U.el('<input list="custDL" autocomplete="off">'); }
        else input = U.el("<input>");
        input.value = st.values[f] || "";
        input.oninput = function (e) {
          st.values[f] = e.target.value;
          if (f === "customer" && custMap[e.target.value] && !st.values.unit) { st.values.unit = custMap[e.target.value]; drawForm(); }
          drawPreview();
        };
        wrap.appendChild(input); fg.appendChild(wrap);
      });
      left.appendChild(fg);

      var btns = U.el('<div class="row-flex" style="margin-top:14px;flex-wrap:wrap"></div>');
      var printB = U.el('<button class="btn primary">🖨 Print</button>'); printB.onclick = function () { printLetter(tpl(), st.values); };
      var dlB = U.el('<button class="btn">⬇ Download</button>'); dlB.onclick = function () { downloadLetter(tpl(), st.values); };
      var issueB = U.el('<button class="btn">✓ Issue & Save</button>'); issueB.onclick = function () { issue(tpl(), st.values); };
      btns.appendChild(printB); btns.appendChild(dlB); btns.appendChild(issueB);
      left.appendChild(btns);
    }
    function drawPreview() {
      right.innerHTML = '<div class="muted" style="font-size:12px;margin-bottom:8px">PREVIEW</div>';
      var box = U.el('<div style="background:#fff;border:1px solid var(--line);border-radius:8px;padding:22px;white-space:pre-wrap;font-family:Georgia,serif;font-size:13.5px;line-height:1.7;max-height:560px;overflow:auto"></div>');
      var c = co();
      box.appendChild(U.el('<div style="border-bottom:2px solid var(--brand);padding-bottom:8px;margin-bottom:16px"><b style="font-size:16px">' + U.esc(c.name) + '</b><div style="font-size:11px;color:#666">' + (c.gstin ? "GSTIN: " + U.esc(c.gstin) : "") + "</div></div>"));
      box.appendChild(document.createTextNode(renderBody(tpl().body, st.values)));
      right.appendChild(box);
    }
    drawForm(); drawPreview();
  }

  function issue(tpl, values) {
    Store.upsert("letters", {
      type: tpl.type, recipient: values.customer || values.bank || "—", unit: values.unit || "",
      refNo: values.refNo || "", issueDate: Store.todayISO(), status: "Issued",
      body: renderBody(tpl.body, values)
    }, "project");
    U.Toast.show("Letter issued & saved", "good");
  }

  function drawIssued(host) {
    var rows = (Store.raw().records.letters || []).filter(function (r) { return r.companyId === cid(); });
    if (!rows.length) { host.appendChild(U.el('<div class="empty-state"><div class="big">📭</div><div>No letters issued yet.</div></div>')); return; }
    var wrap = U.el('<div class="table-wrap"></div>');
    var table = U.el('<table class="data"></table>');
    table.appendChild(U.el('<thead><tr><th>Type</th><th>Recipient</th><th>Unit</th><th>Ref #</th><th>Issued</th><th>Status</th><th class="num">Actions</th></tr></thead>'));
    var tb = U.el("<tbody></tbody>");
    rows.forEach(function (r) {
      var tr = U.el("<tr></tr>");
      tr.appendChild(U.el("<td>" + U.esc(r.type || "—") + "</td>"));
      tr.appendChild(U.el("<td>" + U.esc(r.recipient || "—") + "</td>"));
      tr.appendChild(U.el("<td>" + U.esc(r.unit || "—") + "</td>"));
      tr.appendChild(U.el("<td>" + U.esc(r.refNo || "—") + "</td>"));
      tr.appendChild(U.el("<td>" + U.fmtDate(r.issueDate) + "</td>"));
      tr.appendChild(U.el('<td><span class="badge ' + (r.status === "Issued" ? "good" : "muted") + '">' + U.esc(r.status || "—") + "</span></td>"));
      var act = U.el('<td class="num"><div class="row-actions"></div></td>'); var box = act.querySelector(".row-actions");
      var view = U.el('<button class="btn sm">View / Print</button>');
      view.onclick = function () { reprint(r); };
      var del = U.el('<button class="btn sm danger">×</button>'); del.onclick = function () { Store.remove("letters", r.id); drawIssued(host); };
      box.appendChild(view); box.appendChild(del); tr.appendChild(act); tb.appendChild(tr);
    });
    table.appendChild(tb); wrap.appendChild(table); host.appendChild(wrap);
  }
  function reprint(r) {
    var c = co();
    var head = '<div class="lh"><h1>' + U.esc(c.name) + '</h1><div class="sub">' + (c.gstin ? "GSTIN: " + U.esc(c.gstin) : "") + "</div></div>";
    var html = '<div class="sheet">' + head + '<div class="content">' + U.esc(r.body || "") + "</div></div>";
    var w = window.open("", "_blank"); if (!w) { U.Toast.show("Allow pop-ups to print", "bad"); return; }
    w.document.write("<html><head><title>" + U.esc(r.type) + "</title><style>" + letterCSS() + "</style></head><body>" + html + "</body></html>");
    w.document.close(); w.focus(); setTimeout(function () { w.print(); }, 250);
  }

  function drawTemplates(host) {
    host.appendChild(U.el('<div class="notice"><span class="ni">🧩</span><div>Edit a template body to match <b>your own draft</b>. Put merge fields in double braces, e.g. <code>{{customer}}</code>, <code>{{unit}}</code>, <code>{{amount}}</code>, <code>{{bank}}</code>. Auto-filled: <code>{{company}}</code>, <code>{{project}}</code>, <code>{{date}}</code>.</div></div>'));
    var addBtn = U.el('<button class="btn primary" style="margin-bottom:12px">+ New Template</button>');
    addBtn.onclick = function () { editTemplate(null, host); };
    host.appendChild(addBtn);
    var list = templates();
    var grid = U.el('<div class="cards grid-2"></div>');
    list.forEach(function (t) {
      var card = U.el('<div class="card"><div class="spread"><h3 style="margin:0">' + U.esc(t.name) + '</h3><span class="badge muted">' + U.esc(t.type || "") + "</span></div></div>");
      card.appendChild(U.el('<div class="muted" style="white-space:pre-wrap;font-size:12px;max-height:120px;overflow:hidden;margin:8px 0;border-left:3px solid var(--line);padding-left:10px">' + U.esc(t.body.slice(0, 240)) + "…</div>"));
      var b = U.el('<div class="row-flex"></div>');
      var ed = U.el('<button class="btn sm">Edit</button>'); ed.onclick = function () { editTemplate(t, host); };
      var del = U.el('<button class="btn sm danger">Delete</button>'); del.onclick = function () { U.confirmDialog("Delete template “" + t.name + "”?", function () { Store.remove("lettertemplates", t.id); drawTemplates(host); }, "Delete"); };
      b.appendChild(ed); b.appendChild(del); card.appendChild(b); grid.appendChild(card);
    });
    host.appendChild(grid);
  }
  function editTemplate(t, host) {
    var body = U.el("<div></div>");
    var f = U.el('<div class="form-grid"></div>');
    f.appendChild(U.el('<div class="field"><label>Template name</label><input id="t_name" value="' + U.esc(t ? t.name : "") + '"></div>'));
    f.appendChild(U.el('<div class="field"><label>Type</label><input id="t_type" value="' + U.esc(t ? t.type : "") + '" placeholder="e.g. Bank NOC"></div>'));
    body.appendChild(f);
    var ta = U.el('<div class="field full" style="margin-top:12px"><label>Letter body (use {{merge_fields}})</label><textarea id="t_body" style="min-height:300px;font-family:Georgia,serif">' + U.esc(t ? t.body : "Ref: {{refNo}}    Date: {{date}}\n\nTo,\n{{customer}}\n\n...") + "</textarea></div>");
    body.appendChild(ta);
    var foot = U.el('<div class="row-flex"></div>');
    var cancel = U.el('<button class="btn">Cancel</button>'); cancel.onclick = U.Modal.close;
    var save = U.el('<button class="btn primary">Save Template</button>');
    save.onclick = function () {
      var data = { name: body.querySelector("#t_name").value || "Untitled", type: body.querySelector("#t_type").value, body: body.querySelector("#t_body").value };
      if (t) data.id = t.id;
      Store.upsert("lettertemplates", data, "company"); U.Modal.close(); U.Toast.show("Template saved", "good"); drawTemplates(host);
    };
    foot.appendChild(cancel); foot.appendChild(save);
    U.Modal.open(t ? "Edit Template" : "New Template", body, foot);
  }

  global.Letters = { render: render };
})(window);
