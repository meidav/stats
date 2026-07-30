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
        logger.info("Using database: %s", self.database_path)
    
    def _candidate_paths(self):
        """Ordered list of possible SQLite locations."""
        paths = []
        env_path = os.environ.get('DATABASE_PATH')
        if env_path:
            paths.append(env_path)

        prod_path = self.config.DATABASE_PATH
        local_path = self.config.DATABASE_PATH_LOCAL
        for path in (prod_path, local_path, 'stats.db'):
            if path and path not in paths:
                paths.append(path)

        # PythonAnywhere historically kept the real DB in the home directory
        home_db = os.path.expanduser('~/stats.db')
        if home_db not in paths:
            paths.append(home_db)

        abs_cwd = os.path.abspath('stats.db')
        if abs_cwd not in paths:
            paths.append(abs_cwd)

        return paths

    def _db_looks_valid(self, path):
        """Reject missing/empty stubs; require a real stats schema."""
        try:
            if not path or not os.path.exists(path) or not os.path.isfile(path):
                return False
            if os.path.getsize(path) < 1024:
                return False
            conn = sqlite3.connect(path)
            try:
                row = conn.execute(
                    "SELECT 1 FROM sqlite_master WHERE type='table' AND name IN ('games', 'users') LIMIT 1"
                ).fetchone()
                return row is not None
            finally:
                conn.close()
        except Exception as exc:
            logger.warning("Skipping database candidate %s: %s", path, exc)
            return False

    def _get_database_path(self):
        """Pick the first valid database path from known locations."""
        candidates = self._candidate_paths()

        # If DATABASE_PATH is explicitly set and valid, always use it
        env_path = os.environ.get('DATABASE_PATH')
        if env_path and self._db_looks_valid(env_path):
            self._ensure_db_dir(env_path)
            return env_path

        valid = [path for path in candidates if self._db_looks_valid(path)]
        if valid:
            # Prefer the largest valid DB (most likely the real production file)
            best = max(valid, key=lambda path: os.path.getsize(path))
            self._ensure_db_dir(best)
            return best

        # Fall back to configured path even if empty (bootstrap / first run)
        fallback = env_path or self.config.DATABASE_PATH or self.config.DATABASE_PATH_LOCAL or 'stats.db'
        self._ensure_db_dir(fallback)
        logger.warning("No valid stats database found; falling back to %s", fallback)
        return fallback

    def _ensure_db_dir(self, path):
        directory = os.path.dirname(path)
        if directory:
            os.makedirs(directory, exist_ok=True)
    
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
