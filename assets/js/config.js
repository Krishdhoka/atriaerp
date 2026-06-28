/* AtriaERP — Cloud configuration
 * ---------------------------------------------------------------------------
 * LEAVE THESE BLANK to run AtriaERP in LOCAL mode (data saved only in this
 * browser). Fill them in to switch the whole app to CLOUD mode: shared
 * database, multi-user logins, accessible from any phone/computer.
 *
 * You get these two values from your Supabase project:
 *   Supabase dashboard → Project Settings → API
 *     • Project URL   →  SUPABASE_URL
 *     • anon public key →  SUPABASE_ANON_KEY   (safe to expose; protected by login + RLS)
 *
 * See cloud/DEPLOY.md for the full step-by-step.
 * ---------------------------------------------------------------------------
 */
window.AtriaConfig = {
  SUPABASE_URL: "https://vallxmluwrmxnyifuyph.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_Y5BHnfvYFldBcdJPyDAtjw_laWBJ2i-",   // publishable key — safe in the browser

  // Optional cosmetic / behaviour settings
  ORG_NAME: "AtriaERP",
  POLL_SECONDS: 30         // how often to refresh data from the cloud (multi-user freshness)
};

window.AtriaConfig.cloudEnabled = !!(window.AtriaConfig.SUPABASE_URL && window.AtriaConfig.SUPABASE_ANON_KEY);
