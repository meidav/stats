from flask import Flask
from flask_login import UserMixin, LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from db_utils import set_cur
import sqlite3

class User(UserMixin):
    def __init__(self, id, username, email, is_admin=False):
        self.id = id
        self.username = username
        self.email = email
        self.is_admin = is_admin

    def get_id(self):
        return str(self.id)

def init_auth(app):
    """Initialize authentication system"""
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    
    @login_manager.user_loader
    def load_user(user_id):
        return get_user_by_id(user_id)
    
    return login_manager

def create_users_table():
    """Create the users table if it doesn't exist"""
    cur = set_cur()
    cur.execute('''
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

def get_user_by_id(user_id):
    """Get user by ID"""
    cur = set_cur()
    cur.execute('SELECT id, username, email, is_admin FROM users WHERE id = ?', (user_id,))
    user_data = cur.fetchone()
    
    if user_data:
        return User(user_data[0], user_data[1], user_data[2], user_data[3])
    return None

def get_user_by_username(username):
    """Get user by username"""
    cur = set_cur()
    cur.execute('SELECT id, username, email, is_admin, password_hash FROM users WHERE username = ?', (username,))
    user_data = cur.fetchone()
    
    if user_data:
        user = User(user_data[0], user_data[1], user_data[2], user_data[3])
        user.password_hash = user_data[4]
        return user
    return None

def create_user(username, email, password, is_admin=False):
    """Create a new user"""
    cur = set_cur()
    password_hash = generate_password_hash(password)
    
    try:
        cur.execute('''
            INSERT INTO users (username, email, password_hash, is_admin)
            VALUES (?, ?, ?, ?)
        ''', (username, email, password_hash, is_admin))
        return True
    except sqlite3.IntegrityError:
        return False

def verify_password(user, password):
    """Verify user password"""
    return check_password_hash(user.password_hash, password)

def admin_required(f):
    """Decorator to require admin access"""
    from functools import wraps
    from flask import abort
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            abort(403)
        return f(*args, **kwargs)
    return decorated_function

def get_all_users():
    """Get all users for admin management"""
    cur = set_cur()
    cur.execute('SELECT id, username, email, is_admin, created_at FROM users ORDER BY created_at DESC')
    return cur.fetchall()

def update_user_admin_status(user_id, is_admin):
    """Update user admin status"""
    cur = set_cur()
    cur.execute('UPDATE users SET is_admin = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                (is_admin, user_id))
    return cur.rowcount > 0

def delete_user(user_id):
    """Delete a user"""
    cur = set_cur()
    cur.execute('DELETE FROM users WHERE id = ?', (user_id,))
    return cur.rowcount > 0
