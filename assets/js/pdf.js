/* AtriaERP — PDF generation (real downloadable .pdf files for letters & reports)
 * Loads jsPDF (+autotable) on demand from CDN. Needs internet at the moment of
 * download (the hosted app has it). Falls back to print if the library can't load.
 */
(function (global) {
  "use strict";
  var U = global.UI;
  var loading = null;

  function loadLibs() {
    if (global.jspdf && global.jspdf.jsPDF && loadLibs._auto) return Promise.resolve();
    if (loading) return loading;
    loading = loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js")
      .then(function () { return loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"); })
      .then(function () { loadLibs._auto = true; });
    return loading;
  }
  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src;
      s.onload = res; s.onerror = function () { rej(new Error("Could not load the PDF engine — check your internet connection.")); };
      document.head.appendChild(s);
    });
  }

  function header(doc, company, project) {
    var W = doc.internal.pageSize.getWidth(), M = 54, y = 56;
    doc.setFont("times", "bold"); doc.setFontSize(18); doc.setTextColor(15, 23, 41);
    doc.text(company.name || "Company", M, y);
    y += 8; doc.setDrawColor(31, 111, 235); doc.setLineWidth(2); doc.line(M, y, W - M, y);
    y += 16; doc.setFont("times", "normal"); doc.setFontSize(9); doc.setTextColor(90);
    var bits = [company.gstin ? "GSTIN: " + company.gstin : "", [company.city, company.state].filter(Boolean).join(", "), project ? "Project: " + project : ""].filter(Boolean);
    if (bits.length) { doc.text(bits.join("   |   "), M, y); y += 6; }
    return y;
  }

  function letterPDF(company, project, title, bodyText, filename) {
    return loadLibs().then(function () {
      var jsPDF = global.jspdf.jsPDF;
      var doc = new jsPDF({ unit: "pt", format: "a4" });
      var W = doc.internal.pageSize.getWidth(), M = 54;
      var y = header(doc, company, project) + 22;
      doc.setFont("times", "normal"); doc.setFontSize(11.5); doc.setTextColor(20);
      var lines = doc.splitTextToSize(bodyText || "", W - 2 * M);
      doc.text(lines, M, y);
      doc.save(filename || "letter.pdf");
    });
  }

  function tablePDF(company, title, headers, rows, filename) {
    return loadLibs().then(function () {
      var jsPDF = global.jspdf.jsPDF;
      var doc = new jsPDF({ unit: "pt", format: "a4", orientation: headers.length > 5 ? "landscape" : "portrait" });
      var M = 54, y = header(doc, company) + 18;
      doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(15, 23, 41);
      doc.text(title || "Report", M, y); y += 8;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120);
      doc.text("As on " + U.fmtDate(Store.todayISO()), M, y + 8);
      doc.autoTable({
        head: [headers], body: rows, startY: y + 18, margin: { left: M, right: M },
        styles: { fontSize: 9, cellPadding: 4 }, headStyles: { fillColor: [31, 111, 235] },
        alternateRowStyles: { fillColor: [246, 248, 252] }
      });
      doc.save(filename || "report.pdf");
    });
  }

  // Wrap a PDF action with a friendly error -> offer print fallback
  function run(promiseFactory, fallback) {
    U.Toast.show("Generating PDF…", "");
    promiseFactory().then(function () { U.Toast.show("PDF downloaded", "good"); })
      .catch(function (e) { U.Toast.show(e.message, "bad"); if (fallback) fallback(); });
  }

  global.Pdf = { letterPDF: letterPDF, tablePDF: tablePDF, run: run };
})(window);
