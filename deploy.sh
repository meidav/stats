#!/bin/bash

# Simple deployment script for PythonAnywhere
# Run this on PythonAnywhere console to manually deploy

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

if [ $? -eq 0 ]; then
    echo "✅ Successfully pulled changes"
else
    echo "❌ Failed to pull changes"
    exit 1
fi

# Touch the WSGI file to reload the app
echo "🔄 Reloading web application..."
touch /var/www/${USER}_pythonanywhere_com_wsgi.py

echo "✅ Deployment complete!"
echo "🌐 Check your app at: https://${USER}.pythonanywhere.com"
