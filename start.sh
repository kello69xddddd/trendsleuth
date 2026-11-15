#!/bin/sh
# TrendSleuth: starts a small local web server and opens the app in the browser.
cd "$(dirname "$0")"
(sleep 1; (open http://localhost:8000/ 2>/dev/null || xdg-open http://localhost:8000/ 2>/dev/null) &) 
exec python3 -m http.server 8000 --directory web
