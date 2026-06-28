# ============================================================================
#  AtriaERP - Tally Connector
#  Runs on the PC where Tally is installed. Reads Sundry Creditors & Debtors
#  (with closing balances + GSTIN) from Tally's local gateway and syncs them
#  into your AtriaERP cloud, so they appear live in the web app.
#
#  No installation needed - PowerShell is built into Windows.
#
#  ONE-TIME SETUP:
#   1) In TallyPrime: press F1 (Help) > Settings > Connectivity >
#      "Client/Server configuration" > set as ACTING AS = Server, Port = 9000.
#      (Tally ERP 9: Gateway of Tally > F12 > Advanced Config > Tally is acting
#      as = Both/Server, Port = 9000.) Keep Tally OPEN with your company loaded.
#   2) Edit the CONFIG block below (your AtriaERP login + which company).
#   3) Run:  right-click this file > Run with PowerShell
#      (or:  powershell -ExecutionPolicy Bypass -File tally-connector.ps1)
#
#  Run it whenever you want fresh numbers, or schedule it (see cloud/TALLY.md).
# ============================================================================

param([switch]$Debug)

# ===================== CONFIG - EDIT THESE ==================================
$LOGIN_EMAIL    = "you@example.com"            # your AtriaERP (Supabase) login email
$LOGIN_PASSWORD = "your-password"             # your AtriaERP login password
$COMPANY_NAME   = "Atria Realty Pvt Ltd"      # which AtriaERP company to attach the ledgers to
$TALLY_URL      = "http://localhost:9000"      # Tally gateway (default)
# --- these are pre-filled; leave as-is ---
$SUPABASE_URL   = "https://vallxmluwrmxnyifuyph.supabase.co"
$SUPABASE_KEY   = "sb_publishable_Y5BHnfvYFldBcdJPyDAtjw_laWBJ2i-"
# ===========================================================================

$ErrorActionPreference = "Stop"
function Say($m, $c = "Gray") { Write-Host $m -ForegroundColor $c }

Say "AtriaERP Tally Connector" "Cyan"

# 1) Sign in to AtriaERP cloud -----------------------------------------------
try {
  $auth = Invoke-RestMethod -Uri "$SUPABASE_URL/auth/v1/token?grant_type=password" -Method Post `
    -Headers @{ apikey = $SUPABASE_KEY; 'Content-Type' = 'application/json' } `
    -Body (@{ email = $LOGIN_EMAIL; password = $LOGIN_PASSWORD } | ConvertTo-Json)
} catch { Say "Login failed - check LOGIN_EMAIL / LOGIN_PASSWORD." "Red"; exit 1 }
$H = @{ apikey = $SUPABASE_KEY; Authorization = "Bearer $($auth.access_token)"; 'Content-Type' = 'application/json' }
Say "Signed in to AtriaERP." "Green"

# 2) Find the target company id ----------------------------------------------
$cos = Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/companies?select=*" -Headers $H
$company = $cos | Where-Object { $_.data.name -eq $COMPANY_NAME } | Select-Object -First 1
if (-not $company) {
  Say "Company '$COMPANY_NAME' not found. Available companies:" "Red"
  $cos | ForEach-Object { Say "   - $($_.data.name)" }
  exit 1
}
$companyId = $company.id
Say "Target company: $COMPANY_NAME" "Green"

# 3) Ask Tally for all ledgers (name, group, closing balance, GSTIN) ---------
$req = @'
<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>EXPORT</TALLYREQUEST><TYPE>COLLECTION</TYPE><ID>AtriaLedgers</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES><TDL><TDLMESSAGE><COLLECTION NAME="AtriaLedgers" ISMODIFY="No"><TYPE>Ledger</TYPE><FETCH>Name,Parent,ClosingBalance,PartyGSTIN,LedgerPhone</FETCH></COLLECTION></TDLMESSAGE></TDL></DESC></BODY></ENVELOPE>
'@
try {
  $resp = Invoke-WebRequest -Uri $TALLY_URL -Method Post -Body $req -ContentType "text/xml" -UseBasicParsing -TimeoutSec 60
} catch {
  Say "Could not reach Tally at $TALLY_URL." "Red"
  Say "Make sure Tally is OPEN, your company is loaded, and the gateway/server is ON (port 9000)." "Yellow"
  exit 1
}
if ($Debug) { $resp.Content | Out-File "$PSScriptRoot\tally-raw.xml" -Encoding utf8; Say "Raw response saved to tally-raw.xml" }

[xml]$xml = $resp.Content
$ledgers = $xml.SelectNodes('//LEDGER')
Say "Tally returned $($ledgers.Count) ledgers." "Green"

# 4) Filter Sundry Creditors / Debtors and upsert into AtriaERP --------------
function Get-Child($node, $tag) { $n = $node.SelectSingleNode($tag); if ($n) { return $n.InnerText } return "" }
function Clean-Id($prefix, $name) { return $prefix + (($name.ToLower() -replace '[^a-z0-9]', '')) }

$today = (Get-Date).ToString("yyyy-MM-dd")
$counts = @{ creditors = 0; debtors = 0 }

foreach ($l in $ledgers) {
  $name = $l.GetAttribute("NAME"); if (-not $name) { $name = Get-Child $l "NAME" }
  if (-not $name) { continue }
  $parent = Get-Child $l "PARENT"
  $entity = $null
  if ($parent -match 'Creditor') { $entity = "creditors" }
  elseif ($parent -match 'Debtor') { $entity = "debtors" }
  if (-not $entity) { continue }

  $cbRaw = Get-Child $l "CLOSINGBALANCE"
  $cb = 0.0; [double]::TryParse(($cbRaw -replace '[^0-9.\-]', ''), [ref]$cb) | Out-Null
  $outstanding = [math]::Abs($cb)
  if ($outstanding -eq 0) { continue }
  $gstin = Get-Child $l "PARTYGSTIN"

  $rowId = Clean-Id ("tl_" + $entity + "_") $name
  $data = [ordered]@{
    id = $rowId; name = $name; gstin = $gstin; outstanding = $outstanding;
    ageDays = $null; lastBill = $today; companyId = $companyId; createdAt = $today; source = "Tally"
  }
  $payload = @(@{ id = $rowId; entity = $entity; company_id = $companyId; project_id = $null; data = $data; updated_at = (Get-Date).ToString("o") }) | ConvertTo-Json -Depth 8
  $hh = $H.Clone(); $hh["Prefer"] = "resolution=merge-duplicates,return=minimal"
  try {
    Invoke-RestMethod -Uri "$SUPABASE_URL/rest/v1/records" -Method Post -Headers $hh -Body $payload | Out-Null
    $counts[$entity]++
  } catch { Say "  ! failed to sync $name : $($_.Exception.Message)" "Yellow" }
}

Say ""
Say "Done. Synced $($counts.creditors) creditors and $($counts.debtors) debtors to AtriaERP." "Cyan"
Say "Open the web app (refresh) - Finance > Creditors / Debtors will show the latest." "Gray"
