#!/usr/bin/env python3
"""
Emergency script to restore admin user
Run this if you accidentally removed admin privileges
"""

import sqlite3
from werkzeug.security import generate_password_hash

def restore_admin():
    try:
        # Connect to database
        conn = sqlite3.connect('stats.db')
        cur = conn.cursor()
        
        # Check if admin user exists
        cur.execute("SELECT id, username, is_admin FROM users WHERE username = 'admin'")
        admin_user = cur.fetchone()
        
        if admin_user:
            user_id, username, is_admin = admin_user
            if is_admin:
                print("✅ Admin user already has admin privileges")
            else:
                # Restore admin privileges
                cur.execute("UPDATE users SET is_admin = 1 WHERE username = 'admin'")
                conn.commit()
                print("✅ Admin privileges restored for user 'admin'")
        else:
            # Create admin user if it doesn't exist
            password_hash = generate_password_hash('admin123', method='pbkdf2:sha256')
            cur.execute('''
                INSERT INTO users (username, email, password_hash, is_admin)
                VALUES (?, ?, ?, ?)
            ''', ('admin', 'admin@example.com', password_hash, True))
            conn.commit()
            print("✅ Admin user created with username 'admin' and password 'admin123'")
        
        conn.close()
        print("🎉 Admin user is ready!")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    restore_admin()
