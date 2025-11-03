#!/usr/bin/env python3
"""
Migration script to add set_scores column to tennis_matches table
This will store actual set scores like "6-3, 6-4" instead of just totals
"""

import sqlite3

def migrate_tennis_set_scores():
    database = 'stats.db'
    conn = sqlite3.connect(database)
    cur = conn.cursor()
    
    try:
        # Check if column already exists
        cur.execute("PRAGMA table_info(tennis_matches)")
        columns = [column[1] for column in cur.fetchall()]
        
        if 'set_scores' not in columns:
            print("Adding set_scores column to tennis_matches table...")
            cur.execute("""
                ALTER TABLE tennis_matches 
                ADD COLUMN set_scores TEXT
            """)
            conn.commit()
            print("✅ Successfully added set_scores column!")
        else:
            print("ℹ️  set_scores column already exists")
        
        # Update existing records with placeholder
        print("Updating existing records with placeholder set scores...")
        cur.execute("""
            UPDATE tennis_matches 
            SET set_scores = CAST(winner_score AS TEXT) || '-' || CAST(loser_score AS TEXT)
            WHERE set_scores IS NULL
        """)
        conn.commit()
        print(f"✅ Updated {cur.rowcount} records with placeholder set scores")
        
    except Exception as e:
        print(f"❌ Error during migration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == '__main__':
    migrate_tennis_set_scores()

