#!/usr/bin/env python3
"""
Migration script to add set_scores column to tennis_matches table.
Run this on PythonAnywhere console: python3 migrate_tennis_set_scores.py
"""
import sqlite3
from sqlite3 import Error

def create_connection(db_file):
    """Create a database connection to the SQLite database"""
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        return conn
    except Error as e:
        print(f"Error connecting to database: {e}")
    return conn

def add_set_scores_column():
    """Add set_scores column to tennis_matches table if it doesn't exist"""
    # Use local/production database path
    for database in ['stats.db']:
        print(f"\nTrying database: {database}")
        conn = create_connection(database)
        
        if conn is not None:
            try:
                cursor = conn.cursor()
                
                # Check if column already exists
                cursor.execute("PRAGMA table_info(tennis_matches)")
                columns = [column[1] for column in cursor.fetchall()]
                
                if 'set_scores' not in columns:
                    print(f"  Adding set_scores column...")
                    cursor.execute('''
                        ALTER TABLE tennis_matches 
                        ADD COLUMN set_scores TEXT
                    ''')
                    conn.commit()
                    print(f"  ✅ Successfully added set_scores column!")
                else:
                    print(f"  ℹ️  set_scores column already exists")
                
                # Show sample data
                cursor.execute("SELECT id, winner, loser, set_scores FROM tennis_matches LIMIT 3")
                rows = cursor.fetchall()
                print(f"\n  Sample data:")
                for row in rows:
                    print(f"    ID {row[0]}: {row[1]} vs {row[2]} - set_scores: {row[3]}")
                    
                conn.close()
                print(f"\n✅ Migration completed for {database}\n")
                break  # Success, exit loop
                    
            except Error as e:
                print(f"  ❌ Error: {e}")
                if conn:
                    conn.close()
        else:
            print(f"  ❌ Could not connect to {database}")

if __name__ == '__main__':
    print("=" * 60)
    print("Tennis Set Scores Migration")
    print("=" * 60)
    add_set_scores_column()
