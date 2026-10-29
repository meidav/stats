#!/usr/bin/env python3
"""
Database migration and setup script
Run this to set up or update your database schema
"""

import sqlite3
import os
import sys
from datetime import datetime

def create_connection(db_path):
    """Create database connection"""
    try:
        conn = sqlite3.connect(db_path)
        return conn
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
        return None

def backup_database(db_path):
    """Create a backup of existing database"""
    if os.path.exists(db_path):
        backup_path = f"{db_path}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        print(f"Creating backup: {backup_path}")
        
        try:
            # Simple file copy for SQLite
            import shutil
            shutil.copy2(db_path, backup_path)
            print(f"✅ Backup created successfully")
            return backup_path
        except Exception as e:
            print(f"❌ Backup failed: {e}")
            return None
    return None

def check_table_exists(conn, table_name):
    """Check if a table exists"""
    cursor = conn.cursor()
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
    """, (table_name,))
    return cursor.fetchone() is not None

def add_column_if_not_exists(conn, table_name, column_name, column_type):
    """Add column to table if it doesn't exist"""
    cursor = conn.cursor()
    
    # Check if column exists
    cursor.execute(f"PRAGMA table_info({table_name})")
    columns = [column[1] for column in cursor.fetchall()]
    
    if column_name not in columns:
        try:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}")
            print(f"✅ Added column {column_name} to {table_name}")
        except sqlite3.Error as e:
            print(f"❌ Error adding column {column_name}: {e}")

def create_indexes(conn):
    """Create database indexes for better performance"""
    indexes = [
        ("idx_games_date", "CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date)"),
        ("idx_games_players", "CREATE INDEX IF NOT EXISTS idx_games_players ON games(winner1, winner2, loser1, loser2)"),
        ("idx_vollis_date", "CREATE INDEX IF NOT EXISTS idx_vollis_date ON vollis(game_date)"),
        ("idx_tennis_date", "CREATE INDEX IF NOT EXISTS idx_tennis_date ON tennis(match_date)"),
    ]
    
    cursor = conn.cursor()
    for index_name, sql in indexes:
        try:
            cursor.execute(sql)
            print(f"✅ Created index: {index_name}")
        except sqlite3.Error as e:
            print(f"❌ Error creating index {index_name}: {e}")

def run_migrations(db_path):
    """Run database migrations"""
    print(f"🔄 Running migrations on: {db_path}")
    
    # Create backup first
    backup_path = backup_database(db_path)
    
    conn = create_connection(db_path)
    if not conn:
        print("❌ Failed to connect to database")
        return False
    
    try:
        # Example migrations - add as needed
        # add_column_if_not_exists(conn, 'games', 'notes', 'TEXT')
        
        # Create indexes for performance
        create_indexes(conn)
        
        # Commit changes
        conn.commit()
        print("✅ Migrations completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        conn.rollback()
        return False
    finally:
        conn.close()

def verify_database(db_path):
    """Verify database integrity"""
    print(f"🔍 Verifying database: {db_path}")
    
    conn = create_connection(db_path)
    if not conn:
        return False
    
    try:
        cursor = conn.cursor()
        
        # Check database integrity
        cursor.execute("PRAGMA integrity_check")
        result = cursor.fetchone()
        
        if result[0] == 'ok':
            print("✅ Database integrity check passed")
        else:
            print(f"❌ Database integrity check failed: {result[0]}")
            return False
        
        # Check table counts
        tables = ['games', 'vollis', 'tennis', 'one_v_one', 'other']
        for table in tables:
            if check_table_exists(conn, table):
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"📊 {table}: {count} records")
        
        return True
        
    except Exception as e:
        print(f"❌ Verification failed: {e}")
        return False
    finally:
        conn.close()

def main():
    """Main migration function"""
    # Determine database path
    db_paths = [
        'stats.db'  # Local and production
    ]
    
    db_path = None
    for path in db_paths:
        if os.path.exists(path):
            db_path = path
            break
    
    if not db_path:
        print("❌ No database found. Please create the database first.")
        return
    
    print(f"🚀 Starting database migration for: {db_path}")
    
    # Run migrations
    if run_migrations(db_path):
        # Verify after migration
        verify_database(db_path)
        print("🎉 Database migration completed!")
    else:
        print("💥 Database migration failed!")
        sys.exit(1)

if __name__ == '__main__':
    main()
