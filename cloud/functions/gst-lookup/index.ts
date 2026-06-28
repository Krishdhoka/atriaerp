// AtriaERP — Supabase Edge Function: gst-lookup
// Securely fetches a GSTIN's registered details from a provider (AppyFlow),
// keeping the provider key SECRET on the server (never in the browser).
//
// Deploy from the Supabase Dashboard → Edge Functions → "Create a function" →
// name it exactly "gst-lookup" → paste this code → Deploy.
// Then set the secret: Edge Functions → Manage secrets → add APPYFLOW_KEY = <your key>.
//
// Provider: https://appyflow.in (free tier, self-serve). To use a different
// provider, change the fetch URL + response mapping below.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { gstin } = await req.json();
    if (!gstin || String(gstin).length !== 15) return json({ ok: false, error: "Provide a 15-character GSTIN" }, 400);

    const key = Deno.env.get("APPYFLOW_KEY");
    if (!key) return json({ ok: false, error: "Server not configured: APPYFLOW_KEY secret missing" }, 500);

    const url = `https://appyflow.in/api/verifyGST?gstNo=${encodeURIComponent(gstin)}&key_secret=${encodeURIComponent(key)}`;
    const resp = await fetch(url);
    const data = await resp.json();

    // AppyFlow returns { taxpayerInfo: {...} } on success, or { error, message } on failure
    const t = data?.taxpayerInfo;
    if (t) {
      const a = t?.pradr?.addr || {};
      const address = [a.bno, a.bnm, a.st, a.loc, a.dst, a.stcd, a.pncd].filter(Boolean).join(", ");
      return json({
        ok: true,
        legalName: t.lgnm || "",
        tradeName: t.tradeNam || "",
        status: t.sts || "",
        registrationDate: t.rgdt || "",
        taxpayerType: t.dty || t.ctb || "",
        address,
        raw: t,
      });
    }
    return json({ ok: false, error: data?.message || data?.error || "Not found / invalid GSTIN" }, 200);
  } catch (e) {
    return json({ ok: false, error: String(e) }, 400);
  }
});
