#!/bin/bash
cd "$(dirname "$0")/backend"

if lsof -nP -iTCP:5050 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Launcher already running."
else
  nohup node launcher.js > launcher.log 2>&1 &
  disown
  sleep 1
  echo "Launcher started on http://localhost:5050"
fi

open "http://localhost:5050"
