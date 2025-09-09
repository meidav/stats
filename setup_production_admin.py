#!/usr/bin/env python3
"""
Script to set up admin user on production
This should be run on PythonAnywhere after deployment
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auth import create_users_table, create_user, get_user_by_username
from werkzeug.security import generate_password_hash

def setup_production_admin():
    """Set up admin user on production"""
    print("🚀 Setting up production admin...")
    
    # Create users table
    create_users_table()
    print("✅ Users table created/verified")
    
    # Check if admin user exists
    admin_user = get_user_by_username('admin')
    if admin_user:
        print("✅ Admin user already exists")
        return True
    
    # Create admin user
    success = create_user('admin', 'admin@example.com', 'admin123', True)
    if success:
        print("✅ Admin user created successfully")
        print("   Username: admin")
        print("   Password: admin123")
        print("   ⚠️  Please change the password after first login!")
        return True
    else:
        print("❌ Failed to create admin user")
        return False

if __name__ == '__main__':
    setup_production_admin()
