#!/usr/bin/env python3
"""
Database Migration Script: Add date_played field and rename existing date field logic

This script:
1. Adds a new 'date_played' field to all game tables
2. Copies existing 'game_date' to 'date_played' 
3. Updates the schema to properly track when game was played vs edited
4. Handles all game types: games, vollis_games, one_v_one_games, other_games
"""

import sqlite3
from datetime import datetime

def create_connection(db_file):
    """Create database connection"""
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        return conn
    except sqlite3.Error as e:
        print(f"Error connecting to database: {e}")
        return None

def migrate_games_table(conn):
    """Migrate main games table"""
    try:
        cursor = conn.cursor()
        
        # Check if date_played column already exists
        cursor.execute("PRAGMA table_info(games)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'date_played' not in columns:
            print("Adding date_played column to games table...")
            
            # Add the new column
            cursor.execute("ALTER TABLE games ADD COLUMN date_played DATETIME")
            
            # Copy game_date to date_played for existing records
            cursor.execute("""
                UPDATE games 
                SET date_played = game_date 
                WHERE date_played IS NULL
            """)
            
            print("✅ Successfully migrated games table")
        else:
            print("✅ games table already has date_played column")
            
        conn.commit()
        
    except sqlite3.Error as e:
        print(f"❌ Error migrating games table: {e}")

def migrate_vollis_games_table(conn):
    """Migrate vollis_games table"""
    try:
        cursor = conn.cursor()
        
        # Check if date_played column already exists
        cursor.execute("PRAGMA table_info(vollis_games)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'date_played' not in columns:
            print("Adding date_played column to vollis_games table...")
            
            # Add the new column
            cursor.execute("ALTER TABLE vollis_games ADD COLUMN date_played DATETIME")
            
            # Copy game_date to date_played for existing records
            cursor.execute("""
                UPDATE vollis_games 
                SET date_played = game_date 
                WHERE date_played IS NULL
            """)
            
            print("✅ Successfully migrated vollis_games table")
        else:
            print("✅ vollis_games table already has date_played column")
            
        conn.commit()
        
    except sqlite3.Error as e:
        print(f"❌ Error migrating vollis_games table: {e}")

def migrate_one_v_one_games_table(conn):
    """Migrate one_v_one_games table"""
    try:
        cursor = conn.cursor()
        
        # Check if date_played column already exists
        cursor.execute("PRAGMA table_info(one_v_one_games)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'date_played' not in columns:
            print("Adding date_played column to one_v_one_games table...")
            
            # Add the new column
            cursor.execute("ALTER TABLE one_v_one_games ADD COLUMN date_played DATETIME")
            
            # Copy game_date to date_played for existing records
            cursor.execute("""
                UPDATE one_v_one_games 
                SET date_played = game_date 
                WHERE date_played IS NULL
            """)
            
            print("✅ Successfully migrated one_v_one_games table")
        else:
            print("✅ one_v_one_games table already has date_played column")
            
        conn.commit()
        
    except sqlite3.Error as e:
        print(f"❌ Error migrating one_v_one_games table: {e}")

def migrate_other_games_table(conn):
    """Migrate other_games table if it exists"""
    try:
        cursor = conn.cursor()
        
        # Check if table exists
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='other_games'
        """)
        
        if cursor.fetchone():
            # Check if date_played column already exists
            cursor.execute("PRAGMA table_info(other_games)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'date_played' not in columns:
                print("Adding date_played column to other_games table...")
                
                # Add the new column
                cursor.execute("ALTER TABLE other_games ADD COLUMN date_played DATETIME")
                
                # Copy game_date to date_played for existing records
                cursor.execute("""
                    UPDATE other_games 
                    SET date_played = game_date 
                    WHERE date_played IS NULL
                """)
                
                print("✅ Successfully migrated other_games table")
            else:
                print("✅ other_games table already has date_played column")
        else:
            print("ℹ️  other_games table does not exist, skipping")
            
        conn.commit()
        
    except sqlite3.Error as e:
        print(f"❌ Error migrating other_games table: {e}")

def main():
    """Run the migration"""
    database = "stats.db"
    
    print("🚀 Starting database migration for date fields...")
    print(f"📁 Database: {database}")
    print(f"⏰ Migration started at: {datetime.now()}")
    print()
    
    # Create database connection
    conn = create_connection(database)
    
    if conn is not None:
        # Backup recommendation
        print("⚠️  IMPORTANT: Make sure you have a backup of your database before proceeding!")
        print()
        
        # Run migrations for each table
        migrate_games_table(conn)
        migrate_vollis_games_table(conn)
        migrate_one_v_one_games_table(conn)
        migrate_other_games_table(conn)
        
        # Close connection
        conn.close()
        
        print()
        print("🎉 Migration completed successfully!")
        print()
        print("📋 Summary of changes:")
        print("   • Added 'date_played' column to all game tables")
        print("   • Copied existing 'game_date' values to 'date_played'")
        print("   • 'game_date' will now track when the game entry was created")
        print("   • 'updated_at' continues to track when the game was last edited")
        print("   • 'date_played' can now be edited by users to reflect actual play time")
        
    else:
        print("❌ Error! Cannot create the database connection.")
        print("Make sure the stats.db file exists in the current directory.")

if __name__ == '__main__':
    main()
