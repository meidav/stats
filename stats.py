from flask import Flask, render_template, request, url_for, flash, redirect, session
from database_functions import *
from stat_functions import *
from datetime import datetime, date, timedelta, timezone
from vollis_functions import *
from tennis_functions import *
from one_v_one_functions import *
from other_functions import *
from auth import init_auth, create_users_table, get_user_by_username, verify_password, login_user, logout_user, admin_required, get_all_users, update_user_admin_status, delete_user, get_user_by_id
from player_management import get_all_players, get_player_games_count, update_player_name, search_players, get_player_stats
import pytz
import logging
import subprocess
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'b83880e869f054bfc465a6f46125ac715e7286ed25e88537'
app.debug = True

# Session configuration for persistent login (30 days)
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
app.config['SESSION_COOKIE_SECURE'] = False  # Set to True if using HTTPS
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['REMEMBER_COOKIE_DURATION'] = timedelta(days=30)
app.config['REMEMBER_COOKIE_SECURE'] = False  # Set to True if using HTTPS
app.config['REMEMBER_COOKIE_HTTPONLY'] = True

# Initialize authentication
login_manager = init_auth(app)
create_users_table()

# Set up Flask logging to console
def setup_logging():
    handler = logging.StreamHandler()  # This will log to the console
    handler.setLevel(logging.ERROR)  # Set the logging level to ERROR
    app.logger.addHandler(handler)

# Set up logging when app starts
setup_logging()

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

@app.route('/')
def index():
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
    games = games_from_player_by_year(year, name)
    stats = total_stats(games, name)
    partner_stats = partner_stats_by_year(name, games, minimum_games)
    opponent_stats = opponent_stats_by_year(name, games, minimum_games)
    rare_partner_stats = rare_partner_stats_by_year(name, games, minimum_games)
    rare_opponent_stats = rare_opponent_stats_by_year(name, games, minimum_games)
    return render_template('player.html', opponent_stats=opponent_stats, rare_opponent_stats=rare_opponent_stats,
        partner_stats=partner_stats, rare_partner_stats=rare_partner_stats, 
        year=year, player=name, minimum_games=minimum_games, all_years=all_years, stats=stats)

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
        if user:
            print(f"DEBUG: User found - ID: {user.id}, Username: {user.username}, Is Admin: {user.is_admin}")
            password_valid = verify_password(user, password)
            print(f"DEBUG: Password valid: {password_valid}")
            
            if password_valid:
                login_user(user, remember=True)
                flash('Successfully logged in!', 'success')
                print(f"DEBUG: User {username} logged in successfully")
                next_page = request.args.get('next')
                return redirect(next_page) if next_page else redirect(url_for('index'))
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
    """Admin dashboard"""
    users = get_all_users()
    players = get_all_players()
    return render_template('admin_dashboard.html', users=users, players=players)

@app.route('/admin/users')
@admin_required
def admin_users():
    """Manage users"""
    users = get_all_users()
    return render_template('admin_users.html', users=users)

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
    
    if search_query:
        players = search_players(search_query)
    else:
        players = get_all_players()
    
    # Get game counts for each player
    player_data = []
    for player in players:
        game_count = get_player_games_count(player)
        player_data.append({
            'name': player,
            'game_count': game_count
        })
    
    # Sort players
    if sort_by == 'games':
        player_data.sort(key=lambda x: x['game_count'], reverse=(sort_order == 'desc'))
    else:  # sort by name
        player_data.sort(key=lambda x: x['name'].lower(), reverse=(sort_order == 'desc'))
    
    return render_template('admin_players.html', players=player_data, search_query=search_query, sort_by=sort_by, sort_order=sort_order)

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
    """Get the latest git commit message"""
    try:
        result = subprocess.run(['git', 'log', '-1', '--pretty=format:%s'], 
                              capture_output=True, text=True, cwd=os.path.dirname(os.path.abspath(__file__)))
        if result.returncode == 0:
            return result.stdout.strip()
        else:
            return "Unable to get commit info"
    except Exception as e:
        return f"Error: {str(e)}"

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
    """Edit player name"""
    if request.method == 'POST':
        old_name = request.form['old_name']
        new_name = request.form['new_name'].strip()
        
        if not new_name:
            flash('New player name cannot be empty', 'danger')
            return redirect(url_for('admin_players'))
        
        if old_name == new_name:
            flash('New name is the same as the old name', 'info')
            return redirect(url_for('admin_players'))
        
        success, result = update_player_name(old_name, new_name)
        if success:
            updated_tables = ', '.join(result)
            flash(f'Player name updated successfully! Updated tables: {updated_tables}', 'success')
        else:
            flash(f'Failed to update player name: {result}', 'danger')
        
        return redirect(url_for('admin_players'))
    
    player_name = request.args.get('player')
    if not player_name:
        flash('No player specified', 'danger')
        return redirect(url_for('admin_players'))
    
    # Get player stats
    stats = get_player_stats(player_name)
    return render_template('edit_player.html', player_name=player_name, stats=stats)

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
    players = all_players(all_games)
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

    game = [x[0][0], x[0][1], x[0][2], x[0][3], x[0][4], x[0][5], x[0][6], x[0][7], x[0][8]]
    w_scores = winners_scores()
    l_scores = losers_scores()
    games = year_games(str(date.today().year))
    players = all_players(games)
    
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
                return render_template('edit_game.html', game=game, players=players, w_scores=w_scores, l_scores=l_scores)
                
            # Validate score logic
            if winner_score <= loser_score:
                flash('Winner score must be greater than loser score!', 'danger')
                return render_template('edit_game.html', game=game, players=players, w_scores=w_scores, l_scores=l_scores)
                
            # Validate uniqueness of players
            if len(set([winner1, winner2, loser1, loser2])) < 4:
                flash('Players must be unique!', 'danger')
                return render_template('edit_game.html', game=game, players=players, w_scores=w_scores, l_scores=l_scores)
            
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
    
    return render_template('edit_game.html', game=game, players=players, w_scores=w_scores, l_scores=l_scores)
    

@app.route('/delete/<int:id>/',methods = ['GET','POST'])
@admin_required
def delete_game(id):
    game_id = id
    game = find_game(id)
    if request.method == 'POST':
        remove_game(game_id)
        flash(f'Game deleted!', 'danger')
        return redirect(url_for('edit_games'))
 
    return render_template('delete_game.html', game=game)

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
    games = vollis_year_games('All years')
    players = all_vollis_players(games)
    t_stats = todays_vollis_stats()
    t_games = todays_vollis_games()
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

    return render_template('edit_vollis_game.html', game=game, players=players, year=str(date.today().year))


@app.route('/delete_vollis_game/<int:id>/',methods = ['GET','POST'])
@admin_required
def delete_vollis_game(id):
    game_id = id
    game = find_vollis_game(id)
    if request.method == 'POST':
        remove_vollis_game(game_id)
        flash(f'Game deleted!', 'danger')
        return redirect(url_for('edit_vollis_games'))
 
    return render_template('delete_vollis_game.html', game=game)

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
    matches = tennis_year_matches('All years')
    players = all_tennis_players(matches)
    t_stats = todays_tennis_stats()
    t_matches = todays_tennis_matches()
    year = str(date.today().year)
    winning_scores = tennis_winning_scores()
    losing_scores = tennis_losing_scores()
    minimum_matches = 0
    stats = tennis_stats_per_year(year, minimum_matches)

    if request.method == 'POST':
        winner = request.form['winner']
        loser = request.form['loser']
        winner_score = request.form['winner_score']
        loser_score = request.form['loser_score']

        if not winner or not loser or not winner_score or not loser_score:
            flash('All fields required!')
        else:
            # Store timestamps in UTC
            #utc_time = datetime.now(timezone.utc)
            utc_time = 3
            flash('trying to add a tennis match with utc_time: ' + utc_time)
            # Add game stats with UTC timestamps
            #add_tennis_stats([utc_time, winner, loser, winner_score, loser_score, utc_time])
            #return redirect(url_for('add_tennis_match'))

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
    match = [x[0][0], x[0][1], x[0][2], x[0][3], x[0][4], x[0][5], x[0][6]]
    matches = tennis_year_matches(str(date.today().year))
    players = all_tennis_players(matches)

    if request.method == 'POST':
        winner = request.form['winner']
        loser = request.form['loser']
        winner_score = request.form['winner_score']
        loser_score = request.form['loser_score']

        if not winner or not loser or not winner_score or not loser_score:
            flash('All fields required!')
        else:
            # Store timestamp in UTC
            utc_time = datetime.now(timezone.utc)

            # Update the match with the UTC timestamp
            edit_tennis_match(match_id, match[1], winner, winner_score, loser, loser_score, utc_time, match_id)
            return redirect(url_for('edit_tennis_matches'))

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
        
        # Reload the web app
        subprocess.run(['touch', '/var/www/arbel_pythonanywhere_com_wsgi.py'], check=True)
        
        return 'Deployment successful', 200
    except Exception as e:
        return f'Deployment failed: {str(e)}', 500

@app.errorhandler(500)
def internal_error(error):
    import traceback
    return f"<pre>{traceback.format_exc()}</pre>", 500
