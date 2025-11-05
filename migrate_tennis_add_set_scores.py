import sqlite3
from sqlite3 import Error

def create_connection(db_file):
    """Create a database connection to the SQLite database"""
    conn = None
    try:
        conn = sqlite3.connect(db_file)
        return conn
    except Error as e:
        print(e)
    return conn

def add_set_scores_column():
    """Add set_scores column to tennis_matches table"""
    database = 'stats.db'
    conn = create_connection(database)
    
    if conn is not None:
        try:
            cursor = conn.cursor()
            
            # Check if column already exists
            cursor.execute("PRAGMA table_info(tennis_matches)")
            columns = [column[1] for column in cursor.fetchall()]
            
            if 'set_scores' not in columns:
                # Add the new column
                cursor.execute('''
                    ALTER TABLE tennis_matches 
                    ADD COLUMN set_scores TEXT
                ''')
                conn.commit()
                print("✅ Successfully added set_scores column to tennis_matches table")
            else:
                print("ℹ️  set_scores column already exists")
                
        except Error as e:
            print(f"❌ Error adding column: {e}")
        finally:
            conn.close()
    else:
        print("❌ Error! Cannot create database connection.")

if __name__ == '__main__':
    add_set_scores_column()

