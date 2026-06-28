/* AtriaERP — GSTIN / PAN verification (offline: format + official checksum)
 * Catches typos, fake, and structurally-invalid numbers instantly — no API, no key.
 * (A live government lookup of the registered legal name/address can be added later
 *  via a provider + a Supabase Edge Function.)
 */
(function (global) {
  "use strict";
  var U = global.UI;

  var STATE = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
    "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur",
    "15": "Mizoram", "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
    "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "25": "Daman & Diu", "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "28": "Andhra Pradesh (old)",
    "29": "Karnataka", "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
    "34": "Puducherry", "35": "Andaman & Nicobar", "36": "Telangana", "37": "Andhra Pradesh",
    "38": "Ladakh", "97": "Other Territory", "99": "Centre Jurisdiction"
  };
  var PAN_TYPE = {
    P: "Individual", C: "Company", H: "HUF", F: "Firm / LLP", A: "Association of Persons (AOP)",
    T: "Trust", B: "Body of Individuals", L: "Local Authority", J: "Artificial Juridical Person", G: "Government"
  };

  function gstinCheckDigit(g14) {
    var code = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", factor = 2, sum = 0, mod = 36;
    for (var i = g14.length - 1; i >= 0; i--) {
      var cp = code.indexOf(g14.charAt(i));
      if (cp < 0) return "";
      var digit = factor * cp;
      factor = factor === 2 ? 1 : 2;
      digit = Math.floor(digit / mod) + (digit % mod);
      sum += digit;
    }
    return code.charAt((mod - (sum % mod)) % mod);
  }

  function gstin(value) {
    var g = String(value || "").toUpperCase().replace(/\s/g, "");
    if (!g) return { ok: false, message: "Enter a GSTIN" };
    if (g.length !== 15) return { ok: false, message: "GSTIN must be 15 characters (got " + g.length + ")" };
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return { ok: false, message: "Invalid GSTIN format" };
    var state = g.slice(0, 2);
    if (!STATE[state]) return { ok: false, message: "Invalid state code (" + state + ")" };
    if (gstinCheckDigit(g.slice(0, 14)) !== g.charAt(14)) return { ok: false, message: "Checksum failed — number is invalid or mistyped" };
    return { ok: true, value: g, message: "Valid GSTIN", details: { State: STATE[state], "PAN inside": g.slice(2, 12), "Reg. number": g.charAt(12) } };
  }

  function pan(value) {
    var p = String(value || "").toUpperCase().replace(/\s/g, "");
    if (!p) return { ok: false, message: "Enter a PAN" };
    if (p.length !== 10) return { ok: false, message: "PAN must be 10 characters (got " + p.length + ")" };
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(p)) return { ok: false, message: "Invalid PAN format (expected AAAAA9999A)" };
    var t = PAN_TYPE[p.charAt(3)] || "Unknown type";
    return { ok: true, value: p, message: "Valid PAN format", details: { "Holder type": t } };
  }

  function check(type, value) { return type === "PAN" ? pan(value) : gstin(value); }

  function resultNode(res) {
    var box = U.el('<div class="notice ' + (res.ok ? "" : "warn") + '" style="margin:10px 0 0"><span class="ni">' + (res.ok ? "✅" : "⚠️") + '</span><div></div></div>');
    var d = box.querySelector("div");
    d.innerHTML = "<b>" + U.esc(res.message) + "</b>";
    if (res.details) Object.keys(res.details).forEach(function (k) { d.innerHTML += '<div class="muted" style="font-size:12px">' + U.esc(k) + ": <b>" + U.esc(res.details[k]) + "</b></div>"; });
    return box;
  }

  // Embeddable quick-check tool
  function renderQuick(host) {
    host.innerHTML = "";
    var row = U.el('<div class="form-grid"></div>');
    row.appendChild(U.el('<div class="field"><label>Type</label><select id="vk_type"><option>GSTIN</option><option>PAN</option></select></div>'));
    row.appendChild(U.el('<div class="field"><label>Number</label><input id="vk_val" placeholder="e.g. 27AAACA1234A1Z5" autocomplete="off"></div>'));
    host.appendChild(row);
    var btn = U.el('<button class="btn primary" style="margin-top:6px">Verify</button>');
    host.appendChild(btn);
    var out = U.el("<div></div>"); host.appendChild(out);
    function run() {
      out.innerHTML = "";
      var type = host.querySelector("#vk_type").value, val = host.querySelector("#vk_val").value;
      var res = check(type, val);
      out.appendChild(resultNode(res));
      if (res.ok && type === "GSTIN" && window.Cloud && Cloud.enabled && Cloud.enabled()) {
        var liveBtn = U.el('<button class="btn sm" style="margin-top:8px">🌐 Fetch live details (govt)</button>');
        var liveOut = U.el("<div></div>");
        liveBtn.onclick = function () { liveGst(res.value, liveBtn, liveOut); };
        out.appendChild(liveBtn); out.appendChild(liveOut);
      }
    }
    btn.onclick = run;
    host.querySelector("#vk_val").addEventListener("keydown", function (e) { if (e.key === "Enter") run(); });
  }

  // Live GST lookup via the Supabase Edge Function "gst-lookup" (cloud mode only)
  function liveGst(gstin, btn, outNode) {
    if (!(window.Cloud && Cloud.invokeFunction)) { outNode.appendChild(resultNode({ ok: false, message: "Live lookup needs cloud mode" })); return; }
    btn.disabled = true; btn.textContent = "Fetching…"; outNode.innerHTML = "";
    Cloud.invokeFunction("gst-lookup", { gstin: gstin }).then(function (d) {
      if (d && d.ok) {
        var det = {};
        [["Legal name", d.legalName], ["Trade name", d.tradeName], ["Status", d.status], ["Type", d.taxpayerType], ["Reg. date", d.registrationDate], ["Address", d.address]]
          .forEach(function (p) { if (p[1]) det[p[0]] = p[1]; });
        outNode.appendChild(resultNode({ ok: true, message: "Live GST details (from govt)", details: det }));
      } else {
        outNode.appendChild(resultNode({ ok: false, message: (d && d.error) || "Lookup failed" }));
      }
    }).catch(function (e) {
      outNode.appendChild(resultNode({ ok: false, message: "Lookup failed: " + e.message + "  — is the gst-lookup function deployed & APPYFLOW_KEY set?" }));
    }).then(function () { btn.disabled = false; btn.textContent = "🌐 Fetch live details (govt)"; });
  }

  // One-shot verify with a toast (for inline buttons)
  function verifyToast(type, value) {
    var res = check(type, value);
    U.Toast.show((res.ok ? "✓ " : "✗ ") + type + ": " + res.message, res.ok ? "good" : "bad");
    return res;
  }

  global.Verify = { gstin: gstin, pan: pan, check: check, resultNode: resultNode, renderQuick: renderQuick, verifyToast: verifyToast };
})(window);
