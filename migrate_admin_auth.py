#!/usr/bin/env python3
"""
Migration script to add admin authentication system
"""

import sqlite3
import os
from datetime import datetime

def create_connection(db_file):
    """Create a database connection"""
    try:
        conn = sqlite3.connect(db_file)
        return conn
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
        return None

def migrate_database(db_path):
    """Run the migration to add users table and admin functionality"""
    conn = create_connection(db_path)
    if not conn:
        print("❌ Failed to connect to database")
        return False
    
    try:
        cursor = conn.cursor()
        
        # Create users table
        print("📝 Creating users table...")
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes for better performance
        print("📝 Creating indexes...")
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin)')
        
        # Create default admin user if no users exist
        cursor.execute('SELECT COUNT(*) FROM users')
        user_count = cursor.fetchone()[0]
        
        if user_count == 0:
            print("📝 Creating default admin user...")
            from werkzeug.security import generate_password_hash
            
            # Default admin credentials (should be changed after first login)
            default_username = "admin"
            default_email = "admin@example.com"
            default_password = "admin123"  # Change this!
            
            password_hash = generate_password_hash(default_password, method='pbkdf2:sha256')
            
            cursor.execute('''
                INSERT INTO users (username, email, password_hash, is_admin)
                VALUES (?, ?, ?, ?)
            ''', (default_username, default_email, password_hash, True))
            
            print(f"✅ Default admin user created:")
            print(f"   Username: {default_username}")
            print(f"   Email: {default_email}")
            print(f"   Password: {default_password}")
            print("   ⚠️  Please change the default password after first login!")
        
        conn.commit()
        print("✅ Migration completed successfully!")
        return True
        
    except sqlite3.Error as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def main():
    """Main migration function"""
    print("🚀 Starting admin authentication migration...")
    
    # Try different database paths
    db_paths = [
        'stats.db',  # Local and production
        os.path.join(os.path.dirname(__file__), 'stats.db')  # Relative to script
    ]
    
    db_found = False
    for db_path in db_paths:
        if os.path.exists(db_path):
            print(f"📁 Found database at: {db_path}")
            if migrate_database(db_path):
                db_found = True
                break
        else:
            print(f"❌ Database not found at: {db_path}")
    
    if not db_found:
        print("❌ No database found. Please ensure stats.db exists.")
        return False
    
    print("🎉 Admin authentication system is ready!")
    return True

if __name__ == '__main__':
    main()
