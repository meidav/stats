from flask import Flask, render_template, request, url_for, flash, redirect
from database_functions import *
from stat_functions import *
from datetime import datetime, date
from vollis_functions import *
from tennis_functions import *
from one_v_one_functions import *
from other_functions import *
from datetime import datetime
from datetime import timedelta
import pytz
import logging

app = Flask(__name__)
app.config['SECRET_KEY'] = 'b83880e869f054bfc465a6f46125ac715e7286ed25e88537'
app.debug = True

# Set up Flask logging to console
@app.before_first_request
def setup_logging():
    handler = logging.StreamHandler()  # This will log to the console
    handler.setLevel(logging.ERROR)  # Set the logging level to ERROR
    app.logger.addHandler(handler)

# Get the local timezone of the system
LOCAL_TIMEZONE = pytz.timezone('America/Los_Angeles')  # Replace with your system's timezone if needed

def get_local_time():
    """
    Returns the current time in the local timezone as a timezone-aware datetime object.
    """
    return datetime.now(LOCAL_TIMEZONE)

def convertToUserLocalTime(gmt_time_str):
    # Assuming gmt_time_str is in the format 'YYYY-MM-DD HH:MM:SS.ssssss' (GMT)
    gmt_format = '%Y-%m-%d %H:%M:%S.%f'
    
    # Parse the GMT time string into a datetime object
    gmt_time = datetime.strptime(gmt_time_str, gmt_format)
    
    # Get the user's local timezone (you can replace 'America/Los_Angeles' with the desired timezone)
    user_tz = pytz.timezone('America/Los_Angeles')
    
    # Convert the GMT time to the user's local time
    local_time = gmt_time.astimezone(user_tz)
    
    # Format the local time string as desired
    local_time_str = local_time.strftime('%Y-%m-%d %H:%M:%S')

    return local_time_str

def convertGametimeToUserLocalTime(gmt_time_str):
    # Assuming gmt_time_str is in the format 'MM/DD/YYYY HH:MM AM/PM' (GMT)
    gmt_format = '%m/%d/%Y %I:%M %p'
    
    # Parse the GMT time string into a datetime object
    gmt_time = datetime.strptime(gmt_time_str, gmt_format)
    
    # Get the user's local timezone (you can replace 'America/Los_Angeles' with the desired timezone)
    user_tz = pytz.timezone('America/Los_Angeles')
    
    # Convert the GMT time to the user's local time
    local_time = gmt_time.astimezone(user_tz)
    
    # Format the local time string as desired
    local_time_str = local_time.strftime('%Y-%m-%d %I:%M %p')
    
    return local_time_str

from datetime import timedelta

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
        if games:
            if len(games) < 30:
                minimum_games = 1
            else:
                minimum_games = len(games) // 30
        else:
            minimum_games = 1
        all_years = grab_all_years()
        t_stats = todays_stats()
        games = todays_games()
        stats = stats_per_year(str(date.today().year), minimum_games)
        rare_stats = rare_stats_per_year(str(date.today().year), minimum_games)
        
        # Get last 30 days stats
        last_30_stats = last_30_days_stats()

        return render_template('stats.html', todays_stats=t_stats, stats=stats, games=games,
                               rare_stats=rare_stats, minimum_games=minimum_games,
                               year=str(date.today().year), all_years=all_years,
                               convertGametimeToUserLocalTime=convertGametimeToUserLocalTime,
                               last_30_stats=last_30_stats)  # Pass last 30 days stats

    except Exception as e:
        print(f"Error in the index route: {e}")
        return redirect(url_for('error_page'))  # Optionally redirect to an error page


@app.route('/stats/<year>/')
def stats(year):
    games = year_games(year)
    if games:
        if len(games) < 30:
            minimum_games = 1
        else:
            minimum_games = len(games) // 30
    else:
        minimum_games = 1
    all_years = grab_all_years()
    t_stats = todays_stats()
    stats = stats_per_year(year, minimum_games)
    rare_stats = rare_stats_per_year(year, minimum_games)
    last_30_stats = None
    return render_template('stats.html', todays_stats=t_stats, all_years=all_years, stats=stats, rare_stats=rare_stats, minimum_games=minimum_games, year=year, 
                           convertGametimeToUserLocalTime=convertGametimeToUserLocalTime, last_30_stats=last_30_stats)

@app.route('/top_teams/')
def top_teams():
    all_years = grab_all_years()
    games = year_games(str(date.today().year))
    year = str(date.today().year)
    if games:
        if len(games) < 70:
            minimum_games = 1
        else:
            minimum_games = len(games) // 70
    else:
        minimum_games = 1
    stats = team_stats_per_year(year, minimum_games, games)
    return render_template('top_teams.html', all_years=all_years, stats=stats, minimum_games=minimum_games, year=year)

@app.route('/top_teams/<year>/')
def top_teams_by_year(year):
    games = year_games(year)
    if games:
        if len(games) < 70:
            minimum_games = 1
        else:
            minimum_games = len(games) // 70
    else:
        minimum_games = 1
    all_years = grab_all_years()
    stats = team_stats_per_year(year, minimum_games, games)
    return render_template('top_teams.html', all_years=all_years, stats=stats, minimum_games=minimum_games, year=year)

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
    return render_template('games.html', games=games, year=year, all_years=all_years, convertGametimeToUserLocalTime=convertGametimeToUserLocalTime)

@app.route('/games/<year>')
def games_by_year(year):
    all_years = grab_all_years()
    games = year_games(year)
    return render_template('games.html', games=games, year=year, all_years=all_years, convertGametimeToUserLocalTime=convertGametimeToUserLocalTime)

"""@app.route('/add_game/', methods=('GET', 'POST'))
def add_game():
    games = year_games(str(date.today().year))
    
    if games:
        minimum_games = 1 if len(games) < 30 else len(games) // 30
    else:
        minimum_games = 1
    
    stats = stats_per_year(str(date.today().year), minimum_games)
    rare_stats = rare_stats_per_year(str(date.today().year), minimum_games)

    w_scores = winners_scores()
    l_scores = losers_scores()
    games = year_games('All years')
    players = all_players(games)
    t_stats = todays_stats()
    games = todays_games()
    year = str(date.today().year)

    if request.method == 'POST':
        winner1 = request.form['winner1']
        winner2 = request.form['winner2']
        loser1 = request.form['loser1']
        loser2 = request.form['loser2']
        winner_score = request.form['winner_score']
        loser_score = request.form['loser_score']

        if not winner1 or not winner2 or not loser1 or not loser2 or not winner_score or not loser_score:
            flash('All fields required!')
        elif int(winner_score) <= int(loser_score):
            flash('Winner score is less than loser score!')
        elif winner1 == winner2 or winner1 == loser1 or winner1 == loser2 or winner2 == loser1 or winner2 == loser2 or loser1 == loser2:
            flash('Two names are the same!')
        else:
            # Store timestamp in UTC for consistency
            utc_time = datetime.now(timezone.utc)
            
            # Save the game stats with UTC timestamp
            add_game_stats([utc_time, winner1.strip(), winner2.strip(), loser1.strip(), loser2.strip(), 
                            winner_score, loser_score, utc_time])

            return redirect(url_for('add_game'))

    return render_template('add_game.html', todays_stats=t_stats, games=games, players=players, 
        w_scores=w_scores, l_scores=l_scores, year=year, stats=stats, rare_stats=rare_stats, 
        minimum_games=minimum_games, convertGametimeToUserLocalTime=convertGametimeToUserLocalTime)"""


"""@app.route('/add_game/', methods=('GET', 'POST'))
def add_game():
    games = year_games(str(date.today().year))

    if games:
        minimum_games = 1 if len(games) < 30 else len(games) // 30
    else:
        minimum_games = 1

    stats = stats_per_year(str(date.today().year), minimum_games)
    rare_stats = rare_stats_per_year(str(date.today().year), minimum_games)

    w_scores = winners_scores()
    l_scores = losers_scores()
    games = year_games('All years')
    players = all_players(games)
    t_stats = todays_stats()
    games = todays_games()
    year = str(date.today().year)

    if request.method == 'POST':
        winner1 = request.form['winner1']
        winner2 = request.form['winner2']
        loser1 = request.form['loser1']
        loser2 = request.form['loser2']
        winner_score = request.form['winner_score']
        loser_score = request.form['loser_score']

        # Check for missing fields
        if not winner1 or not winner2 or not loser1 or not loser2 or not winner_score or not loser_score:
            return jsonify({'error': 'All fields required!'}), 400
        
        # Validate the scores
        elif int(winner_score) <= int(loser_score):
            return jsonify({'error': 'Winner score is less than loser score!'}), 400
        
        # Ensure no player is listed twice
        elif winner1 == winner2 or winner1 == loser1 or winner1 == loser2 or winner2 == loser1 or winner2 == loser2 or loser1 == loser2:
            return jsonify({'error': 'Two names are the same!'}), 400

        else:
            # Ensure the timestamp is consistent and formatted correctly
            # utc_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")  # Format without microseconds
            utc_time = datetime.now()
            print(f"Game time: {utc_time}")  # Debug the timestamp

            try:
                # Save the game stats with UTC timestamp
                add_game_stats([utc_time, winner1.strip(), winner2.strip(), loser1.strip(), loser2.strip(),
                                winner_score, loser_score, utc_time])
                return jsonify({'message': 'Game successfully added!'}), 200

            except Exception as e:
                return jsonify({'error': f'Error saving game stats: {str(e)}'}), 500

    return render_template('add_game.html', todays_stats=t_stats, games=games, players=players, 
        w_scores=w_scores, l_scores=l_scores, year=year, stats=stats, rare_stats=rare_stats, 
        minimum_games=minimum_games, convertGametimeToUserLocalTime=convertGametimeToUserLocalTime)"""

@app.route('/add_game/', methods=('GET', 'POST'))
def add_game():
    current_year = str(date.today().year)
    games_current_year = year_games(current_year)
    all_games = year_games('All years')
    today_games = todays_games()

    minimum_games = 1 if not games_current_year else max(1, len(games_current_year) // 30)

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

            # Validate required fields
            if not all([winner1, winner2, loser1, loser2, winner_score, loser_score]):
                return jsonify({'error': 'All fields are required!'}), 400

            # Validate numeric scores
            try:
                winner_score = int(winner_score)
                loser_score = int(loser_score)
            except ValueError:
                return jsonify({'error': 'Scores must be numeric!'}), 400

            # Validate score logic
            if winner_score <= loser_score:
                return jsonify({'error': 'Winner score must be greater than loser score!'}), 400

            # Validate uniqueness of players
            if len(set([winner1, winner2, loser1, loser2])) < 4:
                return jsonify({'error': 'Each player must be unique!'}), 400

            # Save the game stats
            utc_time = datetime.now(timezone.utc)
            add_game_stats([
                utc_time, winner1, winner2, loser1, loser2, winner_score, loser_score, utc_time
            ])
            return jsonify({'message': 'Game successfully added!'}), 200

        except Exception as e:
            # Log the error for debugging
            app.logger.error(f"Error in add_game: {e}")
            return jsonify({'error': f'Error saving game stats: {str(e)}'}), 500

    return render_template('add_game.html', todays_stats=t_stats, games=today_games, players=players, 
        w_scores=w_scores, l_scores=l_scores, year=current_year, stats=stats, rare_stats=rare_stats, 
        minimum_games=minimum_games)



@app.route('/edit_games/')
def edit_games():
    all_years = grab_all_years()
    games = year_games(str(date.today().year))
    return render_template('edit_games.html', games=games, year=str(date.today().year), 
                           all_years=all_years, convertGametimeToUserLocalTime=convertGametimeToUserLocalTime)

@app.route('/edit_games/<year>')
def edit_games_by_year(year):
    #flash("Received request to edit games with year: " + year)
    all_years = grab_all_years()
    games = year_games(year)
    return render_template('edit_games.html', games=games, year=year, 
                           all_years=all_years, convertGametimeToUserLocalTime=convertGametimeToUserLocalTime)

@app.route('/edit_game/<int:id>/', methods=['GET', 'POST'])
def update(id):
    flash("Received request to edit game with ID: " + id)
    #game_id = id
    #x = find_game(game_id)

    #game = [x[0][0], x[0][1], x[0][2], x[0][3], x[0][4], x[0][5], x[0][6], x[0][7], x[0][8]]
    #w_scores = winners_scores()
    #l_scores = losers_scores()
    #games = year_games(str(date.today().year))
    #players = all_players(games)
    """
    if request.method == 'POST':
        winner1 = request.form['winner1']
        winner2 = request.form['winner2']
        loser1 = request.form['loser1']
        loser2 = request.form['loser2']
        winner_score = request.form['winner_score']
        loser_score = request.form['loser_score']

        if not winner1 or not winner2 or not loser1 or not loser2 or not winner_score or not loser_score:
            flash('All fields required!')
        else:
            # Validate score values
            try:
                winner_score = int(winner_score)
                loser_score = int(loser_score)
            except ValueError:
                flash('Invalid score values!')
                return redirect(url_for('edit_game', id=game_id))

            # Replace deprecated utcnow() with datetime.now(datetime.timezone.utc)
            utc_time = datetime.now(timezone.utc)

            try:
                update_game(game_id, game[1], winner1, winner2, winner_score, loser1, loser2, loser_score, utc_time, game_id)
            except Exception as e:
                app.logger.error(f"Error updating game with ID {game_id}: {e}")
                flash(f'Error updating game: {str(e)}')
                return redirect(url_for('edit_games'))

            return redirect(url_for('edit_games'))
    """
    #return render_template('edit_game.html', game=game, players=players, w_scores=w_scores, l_scores=l_scores, convertGametimeToUserLocalTime=convertGametimeToUserLocalTime)
    return render_template('edit_game.html')


@app.route('/delete/<int:id>/',methods = ['GET','POST'])
def delete_game(id):
    game_id = id
    game = find_game(id)
    if request.method == 'POST':
        remove_game(game_id)
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
        all_years=all_years, minimum_games=minimum_games, year=year, convertToUserLocalTime=convertToUserLocalTime)

@app.route('/vollis_stats/')
def vollis():
    all_years = all_vollis_years()
    year = str(date.today().year)
    t_stats = todays_vollis_stats()
    games = todays_vollis_games()
    minimum_games = 0
    stats = vollis_stats_per_year(year, minimum_games)
    return render_template('vollis_stats.html', stats=stats, todays_stats=t_stats, games=games,
        all_years=all_years, minimum_games=minimum_games, year=year, convertToUserLocalTime=convertToUserLocalTime)


@app.route('/add_vollis_game/', methods=('GET', 'POST'))
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

        if not winner or not loser or not winner_score or not loser_score:
            flash('All fields required!')
        else:
            # Store timestamps in UTC
            utc_time = datetime.now(timezone.utc)

            # Add game stats with UTC timestamps
            add_vollis_stats([utc_time, winner, loser, winner_score, loser_score, utc_time])
            return redirect(url_for('add_vollis_game'))

    return render_template('add_vollis_game.html', year=year, players=players, todays_stats=t_stats, 
                           games=t_games, winning_scores=winning_scores, losing_scores=losing_scores, 
                           stats=stats, convertToUserLocalTime=convertToUserLocalTime)

@app.route('/edit_vollis_games/')
def edit_vollis_games():
    all_years = all_vollis_years()
    games = vollis_year_games(str(date.today().year))
    return render_template('edit_vollis_games.html', games=games, all_years=all_years, 
                           year=str(date.today().year), convertToUserLocalTime=convertToUserLocalTime)


@app.route('/edit_past_year_vollis_games/<year>')
def edit_vollis_games_by_year(year):
    all_years = all_vollis_years()
    games = vollis_year_games(year)
    return render_template('edit_vollis_games.html', all_years=all_years, games=games, year=year, convertToUserLocalTime=convertToUserLocalTime)

@app.route('/vollis_games/')
def vollis_games():
    all_years = all_vollis_years()
    games = vollis_year_games(str(date.today().year))
    return render_template('vollis_games.html', games=games, all_years=all_years, year=str(date.today().year), convertToUserLocalTime=convertToUserLocalTime)

@app.route('/vollis_games/<year>')
def vollis_games_by_year(year):
    all_years = all_vollis_years()
    games = vollis_year_games(year)
    return render_template('vollis_games.html', all_years=all_years, games=games, year=year, convertToUserLocalTime=convertToUserLocalTime)

"""
@app.route('/edit_vollis_game/<int:id>/', methods=['GET', 'POST'])
def update_vollis_game(id):
    game_id = id
    x = find_vollis_game(game_id)
    game = [x[0][0], x[0][1], x[0][2], x[0][3], x[0][4], x[0][5], x[0][6]]
    games = vollis_year_games(str(date.today().year))
    players = all_vollis_players(games)

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

            # Update the game with the UTC timestamp
            edit_vollis_game(game_id, game[1], winner, winner_score, loser, loser_score, utc_time, game_id)
            return redirect(url_for('edit_vollis_games'))

    return render_template('edit_vollis_game.html', game=game, players=players, 
                           year=str(date.today().year), convertToUserLocalTime=convertToUserLocalTime)
"""

@app.route('/edit_vollis_game/<int:id>/', methods=['GET', 'POST'])
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
        actual_time = request.form['actual_time']

        if not winner or not loser or not winner_score or not loser_score:
            flash('All fields required!')
        else:
            # Only process the date/time if it's provided
            if actual_time:
                try:
                    # Parse the actual_time string from "YYYY-MM-DDTHH:MM" format
                    formatted_time = datetime.strptime(actual_time, "%Y-%m-%dT%H:%M").strftime("%Y-%m-%d %H:%M:%S")
                except ValueError as e:
                    print(f"Date parsing error: {e}")
                    formatted_time = None  # In case of parsing error, you can handle it as needed
            else:
                # If no time is provided, fallback to existing game date
                formatted_time = game[1]

            # Update the game record with the UTC timestamp or preformatted actual_time
            utc_time = datetime.now(timezone.utc)
            edit_vollis_game(game_id, game[1], winner, winner_score, loser, loser_score, formatted_time, game_id)

            return redirect(url_for('edit_vollis_games'))

    return render_template('edit_vollis_game.html', game=game, players=players, 
                           year=str(date.today().year), convertToUserLocalTime=convertToUserLocalTime)


@app.route('/delete_vollis_game/<int:id>/',methods = ['GET','POST'])
def delete_vollis_game(id):
    game_id = id
    game = find_vollis_game(id)
    if request.method == 'POST':
        remove_vollis_game(game_id)
        return redirect(url_for('edit_vollis_games'))
 
    return render_template('delete_vollis_game.html', game=game, convertToUserLocalTime=convertToUserLocalTime)

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
        all_years=all_years, minimum_matches=minimum_matches, year=year, convertToUserLocalTime=convertToUserLocalTime)

@app.route('/tennis_stats/')
def tennis():
    all_years = all_tennis_years()
    year = str(date.today().year)
    t_stats = todays_tennis_stats()
    matches = todays_tennis_matches()
    minimum_matches = 0
    stats = tennis_stats_per_year(year, minimum_matches)
    return render_template('tennis_stats.html', stats=stats, todays_stats=t_stats, matches=matches,
        all_years=all_years, minimum_matches=minimum_matches, year=year, convertToUserLocalTime=convertToUserLocalTime)


@app.route('/add_tennis_match/', methods=('GET', 'POST'))
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
                           stats=stats, convertToUserLocalTime=convertToUserLocalTime)

@app.route('/edit_tennis_matches/')
def edit_tennis_matches():
    all_years = all_tennis_years()
    matches = tennis_year_matches(str(date.today().year))
    return render_template('edit_tennis_matches.html', matches=matches, all_years=all_years, 
                           year=str(date.today().year), convertToUserLocalTime=convertToUserLocalTime)


@app.route('/edit_past_year_tennis_matches/<year>')
def edit_tennis_matches_by_year(year):
    all_years = all_tennis_years()
    matches = tennis_year_matches(year)
    return render_template('edit_tennis_matches.html', all_years=all_years, matches=matches, year=year, convertToUserLocalTime=convertToUserLocalTime)

@app.route('/tennis_matches/')
def tennis_matches():
    all_years = all_tennis_years()
    matches = tennis_year_matches(str(date.today().year))
    return render_template('tennis_matches.html', matches=matches, all_years=all_years, year=str(date.today().year), convertToUserLocalTime=convertToUserLocalTime)

@app.route('/tennis_matches/<year>')
def tennis_matches_by_year(year):
    all_years = all_tennis_years()
    matches = tennis_year_matches(year)
    return render_template('tennis_matches.html', all_years=all_years, matches=matches, year=year, convertToUserLocalTime=convertToUserLocalTime)


@app.route('/edit_tennis_match/<int:id>/', methods=['GET', 'POST'])
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
                           year=str(date.today().year), convertToUserLocalTime=convertToUserLocalTime)


@app.route('/delete_tennis_match/<int:id>/',methods = ['GET','POST'])
def delete_tennis_match(id):
    match_id = id
    match = find_tennis_match(match_id)
    if request.method == 'POST':
        remove_tennis_match(match_id)
        return redirect(url_for('edit_tennis_matches'))
 
    return render_template('delete_tennis_match.html', match=match, convertToUserLocalTime=convertToUserLocalTime)

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
def edit_one_v_one_games():
    all_years = all_one_v_one_years()
    games = one_v_one_year_games(str(date.today().year))
    return render_template('edit_one_v_one_games.html', games=games, all_years=all_years, year=str(date.today().year))

@app.route('/edit_past_year_one_v_one_games/<year>')
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
def edit_other_games():
    all_years = all_other_years()
    games = other_year_games(str(date.today().year))
    return render_template('edit_other_games.html', games=games, all_years=all_years, year=str(date.today().year))

@app.route('/edit_past_year_other_games/<year>')
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


