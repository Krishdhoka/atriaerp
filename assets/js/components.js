/* AtriaERP — Reusable UI components & helpers */
(function (global) {
  "use strict";

  function el(html) { var t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]; }); }

  /* ---- formatting ---- */
  function inr(n) {
    if (n == null || n === "" || isNaN(n)) return "—";
    n = Number(n);
    return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }
  function inrShort(n) {
    if (n == null || isNaN(n)) return "—";
    n = Number(n);
    var sign = n < 0 ? "-" : ""; n = Math.abs(n);
    if (n >= 1e7) return sign + "₹" + (n / 1e7).toFixed(2).replace(/\.00$/, "") + " Cr";
    if (n >= 1e5) return sign + "₹" + (n / 1e5).toFixed(2).replace(/\.00$/, "") + " L";
    if (n >= 1e3) return sign + "₹" + (n / 1e3).toFixed(1).replace(/\.0$/, "") + "K";
    return sign + "₹" + n.toLocaleString("en-IN");
  }
  function fmtDate(s) {
    if (!s) return "—";
    var dt = new Date(s); if (isNaN(dt)) return esc(s);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  }
  function daysFromNow(s) {
    if (!s) return null;
    var dt = new Date(s); if (isNaN(dt)) return null;
    return Math.round((dt - new Date().setHours(0,0,0,0)) / 86400000);
  }

  function fmtCell(value, col) {
    if (col.type === "money") return inr(value);
    if (col.type === "number") return value == null || value === "" ? "—" : Number(value).toLocaleString("en-IN");
    if (col.type === "percent") return value == null || value === "" ? "—" : value + "%";
    if (col.type === "date") return fmtDate(value);
    if (col.type === "badge") {
      if (value == null || value === "") return "—";
      var cls = (col.map && col.map[value]) || "muted";
      return '<span class="badge ' + cls + '">' + esc(value) + "</span>";
    }
    return esc(value == null || value === "" ? "—" : value);
  }

  /* ---- toast ---- */
  var Toast = {
    show: function (msg, kind) {
      var host = document.getElementById("toastHost");
      var t = el('<div class="toast ' + (kind || "") + '">' + esc(msg) + "</div>");
      host.appendChild(t);
      setTimeout(function () { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(function () { t.remove(); }, 300); }, 2600);
    }
  };

  /* ---- modal ---- */
  var Modal = {
    open: function (title, bodyNode, footNode) {
      var backdrop = document.getElementById("modalBackdrop");
      var modal = document.getElementById("modal");
      modal.innerHTML = "";
      var head = el('<div class="modal-head"><h2>' + esc(title) + '</h2><button class="icon-btn" id="modalClose" style="color:#666">&times;</button></div>');
      var body = el('<div class="modal-body"></div>'); body.appendChild(bodyNode);
      modal.appendChild(head); modal.appendChild(body);
      if (footNode) { var foot = el('<div class="modal-foot"></div>'); foot.appendChild(footNode); modal.appendChild(foot); }
      backdrop.hidden = false;
      head.querySelector("#modalClose").onclick = Modal.close;
      backdrop.onclick = function (e) { if (e.target === backdrop) Modal.close(); };
    },
    close: function () { document.getElementById("modalBackdrop").hidden = true; }
  };

  function confirmDialog(message, onYes, yesLabel) {
    var body = el('<div><p style="margin:0 0 4px">' + esc(message) + "</p></div>");
    var foot = el('<div class="row-flex"></div>');
    var cancel = el('<button class="btn">Cancel</button>');
    var ok = el('<button class="btn danger">' + esc(yesLabel || "Delete") + "</button>");
    cancel.onclick = Modal.close;
    ok.onclick = function () { Modal.close(); onYes(); };
    foot.appendChild(cancel); foot.appendChild(ok);
    Modal.open("Please confirm", body, foot);
  }

  /* ---- form builder (from schema fields) ---- */
  function buildForm(fields, record, onSubmit, submitLabel) {
    record = record || {};
    var form = el('<form class="form-grid"></form>');
    fields.forEach(function (fld) {
      var wrap = el('<div class="field' + (fld.full ? " full" : "") + (fld.req ? " req" : "") + '"></div>');
      var lbl = el("<label>" + esc(fld.label) + "</label>");
      wrap.appendChild(lbl);
      var val = record[fld.f] != null ? record[fld.f] : (fld.def != null ? fld.def : "");
      var input;
      if (fld.type === "textarea") {
        input = el('<textarea name="' + fld.f + '"></textarea>'); input.value = val;
      } else if (fld.type === "select") {
        input = el('<select name="' + fld.f + '"></select>');
        if (!fld.req) input.appendChild(el('<option value="">— select —</option>'));
        (fld.options || []).forEach(function (o) {
          var opt = el('<option>' + esc(o) + "</option>"); if (o === val) opt.selected = true; input.appendChild(opt);
        });
      } else {
        var itype = fld.type === "money" || fld.type === "number" || fld.type === "percent" ? "number" : (fld.type === "date" ? "date" : (fld.type === "email" ? "email" : "text"));
        input = el('<input type="' + itype + '" name="' + fld.f + '" />');
        input.value = val;
        if (fld.type === "money" || fld.type === "percent") input.step = "any";
      }
      if (fld.req) input.required = true;
      wrap.appendChild(input);
      if (fld.hint) wrap.appendChild(el('<div class="hint">' + esc(fld.hint) + "</div>"));
      form.appendChild(wrap);
    });
    form.onsubmit = function (e) {
      e.preventDefault();
      var data = {};
      fields.forEach(function (fld) {
        var node = form.querySelector('[name="' + fld.f + '"]');
        var v = node.value;
        if ((fld.type === "money" || fld.type === "number" || fld.type === "percent") && v !== "") v = Number(v);
        data[fld.f] = v;
      });
      if (record.id) data.id = record.id;
      onSubmit(data);
    };
    var foot = el('<div class="row-flex"></div>');
    var cancel = el('<button type="button" class="btn">Cancel</button>'); cancel.onclick = Modal.close;
    var save = el('<button type="submit" class="btn primary">' + esc(submitLabel || "Save") + "</button>");
    save.onclick = function () { form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true })); };
    foot.appendChild(cancel); foot.appendChild(save);
    return { form: form, foot: foot };
  }

  /* ---- generic data table ---- */
  function dataTable(rows, columns, opts) {
    opts = opts || {};
    var wrap = el('<div class="table-wrap"></div>');
    if (!rows.length) {
      wrap.appendChild(el('<div class="empty-state"><div class="big">📭</div><div>' + esc(opts.emptyText || "No records yet.") + "</div></div>"));
      return wrap;
    }
    var table = el('<table class="data"></table>');
    var thead = el("<thead><tr></tr></thead>");
    var htr = thead.querySelector("tr");
    columns.forEach(function (c) {
      var numeric = c.type === "money" || c.type === "number" || c.type === "percent";
      htr.appendChild(el('<th class="' + (numeric ? "num" : "") + '" data-f="' + c.f + '">' + esc(c.label) + "</th>"));
    });
    if (opts.actions) htr.appendChild(el('<th class="num">Actions</th>'));
    table.appendChild(thead);
    var tbody = el("<tbody></tbody>");
    rows.forEach(function (r) {
      var tr = el("<tr></tr>");
      columns.forEach(function (c) {
        var numeric = c.type === "money" || c.type === "number" || c.type === "percent";
        tr.appendChild(el('<td class="' + (numeric ? "num" : "") + '">' + fmtCell(r[c.f], c) + "</td>"));
      });
      if (opts.actions) {
        var td = el('<td class="num"><div class="row-actions"></div></td>');
        var box = td.querySelector(".row-actions");
        var edit = el('<button class="btn sm">Edit</button>'); edit.onclick = function () { opts.onEdit(r); };
        var del = el('<button class="btn sm danger">Delete</button>'); del.onclick = function () { opts.onDelete(r); };
        box.appendChild(edit); box.appendChild(del);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    wrap.appendChild(table);
    return wrap;
  }

  function kpiCard(label, value, sub, icon) {
    return el('<div class="card kpi"><div class="kpi-icon">' + (icon || "📌") + '</div>' +
      '<div class="kpi-label">' + esc(label) + '</div>' +
      '<div class="kpi-value">' + value + '</div>' +
      '<div class="kpi-sub">' + (sub || "") + "</div></div>");
  }

  function pageHead(title, sub, actionsNode) {
    var head = el('<div class="page-head"><div><h1>' + esc(title) + '</h1><div class="sub">' + esc(sub || "") + "</div></div></div>");
    if (actionsNode) { var box = el('<div class="row-flex"></div>'); box.appendChild(actionsNode); head.appendChild(box); }
    return head;
  }

  global.UI = {
    el: el, esc: esc, inr: inr, inrShort: inrShort, fmtDate: fmtDate, fmtCell: fmtCell, daysFromNow: daysFromNow,
    Toast: Toast, Modal: Modal, confirmDialog: confirmDialog, buildForm: buildForm, dataTable: dataTable,
    kpiCard: kpiCard, pageHead: pageHead
  };
  global.Toast = Toast;
})(window);
