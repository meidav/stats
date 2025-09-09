#!/usr/bin/env python3
"""
Add arbel admin user to the server database
This script will be run on PythonAnywhere
"""

import sqlite3
from werkzeug.security import generate_password_hash

def add_arbel_admin():
    try:
        # Connect to database
        conn = sqlite3.connect('stats.db')
        cur = conn.cursor()
        
        # Check if arbel user already exists
        cur.execute("SELECT id, username, is_admin FROM users WHERE username = 'arbel'")
        existing_user = cur.fetchone()
        
        if existing_user:
            user_id, username, is_admin = existing_user
            if is_admin:
                print("✅ User 'arbel' already exists and has admin privileges")
            else:
                # Update existing user to admin
                cur.execute("UPDATE users SET is_admin = 1, password_hash = ? WHERE username = 'arbel'", 
                           (generate_password_hash('Caleb00!!', method='pbkdf2:sha256'),))
                conn.commit()
                print("✅ User 'arbel' updated with admin privileges and new password")
        else:
            # Create new admin user
            password_hash = generate_password_hash('Caleb00!!', method='pbkdf2:sha256')
            cur.execute('''
                INSERT INTO users (username, email, password_hash, is_admin)
                VALUES (?, ?, ?, ?)
            ''', ('arbel', 'arbel@example.com', password_hash, True))
            conn.commit()
            print("✅ New admin user 'arbel' created successfully")
        
        # Verify the user was created/updated correctly
        cur.execute("SELECT id, username, email, is_admin FROM users WHERE username = 'arbel'")
        user_data = cur.fetchone()
        if user_data:
            print(f"📋 User details: ID={user_data[0]}, Username={user_data[1]}, Email={user_data[2]}, Is Admin={user_data[3]}")
        
        # Also check the admin user
        cur.execute("SELECT id, username, email, is_admin FROM users WHERE username = 'admin'")
        admin_data = cur.fetchone()
        if admin_data:
            print(f"📋 Admin user details: ID={admin_data[0]}, Username={admin_data[1]}, Email={admin_data[2]}, Is Admin={admin_data[3]}")
        
        conn.close()
        print("🎉 Admin users are ready!")
        print("🔑 Login with: username='arbel', password='Caleb00!!'")
        print("🔑 Or: username='admin', password='admin123'")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    add_arbel_admin()
