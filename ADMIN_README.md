# Admin System Documentation

## Overview

The stats application now includes a comprehensive admin system that allows authorized users to manage the application and edit player names across all game types.

## Features

### Authentication System
- **Flask-Login Integration**: Secure user authentication
- **Admin User Management**: Create, update, and delete admin users
- **Password Security**: Uses Werkzeug for secure password hashing
- **Session Management**: Automatic login/logout functionality

### Player Management
- **Player Name Editing**: Edit player names across all game types (games, vollis, tennis, one_v_one, other)
- **Bulk Updates**: Changes are applied to all historical games
- **Player Search**: Search and filter players
- **Player Statistics**: View detailed stats before making changes

### Admin Dashboard
- **User Management**: View and manage all users
- **Player Management**: Edit player names and view statistics
- **Quick Actions**: Direct access to add/edit game functions
- **Admin Navigation**: Special admin menu items for authenticated admins

## Default Admin Account

After running the migration, a default admin account is created:

- **Username**: `admin`
- **Email**: `admin@example.com`
- **Password**: `admin123`

⚠️ **Important**: Change the default password after first login!

## Setup Instructions

1. **Run the migration**:
   ```bash
   python3 migrate_admin_auth.py
   ```

2. **Start the application**:
   ```bash
   python3 stats.py
   ```

3. **Access admin features**:
   - Go to `/login` to log in as admin
   - Access admin dashboard at `/admin`
   - Manage players at `/admin/players`

## Admin Routes

### Authentication
- `GET/POST /login` - Login page
- `GET /logout` - Logout

### Admin Dashboard
- `GET /admin` - Admin dashboard (requires admin)
- `GET /admin/users` - User management (requires admin)
- `POST /admin/users/<id>/toggle_admin` - Toggle admin status (requires admin)
- `POST /admin/users/<id>/delete` - Delete user (requires admin)

### Player Management
- `GET /admin/players` - Player management (requires admin)
- `GET/POST /admin/players/edit` - Edit player name (requires admin)

### Protected Game Routes
All add/edit/delete routes are now protected with `@admin_required`:
- `/add_game/` - Add new game
- `/edit_games/` - Edit games
- `/add_vollis_game/` - Add vollis game
- `/edit_vollis_games/` - Edit vollis games
- `/add_tennis_match/` - Add tennis match
- `/edit_tennis_matches/` - Edit tennis matches
- `/add_one_v_one_game/` - Add one v one game
- `/edit_one_v_one_games/` - Edit one v one games
- `/add_other_game/` - Add other game
- `/edit_other_games/` - Edit other games

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

- **Password Hashing**: Uses Werkzeug's secure password hashing
- **Admin-Only Access**: All admin functions require authentication
- **Session Management**: Secure user sessions with Flask-Login
- **CSRF Protection**: Built-in CSRF protection through Flask

## Player Name Editing

When editing a player name, the system will:

1. **Update all game types**: games, vollis_games, tennis_matches, one_v_one_games, other_games
2. **Update all player columns**: winner1, winner2, loser1, loser2, winner, loser, etc.
3. **Update timestamps**: Set updated_at to current time
4. **Provide feedback**: Show which tables were updated and how many records

## Navigation

### For Regular Users
- Standard navigation menu
- Login link if not authenticated

### For Admin Users
- All regular navigation items
- Admin Dashboard link
- Manage Players link
- Add Game link
- Edit Games link
- Logout with username display

## Troubleshooting

### Common Issues

1. **"Module not found" errors**: Make sure to activate the virtual environment and install dependencies
2. **Database connection errors**: Ensure the database file exists and is accessible
3. **Authentication errors**: Check that the users table was created properly

### Dependencies

Required Python packages:
- Flask
- Flask-Login
- Werkzeug
- SQLite3 (built-in)

## Future Enhancements

Potential improvements for the admin system:

1. **User Registration**: Allow admins to create new user accounts
2. **Role-Based Permissions**: Different permission levels for different users
3. **Audit Logging**: Track all admin actions
4. **Bulk Operations**: Bulk player name changes
5. **Data Export**: Export player and game data
6. **Backup/Restore**: Database backup and restore functionality
