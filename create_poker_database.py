import sqlite3
from sqlite3 import Error

def create_connection(db_file):
    try:
        conn = sqlite3.connect(db_file)
        return conn
    except Error as e:
        print(e)
    return None

def create_table(conn, create_table_sql):
    try:
        c = conn.cursor()
        c.execute(create_table_sql)
    except Error as e:
        print(e)

def create_poker_session(conn, session):
    sql = ''' INSERT INTO poker_sessions(session_date, location, buy_in, cash_out, notes, updated_at)
              VALUES(?,?,?,?,?,?) '''
    cur = conn.cursor()
    cur.execute(sql, session)
    conn.commit()

def main():
    database = r"stats.db"

    sql_create_poker_table = """CREATE TABLE IF NOT EXISTS poker_sessions (
                                    id integer PRIMARY KEY,
                                    session_date DATETIME NOT NULL,
                                    location TEXT,
                                    buy_in REAL NOT NULL,
                                    cash_out REAL NOT NULL,
                                    notes TEXT,
                                    updated_at DATETIME NOT NULL
                                );"""

    conn = create_connection(database)
    if conn is not None:
        create_table(conn, sql_create_poker_table)
    else:
        print("Error! Cannot create the database connection.")

main()
