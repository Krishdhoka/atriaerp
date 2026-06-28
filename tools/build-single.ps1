# Builds a single, portable AtriaERP-Beta.html with all CSS + JS inlined.
# Run:  powershell -ExecutionPolicy Bypass -File tools/build-single.ps1
# Output: dist/AtriaERP-Beta.html  (double-click or share via email/WhatsApp)

$root = Split-Path -Parent $PSScriptRoot
$enc  = [System.Text.Encoding]::UTF8
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)

function ReadFile($rel) { return [System.IO.File]::ReadAllText((Join-Path $root $rel), $enc) }

$html = ReadFile 'index.html'

# Inline the stylesheet (literal replace so $ in content is safe)
$css  = ReadFile 'assets/css/styles.css'
$html = $html.Replace('<link rel="stylesheet" href="assets/css/styles.css" />', "<style>`n$css`n</style>")

# Inline every local <script src="assets/js/*.js"></script> in order
$evaluator = {
  param($m)
  $p  = $m.Groups[1].Value
  $js = [System.IO.File]::ReadAllText((Join-Path $root $p), [System.Text.Encoding]::UTF8)
  return "<script>`n$js`n</script>"
}
$html = [regex]::Replace($html, '<script src="(assets/js/[^"]+)"></script>', $evaluator)

# Mark it as the portable build (disable service-worker registration which needs separate files)
$html = $html.Replace('navigator.serviceWorker.register("sw.js")', 'Promise.reject(new Error("single-file build"))')

$outDir = Join-Path $root 'dist'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory $outDir | Out-Null }
$out = Join-Path $outDir 'AtriaERP-Beta.html'
[System.IO.File]::WriteAllText($out, $html, $utf8NoBom)

$kb = [math]::Round((Get-Item $out).Length / 1024)
Write-Host "Built $out  ($kb KB)  - single portable file, no setup needed."
