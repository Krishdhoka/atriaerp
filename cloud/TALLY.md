# Connect Tally to AtriaERP

Tally runs **on a PC in your office**, and a website can't read it directly. So a small **connector** runs on the Tally PC, reads your **Sundry Creditors & Debtors**, and pushes them into your AtriaERP cloud — where they appear in **Finance → Creditors / Debtors**.

No software to install — it's a PowerShell script (built into Windows).

---

## One-time setup

### 1. Turn on Tally's gateway (so the connector can read it)
- **TallyPrime:** press **F1 (Help) → Settings → Connectivity → Client/Server configuration** → set **Acting as = Server**, **Port = 9000**.
- **Tally ERP 9:** Gateway of Tally → **F12 → Advanced Configuration** → **Tally is acting as = Both** (or Server), **Port = 9000**.
- Keep **Tally open** with your company loaded whenever you sync.

### 2. Configure the connector
- Copy **`tools/tally-connector.ps1`** onto the Tally PC (or just run it from the project folder there).
- Right-click it → **Edit** (opens in Notepad) and fill in the top **CONFIG** block:
  - `LOGIN_EMAIL` / `LOGIN_PASSWORD` — your AtriaERP login (the same one you use on the website)
  - `COMPANY_NAME` — which AtriaERP company these ledgers belong to (exact name, e.g. `Atria Realty Pvt Ltd`)
  - (URL + key are already filled in.)
- Save.

### 3. Run it
- Right-click `tally-connector.ps1` → **Run with PowerShell**.
  - If Windows warns about scripts, run from a terminal:
    `powershell -ExecutionPolicy Bypass -File tally-connector.ps1`
- You'll see: *"Synced N creditors and M debtors to AtriaERP."*
- Open the web app → **Finance → Creditors / Debtors** → your Tally ledgers are there. 🎉

---

## Refreshing the numbers
Run the connector again whenever you want fresh figures. To **automate** it (e.g. every morning), use Windows **Task Scheduler** → Create Basic Task → Daily → Action: *Start a program* → `powershell.exe`, arguments: `-ExecutionPolicy Bypass -File "C:\path\to\tally-connector.ps1"`.

## Troubleshooting
- **"Could not reach Tally"** → Tally isn't open, the company isn't loaded, or the gateway/port 9000 isn't enabled (step 1).
- **"Login failed"** → check `LOGIN_EMAIL` / `LOGIN_PASSWORD`.
- **"Company not found"** → `COMPANY_NAME` must match exactly; the script prints the available names.
- **It runs but no ledgers** → run with the `-Debug` switch (`...-File tally-connector.ps1 -Debug`) — it saves `tally-raw.xml`. Send me that file and I'll adjust the mapping to your Tally setup.

> Want it to also pull **bills outstanding (ageing)**, **GST registers**, or **vouchers**? That's the same pattern — tell me and I'll extend the connector.
