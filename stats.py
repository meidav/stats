from flask import Flask, render_template, request, url_for, flash, redirect, session, jsonify, send_from_directory
from database_functions import *
from stat_functions import *
from datetime import datetime, date, timedelta, timezone
from vollis_functions import *
from tennis_functions import *
from one_v_one_functions import *
from other_functions import *
import hmac
import werkzeug.security as _werkzeug_security

# Werkzeug 2.2 removed safe_str_cmp; older Flask-Login on PA still imports it.
if not hasattr(_werkzeug_security, 'safe_str_cmp'):
    _werkzeug_security.safe_str_cmp = lambda a, b: hmac.compare_digest(str(a), str(b))

from auth import init_auth, create_users_table, get_user_by_username, get_user_by_email, verify_password, login_user, logout_user, admin_required, get_all_users, update_user_admin_status, delete_user, get_user_by_id, create_user
from arbel_prefix import ArbelPrefixMiddleware, is_arbel_request, redirect_legacy_to_arbel
from player_management import (
    get_all_players,
    get_player_games_count,
    update_player_name,
    search_players,
    get_player_stats,
    get_players_with_counts,
    count_all_players,
    get_player_photo_url,
    save_player_photo,
    save_player_photo_data_url,
    remove_player_photo,
)
import pytz
import logging
import subprocess
import sys
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'b83880e869f054bfc465a6f46125ac715e7286ed25e88537')
app.debug = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
app.config['MAX_CONTENT_LENGTH'] = 32 * 1024 * 1024  # stats import + profile photos

# Session configuration for persistent login (30 days)
_is_production = os.environ.get('FLASK_ENV') == 'production'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
app.config['SESSION_COOKIE_SECURE'] = _is_production
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['REMEMBER_COOKIE_DURATION'] = timedelta(days=30)
app.config['REMEMBER_COOKIE_SECURE'] = _is_production
app.config['REMEMBER_COOKIE_HTTPONLY'] = True

# Initialize authentication (keep startup resilient so a DB hiccup cannot blank the site)
login_manager = init_auth(app)
try:
    create_users_table()
except Exception as exc:
    logging.getLogger(__name__).error("Could not ensure users table: %s", exc)

# Mobile API (optional; needs Flask-JWT-Extended and Flask-CORS on the server)
try:
    from api import init_api
    init_api(app)
except Exception as exc:
    logging.getLogger(__name__).debug("Mobile API skipped: %s", exc)

# Set up Flask logging to console
def setup_logging():
    handler = logging.StreamHandler()  # This will log to the console
    handler.setLevel(logging.ERROR)  # Set the logging level to ERROR
    app.logger.addHandler(handler)

# Set up logging when app starts
setup_logging()

@app.context_processor
def _template_globals():
    return {"current_year": date.today().year}

@app.before_request
def _redirect_legacy_stats():
    return redirect_legacy_to_arbel()

# TIME OFFSET
TIME_OFFSET = -8 #set this to the difference between your timezone and utc

def get_local_time():
    utc_now = datetime.now()
    local_time = utc_now + timedelta(hours=TIME_OFFSET)
    return local_time

def get_min_delta():
    # this delta function represents the number of games which will be divided by to determine the min games for rare games calculations
    # so if the db has 55 games, the calc would be 55 / [this number], and it floors (rounds down) that result
    # return 30 for the old default delta
    return 30

# Helper function to get stats for the last 30 days
def last_30_days_stats():
    try:
        today = date.today()
        thirty_days_ago = today - timedelta(days=30)
        
        # Assuming you have a database function that fetches stats for a date range
        # Replace 'get_stats_for_date_range' with your actual query or database function.
        # Here's an example:
        stats = get_stats_for_date_range(str(thirty_days_ago), str(today))
        
        return stats
    except Exception as e:
        print(f"Error fetching last 30 days stats: {e}")
        return []  # Return empty list on failure to ensure stability

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(
        os.path.join(app.root_path, 'static'),
        'favicon.ico',
        mimetype='image/vnd.microsoft.icon',
    )


@app.route('/apple-touch-icon.png')
@app.route('/apple-touch-icon-precomposed.png')
def apple_touch_icon():
    return send_from_directory(os.path.join(app.root_path, 'static'), 'apple-touch-icon.png')


@app.route('/')
def index():
    if not is_arbel_request():
        return render_template('marketing.html')
    try:
        games = year_games(str(date.today().year))
        tot_games = len(games)
        if games:
            if tot_games < get_min_delta():
                minimum_games = 1
            else:
                minimum_games = tot_games // get_min_delta()
        else:
            minimum_games = 1
        all_years = grab_all_years()
        t_stats = todays_stats()
        games = todays_games()
        stats = stats_per_year(str(date.today().year), minimum_games)
        rare_stats = rare_stats_per_year(str(date.today().year), minimum_games)
        
        #flash(f'Total games for rare stats: "{tot_games}"', 'info')
        #flash(f'Minimum games for rare stats: "{minimum_games}"', 'info')

        # Get last 30 days stats
        last_30_stats = last_30_days_stats()

        return render_template('stats.html', todays_stats=t_stats, stats=stats, games=games, rare_stats=rare_stats, minimum_games=minimum_games,
                               year=str(date.today().year), all_years=all_years, last_30_stats=last_30_stats, tot_games=tot_games)

    except Exception as e:
        print(f"Error in the index route: {e}")
        return redirect(('error.html'))  # Optionally redirect to an error page


@app.route('/stats/<year>/')
def stats(year):
    games = year_games(year)
    tot_games = len(games)
    if games:
        if tot_games < get_min_delta():
            minimum_games = 1
        else:
            minimum_games = tot_games // get_min_delta()
    else:
        minimum_games = 1
    all_years = grab_all_years()
    t_stats = todays_stats()
    stats = stats_per_year(year, minimum_games)
    rare_stats = rare_stats_per_year(year, minimum_games)
    last_30_stats = None
    return render_template('stats.html', todays_stats=t_stats, all_years=all_years, stats=stats, rare_stats=rare_stats, minimum_games=minimum_games, year=year, 
                           last_30_stats=last_30_stats, tot_games=tot_games)

@app.route('/top_teams/')
def top_teams():
    all_years = grab_all_years()
    games = year_games(str(date.today().year))
    year = str(date.today().year)
    tot_games = len(games)
    min_delta = 50
    if games:
        if tot_games < min_delta:
            minimum_games = 1
        else:
            minimum_games = tot_games // min_delta
    else:
        minimum_games = 1
    stats = team_stats_per_year(year, minimum_games, games)
    return render_template('top_teams.html', all_years=all_years, stats=stats, minimum_games=minimum_games, year=year, tot_games=tot_games)

@app.route('/top_teams/<year>/')
def top_teams_by_year(year):
    games = year_games(year)
    tot_games = len(games)
    min_delta = 50
    if games:
        if tot_games < min_delta:
            minimum_games = 1
        else:
            minimum_games = tot_games // min_delta
    else:
        minimum_games = 1
    all_years = grab_all_years()
    stats = team_stats_per_year(year, minimum_games, games)
    return render_template('top_teams.html', all_years=all_years, stats=stats, minimum_games=minimum_games, year=year, tot_games=tot_games)

@app.route('/player/<year>/<name>')
def player_stats(year, name):
    games = games_from_player_by_year(year, name)
    if games:
        if len(games) < 40:
            minimum_games = 1
        else:
            minimum_games = len(games) // 40
    else:
        minimum_games = 1
    all_years = all_years_player(name)
    games = sort_games_newest_first(games_from_player_by_year(year, name))
    stats = total_stats(games, name)
    partner_stats = partner_stats_by_year(name, games, minimum_games)
    opponent_stats = opponent_stats_by_year(name, games, minimum_games)
    rare_partner_stats = rare_partner_stats_by_year(name, games, minimum_games)
    rare_opponent_stats = rare_opponent_stats_by_year(name, games, minimum_games)

    # Year standings threshold (for ranking among all players, not partner min)
    year_game_rows = year_games(year) if year != 'All years' else all_games()
    tot_games = len(year_game_rows)
    if year_game_rows:
        year_min = 1 if tot_games < get_min_delta() else tot_games // get_min_delta()
    else:
        year_min = 1
    rank, field_size = player_rank_in_year(year, name, year_min)

    wins = stats[0][1] if stats else 0
    losses = stats[0][2] if stats else 0
    win_pct = stats[0][3] if stats else 0
    rating = player_point_rating(games, name)
    streak = player_streak(games, name)
    last_results = player_last_results(games, name, 10)
    initials = player_initials(name)
    games_display = convert_ampm(games)
    photo_url = get_player_photo_url(name)

    return render_template(
        'player.html',
        opponent_stats=opponent_stats,
        rare_opponent_stats=rare_opponent_stats,
        partner_stats=partner_stats,
        rare_partner_stats=rare_partner_stats,
        year=year,
        player=name,
        minimum_games=minimum_games,
        all_years=all_years,
        stats=stats,
        games=games_display,
        wins=wins,
        losses=losses,
        win_pct=win_pct,
        games_played=wins + losses,
        rating=rating,
        rank=rank,
        field_size=field_size,
        streak=streak,
        last_results=last_results,
        initials=initials,
        photo_url=photo_url,
    )

@app.route('/games/')
def games():
    all_years = grab_all_years()
    games = year_games(str(date.today().year))
    year = str(date.today().year)
    return render_template('games.html', games=games, year=year, all_years=all_years)

@app.route('/games/<year>')
def games_by_year(year):
    all_years = grab_all_years()
    games = year_games(year)
    return render_template('games.html', games=games, year=year, all_years=all_years)

# Authentication routes
@app.route('/login', methods=['GET', 'POST'])
def login():
    if not is_arbel_request():
        return render_template('marketing_login.html')

    # Ensure users table exists and admin user is created
    create_users_table()
    
    # Check if admin user exists, if not create it
    admin_user = get_user_by_username('admin')
    if not admin_user:
        from werkzeug.security import generate_password_hash
        cur = set_cur()
        password_hash = generate_password_hash('admin123', method='pbkdf2:sha256')
        try:
            cur.execute('''
                INSERT INTO users (username, email, password_hash, is_admin)
                VALUES (?, ?, ?, ?)
            ''', ('admin', 'admin@example.com', password_hash, True))
            cur.connection.commit()
            print("Admin user created successfully")
        except Exception as e:
            print(f"Error creating admin user: {e}")
    
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        print(f"DEBUG: Login attempt - Username: {username}")
        
        user = get_user_by_username(username)
        if not user:
            user = get_user_by_email(username)
        if user:
            print(f"DEBUG: User found - ID: {user.id}, Username: {user.username}, Is Admin: {user.is_admin}")
            password_valid = verify_password(user, password)
            print(f"DEBUG: Password valid: {password_valid}")
            
            if password_valid:
                login_user(user, remember=True)
                flash('Successfully logged in!', 'success')
                print(f"DEBUG: User {username} logged in successfully")
                next_page = request.args.get('next')
                if next_page:
                    return redirect(next_page)
                if user.is_admin:
                    return redirect(url_for('admin_dashboard'))
                return redirect(url_for('index'))
            else:
                print(f"DEBUG: Invalid password for user {username}")
                flash('Invalid username or password', 'danger')
        else:
            print(f"DEBUG: User {username} not found")
            flash('Invalid username or password', 'danger')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    logout_user()
    flash('You have been logged out', 'info')
    return redirect(url_for('index'))

@app.route('/admin')
@admin_required
def admin_dashboard():
    """PlayTracker admin at /admin. Legacy volleyball admin at /arbel/admin."""
    users = get_all_users()
    players_count = count_all_players()
    jwt_days = 30
    try:
        from api.app_settings import jwt_access_token_days
        jwt_days = jwt_access_token_days()
    except Exception:
        pass
    if is_arbel_request():
        return render_template(
            'admin_dashboard.html',
            users=users,
            players_count=players_count,
        )
    return render_template(
        'admin_playtracker.html',
        users=users,
        players_count=players_count,
        jwt_access_token_days=jwt_days,
    )


@app.route('/admin/import-legacy', methods=['POST'])
@admin_required
def admin_import_legacy():
    uploaded = request.files.get('database')
    if not uploaded or not uploaded.filename:
        flash('Choose the stats.db file from PythonAnywhere.', 'danger')
        return redirect(url_for('admin_dashboard'))

    import tempfile
    handle = tempfile.NamedTemporaryFile(suffix='.db', delete=False)
    source_path = handle.name
    handle.close()
    try:
        uploaded.save(source_path)
        from api.legacy_import import fetch_player_photos, import_legacy_sqlite
        from db_utils import db_manager
        from player_management import UPLOAD_DIR

        report = import_legacy_sqlite(source_path, db_manager.database_path)
        flash('Legacy stats imported. ' + '; '.join(f'{key}: {value}' for key, value in report.items()), 'success')
        if request.form.get('fetch_photos'):
            photos = fetch_player_photos(db_manager.database_path, UPLOAD_DIR)
            flash(
                f"Player photos: fetched {photos['fetched']}, already on disk {photos['skipped']}, missing {photos['missing']}.",
                'info',
            )
    except Exception as exc:
        flash(f'Import failed: {exc}', 'danger')
    finally:
        try:
            os.remove(source_path)
        except OSError:
            pass
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/settings', methods=['POST'])
@admin_required
def admin_save_settings():
    raw = (request.form.get('jwt_access_token_days') or '').strip()
    try:
        days = int(raw)
    except ValueError:
        flash('Session duration must be a number of days.', 'danger')
        return redirect(url_for('admin_dashboard'))
    if days < 1 or days > 365:
        flash('Session duration must be between 1 and 365 days.', 'danger')
        return redirect(url_for('admin_dashboard'))
    try:
        from api.app_settings import apply_runtime_settings, set_setting
        set_setting('jwt_access_token_days', days)
        apply_runtime_settings(app)
    except Exception as exc:
        flash(f'Could not save settings: {exc}', 'danger')
        return redirect(url_for('admin_dashboard'))
    flash(f'App session duration saved: {days} day{"s" if days != 1 else ""}. New sign-ins use this value.', 'success')
    return redirect(url_for('admin_dashboard'))

@app.route('/admin/users')
@admin_required
def admin_users():
    """Manage admin accounts"""
    users = get_all_users()
    return render_template('admin_users.html', users=users)


@app.route('/admin/users/create', methods=['POST'])
@admin_required
def create_admin_user():
    """Create a new account with admin privileges"""
    username = (request.form.get('username') or '').strip()
    email = (request.form.get('email') or '').strip()
    password = request.form.get('password') or ''
    confirm = request.form.get('confirm_password') or ''

    if not username or not email or not password:
        flash('Username, email, and password are required.', 'danger')
        return redirect(url_for('admin_users'))
    if password != confirm:
        flash('Passwords do not match.', 'danger')
        return redirect(url_for('admin_users'))
    if len(password) < 8:
        flash('Password must be at least 8 characters.', 'danger')
        return redirect(url_for('admin_users'))

    if create_user(username, email, password, is_admin=True):
        flash('Admin account created successfully.', 'success')
    else:
        flash('Could not create that account. The username or email may already be in use.', 'danger')
    return redirect(url_for('admin_users'))

@app.route('/admin/users/<int:user_id>/toggle_admin', methods=['POST'])
@admin_required
def toggle_user_admin(user_id):
    """Toggle admin status for a user"""
    is_admin = request.form.get('is_admin') == 'true'
    if update_user_admin_status(user_id, is_admin):
        flash(f'User admin status updated', 'success')
    else:
        flash('Failed to update user admin status', 'danger')
    return redirect(url_for('admin_users'))

@app.route('/admin/users/<int:user_id>/delete', methods=['POST'])
@admin_required
def delete_user_admin(user_id):
    """Delete a user"""
    if delete_user(user_id):
        flash('User deleted successfully', 'success')
    else:
        flash('Failed to delete user', 'danger')
    return redirect(url_for('admin_users'))

@app.route('/admin/players')
@admin_required
def admin_players():
    """Manage players"""
    search_query = request.args.get('search', '')
    sort_by = request.args.get('sort', 'name')
    sort_order = request.args.get('order', 'asc')
    player_data = get_players_with_counts(search_query=search_query, sort_by=sort_by, sort_order=sort_order)
    return render_template(
        'admin_players.html',
        players=player_data,
        search_query=search_query,
        sort_by=sort_by,
        sort_order=sort_order,
    )

@app.route('/refresh-user')
def refresh_user():
    """Force refresh user data from database"""
    if current_user.is_authenticated:
        # Reload user from database
        user = get_user_by_id(current_user.id)
        if user:
            login_user(user, remember=True)
            flash('User data refreshed', 'success')
        else:
            flash('User not found', 'danger')
    return redirect(url_for('index'))

@app.route('/fix-admin')
def fix_admin():
    """Emergency fix for admin users"""
    try:
        from werkzeug.security import generate_password_hash

        # Ensure users table exists
        create_users_table()

        # Create/fix admin user
        cur = set_cur()

        # Check if admin exists
        cur.execute("SELECT id, is_admin FROM users WHERE username = 'admin'")
        admin_user = cur.fetchone()

        if admin_user:
            user_id, is_admin = admin_user
            if not is_admin:
                # Fix admin status
                cur.execute("UPDATE users SET is_admin = 1 WHERE username = 'admin'")
                cur.connection.commit()
                print("Fixed admin user privileges")

        # Create arbel admin if it doesn't exist
        cur.execute("SELECT id FROM users WHERE username = 'arbel'")
        arbel_user = cur.fetchone()

        if not arbel_user:
            password_hash = generate_password_hash('Caleb00!!', method='pbkdf2:sha256')
            cur.execute('''
                INSERT INTO users (username, email, password_hash, is_admin)
                VALUES (?, ?, ?, ?)
            ''', ('arbel', 'arbel@example.com', password_hash, True))
            cur.connection.commit()
            print("Created arbel admin user")

        # Show all users
        cur.execute("SELECT id, username, is_admin FROM users")
        users = cur.fetchall()

        result = "Users in database:<br>"
        for user in users:
            result += f"ID: {user[0]}, Username: {user[1]}, Is Admin: {user[2]}<br>"

        return result

    except Exception as e:
        return f"Error: {str(e)}"

@app.route('/api/latest-commit')
def latest_commit():
    """Return current and previous commit details for the browser console."""
    try:
        repo_dir = os.path.dirname(os.path.abspath(__file__))
        result = subprocess.run(
            [
                'git', 'log', '-2',
                '--pretty=format:%h%x09%cd%x09%s',
                '--date=format:%Y-%m-%d %H:%M',
            ],
            capture_output=True,
            text=True,
            cwd=repo_dir,
        )
        if result.returncode != 0 or not result.stdout.strip():
            return {'error': 'Unable to get commit info'}, 500

        commits = []
        for line in result.stdout.strip().splitlines():
            parts = line.split('\t', 2)
            if len(parts) != 3:
                continue
            commits.append({
                'hash': parts[0].strip(),
                'date': parts[1].strip(),
                'subject': parts[2].strip(),
            })

        payload = {
            'current': commits[0] if commits else None,
            'previous': commits[1] if len(commits) > 1 else None,
        }
        return payload
    except Exception as e:
        return {'error': str(e)}, 500

@app.route('/admin/edit-user/<int:user_id>', methods=['POST'])
@admin_required
def edit_user_admin(user_id):
    """Edit user details"""
    try:
        username = request.form['username']
        email = request.form['email']
        password = request.form.get('password', '')
        is_admin = 'is_admin' in request.form
        
        cur = set_cur()
        
        # Update user
        if password:
            # Update with new password
            from werkzeug.security import generate_password_hash
            password_hash = generate_password_hash(password, method='pbkdf2:sha256')
            cur.execute('''
                UPDATE users 
                SET username = ?, email = ?, password_hash = ?, is_admin = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (username, email, password_hash, is_admin, user_id))
        else:
            # Update without changing password
            cur.execute('''
                UPDATE users 
                SET username = ?, email = ?, is_admin = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (username, email, is_admin, user_id))
        
        cur.connection.commit()
        flash('User updated successfully!', 'success')
        
    except Exception as e:
        flash('Failed to update user', 'danger')
        print(f"Error updating user: {e}")
    
    return redirect(url_for('admin_users'))

@app.route('/admin/change-password', methods=['GET', 'POST'])
@admin_required
def change_password():
    """Change admin password"""
    if request.method == 'POST':
        current_password = request.form['current_password']
        new_password = request.form['new_password']
        confirm_password = request.form['confirm_password']
        
        # Verify current password
        if not verify_password(current_user, current_password):
            flash('Current password is incorrect', 'danger')
            return render_template('change_password.html')
        
        # Check if new passwords match
        if new_password != confirm_password:
            flash('New passwords do not match', 'danger')
            return render_template('change_password.html')
        
        # Update password
        from werkzeug.security import generate_password_hash
        cur = set_cur()
        try:
            password_hash = generate_password_hash(new_password, method='pbkdf2:sha256')
            cur.execute('UPDATE users SET password_hash = ? WHERE id = ?', (password_hash, current_user.id))
            cur.connection.commit()
            flash('Password updated successfully!', 'success')
            return redirect(url_for('admin_dashboard'))
        except Exception as e:
            flash('Failed to update password', 'danger')
            print(f"Error updating password: {e}")
    
    return render_template('change_password.html')

@app.route('/admin/players/edit', methods=['GET', 'POST'])
@admin_required
def edit_player():
    """Edit player profile (name + photo) and view summary stats."""
    from stat_functions import player_initials

    if request.method == 'POST':
        old_name = (request.form.get('old_name') or '').strip()
        new_name = (request.form.get('new_name') or '').strip()
        action = (request.form.get('action') or 'save').strip()

        if not old_name:
            flash('No player specified', 'danger')
            return redirect(url_for('admin_players'))

        if action == 'remove_photo':
            remove_player_photo(old_name)
            flash('Profile photo removed', 'success')
            return redirect(url_for('edit_player', player=old_name))

        photo_data = (request.form.get('photo_data') or '').strip()
        if photo_data.startswith('data:image/'):
            ok, result = save_player_photo_data_url(old_name, photo_data)
            if not ok:
                flash(result, 'danger')
                return redirect(url_for('edit_player', player=old_name))
            flash('Profile photo updated', 'success')
        else:
            photo = request.files.get('photo')
            if photo and photo.filename:
                ok, result = save_player_photo(old_name, photo)
                if not ok:
                    flash(result, 'danger')
                    return redirect(url_for('edit_player', player=old_name))
                flash('Profile photo updated', 'success')

        if new_name and new_name != old_name:
            success, result = update_player_name(old_name, new_name)
            if success:
                updated_tables = ', '.join(result) if result else 'profile'
                flash(f'Player name updated. Updated: {updated_tables}', 'success')
                return redirect(url_for('edit_player', player=new_name))
            flash(f'Failed to update player name: {result}', 'danger')
            return redirect(url_for('edit_player', player=old_name))

        if not photo_data.startswith('data:image/') and not (request.files.get('photo') and request.files.get('photo').filename):
            flash('No changes to save', 'info')
        return redirect(url_for('edit_player', player=old_name))

    player_name = request.args.get('player')
    if not player_name:
        flash('No player specified', 'danger')
        return redirect(url_for('admin_players'))

    stats = get_player_stats(player_name)
    doubles = stats['games']
    doubles_played = doubles['wins'] + doubles['losses']
    doubles_pct = (doubles['wins'] / doubles_played) if doubles_played else 0
    photo_url = get_player_photo_url(player_name)
    return render_template(
        'edit_player.html',
        player_name=player_name,
        stats=stats,
        doubles_wins=doubles['wins'],
        doubles_losses=doubles['losses'],
        doubles_played=doubles_played,
        doubles_pct=doubles_pct,
        photo_url=photo_url,
        initials=player_initials(player_name),
        year=str(date.today().year),
    )

@app.route('/add_game/', methods=('GET', 'POST'))
@admin_required
def add_game():
    current_year = str(date.today().year)
    games_current_year = year_games(current_year)
    all_games = year_games('All years')
    today_games = todays_games()

    tot_games = len(games_current_year)
    minimum_games = 1 if not games_current_year else max(1, tot_games // get_min_delta())
    #minimum_games = 2

    stats = stats_per_year(current_year, minimum_games)
    rare_stats = rare_stats_per_year(current_year, minimum_games)
    w_scores = winners_scores()
    l_scores = losers_scores()
    players = all_players(today_games + all_games)
    t_stats = todays_stats()

    if request.method == 'POST':
        try:
            winner1 = request.form['winner1'].strip()
            winner2 = request.form['winner2'].strip()
            loser1 = request.form['loser1'].strip()
            loser2 = request.form['loser2'].strip()
            winner_score = request.form['winner_score'].strip()
            loser_score = request.form['loser_score'].strip()
            
            # Get optional date/time played from form
            date_played = request.form.get('date_played', '').strip()
            time_played = request.form.get('time_played', '').strip()

            # Validate required fields
            if not all([winner1, winner2, loser1, loser2, winner_score, loser_score]):
                flash('All fields are required!', 'danger')
                return render_template('add_game.html', todays_stats=t_stats, games=today_games, players=players, 
                    w_scores=w_scores, l_scores=l_scores, year=current_year, stats=stats, rare_stats=rare_stats, tot_games=tot_games, 
                    minimum_games=minimum_games, winner1='', winner2='', loser1='', loser2='', winner_score='', loser_score='')
                
            # Validate numeric scores
            try:
                winner_score = int(winner_score)
                loser_score = int(loser_score)
            except ValueError:
                flash('Scores must be numeric!', 'danger')
                return render_template('add_game.html', todays_stats=t_stats, games=today_games, players=players, 
                    w_scores=w_scores, l_scores=l_scores, year=current_year, stats=stats, rare_stats=rare_stats, tot_games=tot_games, 
                    minimum_games=minimum_games, winner1=winner1, winner2=winner2, loser1=loser1, loser2=loser2, winner_score='', loser_score='')
                
            # Validate score logic
            if winner_score <= loser_score:
                flash('Winner score must be greater than loser score!', 'danger')
                return render_template('add_game.html', todays_stats=t_stats, games=today_games, players=players, 
                    w_scores=w_scores, l_scores=l_scores, year=current_year, stats=stats, rare_stats=rare_stats, tot_games=tot_games, 
                    minimum_games=minimum_games, winner1=winner1, winner2=winner2, loser1=loser1, loser2=loser2, winner_score=winner_score, loser_score=loser_score)
                
            # Validate uniqueness of players
            if len(set([winner1, winner2, loser1, loser2])) < 4:
                flash('Players must be unique!', 'danger')
                return render_template('add_game.html', todays_stats=t_stats, games=today_games, players=players, 
                    w_scores=w_scores, l_scores=l_scores, year=current_year, stats=stats, rare_stats=rare_stats, tot_games=tot_games, 
                    minimum_games=minimum_games, winner1=winner1, winner2=winner2, loser1=loser1, loser2=loser2, winner_score=winner_score, loser_score=loser_score)
                
            # Handle date/time played - use provided date/time or default to current time
            my_time = get_local_time()  # For updated_at field
            
            if date_played and time_played:
                # Use provided date and time
                date_time_played = f"{date_played} {time_played}:00"
            elif date_played:
                # Use provided date with current time
                from datetime import datetime
                current_time = datetime.now().strftime('%H:%M:%S')
                date_time_played = f"{date_played} {current_time}"
            else:
                # Use current date/time for both
                date_time_played = my_time
            
            # Save the game stats only if validation passed
            add_game_stats([date_time_played, winner1, winner2, loser1, loser2, winner_score, loser_score, my_time])

            #flash(f'Game added! date/time in db: "{my_time}"', 'success')  # Flash success message with custom category
            flash(f'Game added!', 'success')
            return redirect(url_for('add_game'))

        except Exception as e:
            # Log the error for debugging
            app.logger.error(f"Error in add_game: {e}")
            flash(f'Error saving game stats: {str(e)}', 'danger')

    return render_template('add_game.html', todays_stats=t_stats, games=today_games, players=players, 
        w_scores=w_scores, l_scores=l_scores, year=current_year, stats=stats, rare_stats=rare_stats, tot_games=tot_games, 
        minimum_games=minimum_games)



@app.route('/edit_games/')
@admin_required
def edit_games():
    all_years = grab_all_years()
    games = year_games(str(date.today().year))
    return render_template('edit_games.html', games=games, year=str(date.today().year), all_years=all_years)

@app.route('/edit_games/<year>')
@admin_required
def edit_games_by_year(year):
    #flash("Received request to edit games with year: " + year)
    all_years = grab_all_years()
    games = year_games(year)
    return render_template('edit_games.html', games=games, year=year, all_years=all_years)

@app.route('/edit_game/<int:id>/', methods=['GET', 'POST'])
@admin_required
def update(id):
    #flash(f'Received request to edit game with ID: "{id}"', 'danger')
    game_id = id
    x = find_game(game_id)

    raw = x[0]
    game = [raw[0], raw[1], raw[2], raw[3], raw[4], raw[5], raw[6], raw[7], raw[8]]
    display_game = convert_ampm([raw])[0]
    year = str(raw[1])[:4] if raw[1] else str(date.today().year)
    date_value = str(raw[1])[:10] if raw[1] else ''
    time_value = str(raw[1])[11:16] if raw[1] and len(str(raw[1])) >= 16 else ''
    w_scores = winners_scores()
    l_scores = losers_scores()
    games = year_games(str(date.today().year))
    players = all_players(games)
    template_kwargs = dict(
        game=game,
        display_game=display_game,
        players=players,
        w_scores=w_scores,
        l_scores=l_scores,
        year=year,
        date_value=date_value,
        time_value=time_value,
    )
    
    if request.method == 'POST':
        winner1 = request.form['winner1'].strip()
        winner2 = request.form['winner2'].strip()
        loser1 = request.form['loser1'].strip()
        loser2 = request.form['loser2'].strip()
        winner_score = request.form['winner_score'].strip()
        loser_score = request.form['loser_score'].strip()
        
        # Get date/time played from form
        date_played = request.form.get('date_played', '').strip()
        time_played = request.form.get('time_played', '').strip()

        # Validate required fields
        if not all([winner1, winner2, loser1, loser2, winner_score, loser_score]):
            flash('All fields are required!', 'danger')
        else:
            # Validate score values
            try:
                winner_score = int(winner_score)
                loser_score = int(loser_score)
            except ValueError:
                flash('Invalid score values!', 'danger')
                return render_template('edit_game.html', **template_kwargs)
                
            # Validate score logic
            if winner_score <= loser_score:
                flash('Winner score must be greater than loser score!', 'danger')
                return render_template('edit_game.html', **template_kwargs)
                
            # Validate uniqueness of players
            if len(set([winner1, winner2, loser1, loser2])) < 4:
                flash('Players must be unique!', 'danger')
                return render_template('edit_game.html', **template_kwargs)
            
            # Handle date/time played
            if date_played and time_played:
                # Combine date and time
                date_time_played = f"{date_played} {time_played}:00"
            elif date_played:
                # Use date with current time
                from datetime import datetime
                current_time = datetime.now().strftime('%H:%M:%S')
                date_time_played = f"{date_played} {current_time}"
            else:
                # Use existing game date if no new date provided
                date_time_played = game[1]
                
            my_time = get_local_time()

            try:
                update_game(game_id, date_time_played, winner1, winner2, winner_score, loser1, loser2, loser_score, my_time, game_id)
            except Exception as e:
                flash(f'Error updating game: {str(e)}')
                return redirect(url_for('edit_games'))

            flash(f'Game updated!', 'success')
            return redirect(url_for('edit_games'))
    
    return render_template('edit_game.html', **template_kwargs)
    

@app.route('/delete/<int:id>/',methods = ['GET','POST'])
@admin_required
def delete_game(id):
    game_id = id
    if request.method == 'POST':
        remove_game(game_id)
        flash(f'Game deleted!', 'danger')
        return redirect(url_for('edit_games'))

    # Confirmation is handled by the in-page delete modal; keep route for form POST.
    return redirect(url_for('edit_games'))

@app.route('/advanced_stats/')
def advanced_stats():
    return render_template('advanced_stats.html')

## --------------------------------------------------
## VOLLIS ROUTES
## --------------------------------------------------

@app.route('/vollis_stats/<year>/')
def vollis_stats(year):
    all_years = all_vollis_years()
    minimum_games = 2
    stats = vollis_stats_per_year(year, minimum_games)
    return render_template('vollis_stats.html', stats=stats,
        all_years=all_years, minimum_games=minimum_games, year=year)

@app.route('/vollis_stats/')
def vollis():
    all_years = all_vollis_years()
    year = str(date.today().year)
    t_stats = todays_vollis_stats()
    games = todays_vollis_games()
    minimum_games = 0
    stats = vollis_stats_per_year(year, minimum_games)
    return render_template('vollis_stats.html', stats=stats, todays_stats=t_stats, games=games,
        all_years=all_years, minimum_games=minimum_games, year=year)

@app.route('/add_vollis_game/', methods=('GET', 'POST'))
@admin_required
def add_vollis_game():
    t_games = todays_vollis_games()
    games = vollis_year_games('All years')
    players = all_vollis_players(t_games + games)
    t_stats = todays_vollis_stats()
    year = str(date.today().year)
    winning_scores = vollis_winning_scores()
    losing_scores = vollis_losing_scores()
    minimum_games = 0
    stats = vollis_stats_per_year(year, minimum_games)

    if request.method == 'POST':
        winner = request.form['winner']
        loser = request.form['loser']
        winner_score = request.form['winner_score']
        loser_score = request.form['loser_score']
        
        # Get optional date/time played from form
        date_played = request.form.get('date_played', '').strip()
        time_played = request.form.get('time_played', '').strip()

        # Validate required fields
        if not winner or not loser or not winner_score or not loser_score:
            flash('All fields are required!', 'danger')
            return render_template('add_vollis_game.html', year=year, players=players, todays_stats=t_stats, 
                           games=t_games, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)
        
        # Validate numeric scores
        try:
            winner_score = int(winner_score)
            loser_score = int(loser_score)
        except ValueError:
            flash('Scores must be numeric!', 'danger')
            return render_template('add_vollis_game.html', year=year, players=players, todays_stats=t_stats, 
                           games=t_games, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)

        # Validate score logic
        if winner_score <= loser_score:
            #flash(f'Winner\'s score must be greater than loser\'s score! winner score: {winner_score}, loser score: {loser_score}', 'danger')
            flash(f'Winner\'s score must be greater than loser\'s score!', 'danger')
            return render_template('add_vollis_game.html', year=year, players=players, todays_stats=t_stats, 
                           games=t_games, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)
        
        # Validate uniqueness of players
        if len(set([winner, loser])) < 2:
            flash('Players must be unique!', 'danger')
            return render_template('add_vollis_game.html', year=year, players=players, todays_stats=t_stats, 
                           games=t_games, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)

        # Handle date/time played - use provided date/time or default to current time
        my_time = get_local_time()  # For updated_at field
        
        if date_played and time_played:
            # Use provided date and time
            date_time_played = f"{date_played} {time_played}:00"
        elif date_played:
            # Use provided date with current time
            from datetime import datetime
            current_time = datetime.now().strftime('%H:%M:%S')
            date_time_played = f"{date_played} {current_time}"
        else:
            # Use current date/time for both
            date_time_played = my_time
        
        add_vollis_stats([date_time_played, winner, loser, winner_score, loser_score, my_time])
        flash(f'Game added!', 'success')
        return redirect(url_for('add_vollis_game'))

    return render_template('add_vollis_game.html', year=year, players=players, todays_stats=t_stats, 
                           games=t_games, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)

@app.route('/edit_vollis_games/')
@admin_required
def edit_vollis_games():
    all_years = all_vollis_years()
    games = vollis_year_games(str(date.today().year))
    return render_template('edit_vollis_games.html', games=games, all_years=all_years, 
                           year=str(date.today().year))


@app.route('/edit_past_year_vollis_games/<year>')
@admin_required
def edit_vollis_games_by_year(year):
    all_years = all_vollis_years()
    games = vollis_year_games(year)
    return render_template('edit_vollis_games.html', all_years=all_years, games=games, year=year)

@app.route('/vollis_games/')
def vollis_games():
    all_years = all_vollis_years()
    games = vollis_year_games(str(date.today().year))
    return render_template('vollis_games.html', games=games, all_years=all_years, year=str(date.today().year))

@app.route('/vollis_games/<year>')
def vollis_games_by_year(year):
    all_years = all_vollis_years()
    games = vollis_year_games(year)
    return render_template('vollis_games.html', all_years=all_years, games=games, year=year)

@app.route('/edit_vollis_game/<int:id>/', methods=['GET', 'POST'])
@admin_required
def update_vollis_game(id):
    game_id = id
    x = find_vollis_game(game_id)  # We continue using find_vollis_game
    game = [x[0][0], x[0][1], x[0][2], x[0][3], x[0][4], x[0][5], x[0][6]]
    games = vollis_year_games(str(date.today().year))
    players = all_vollis_players(games)

    if request.method == 'POST':
        winner = request.form['winner']
        loser = request.form['loser']
        winner_score = request.form['winner_score']
        loser_score = request.form['loser_score']
        
        # Get date/time played from form
        date_played = request.form.get('date_played', '').strip()
        time_played = request.form.get('time_played', '').strip()
        
        if not winner or not loser or not winner_score or not loser_score:
            flash('All fields are required!', 'danger')
        else:
            # Handle date/time played
            if date_played and time_played:
                # Combine date and time
                date_time_played = f"{date_played} {time_played}:00"
            elif date_played:
                # Use date with current time
                from datetime import datetime
                current_time = datetime.now().strftime('%H:%M:%S')
                date_time_played = f"{date_played} {current_time}"
            else:
                # Use existing game date if no new date provided
                date_time_played = game[1]
                
            my_time = get_local_time()
            edit_vollis_game(game_id, date_time_played, winner, winner_score, loser, loser_score, my_time, game_id)
            flash(f'Game updated!', 'success')
            return redirect(url_for('edit_vollis_games'))

    winning_scores = vollis_winning_scores()
    losing_scores = vollis_losing_scores()
    return render_template('edit_vollis_game.html', game=game, players=players, year=str(date.today().year), winning_scores=winning_scores, losing_scores=losing_scores)


@app.route('/delete_vollis_game/<int:id>/',methods = ['GET','POST'])
@admin_required
def delete_vollis_game(id):
    game_id = id
    if request.method == 'POST':
        remove_vollis_game(game_id)
        flash(f'Game deleted!', 'danger')
        return redirect(url_for('edit_vollis_games'))

    # Confirmation is handled by the in-page delete modal.
    return redirect(url_for('edit_vollis_games'))

@app.route('/vollis_player/<year>/<name>')
def vollis_player_stats(year, name):
    all_years = all_years_vollis_player(name)
    games = games_from_vollis_player_by_year(year, name)
    stats = total_vollis_stats(name, games)
    opponent_stats = vollis_opponent_stats_by_year(name, games)
    return render_template('vollis_player.html', opponent_stats=opponent_stats, 
        year=year, player=name, all_years=all_years, stats=stats)

## --------------------------------------------------
## TENNIS ROUTES
## --------------------------------------------------

@app.route('/tennis_stats/<year>/')
def tennis_stats(year):
    all_years = all_tennis_years()
    minimum_matches = 2
    stats = tennis_stats_per_year(year, minimum_matches)
    return render_template('tennis_stats.html', stats=stats,
        all_years=all_years, minimum_matches=minimum_matches, year=year)

@app.route('/tennis_stats/')
def tennis():
    all_years = all_tennis_years()
    year = str(date.today().year)
    t_stats = todays_tennis_stats()
    matches = todays_tennis_matches()
    minimum_matches = 0
    stats = tennis_stats_per_year(year, minimum_matches)
    return render_template('tennis_stats.html', stats=stats, todays_stats=t_stats, matches=matches,
        all_years=all_years, minimum_matches=minimum_matches, year=year)


@app.route('/add_tennis_match/', methods=('GET', 'POST'))
@admin_required
def add_tennis_match():
    t_matches = todays_tennis_matches()
    matches = tennis_year_matches('All years')
    players = all_tennis_players(t_matches + matches)
    t_stats = todays_tennis_stats()
    year = str(date.today().year)
    winning_scores = tennis_winning_scores()
    losing_scores = tennis_losing_scores()
    minimum_matches = 0
    stats = tennis_stats_per_year(year, minimum_matches)

    if request.method == 'POST':
        winner = request.form['winner']
        loser = request.form['loser']
        
        # Get optional date/time played from form
        date_played = request.form.get('date_played', '').strip()
        time_played = request.form.get('time_played', '').strip()

        # Validate required fields
        if not winner or not loser:
            flash('Winner and loser are required!', 'danger')
            return render_template('add_tennis_match.html', year=year, players=players, todays_stats=t_stats, 
                           matches=t_matches, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)
        
        # Validate uniqueness of players
        if len(set([winner, loser])) < 2:
            flash('Players must be unique!', 'danger')
            return render_template('add_tennis_match.html', year=year, players=players, todays_stats=t_stats, 
                           matches=t_matches, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)

        # Collect set scores
        sets = []
        for i in range(1, 6):  # Up to 5 sets
            winner_set = request.form.get(f'winner_set{i}', '').strip()
            loser_set = request.form.get(f'loser_set{i}', '').strip()
            
            if winner_set and loser_set:
                try:
                    winner_games = int(winner_set)
                    loser_games = int(loser_set)
                    
                    # Basic validation for tennis scoring
                    if winner_games < 0 or loser_games < 0 or winner_games > 20 or loser_games > 20:
                        flash(f'Set {i} scores must be between 0-20!', 'danger')
                        return render_template('add_tennis_match.html', year=year, players=players, todays_stats=t_stats, 
                               matches=t_matches, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)
                    
                    # Validate set winner logic
                    if winner_games == loser_games:
                        flash(f'Set {i} cannot be a tie!', 'danger')
                        return render_template('add_tennis_match.html', year=year, players=players, todays_stats=t_stats, 
                               matches=t_matches, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)
                    
                    sets.append((winner_games, loser_games))
                except ValueError:
                    flash(f'Set {i} scores must be numeric!', 'danger')
                    return render_template('add_tennis_match.html', year=year, players=players, todays_stats=t_stats, 
                           matches=t_matches, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)

        # Validate at least one set was entered
        if len(sets) == 0:
            flash('At least one set is required!', 'danger')
            return render_template('add_tennis_match.html', year=year, players=players, todays_stats=t_stats, 
                           matches=t_matches, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)

        # Validate match winner
        winner_sets = sum(1 for w, l in sets if w > l)
        loser_sets = sum(1 for w, l in sets if l > w)
        
        if winner_sets <= loser_sets:
            flash('Winner must win more sets than loser!', 'danger')
            return render_template('add_tennis_match.html', year=year, players=players, todays_stats=t_stats, 
                           matches=t_matches, winning_scores=winning_scores, losing_scores=losing_scores, stats=stats)

        # Handle date/time played - use provided date/time or default to current time
        my_time = get_local_time()  # For updated_at field
        
        if date_played and time_played:
            # Use provided date and time
            date_time_played = f"{date_played} {time_played}:00"
        elif date_played:
            # Use provided date with current time
            from datetime import datetime
            current_time = datetime.now().strftime('%H:%M:%S')
            date_time_played = f"{date_played} {current_time}"
        else:
            # Use current date/time for both
            date_time_played = my_time
        
        # Store actual set scores as text (e.g., "6-3, 6-4")
        set_scores_text = ", ".join([f"{w}-{l}" for w, l in sets])
        total_winner_games = sum(w for w, l in sets)
        total_loser_games = sum(l for w, l in sets)
        
        # Debug logging
        print(f"DEBUG: Set scores text = {set_scores_text}")
        print(f"DEBUG: Sets = {sets}")
        
        # Store both totals (for backwards compatibility) and actual set scores
        add_tennis_stats([date_time_played, winner, loser, total_winner_games, total_loser_games, my_time, set_scores_text])
        flash(f'Match added: {set_scores_text}', 'success')
        return redirect(url_for('add_tennis_match'))

    return render_template('add_tennis_match.html', year=year, players=players, todays_stats=t_stats, 
                           matches=t_matches, winning_scores=winning_scores, losing_scores=losing_scores, 
                           stats=stats)

@app.route('/edit_tennis_matches/')
@admin_required
def edit_tennis_matches():
    all_years = all_tennis_years()
    matches = tennis_year_matches(str(date.today().year))
    return render_template('edit_tennis_matches.html', matches=matches, all_years=all_years, 
                           year=str(date.today().year))


@app.route('/edit_past_year_tennis_matches/<year>')
@admin_required
def edit_tennis_matches_by_year(year):
    all_years = all_tennis_years()
    matches = tennis_year_matches(year)
    return render_template('edit_tennis_matches.html', all_years=all_years, matches=matches, year=year)

@app.route('/tennis_matches/')
def tennis_matches():
    all_years = all_tennis_years()
    matches = tennis_year_matches(str(date.today().year))
    return render_template('tennis_matches.html', matches=matches, all_years=all_years, year=str(date.today().year))

@app.route('/tennis_matches/<year>')
def tennis_matches_by_year(year):
    all_years = all_tennis_years()
    matches = tennis_year_matches(year)
    return render_template('tennis_matches.html', all_years=all_years, matches=matches, year=year)


@app.route('/edit_tennis_match/<int:id>/', methods=['GET', 'POST'])
@admin_required
def update_tennis_match(id):
    match_id = id
    x = find_tennis_match(match_id)
    # Extract all fields including set_scores (now 8 fields total)
    match = [x[0][i] if i < len(x[0]) else None for i in range(8)]
    matches = tennis_year_matches(str(date.today().year))
    players = all_tennis_players(matches)

    if request.method == 'POST':
        winner = request.form['winner']
        loser = request.form['loser']
        match_format = request.form.get('match_format', 'single_set')
        
        # Get optional date/time played from form
        date_played = request.form.get('date_played', '').strip()
        time_played = request.form.get('time_played', '').strip()

        # Validate required fields
        if not winner or not loser:
            flash('Winner and loser are required!', 'danger')
            return render_template('edit_tennis_match.html', match=match, players=players, 
                           year=str(date.today().year))
        
        # Validate uniqueness of players
        if len(set([winner, loser])) < 2:
            flash('Players must be unique!', 'danger')
            return render_template('edit_tennis_match.html', match=match, players=players, 
                           year=str(date.today().year))

        # Collect set scores (same logic as add route)
        sets = []
        for i in range(1, 6):
            winner_set = request.form.get(f'winner_set{i}', '').strip()
            loser_set = request.form.get(f'loser_set{i}', '').strip()
            
            if winner_set and loser_set:
                try:
                    winner_games = int(winner_set)
                    loser_games = int(loser_set)
                    
                    if winner_games < 0 or loser_games < 0 or winner_games > 20 or loser_games > 20:
                        flash(f'Set {i} scores must be between 0-20!', 'danger')
                        return render_template('edit_tennis_match.html', match=match, players=players, 
                               year=str(date.today().year))
                    
                    if winner_games == loser_games:
                        flash(f'Set {i} cannot be a tie!', 'danger')
                        return render_template('edit_tennis_match.html', match=match, players=players, 
                               year=str(date.today().year))
                    
                    sets.append((winner_games, loser_games))
                except ValueError:
                    flash(f'Set {i} scores must be numeric!', 'danger')
                    return render_template('edit_tennis_match.html', match=match, players=players, 
                           year=str(date.today().year))

        # Validate match format requirements
        if not sets:
            flash('At least one set is required!', 'danger')
            return render_template('edit_tennis_match.html', match=match, players=players, 
                           year=str(date.today().year))

        # Validate match winner
        winner_sets = sum(1 for w, l in sets if w > l)
        loser_sets = sum(1 for w, l in sets if l > w)
        
        if winner_sets <= loser_sets:
            flash('Winner must win more sets than loser!', 'danger')
            return render_template('edit_tennis_match.html', match=match, players=players, 
                           year=str(date.today().year))

        # Handle date/time played
        if date_played and time_played:
            date_time_played = f"{date_played} {time_played}:00"
        elif date_played:
            from datetime import datetime
            current_time = datetime.now().strftime('%H:%M:%S')
            date_time_played = f"{date_played} {current_time}"
        else:
            date_time_played = match[1]
        
        my_time = get_local_time()
        
        # Format set scores for storage
        set_scores_text = ", ".join([f"{w}-{l}" for w, l in sets])
        total_winner_games = sum(w for w, l in sets)
        total_loser_games = sum(l for w, l in sets)
        
        # Update the match with set scores
        try:
            edit_tennis_match(match_id, date_time_played, winner, total_winner_games, loser, total_loser_games, my_time, set_scores_text, match_id)
            flash(f'Match updated: {set_scores_text}', 'success')
            return redirect(url_for('edit_tennis_matches'))
        except Exception as e:
            flash(f'Error updating match: {str(e)}. If set_scores column is missing, run the migration script on PythonAnywhere.', 'danger')
            return render_template('edit_tennis_match.html', match=match, players=players, 
                           year=str(date.today().year))

    return render_template('edit_tennis_match.html', match=match, players=players, 
                           year=str(date.today().year))


@app.route('/delete_tennis_match/<int:id>/',methods = ['GET','POST'])
@admin_required
def delete_tennis_match(id):
    match_id = id
    match = find_tennis_match(match_id)
    if request.method == 'POST':
        remove_tennis_match(match_id)
        return redirect(url_for('edit_tennis_matches'))
 
    return render_template('delete_tennis_match.html', match=match)

@app.route('/tennis_player/<year>/<name>')
def tennis_player_stats(year, name):
    all_years = all_years_tennis_player(name)
    matches = matches_from_tennis_player_by_year(year, name)
    stats = total_tennis_stats(name, matches)
    opponent_stats = tennis_opponent_stats_by_year(name, matches)
    return render_template('tennis_player.html', opponent_stats=opponent_stats, 
        year=year, player=name, all_years=all_years, stats=stats)


## --------------------------------------------------
## ONE V ONE ROUTES
## --------------------------------------------------

@app.route('/one_v_one_stats/<year>/')
def one_v_one_stats(year):
    all_years = all_one_v_one_years()
    minimum_games = 1
    stats = one_v_one_stats_per_year(year, minimum_games)
    return render_template('one_v_one_stats.html', stats=stats,
        all_years=all_years, minimum_games=minimum_games, year=year)

@app.route('/one_v_one_stats/')
def one_v_one():
    all_years = all_one_v_one_years()
    year = str(date.today().year)
    t_stats = todays_one_v_one_stats()
    games = todays_one_v_one_games()
    minimum_games = 0
    stats = one_v_one_stats_per_year(year, minimum_games)
    return render_template('one_v_one_stats.html', stats=stats, todays_stats=t_stats, games=games,
        all_years=all_years, minimum_games=minimum_games, year=year)


@app.route('/add_one_v_one_game/', methods=('GET', 'POST'))
@admin_required
def add_one_v_one_game():
    games = one_v_one_year_games('All years')
    game_types = one_v_one_game_types(games)
    game_names = one_v_one_game_names(games)
    players = all_one_v_one_players(games)
    stats = todays_one_v_one_stats()
    year = str(date.today().year)
    winning_scores = one_v_one_winning_scores()
    losing_scores = one_v_one_losing_scores()
    if request.method == 'POST':
        game_type = request.form['game_type']
        game_name = request.form['game_name']
        winner = request.form['winner']
        loser = request.form['loser']
        winner_score = request.form['winner_score']
        loser_score = request.form['loser_score']

        if not game_type or not game_name or not winner or not loser or not winner_score or not loser_score:
            flash('All fields required!')
        else:
            add_one_v_one_stats([datetime.now(), game_type, game_name, winner, loser, winner_score, loser_score, datetime.now()])
            return redirect(url_for('add_one_v_one_game'))

    return render_template('add_one_v_one_game.html', year=year, players=players, game_types=game_types, game_names=game_names, todays_stats=stats, games=games,
        winning_scores=winning_scores, losing_scores=losing_scores)


@app.route('/edit_one_v_one_games/')
@admin_required
def edit_one_v_one_games():
    all_years = all_one_v_one_years()
    games = one_v_one_year_games(str(date.today().year))
    return render_template('edit_one_v_one_games.html', games=games, all_years=all_years, year=str(date.today().year))

@app.route('/edit_past_year_one_v_one_games/<year>')
@admin_required
def edit_one_v_one_games_by_year(year):
    all_years = all_one_v_one_years()
    games = one_v_one_year_games(year)
    return render_template('edit_one_v_one_games.html', all_years=all_years, games=games, year=year)

@app.route('/one_v_one_games/')
def one_v_one_games():
    all_years = all_one_v_one_years()
    games = one_v_one_year_games(str(date.today().year))
    return render_template('one_v_one_games.html', games=games, all_years=all_years, year=str(date.today().year))

@app.route('/one_v_one_games/<year>')
def one_v_one_games_by_year(year):
    all_years = all_one_v_one_years()
    games = one_v_one_year_games(year)
    return render_template('one_v_one_games.html', all_years=all_years, games=games, year=year)


@app.route('/edit_one_v_one_game/<int:id>/',methods = ['GET','POST'])
@admin_required
def update_one_v_one_game(id):
    game_id = id
    x = find_one_v_one_game(game_id)
    game = [x[0][0], x[0][1], x[0][2], x[0][3], x[0][4], x[0][5], x[0][6]]
    games = one_v_one_year_games(str(date.today().year))
    players = all_one_v_one_players(games)
    if request.method == 'POST':
        winner = request.form['winner']
        loser = request.form['loser']
        winner_score = request.form['winner_score']
        loser_score = request.form['loser_score']

        if not winner or not loser or not winner_score or not loser_score:
            flash('All fields required!')
        else:
            edit_one_v_one_game(game_id, game[1], winner, winner_score, loser, loser_score, datetime.now(), game_id)
            return redirect(url_for('edit_one_v_one_games'))
 
    return render_template('edit_one_v_one_game.html', game=game, players=players, year=str(date.today().year))


@app.route('/delete_one_v_one_game/<int:id>/',methods = ['GET','POST'])
@admin_required
def delete_one_v_one_game(id):
    game_id = id
    game = find_one_v_one_game(id)
    if request.method == 'POST':
        remove_one_v_one_game(game_id)
        return redirect(url_for('edit_one_v_one_games'))
 
    return render_template('delete_one_v_one_game.html', game=game)

@app.route('/one_v_one_player/<year>/<name>')
def one_v_one_player_stats(year, name):
    all_years = all_years_one_v_one_player(name)
    games = games_from_one_v_one_player_by_year(year, name)
    stats = total_one_v_one_stats(name, games)
    opponent_stats = one_v_one_opponent_stats_by_year(name, games)
    return render_template('one_v_one_player.html', opponent_stats=opponent_stats, 
        year=year, player=name, all_years=all_years, stats=stats)



@app.route('/single_game_stats/<game_name>/')
def single_game_stats(game_name):
    all_years = single_game_years(game_name)
    year = str(date.today().year)
    games = single_game_games(year, game_name)
    minimum_games = 0
    stats = total_single_game_stats(games)
    return render_template('single_game_stats.html', stats=stats, game_name=game_name,
        all_years=all_years, minimum_games=minimum_games, year=year)

## --------------------------------------------------
## OTHER ROUTES
## --------------------------------------------------

@app.route('/other_stats/<year>/')
def other_stats(year):
    all_years = all_other_years()
    minimum_games = 1
    stats = other_stats_per_year(year, minimum_games)
    return render_template('other_stats.html', stats=stats,
        all_years=all_years, minimum_games=minimum_games, year=year)

@app.route('/other_stats/')
def other():
    all_years = all_other_years()
    year = str(date.today().year)
    t_stats = todays_other_stats()
    games = todays_other_games()
    minimum_games = 0
    stats = other_stats_per_year(year, minimum_games)
    return render_template('other_stats.html', stats=stats, todays_stats=t_stats, games=games,
        all_years=all_years, minimum_games=minimum_games, year=year)


@app.route('/add_other_game/', methods=('GET', 'POST'))
@admin_required
def add_other_game():
    games = other_year_games('All years')
    game_types = other_game_types(games)
    game_names = other_game_names(games)
    players = all_other_players(games)
    stats = todays_other_stats()
    year = str(date.today().year)
    winning_scores = other_winning_scores()
    losing_scores = other_losing_scores()
    if request.method == 'POST':
        game_type = request.form['game_type']
        game_name = request.form['game_name']
        winner = request.form['winner']
        loser = request.form['loser']
        winner_score = request.form['winner_score']
        loser_score = request.form['loser_score']

        if not game_type or not game_name or not winner or not loser or not winner_score or not loser_score:
            flash('All fields required!')
        else:
            add_other_stats([datetime.now(), game_type, game_name, winner, loser, winner_score, loser_score, datetime.now()])
            return redirect(url_for('add_other_game'))

    return render_template('add_other_game.html', year=year, players=players, game_types=game_types, game_names=game_names, todays_stats=stats, games=games,
        winning_scores=winning_scores, losing_scores=losing_scores)


@app.route('/edit_other_games/')
@admin_required
def edit_other_games():
    all_years = all_other_years()
    games = other_year_games(str(date.today().year))
    return render_template('edit_other_games.html', games=games, all_years=all_years, year=str(date.today().year))

@app.route('/edit_past_year_other_games/<year>')
@admin_required
def edit_other_games_by_year(year):
    all_years = all_other_years()
    games = other_year_games(year)
    return render_template('edit_other_games.html', all_years=all_years, games=games, year=year)

@app.route('/other_games/')
def other_games():
    all_years = all_other_years()
    games = other_year_games(str(date.today().year))
    return render_template('other_games.html', games=games, all_years=all_years, year=str(date.today().year))

@app.route('/other_games/<year>')
def other_games_by_year(year):
    all_years = all_other_years()
    games = other_year_games(year)
    return render_template('other_games.html', all_years=all_years, games=games, year=year)


@app.route('/edit_other_game/<int:id>/',methods = ['GET','POST'])
@admin_required
def update_other_game(id):
    game_id = id
    x = find_other_game(game_id)
    game = [x[0][0], x[0][1], x[0][2], x[0][3], x[0][4], x[0][5], x[0][6]]
    games = other_year_games(str(date.today().year))
    players = all_other_players(games)
    if request.method == 'POST':
        winner = request.form['winner']
        loser = request.form['loser']
        winner_score = request.form['winner_score']
        loser_score = request.form['loser_score']

        if not winner or not loser or not winner_score or not loser_score:
            flash('All fields required!')
        else:
            edit_other_game(game_id, game[1], winner, winner_score, loser, loser_score, datetime.now(), game_id)
            return redirect(url_for('edit_other_games'))
 
    return render_template('edit_other_game.html', game=game, players=players, year=str(date.today().year))


@app.route('/delete_other_game/<int:id>/',methods = ['GET','POST'])
@admin_required
def delete_other_game(id):
    game_id = id
    game = find_other_game(id)
    if request.method == 'POST':
        remove_other_game(game_id)
        return redirect(url_for('edit_other_games'))
 
    return render_template('delete_other_game.html', game=game)

@app.route('/other_player/<year>/<name>')
def other_player_stats(year, name):
    all_years = all_years_other_player(name)
    games = games_from_other_player_by_year(year, name)
    stats = total_other_stats(name, games)
    opponent_stats = other_opponent_stats_by_year(name, games)
    return render_template('other_player.html', opponent_stats=opponent_stats, 
        year=year, player=name, all_years=all_years, stats=stats)


@app.route('/deploy', methods=['POST'])
def deploy():
    """Webhook endpoint for automated deployment"""
    try:
        # Change to the stats directory
        os.chdir('/home/arbel/stats')
        
        # Pull latest changes
        subprocess.run(['git', 'fetch', 'origin'], check=True)
        subprocess.run(['git', 'reset', '--hard', 'origin/main'], check=True)

        # Install/update Python deps. Under uWSGI, sys.executable is uwsgi itself,
        # so prefer pip3/pip rather than `python -m pip`.
        pip_error = None
        for pip_cmd in (
            ['pip3', 'install', '--user', '-r', 'requirements.txt'],
            ['pip', 'install', '--user', '-r', 'requirements.txt'],
        ):
            result = subprocess.run(pip_cmd, capture_output=True, text=True)
            if result.returncode == 0:
                pip_error = None
                break
            pip_error = (result.stderr or result.stdout or 'pip install failed').strip()
        
        # Reload the web app even if pip had issues (code/static still need a reload)
        subprocess.run(['touch', '/var/www/arbel_pythonanywhere_com_wsgi.py'], check=True)

        if pip_error:
            return f'Deployed code and reloaded, but pip install failed: {pip_error}', 200
        
        return 'Deployment successful', 200
    except Exception as e:
        return f'Deployment failed: {str(e)}', 500


@app.route('/about')
def marketing_about():
    return render_template('marketing_about.html')


@app.route('/privacy')
def marketing_privacy():
    if is_arbel_request():
        return redirect('/privacy')
    return render_template('marketing_legal.html', page='privacy')


@app.route('/terms')
def marketing_terms():
    if is_arbel_request():
        return redirect('/terms')
    return render_template('marketing_legal.html', page='terms')


@app.errorhandler(404)
def not_found_error(error):
    if request.path.startswith('/api'):
        return jsonify({"error": "not found"}), 404
    return render_template(
        'error.html',
        code=404,
        title='Ball went long',
        message='This page is out of boundaries.',
    ), 404

@app.errorhandler(500)
def internal_error(error):
    import traceback
    app.logger.error(traceback.format_exc())
    detail = None
    if app.debug:
        detail = traceback.format_exc()
    return render_template(
        'error.html',
        code=500,
        title='Whiffed that one',
        message='Something spiked the server. The ball is still in play though. Try again or head back to stats.',
        detail=detail,
    ), 500


app.wsgi_app = ArbelPrefixMiddleware(app.wsgi_app)
