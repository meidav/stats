from create_tennis_database import *
from datetime import datetime, date

def tennis_stats_per_year(year, minimum_matches):
    matches = tennis_year_matches(year)
    players = all_tennis_players(matches)
    stats = []
    for player in players:
        wins, losses = 0, 0
        for match in matches:
            if player == match[2]:
                wins += 1
            elif player == match[4]:
                losses += 1
        win_percentage = wins / (wins + losses)
        if wins + losses >= minimum_matches:
            stats.append([player, wins, losses, win_percentage])
    stats.sort(key=lambda x: x[3], reverse=True)
    return stats

def all_tennis_players(matches):
    players = []
    for match in matches:
        if match[2] not in players:
            players.append(match[2])
        if match[4] not in players:
            players.append(match[4])
    return players


def tennis_year_matches(year):
    cur = set_cur()
    if year == 'All years':
        cur.execute("SELECT * FROM tennis_matches")
    else:
        cur.execute("SELECT * FROM tennis_matches WHERE strftime('%Y',match_date)=?", (year,))
    row = cur.fetchall()
    row.sort(reverse=True)
    return row

def set_cur():
    database = '/home/Idynkydnk/stats/stats.db'
    conn = create_connection(database)
    if conn is None:
        database = r'stats.db'
        conn = create_connection(database)
    cur = conn.cursor()
    return cur  

def add_tennis_stats(match):
    # match[6] is the set_scores if provided
    set_scores = match[6] if len(match) > 6 else None
    new_tennis_match(match[0], match[1], match[3], match[2], match[4], match[5], set_scores)

def enter_data_into_database(matches_data):
    for x in matches_data:
        new_tennis_match(x[4], x[2], 0, x[3], 0, x[4], None)

def new_tennis_match(match_date, winner, winner_score, loser, loser_score, updated_at, set_scores=None):
    database = '/home/Idynkydnk/stats/stats.db'
    conn = create_connection(database)
    if conn is None:
        database = r'stats.db'
        conn = create_connection(database)
    with conn: 
        match = (match_date, winner, winner_score, loser, loser_score, updated_at, set_scores);
        create_tennis_match(conn, match)

def find_tennis_match(match_id):
    cur = set_cur()
    cur.execute("SELECT * FROM tennis_matches WHERE id=?", (match_id,))
    row = cur.fetchall()
    return row

def edit_tennis_match(match_id, match_date, winner, winner_score, loser, loser_score, updated_at, match_id2):
    database = '/home/Idynkydnk/stats/stats.db'
    conn = create_connection(database)
    if conn is None:
        database = r'stats.db'
        conn = create_connection(database)
    with conn: 
        match = (match_id, match_date, winner, winner_score, loser, loser_score, updated_at, match_id2);
        database_update_tennis_match(conn, match)

def remove_tennis_match(match_id):
    database = '/home/Idynkydnk/stats/stats.db'
    conn = create_connection(database)
    if conn is None:
        database = r'stats.db'
        conn = create_connection(database)
    with conn: 
        database_delete_tennis_match(conn, match_id)

def all_tennis_years():
    matches = all_tennis_matches()
    years = []
    for match in matches:
        if match[1][0:4] not in years:
            years.append(match[1][0:4])
    years.append('All years')
    return years

def all_years_tennis_player(name):
    years = []
    matches = all_tennis_matches_by_player(name)
    for match in matches:
        if match[1][0:4] not in years:
            years.append(match[1][0:4])
    if len(years) > 1:
        years.append('All years')
    return years

def all_tennis_matches_by_player(name):
    cur = set_cur()
    cur.execute("SELECT * FROM tennis_matches WHERE (winner=? OR loser=?)", (name, name))
    row = cur.fetchall()
    return row

def all_tennis_matches():
    cur = set_cur()
    cur.execute("SELECT * FROM tennis_matches")
    row = cur.fetchall()
    return row

def matches_from_tennis_player_by_year(year, name):
    cur = set_cur()
    if year == 'All years':
        cur.execute("SELECT * FROM tennis_matches WHERE winner=? OR loser=?", (name, name))
    else:
        cur.execute("SELECT * FROM tennis_matches WHERE strftime('%Y',match_date)=? AND (winner=? OR loser=?)", (year, name, name))
    row = cur.fetchall()
    return row

def all_tennis_opponents(player, matches):
    players = []
    for match in matches:
        if match[2] not in players:
            players.append(match[2])
        if match[4] not in players:
            players.append(match[4])
    players.remove(player)
    return players


def tennis_opponent_stats_by_year(name, matches):
    opponents = all_tennis_opponents(name, matches)
    stats = []
    for opponent in opponents:
        wins, losses = 0, 0
        for match in matches:
            if match[2] == opponent:
                losses += 1
            if match[4] == opponent:
                wins += 1
        win_percent = wins / (wins + losses)
        total_matches = wins + losses
        stats.append({'opponent':opponent, 'wins':wins, 'losses':losses, 'win_percentage':win_percent, 'total_matches':total_matches})
    stats.sort(key=lambda x: x['win_percentage'], reverse=True)
    return stats

def total_tennis_stats(name, matches):
    stats = []
    wins, losses = 0, 0
    for match in matches:
        if match[2] == name:
            wins += 1
        if match[4] == name:
            losses += 1
    win_percent = wins / (wins + losses)
    total_matches = wins + losses
    stats.append([name, wins, losses, win_percent, total_matches])
    return stats


def todays_tennis_stats():
    matches = todays_tennis_matches()
    players = all_tennis_players(matches)
    stats = []
    for player in players:
        wins, losses, differential = 0, 0, 0
        for match in matches:
            if player == match[2]:
                wins += 1
                differential += (match[3] - match[5])
            elif player == match[4]:
                losses += 1
                differential -= (match[3] - match[5])
        win_percentage = wins / (wins + losses)
        stats.append([player, wins, losses, win_percentage, differential])
    stats.sort(key=lambda x: x[3], reverse=True)
    return stats

def all_tennis_players(matches):
    players = []
    for match in matches:
        if match[2] not in players:
            players.append(match[2])
        if match[4] not in players:
            players.append(match[4])
    return players

def todays_tennis_matches():
    cur = set_cur()
    cur.execute("SELECT * FROM tennis_matches WHERE match_date > date('now','-15 hours')")
    matches = cur.fetchall()
    matches.sort(reverse=True)
    #row = convert_ampm(matches)
    return matches

def tennis_winning_scores():
    scores = [6,7]
    return scores

def tennis_losing_scores():
    scores = [2,3,4]
    return scores







