#!/bin/bash
# Repair PythonAnywhere after a bad reload / empty DB stub.
# Run in a PythonAnywhere Bash console:
#   cd ~/stats && bash pa_repair.sh

set -euo pipefail

echo "Repairing PythonAnywhere deployment..."
cd ~/stats

echo "Pulling latest code..."
git fetch origin
git reset --hard origin/main

# If project stats.db is an empty stub, prefer the home-directory DB
if [[ -f ~/stats.db ]]; then
  HOME_SIZE=$(wc -c < ~/stats.db | tr -d ' ')
  PROJ_SIZE=0
  if [[ -f ~/stats/stats.db ]]; then
    PROJ_SIZE=$(wc -c < ~/stats/stats.db | tr -d ' ')
  fi
  echo "DB sizes: ~/stats.db=${HOME_SIZE}  ~/stats/stats.db=${PROJ_SIZE}"
  if [[ "$HOME_SIZE" -gt 1024 && "$PROJ_SIZE" -lt 1024 ]]; then
    echo "Replacing empty ~/stats/stats.db with link to ~/stats.db"
    mv -f ~/stats/stats.db ~/stats/stats.db.empty-stub 2>/dev/null || true
    ln -sfn ~/stats.db ~/stats/stats.db
  fi
fi

echo "Installing dependencies..."
pip3 install --user -r requirements.txt || pip install --user -r requirements.txt || true

echo "Reloading web app..."
touch /var/www/arbel_pythonanywhere_com_wsgi.py

echo "Done. Check https://arbel.pythonanywhere.com"
