# Backend functions (Supabase Edge Functions)

Secret API keys (GST lookup, SMS, bank, etc.) must run on the **server**, never in the browser. Supabase Edge Functions are that server — and you can create them entirely from the **Supabase dashboard** (no command line).

This is the pattern for *every* secret-key integration. Once you've done it once, the rest are the same 3 steps.

---

## Integration #5 — Live GST lookup

### Step 1 — Get a provider key
Use **either** provider (the function supports both):
- **Surepass (recommended)** — https://surepass.io → sign up → dashboard → copy your **API token** (a long Bearer token). Secret name will be `SUREPASS_TOKEN`.
- **AppyFlow (alternative)** — https://appyflow.in → sign up → copy your **key_secret**. Secret name will be `APPYFLOW_KEY`.

### Step 2 — Create the function in Supabase
1. Supabase dashboard → left menu → **Edge Functions** → **Create a function** (or **Deploy a new function**).
2. Name it **exactly** `gst-lookup`.
3. In the code editor, delete the sample and **paste the contents of** [`cloud/functions/gst-lookup/index.ts`](functions/gst-lookup/index.ts) from this project.
4. Click **Deploy**.

### Step 3 — Add the secret key
1. Supabase → **Edge Functions** → **Manage secrets** (or **Project Settings → Edge Functions → Secrets**).
2. Add a new secret (match your provider from Step 1):
   - Surepass → **Name:** `SUREPASS_TOKEN` · **Value:** your token
   - AppyFlow → **Name:** `APPYFLOW_KEY` · **Value:** your key_secret
3. Save. (The function reads this securely — it's never exposed to users.)

### Step 4 — Use it
In AtriaERP → **Settings & Integrations → GSTIN / PAN Verification** → type a GSTIN → **Verify** → then **🌐 Fetch live details (govt)**. It returns the registered legal name, trade name, status, and address.

> Tell me once the function is deployed + the secret is set, and I'll run a live test with you.

---

## Reusing this for future integrations
Every secret-key integration follows the same shape:
1. Sign up with the provider, get the key.
2. Create a Supabase Edge Function (I give you the code), name it, paste, deploy.
3. Add the provider key as an Edge Function **secret**.
4. AtriaERP calls it securely via `Cloud.invokeFunction("<name>", {...})`.

Planned next functions: `sms-send` (MSG91), `pan-verify`, `tally-sync`, `bank-balance`.
