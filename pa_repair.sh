#!/bin/bash
# One-time repair for PythonAnywhere after dependency changes.
# Run this in a PythonAnywhere Bash console if the site shows 500 errors.

set -euo pipefail

echo "Repairing PythonAnywhere deployment..."
cd ~/stats

echo "Pulling latest code..."
git fetch origin
git reset --hard origin/main

echo "Installing dependencies..."
pip3 install -r requirements.txt || pip install -r requirements.txt

echo "Reloading web app..."
touch /var/www/arbel_pythonanywhere_com_wsgi.py

echo "Done. Check https://arbel.pythonanywhere.com"
