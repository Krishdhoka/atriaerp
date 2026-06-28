# AtriaERP — Real Estate ERP

A multi-company, multi-project ERP for real estate developers (Tally + ERPNext-style + custom features).
Runs entirely in your web browser — **no installation required**. All data is saved locally on this PC.

## How to open

- **Double-click `Launch AtriaERP.bat`** — this starts a tiny local web server and opens the app at `http://localhost:8123/`. Keep the minimized **"AtriaERP Server"** window open while using the app.
- ⚠️ **Do not open `index.html` directly** from this OneDrive folder — it can show a **blank screen** because the browser can't load the separate files over `file://`. Use the launcher (or the single-file `dist/AtriaERP-Beta.html`).
- Switch **Company** and **Project** from the dropdowns at the top — every screen is scoped to your selection.

> ⚠️ **Your data lives in this browser only.** Use **Data Manager → Export Backup** regularly to keep a safe copy
> (a `.json` file you can re-import here or on another PC).

## Modules

| Group | Modules |
|---|---|
| **Overview** | Dashboard (KPIs, sales funnel, inventory, finance snapshot, reminders, construction progress) |
| **CRM & Sales** | Leads & CRM, WhatsApp Blast, Email Campaigns, Agreements, Letters & Formats (Bank NOC / Fit-out / Parking) |
| **Inventory & Property** | Inventory (units), Property Details, Plans & Drawings, Rental Management |
| **Finance** | Payments (Received/Due), Creditors (Tally), Debtors (Tally), Bank Balances (Axis API), Net Banking Payments, GST, TDS |
| **Procurement & Projects** | Vendor Portal, Vendors, Purchase, Work Orders, Work Schedule, Stage of Construction, Liaisoning (BMC/VVCMC/MMRDA…) |
| **Legal & Land** | Legal Documents, Land Management (stages, litigation, reminders), E-Courts |
| **HR** | Payroll, Reimbursements & Petty Cash |
| **System** | Data Manager (backup/restore/reset), Companies & Projects setup |

## What's real vs. simulated

- **Fully working now:** all data entry, editing, search, filtering, sorting, multi-company/project scoping,
  dashboards, reminders, backup/restore. Every record you add is saved.
- **Simulated integrations (clearly marked 🧪):** Tally sync, Axis Bank balance refresh, Net Banking payouts,
  WhatsApp/Email blasts, and E-Courts lookups currently run as realistic local simulations. The screens, settings,
  and data flows are built so they can be wired to the real APIs later (the connection points are already in place).

## Going live later (optional)

When you're ready for a multi-user office system, this front-end can be connected to a server + database
(e.g. Node/Express or ERPNext) and the simulated integrations replaced with:
- **Tally** — Tally HTTP/ODBC gateway (port 9000) for Creditors/Debtors pull
- **Axis Bank** — Corporate Internet Banking / Connected Banking API for balances & payouts
- **WhatsApp** — WhatsApp Business Cloud API
- **E-Courts** — eCourts Services API (CNR lookup)

## Project structure

```
index.html              App shell
Launch AtriaERP.bat     One-click launcher (Windows)
assets/css/styles.css   Styling
assets/js/
  store.js              Local data store (localStorage) + backup/restore
  schema.js             All module/field/column definitions + navigation
  seed.js               Demo data (3 companies, 4 projects)
  components.js         Formatting (₹ Cr/Lakh), tables, forms, modals, toasts
  views.js              Dashboard + generic list/CRUD engine
  integrations.js       Bank, Tally, WhatsApp, Email, E-Courts, Vendor Portal, Data Manager, Setup
  app.js                Boot, navigation, routing, company/project switching
tools/static-server.ps1 Optional local web server (for previewing; not needed for normal use)
```
