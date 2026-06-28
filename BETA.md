# AtriaERP — Beta (check it before going live)

This is a **beta**: everything works, data is saved **locally on each device**, and there are no logins yet. It's meant for you (and a few colleagues) to try every screen and tell me what to fix or change **before** we switch on the shared cloud version for the whole office.

> The app shows a **BETA** badge top-left, and a **💬 Feedback** button (bottom-right) on every screen.

## 3 ways to open the beta

**1. Recommended — double-click `Launch AtriaERP.bat`** (or `Start AtriaERP.bat`)
- This opens AtriaERP in your browser at `http://localhost:8123/`.
- A small minimized **"AtriaERP Server"** window appears — **leave it open** while you use the app; close it when done.
- ⚠️ **Do NOT open `index.html` directly by double-click** — because this folder is inside **OneDrive**, opening the file directly often shows a **blank screen** (the browser can't load the parts). Always use the launcher above.

**2. Single portable file (easiest to share with colleagues)**
- Open **`dist/AtriaERP-Beta.html`** — one self-contained file. Copy it to a USB stick or **email / WhatsApp it** — recipients double-click and it runs. No install, no internet.
- Tip: if it opens blank from inside OneDrive, first **right-click the file → "Always keep on this device"**, then open it.

**3. On your phone (no signup, ~1 minute)**
- On a computer, open **https://app.netlify.com/drop** in your browser.
- Drag the whole **`RishabhNEXERP`** folder onto that page.
- It gives you a web link like `https://random-name.netlify.app`.
- Open that link on your **phone** → Chrome menu **⋮ → Install app** (Android) or Share **→ Add to Home Screen** (iPhone). Now it's an app icon on your phone.
- (This is a throwaway test link. The permanent, multi-user version comes with the Supabase + Vercel go-live in `cloud/DEPLOY.md`.)

## How to give feedback
- Tap **💬 Feedback** (bottom-right) any time, choose Bug/Suggestion, type your note, **Save**.
- Notes are kept on the device. When done, open Feedback again → **✉️ Email all notes** to send them to me in one click.

## What to check (test checklist)

**Setup & navigation**
- [ ] Switch **Company** and **Project** (top bar) — screens follow your selection
- [ ] Open every menu group; check the modules you care about most

**CRM & Sales**
- [ ] Add a **Lead**; edit it; set a follow-up date
- [ ] **New Booking** wizard: pick a lead → unit → price → plan → confirm. Check it books the unit, makes an agreement, and creates the payment demands
- [ ] **Follow-up Calendar** shows your reminders in the right buckets
- [ ] **Customer 360** shows that customer's full picture

**Money**
- [ ] **Collections** — tap **WhatsApp** on a customer (it should open WhatsApp with a ready message). Try **Record Receipt**
- [ ] **Reports & MIS** — open each report; try **CSV** and **Print**
- [ ] **Approvals Inbox** — approve/reject a pending item
- [ ] Check **GST**, **TDS**, **Creditors/Debtors** look right

**Projects, Land, HR**
- [ ] **Budget vs Actual** — set up default heads, enter a budget
- [ ] **Work Orders / Work Schedule** — add one
- [ ] **Land Desk** (switch to a company with land) — open a payment schedule
- [ ] **Rent Roll** — record rent; check renewal alerts
- [ ] **Payroll / Reimbursements**

**Data safety**
- [ ] **Data Manager → Export Backup** (download a copy), then try **Import**
- [ ] On phone: install to home screen and reopen

## Known beta limits (fixed when we go live)
- Data is **per-device** (not shared between users yet) — that's the cloud step.
- No logins/roles yet in the beta — also the cloud step.
- File uploads in **Document Vault** are limited to ~1.5 MB each locally.
- Tally / Axis Bank / WhatsApp-API / e-Courts are **realistic simulations** until connected to live accounts.

When you're happy with the beta, tell me and we'll do the **Supabase + Vercel** go-live (see `cloud/DEPLOY.md`).
