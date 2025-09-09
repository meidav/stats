"""
Player management functionality for admin users
Allows editing player names across all game types
"""

from db_utils import set_cur
from datetime import datetime

def get_all_players():
    """Get all unique players from all game types"""
    cur = set_cur()
    players = set()
    
    # Get players from games table
    cur.execute('SELECT DISTINCT winner1 FROM games UNION SELECT DISTINCT winner2 FROM games UNION SELECT DISTINCT loser1 FROM games UNION SELECT DISTINCT loser2 FROM games')
    game_players = cur.fetchall()
    for player in game_players:
        if player[0]:  # Check if not None
            players.add(player[0])
    
    # Get players from vollis_games table
    cur.execute('SELECT DISTINCT winner FROM vollis_games UNION SELECT DISTINCT loser FROM vollis_games')
    vollis_players = cur.fetchall()
    for player in vollis_players:
        if player[0]:
            players.add(player[0])
    
    # Get players from tennis_matches table
    cur.execute('SELECT DISTINCT winner FROM tennis_matches UNION SELECT DISTINCT loser FROM tennis_matches')
    tennis_players = cur.fetchall()
    for player in tennis_players:
        if player[0]:
            players.add(player[0])
    
    # Get players from one_v_one_games table
    cur.execute('SELECT DISTINCT winner FROM one_v_one_games UNION SELECT DISTINCT loser FROM one_v_one_games')
    one_v_one_players = cur.fetchall()
    for player in one_v_one_players:
        if player[0]:
            players.add(player[0])
    
    # Get players from other_games table
    other_columns = ['winner1', 'winner2', 'winner3', 'winner4', 'winner5', 'winner6', 
                    'loser1', 'loser2', 'loser3', 'loser4', 'loser5', 'loser6']
    for col in other_columns:
        cur.execute(f'SELECT DISTINCT {col} FROM other_games WHERE {col} IS NOT NULL')
        other_players = cur.fetchall()
        for player in other_players:
            if player[0]:
                players.add(player[0])
    
    return sorted(list(players))

def get_player_games_count(player_name):
    """Get count of games for a player across all game types"""
    cur = set_cur()
    total_games = 0
    
    # Count games from games table
    cur.execute('''
        SELECT COUNT(*) FROM games 
        WHERE winner1 = ? OR winner2 = ? OR loser1 = ? OR loser2 = ?
    ''', (player_name, player_name, player_name, player_name))
    total_games += cur.fetchone()[0]
    
    # Count games from vollis_games table
    cur.execute('SELECT COUNT(*) FROM vollis_games WHERE winner = ? OR loser = ?', (player_name, player_name))
    total_games += cur.fetchone()[0]
    
    # Count games from tennis_matches table
    cur.execute('SELECT COUNT(*) FROM tennis_matches WHERE winner = ? OR loser = ?', (player_name, player_name))
    total_games += cur.fetchone()[0]
    
    # Count games from one_v_one_games table
    cur.execute('SELECT COUNT(*) FROM one_v_one_games WHERE winner = ? OR loser = ?', (player_name, player_name))
    total_games += cur.fetchone()[0]
    
    # Count games from other_games table
    other_columns = ['winner1', 'winner2', 'winner3', 'winner4', 'winner5', 'winner6', 
                    'loser1', 'loser2', 'loser3', 'loser4', 'loser5', 'loser6']
    for col in other_columns:
        cur.execute(f'SELECT COUNT(*) FROM other_games WHERE {col} = ?', (player_name,))
        total_games += cur.fetchone()[0]
    
    return total_games

def update_player_name(old_name, new_name):
    """Update player name across all game types"""
    cur = set_cur()
    updated_tables = []
    
    try:
        # Update games table
        cur.execute('UPDATE games SET winner1 = ? WHERE winner1 = ?', (new_name, old_name))
        games_winner1 = cur.rowcount
        cur.execute('UPDATE games SET winner2 = ? WHERE winner2 = ?', (new_name, old_name))
        games_winner2 = cur.rowcount
        cur.execute('UPDATE games SET loser1 = ? WHERE loser1 = ?', (new_name, old_name))
        games_loser1 = cur.rowcount
        cur.execute('UPDATE games SET loser2 = ? WHERE loser2 = ?', (new_name, old_name))
        games_loser2 = cur.rowcount
        
        if games_winner1 + games_winner2 + games_loser1 + games_loser2 > 0:
            updated_tables.append(f"games ({games_winner1 + games_winner2 + games_loser1 + games_loser2} records)")
        
        # Update vollis_games table
        cur.execute('UPDATE vollis_games SET winner = ? WHERE winner = ?', (new_name, old_name))
        vollis_winner = cur.rowcount
        cur.execute('UPDATE vollis_games SET loser = ? WHERE loser = ?', (new_name, old_name))
        vollis_loser = cur.rowcount
        
        if vollis_winner + vollis_loser > 0:
            updated_tables.append(f"vollis_games ({vollis_winner + vollis_loser} records)")
        
        # Update tennis_matches table
        cur.execute('UPDATE tennis_matches SET winner = ? WHERE winner = ?', (new_name, old_name))
        tennis_winner = cur.rowcount
        cur.execute('UPDATE tennis_matches SET loser = ? WHERE loser = ?', (new_name, old_name))
        tennis_loser = cur.rowcount
        
        if tennis_winner + tennis_loser > 0:
            updated_tables.append(f"tennis_matches ({tennis_winner + tennis_loser} records)")
        
        # Update one_v_one_games table
        cur.execute('UPDATE one_v_one_games SET winner = ? WHERE winner = ?', (new_name, old_name))
        one_v_one_winner = cur.rowcount
        cur.execute('UPDATE one_v_one_games SET loser = ? WHERE loser = ?', (new_name, old_name))
        one_v_one_loser = cur.rowcount
        
        if one_v_one_winner + one_v_one_loser > 0:
            updated_tables.append(f"one_v_one_games ({one_v_one_winner + one_v_one_loser} records)")
        
        # Update other_games table
        other_columns = ['winner1', 'winner2', 'winner3', 'winner4', 'winner5', 'winner6', 
                        'loser1', 'loser2', 'loser3', 'loser4', 'loser5', 'loser6']
        other_total = 0
        for col in other_columns:
            cur.execute(f'UPDATE other_games SET {col} = ? WHERE {col} = ?', (new_name, old_name))
            other_total += cur.rowcount
        
        if other_total > 0:
            updated_tables.append(f"other_games ({other_total} records)")
        
        # Update updated_at timestamps
        current_time = datetime.now()
        cur.execute('UPDATE games SET updated_at = ? WHERE winner1 = ? OR winner2 = ? OR loser1 = ? OR loser2 = ?', 
                   (current_time, new_name, new_name, new_name, new_name))
        cur.execute('UPDATE vollis_games SET updated_at = ? WHERE winner = ? OR loser = ?', 
                   (current_time, new_name, new_name))
        cur.execute('UPDATE tennis_matches SET updated_at = ? WHERE winner = ? OR loser = ?', 
                   (current_time, new_name, new_name))
        cur.execute('UPDATE one_v_one_games SET updated_at = ? WHERE winner = ? OR loser = ?', 
                   (current_time, new_name, new_name))
        
        # Update other_games updated_at
        for col in other_columns:
            cur.execute(f'UPDATE other_games SET updated_at = ? WHERE {col} = ?', (current_time, new_name))
        
        cur.connection.commit()
        return True, updated_tables
        
    except Exception as e:
        cur.connection.rollback()
        return False, str(e)

def search_players(query):
    """Search for players by name (case-insensitive)"""
    all_players = get_all_players()
    query_lower = query.lower()
    return [player for player in all_players if query_lower in player.lower()]

def get_player_stats(player_name):
    """Get detailed stats for a player across all game types"""
    cur = set_cur()
    stats = {
        'total_games': 0,
        'games': {'wins': 0, 'losses': 0},
        'vollis': {'wins': 0, 'losses': 0},
        'tennis': {'wins': 0, 'losses': 0},
        'one_v_one': {'wins': 0, 'losses': 0},
        'other': {'wins': 0, 'losses': 0}
    }
    
    # Games table stats
    cur.execute('''
        SELECT 
            SUM(CASE WHEN winner1 = ? OR winner2 = ? THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN loser1 = ? OR loser2 = ? THEN 1 ELSE 0 END) as losses
        FROM games 
        WHERE winner1 = ? OR winner2 = ? OR loser1 = ? OR loser2 = ?
    ''', (player_name, player_name, player_name, player_name, player_name, player_name, player_name, player_name))
    result = cur.fetchone()
    if result and result[0] is not None:
        stats['games']['wins'] = result[0]
        stats['games']['losses'] = result[1]
        stats['total_games'] += result[0] + result[1]
    
    # Vollis games stats
    cur.execute('''
        SELECT 
            SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN loser = ? THEN 1 ELSE 0 END) as losses
        FROM vollis_games 
        WHERE winner = ? OR loser = ?
    ''', (player_name, player_name, player_name, player_name))
    result = cur.fetchone()
    if result and result[0] is not None:
        stats['vollis']['wins'] = result[0]
        stats['vollis']['losses'] = result[1]
        stats['total_games'] += result[0] + result[1]
    
    # Tennis matches stats
    cur.execute('''
        SELECT 
            SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN loser = ? THEN 1 ELSE 0 END) as losses
        FROM tennis_matches 
        WHERE winner = ? OR loser = ?
    ''', (player_name, player_name, player_name, player_name))
    result = cur.fetchone()
    if result and result[0] is not None:
        stats['tennis']['wins'] = result[0]
        stats['tennis']['losses'] = result[1]
        stats['total_games'] += result[0] + result[1]
    
    # One v one games stats
    cur.execute('''
        SELECT 
            SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as wins,
            SUM(CASE WHEN loser = ? THEN 1 ELSE 0 END) as losses
        FROM one_v_one_games 
        WHERE winner = ? OR loser = ?
    ''', (player_name, player_name, player_name, player_name))
    result = cur.fetchone()
    if result and result[0] is not None:
        stats['one_v_one']['wins'] = result[0]
        stats['one_v_one']['losses'] = result[1]
        stats['total_games'] += result[0] + result[1]
    
    # Other games stats (simplified - counting as wins if in winner columns)
    other_winner_columns = ['winner1', 'winner2', 'winner3', 'winner4', 'winner5', 'winner6']
    other_loser_columns = ['loser1', 'loser2', 'loser3', 'loser4', 'loser5', 'loser6']
    
    other_wins = 0
    other_losses = 0
    
    for col in other_winner_columns:
        cur.execute(f'SELECT COUNT(*) FROM other_games WHERE {col} = ?', (player_name,))
        other_wins += cur.fetchone()[0]
    
    for col in other_loser_columns:
        cur.execute(f'SELECT COUNT(*) FROM other_games WHERE {col} = ?', (player_name,))
        other_losses += cur.fetchone()[0]
    
    stats['other']['wins'] = other_wins
    stats['other']['losses'] = other_losses
    stats['total_games'] += other_wins + other_losses
    
    return stats
