#!/bin/bash

# Simple deployment script for PythonAnywhere
# Run this on PythonAnywhere console to manually deploy

set -euo pipefail

echo "Starting deployment..."

# Pull latest changes
echo "Pulling latest changes from GitHub..."
git pull origin main

echo "Installing dependencies..."
pip3 install -r requirements.txt || pip install -r requirements.txt

# Touch the WSGI file to reload the app
echo "Reloading web application..."
touch /var/www/${USER}_pythonanywhere_com_wsgi.py

echo "Deployment complete!"
echo "Check your app at: https://${USER}.pythonanywhere.com"
