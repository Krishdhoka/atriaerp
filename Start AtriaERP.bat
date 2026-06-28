@echo off
REM ============================================================
REM  AtriaERP launcher (reliable) - runs a tiny local web server
REM  and opens the app in your browser. Avoids OneDrive / file://
REM  problems that can cause a blank screen.
REM
REM  Keep the small black server window open while you use the app.
REM  Close it when you're done.
REM ============================================================
cd /d "%~dp0"
echo Starting AtriaERP server...
start "AtriaERP Server (keep open)" /min powershell -ExecutionPolicy Bypass -NoProfile -File "tools\static-server.ps1" -Port 8123
REM give the server a moment to start, then open the browser
ping -n 3 127.0.0.1 >nul
start "" "http://localhost:8123/"
echo.
echo AtriaERP should now be open in your browser at http://localhost:8123/
echo (Leave the minimized "AtriaERP Server" window running.)
