/* AtriaERP — CSV/Excel import & export (works for any module)
 * Download a template, fill it in Excel, upload it back, auto-map columns, bulk-create.
 */
(function (global) {
  "use strict";
  var U = global.UI;

  function csvCell(v) { v = v == null ? "" : String(v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function toCSV(rows, fields) {
    var lines = [fields.map(function (f) { return csvCell(f.label); }).join(",")];
    rows.forEach(function (r) { lines.push(fields.map(function (f) { return csvCell(r[f.f]); }).join(",")); });
    return lines.join("\r\n");
  }
  function parseCSV(text) {
    var rows = [], row = [], cur = "", inQ = false;
    text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (inQ) {
        if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
        else cur += c;
      } else {
        if (c === '"') inQ = true;
        else if (c === ",") { row.push(cur); cur = ""; }
        else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
        else cur += c;
      }
    }
    if (cur !== "" || row.length) { row.push(cur); rows.push(row); }
    // drop fully-empty trailing rows
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ""; }); });
  }

  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime || "text/csv;charset=utf-8" });
    var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  }

  function exportEntity(entityKey) {
    var def = Schema.ENTITIES[entityKey];
    var rows = Store.list(entityKey, { scope: def.scope });
    download(entityKey + "-export-" + Store.todayISO() + ".csv", toCSV(rows, def.fields), "text/csv");
    U.Toast.show("Exported " + rows.length + " " + def.title.toLowerCase(), "good");
  }

  function downloadTemplate(entityKey) {
    var def = Schema.ENTITIES[entityKey];
    // include one example row of hints
    var hint = {}; def.fields.forEach(function (f) {
      hint[f.f] = f.type === "select" ? (f.options || []).slice(0, 1)[0] || "" : f.type === "date" ? "2026-06-30" : f.type === "money" || f.type === "number" ? "0" : "";
    });
    download(entityKey + "-template.csv", toCSV([hint], def.fields), "text/csv");
    U.Toast.show("Template downloaded — fill it in Excel, then Import", "good");
  }

  function norm(s) { return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

  function openImport(entityKey, onDone) {
    var def = Schema.ENTITIES[entityKey];
    var body = U.el("<div></div>");
    body.appendChild(U.el('<div class="notice"><span class="ni">📄</span><div>1) <b>Download the template</b>, fill your rows in Excel, and <b>Save As CSV</b>. 2) <b>Upload</b> it below. Columns are matched by their heading.</div></div>'));
    var dl = U.el('<button class="btn" style="margin-bottom:12px">⬇ Download template CSV</button>');
    dl.onclick = function () { downloadTemplate(entityKey); };
    body.appendChild(dl);
    var file = U.el('<input type="file" accept=".csv,text/csv" style="display:block;margin-bottom:10px">');
    body.appendChild(file);
    var out = U.el("<div></div>"); body.appendChild(out);
    var parsed = null;

    file.onchange = function (e) {
      var f = e.target.files[0]; if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        out.innerHTML = "";
        try {
          var grid = parseCSV(reader.result);
          if (grid.length < 2) { out.appendChild(U.el('<div class="notice warn"><span class="ni">⚠️</span><div>No data rows found.</div></div>')); return; }
          var headers = grid[0];
          // map each CSV header to a field by label or key
          var map = headers.map(function (h) {
            var hit = def.fields.find(function (fl) { return norm(fl.label) === norm(h) || norm(fl.f) === norm(h); });
            return hit ? hit.f : null;
          });
          var mappedCount = map.filter(Boolean).length;
          var dataRows = grid.slice(1);
          parsed = { headers: headers, map: map, rows: dataRows };
          out.appendChild(U.el('<div class="stat-line"><span>Rows found</span><b>' + dataRows.length + "</b></div>"));
          out.appendChild(U.el('<div class="stat-line"><span>Columns matched</span><b>' + mappedCount + " / " + headers.length + "</b></div>"));
          var unmapped = headers.filter(function (h, i) { return !map[i]; });
          if (unmapped.length) out.appendChild(U.el('<div class="muted" style="font-size:12px;margin-top:6px">Ignored columns: ' + U.esc(unmapped.join(", ")) + "</div>"));
          if (!mappedCount) out.appendChild(U.el('<div class="notice warn" style="margin-top:8px"><span class="ni">⚠️</span><div>No columns matched — use the template headings.</div></div>'));
        } catch (err) { out.appendChild(U.el('<div class="notice warn"><span class="ni">⚠️</span><div>Could not read file: ' + U.esc(err.message) + "</div></div>")); }
      };
      reader.readAsText(f);
    };

    var foot = U.el('<div class="row-flex"></div>');
    var cancel = U.el('<button class="btn">Cancel</button>'); cancel.onclick = U.Modal.close;
    var imp = U.el('<button class="btn primary">Import</button>');
    imp.onclick = function () {
      if (!parsed) { U.Toast.show("Choose a CSV file first", "bad"); return; }
      var n = 0;
      parsed.rows.forEach(function (cells) {
        var data = {}, has = false;
        parsed.map.forEach(function (fkey, i) {
          if (!fkey) return;
          var fld = def.fields.find(function (x) { return x.f === fkey; });
          var v = cells[i]; if (v == null) v = "";
          v = String(v).trim();
          if (v === "") return;
          if (fld && (fld.type === "money" || fld.type === "number" || fld.type === "percent")) { var num = Number(v.replace(/[, ]/g, "")); v = isNaN(num) ? v : num; }
          data[fkey] = v; has = true;
        });
        if (has) { Store.upsert(entityKey, data, def.scope); n++; }
      });
      U.Modal.close();
      U.Toast.show("Imported " + n + " " + def.title.toLowerCase(), "good");
      if (onDone) onDone();
    };
    foot.appendChild(cancel); foot.appendChild(imp);
    U.Modal.open("Import " + def.title, body, foot);
  }

  global.DataIO = { exportEntity: exportEntity, downloadTemplate: downloadTemplate, openImport: openImport, toCSV: toCSV, parseCSV: parseCSV };
})(window);
