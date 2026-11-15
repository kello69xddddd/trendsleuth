@echo off
rem TrendSleuth: starts a small local web server and opens the app in the browser.
cd /d "%~dp0"
start "" http://localhost:8000/
python -m http.server 8000 --directory web || py -m http.server 8000 --directory web
if errorlevel 1 (
  echo.
  echo Python was not found. Opening the app by double click instead.
  start "" "%~dp0web\index.html"
  pause
)
