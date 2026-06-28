# Take AtriaERP to the cloud (multi-user, phone-installable)

This makes AtriaERP accessible from **any phone or computer, anywhere**, with **logins** and a **shared database**. Free to start.

You'll set up two free services:
- **Supabase** → the shared database + logins (the "brain")
- **Vercel** → hosts the app on the internet + gives you an installable web address (the "front door")

Total time: ~20–30 minutes. I'll help with every step — paste anything back to me if you get stuck.

---

## Part A — Database & logins (Supabase)

1. Go to **https://supabase.com** → **Start your project** → sign in with Google/GitHub.
2. **New project** → name it `atriaerp` → choose a **strong database password** (save it) → Region: **Mumbai (ap-south-1)** → **Create**. Wait ~2 min.
3. Left menu → **SQL Editor** → **New query**. Open the file [`cloud/supabase-setup.sql`](supabase-setup.sql) from this project, copy ALL of it, paste, and click **Run**. You should see "Success".
4. Left menu → **Project Settings → API**. Copy these two values:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon public** key (a long string)
5. **Create your first user:** left menu → **Authentication → Users → Add user** → enter your email + a password → **Create**. (Repeat for each staff member, or let them sign up later.)
6. **Set roles:** left menu → **Table Editor → profiles**. Each user has a row; set the **role** column. Options:
   `admin` (everything) · `manager` (everything) · `sales` (CRM + inventory) · `accounts` (finance + HR) · `site` (projects + inventory) · `legal` (legal + land).

> 🔒 Your data is protected: the `anon` key is safe to put in the app because the database only responds to **logged-in** users (Row-Level Security is enabled by the SQL above).

## Part B — Plug the keys into the app

Open **`assets/js/config.js`** and paste your two values:

```js
window.AtriaConfig = {
  SUPABASE_URL: "https://xxxx.supabase.co",      // ← your Project URL
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiI...",   // ← your anon public key
  ...
};
```

Save. (Tell me the values and I'll fill this in and double-check it.)

## Part C — Put the app on the internet (Vercel)

**Easiest path (no commands):**
1. Create a free GitHub account at **https://github.com** if you don't have one.
2. Make a new repository and upload this whole `RishabhNEXERP` folder (drag-and-drop on github.com works), **or** tell me and I'll prepare the git push for you.
3. Go to **https://vercel.com** → sign in with GitHub → **Add New → Project** → pick the `RishabhNEXERP` repo → **Deploy**. No build settings needed (it's a static site).
4. Vercel gives you a web address like `https://atriaerp.vercel.app`. That's your live app. 🎉

## Part D — Install on phones

1. On the phone, open your Vercel address (e.g. `https://atriaerp.vercel.app`) in **Chrome (Android)** or **Safari (iPhone)**.
2. **Android:** menu (⋮) → **Install app / Add to Home screen**. **iPhone:** Share → **Add to Home Screen**.
3. AtriaERP now opens full-screen like a normal app. Staff log in with their email/password.

## First-time data

- Start fresh: log in → **Companies & Projects** → add your real companies/projects → start entering data.
- Or migrate the demo/local data you already have: in **Data Manager**, use **“Upload local data to cloud”** (appears in cloud mode).

---

### How it works (plain English)
- Every change anyone makes is saved to the shared Supabase database instantly.
- The app refreshes from the cloud every ~30 seconds so everyone sees the latest.
- If a phone goes offline, the installed app still opens; changes sync when it's back online.

### Going further (optional, later)
- **Per-company access** for external parties (vendors): tighten the Row-Level Security policies.
- **Tally / Axis / WhatsApp Cloud API** live integrations can run as Supabase Edge Functions or a small server.
