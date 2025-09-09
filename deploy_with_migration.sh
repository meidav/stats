#!/bin/bash

# Deployment script with database migration for date/time played feature
# This script should be run on PythonAnywhere after pulling the latest code

echo "🚀 Starting deployment with database migration..."
echo "⏰ Started at: $(date)"
echo ""

# Make sure we're in the right directory
cd ~/stats

echo "📁 Current directory: $(pwd)"
echo ""

# Pull latest code
echo "📦 Pulling latest code from GitHub..."
git fetch origin
git reset --hard origin/main
echo "✅ Code updated successfully"
echo ""

# Run database migration
echo "🗄️  Running database migration..."
python3 migrate_date_fields.py
echo ""

# Reload the web app
echo "🔄 Reloading web application..."
touch /var/www/arbel_pythonanywhere_com_wsgi.py
echo "✅ Web app reloaded"
echo ""

echo "🎉 Deployment completed successfully!"
echo "⏰ Finished at: $(date)"
echo ""
echo "📋 Summary of changes:"
echo "   • Updated code from GitHub"
echo "   • Migrated database to support date_played field"
echo "   • Added native HTML5 date/time inputs to edit forms"
echo "   • Added optional date/time override to add forms"
echo "   • Reloaded web application"
