import sqlite3
import logging
from contextlib import contextmanager
from config import config
import os

logger = logging.getLogger(__name__)

class DatabaseManager:
    """Centralized database connection management"""
    
    def __init__(self, config_name='default'):
        self.config = config[config_name]
        self.database_path = self._get_database_path()
    
    def _get_database_path(self):
        """Get the appropriate database path"""
        # Try production path first, fall back to local
        prod_path = self.config.DATABASE_PATH
        local_path = self.config.DATABASE_PATH_LOCAL
        
        if os.path.exists(prod_path) or '/home/' in prod_path:
            return prod_path
        return local_path
    
    def create_connection(self):
        """Create a database connection"""
        try:
            conn = sqlite3.connect(self.database_path)
            conn.row_factory = sqlite3.Row  # Enable column access by name
            return conn
        except sqlite3.Error as e:
            logger.error(f"Database connection error: {e}")
            return None
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = self.create_connection()
        if conn is None:
            raise sqlite3.Error("Failed to create database connection")
        
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            logger.error(f"Database transaction error: {e}")
            raise
        finally:
            conn.close()
    
    def execute_query(self, query, params=None, fetch_one=False, fetch_all=True):
        """Execute a query and return results"""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            if params:
                cursor.execute(query, params)
            else:
                cursor.execute(query)
            
            if fetch_one:
                return cursor.fetchone()
            elif fetch_all:
                return cursor.fetchall()
            else:
                return cursor.rowcount

# Global database manager instance
db_manager = DatabaseManager(
    os.environ.get('FLASK_ENV', 'development')
)

class CursorWrapper:
    """Wrapper class to mimic the old set_cur() functionality"""
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.connection = None
    
    def execute(self, query, params=None):
        """Execute a query and store results"""
        if params:
            self.last_result = self.db_manager.execute_query(query, params)
        else:
            self.last_result = self.db_manager.execute_query(query)
        return self
    
    def fetchone(self):
        """Fetch one result"""
        if hasattr(self, 'last_result') and self.last_result:
            return self.last_result[0] if isinstance(self.last_result, list) else self.last_result
        return None
    
    def fetchall(self):
        """Fetch all results"""
        if hasattr(self, 'last_result'):
            return self.last_result if isinstance(self.last_result, list) else [self.last_result]
        return []
    
    @property
    def rowcount(self):
        """Get row count"""
        if hasattr(self, 'last_result'):
            return len(self.last_result) if isinstance(self.last_result, list) else 1
        return 0

def set_cur():
    """Compatibility function for old database code"""
    return CursorWrapper(db_manager)
