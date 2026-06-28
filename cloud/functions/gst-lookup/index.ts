// AtriaERP — Supabase Edge Function: gst-lookup
// Securely fetches a GSTIN's registered details, keeping the provider key SECRET
// on the server (never in the browser).
//
// Supports TWO providers — set whichever secret you have:
//   • Surepass   → secret name: SUREPASS_TOKEN   (recommended; https://surepass.io)
//   • AppyFlow   → secret name: APPYFLOW_KEY      (https://appyflow.in)
// If both are set, Surepass is used.
//
// Deploy: Supabase Dashboard → Edge Functions → Create a function → name it
// exactly "gst-lookup" → paste this code → Deploy. Then add the secret under
// Edge Functions → Manage secrets.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const pick = (o: Record<string, unknown>, keys: string[]) => {
  for (const k of keys) { const v = o?.[k]; if (v) return typeof v === "string" ? v : JSON.stringify(v); }
  return "";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { gstin } = await req.json();
    if (!gstin || String(gstin).length !== 15) return json({ ok: false, error: "Provide a 15-character GSTIN" }, 400);

    const surepass = Deno.env.get("SUREPASS_TOKEN");
    const appyflow = Deno.env.get("APPYFLOW_KEY");

    // ---- Surepass ----
    if (surepass) {
      const r = await fetch("https://kyc-api.surepass.io/api/v1/corporate/gstin", {
        method: "POST",
        headers: { "Authorization": "Bearer " + surepass, "Content-Type": "application/json" },
        body: JSON.stringify({ id_number: gstin }),
      });
      const d = await r.json();
      const x = (d && d.data) || {};
      if (d && d.success && Object.keys(x).length) {
        return json({
          ok: true,
          legalName: pick(x, ["legal_name", "business_name"]),
          tradeName: pick(x, ["trade_name", "business_name"]),
          status: pick(x, ["gstin_status", "status"]),
          registrationDate: pick(x, ["date_of_registration", "registration_date"]),
          taxpayerType: pick(x, ["constitution_of_business", "taxpayer_type", "company_type"]),
          address: pick(x, ["address", "principal_place_address", "pradr"]),
          raw: d,
        });
      }
      return json({ ok: false, error: (d && (d.message || d.error)) || "Not found / invalid GSTIN", raw: d }, 200);
    }

    // ---- AppyFlow ----
    if (appyflow) {
      const r = await fetch(`https://appyflow.in/api/verifyGST?gstNo=${encodeURIComponent(gstin)}&key_secret=${encodeURIComponent(appyflow)}`);
      const d = await r.json();
      const t = d && d.taxpayerInfo;
      if (t) {
        const a = (t.pradr && t.pradr.addr) || {};
        const address = [a.bno, a.bnm, a.st, a.loc, a.dst, a.stcd, a.pncd].filter(Boolean).join(", ");
        return json({ ok: true, legalName: t.lgnm || "", tradeName: t.tradeNam || "", status: t.sts || "", registrationDate: t.rgdt || "", taxpayerType: t.dty || t.ctb || "", address, raw: t });
      }
      return json({ ok: false, error: (d && (d.message || d.error)) || "Not found / invalid GSTIN", raw: d }, 200);
    }

    return json({ ok: false, error: "No provider key set. Add SUREPASS_TOKEN or APPYFLOW_KEY as an Edge Function secret." }, 500);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 400);
  }
});
