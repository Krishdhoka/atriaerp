@echo off
REM ============================================================
REM  AtriaERP - reliable launcher (runs a tiny local web server
REM  and opens the app). This avoids the blank-screen problem you
REM  get when opening index.html directly from a OneDrive folder.
REM
REM  Keep the small minimized "AtriaERP Server" window open while
REM  you use the app. Close it when you're done.
REM ============================================================
cd /d "%~dp0"
echo Starting AtriaERP...
start "AtriaERP Server (keep open)" /min powershell -ExecutionPolicy Bypass -NoProfile -File "tools\static-server.ps1" -Port 8123
ping -n 3 127.0.0.1 >nul
start "" "http://localhost:8123/"
echo.
echo AtriaERP is opening in your browser at http://localhost:8123/
echo (Leave the minimized "AtriaERP Server" window running.)
