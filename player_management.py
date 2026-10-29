"""
Player management functionality for admin users
Allows editing player names across all game types
"""

from db_utils import db_manager
from datetime import datetime
import os
import uuid
import re
import base64

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.environ.get(
    'UPLOAD_DIR',
    os.path.join(BASE_DIR, 'static', 'uploads', 'players'),
)
ALLOWED_PHOTO_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


def ensure_player_profiles_table():
    """Create player_profiles table if missing."""
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with db_manager.get_connection() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS player_profiles (
                name TEXT PRIMARY KEY,
                photo_filename TEXT,
                updated_at TEXT
            )
        ''')


def _slugify_name(name):
    slug = re.sub(r'[^a-zA-Z0-9]+', '-', (name or '').strip().lower()).strip('-')
    return slug[:40] or 'player'


def _photo_filesystem_path(filename):
    return os.path.join(UPLOAD_DIR, filename)


def _photo_public_url(filename):
    return f'/static/uploads/players/{filename}'


def get_player_photo_filename(player_name):
    ensure_player_profiles_table()
    with db_manager.get_connection() as conn:
        row = conn.execute(
            'SELECT photo_filename FROM player_profiles WHERE name = ?',
            (player_name,)
        ).fetchone()
    if row and row[0]:
        return row[0]
    return None


def get_player_photo_url(player_name):
    filename = get_player_photo_filename(player_name)
    if not filename:
        return None
    path = _photo_filesystem_path(filename)
    if not os.path.isfile(path):
        return None
    # Cache-bust so updated crops show immediately
    try:
        version = int(os.path.getmtime(path))
    except OSError:
        version = 0
    return f'{_photo_public_url(filename)}?v={version}'


def _store_player_photo_bytes(player_name, data, ext='.jpg'):
    ensure_player_profiles_table()
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    old = get_player_photo_filename(player_name)
    filename = f'{_slugify_name(player_name)}-{uuid.uuid4().hex[:10]}{ext}'
    dest = _photo_filesystem_path(filename)
    with open(dest, 'wb') as handle:
        handle.write(data)

    now = datetime.now().isoformat(timespec='seconds')
    with db_manager.get_connection() as conn:
        conn.execute('''
            INSERT INTO player_profiles (name, photo_filename, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(name) DO UPDATE SET
                photo_filename = excluded.photo_filename,
                updated_at = excluded.updated_at
        ''', (player_name, filename, now))

    if old and old != filename:
        old_path = _photo_filesystem_path(old)
        if os.path.isfile(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass

    return True, filename


def save_player_photo(player_name, file_storage):
    """Save uploaded photo for a player. Returns (ok, message_or_filename)."""
    if not file_storage or not getattr(file_storage, 'filename', None):
        return False, 'No file uploaded'

    _, ext = os.path.splitext(file_storage.filename.lower())
    if ext not in ALLOWED_PHOTO_EXT:
        return False, 'Use a JPG, PNG, WEBP, or GIF image'

    data = file_storage.read()
    if not data:
        return False, 'Empty image file'
    return _store_player_photo_bytes(player_name, data, ext=ext)


def save_player_photo_data_url(player_name, data_url):
    """Save a cropped image from a canvas data URL (image/jpeg or image/png)."""
    if not data_url or not isinstance(data_url, str) or ',' not in data_url:
        return False, 'No cropped image provided'

    header, encoded = data_url.split(',', 1)
    header = header.lower()
    if 'image/png' in header:
        ext = '.png'
    elif 'image/webp' in header:
        ext = '.webp'
    else:
        ext = '.jpg'

    try:
        data = base64.b64decode(encoded)
    except Exception:
        return False, 'Could not read cropped image'

    if not data:
        return False, 'Empty cropped image'
    return _store_player_photo_bytes(player_name, data, ext=ext)


def remove_player_photo(player_name):
    ensure_player_profiles_table()
    old = get_player_photo_filename(player_name)
    with db_manager.get_connection() as conn:
        conn.execute(
            'UPDATE player_profiles SET photo_filename = NULL, updated_at = ? WHERE name = ?',
            (datetime.now().isoformat(timespec='seconds'), player_name)
        )
    if old:
        old_path = _photo_filesystem_path(old)
        if os.path.isfile(old_path):
            try:
                os.remove(old_path)
            except OSError:
                pass
    return True


def _existing_tables(conn):
    rows = conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()
    return {row[0] for row in rows}


def _collect_player_counts_sql(conn):
    tables = _existing_tables(conn)
    parts = []

    if 'games' in tables:
        parts.extend([
            "SELECT winner1 AS name FROM games WHERE winner1 IS NOT NULL AND TRIM(winner1) != ''",
            "SELECT winner2 AS name FROM games WHERE winner2 IS NOT NULL AND TRIM(winner2) != ''",
            "SELECT loser1 AS name FROM games WHERE loser1 IS NOT NULL AND TRIM(loser1) != ''",
            "SELECT loser2 AS name FROM games WHERE loser2 IS NOT NULL AND TRIM(loser2) != ''",
        ])
    if 'vollis_games' in tables:
        parts.extend([
            "SELECT winner AS name FROM vollis_games WHERE winner IS NOT NULL AND TRIM(winner) != ''",
            "SELECT loser AS name FROM vollis_games WHERE loser IS NOT NULL AND TRIM(loser) != ''",
        ])
    if 'tennis_matches' in tables:
        parts.extend([
            "SELECT winner AS name FROM tennis_matches WHERE winner IS NOT NULL AND TRIM(winner) != ''",
            "SELECT loser AS name FROM tennis_matches WHERE loser IS NOT NULL AND TRIM(loser) != ''",
        ])
    if 'one_v_one_games' in tables:
        parts.extend([
            "SELECT winner AS name FROM one_v_one_games WHERE winner IS NOT NULL AND TRIM(winner) != ''",
            "SELECT loser AS name FROM one_v_one_games WHERE loser IS NOT NULL AND TRIM(loser) != ''",
        ])
    if 'other_games' in tables:
        for col in [
            'winner1', 'winner2', 'winner3', 'winner4', 'winner5', 'winner6',
            'loser1', 'loser2', 'loser3', 'loser4', 'loser5', 'loser6',
        ]:
            parts.append(
                f"SELECT {col} AS name FROM other_games WHERE {col} IS NOT NULL AND TRIM({col}) != ''"
            )

    if not parts:
        return "SELECT '' AS player_name, 0 AS game_count WHERE 0"

    union_sql = " UNION ALL ".join(parts)
    return f'''
        SELECT TRIM(name) AS player_name, COUNT(*) AS game_count
        FROM ({union_sql})
        GROUP BY TRIM(name)
    '''


def get_players_with_counts(search_query='', sort_by='name', sort_order='asc'):
    """Return player rows with counts in one query (no N+1)."""
    ensure_player_profiles_table()
    from stat_functions import player_initials

    with db_manager.get_connection() as conn:
        rows = conn.execute(_collect_player_counts_sql(conn)).fetchall()
        photos = {
            r[0]: r[1]
            for r in conn.execute('SELECT name, photo_filename FROM player_profiles').fetchall()
            if r[1]
        }

    players = []
    q = (search_query or '').strip().lower()
    for name, count in rows:
        if not name:
            continue
        name = name.strip()
        if q and q not in name.lower():
            continue
        filename = photos.get(name)
        photo_url = None
        if filename:
            path = os.path.join(UPLOAD_DIR, filename)
            if os.path.isfile(path):
                try:
                    version = int(os.path.getmtime(path))
                except OSError:
                    version = 0
                photo_url = f'/static/uploads/players/{filename}?v={version}'
        players.append({
            'name': name,
            'game_count': int(count or 0),
            'photo_url': photo_url,
            'initials': player_initials(name),
        })

    reverse = (sort_order == 'desc')
    if sort_by == 'games':
        players.sort(key=lambda x: (x['game_count'], x['name'].lower()), reverse=reverse)
    else:
        players.sort(key=lambda x: x['name'].lower(), reverse=reverse)
    return players


def count_all_players():
    ensure_player_profiles_table()
    with db_manager.get_connection() as conn:
        sql = _collect_player_counts_sql(conn)
        return int(conn.execute(f'SELECT COUNT(*) FROM ({sql})').fetchone()[0] or 0)


def get_all_players():
    return [p['name'] for p in get_players_with_counts()]


def get_player_games_count(player_name):
    for player in get_players_with_counts():
        if player['name'] == player_name:
            return player['game_count']
    return 0


def update_player_name(old_name, new_name):
    """Update player name across all game types and profile row."""
    old_name = (old_name or '').strip()
    new_name = (new_name or '').strip()
    updated_tables = []
    ensure_player_profiles_table()

    try:
        with db_manager.get_connection() as conn:
            tables = _existing_tables(conn)
            other_columns = [
                'winner1', 'winner2', 'winner3', 'winner4', 'winner5', 'winner6',
                'loser1', 'loser2', 'loser3', 'loser4', 'loser5', 'loser6',
            ]

            if 'games' in tables:
                total = 0
                for col in ('winner1', 'winner2', 'loser1', 'loser2'):
                    cur = conn.execute(f'UPDATE games SET {col} = ? WHERE {col} = ?', (new_name, old_name))
                    total += cur.rowcount
                if total:
                    updated_tables.append(f'games ({total} records)')

            if 'vollis_games' in tables:
                total = 0
                for col in ('winner', 'loser'):
                    cur = conn.execute(f'UPDATE vollis_games SET {col} = ? WHERE {col} = ?', (new_name, old_name))
                    total += cur.rowcount
                if total:
                    updated_tables.append(f'vollis_games ({total} records)')

            if 'tennis_matches' in tables:
                total = 0
                for col in ('winner', 'loser'):
                    cur = conn.execute(f'UPDATE tennis_matches SET {col} = ? WHERE {col} = ?', (new_name, old_name))
                    total += cur.rowcount
                if total:
                    updated_tables.append(f'tennis_matches ({total} records)')

            if 'one_v_one_games' in tables:
                total = 0
                for col in ('winner', 'loser'):
                    cur = conn.execute(f'UPDATE one_v_one_games SET {col} = ? WHERE {col} = ?', (new_name, old_name))
                    total += cur.rowcount
                if total:
                    updated_tables.append(f'one_v_one_games ({total} records)')

            if 'other_games' in tables:
                total = 0
                for col in other_columns:
                    cur = conn.execute(f'UPDATE other_games SET {col} = ? WHERE {col} = ?', (new_name, old_name))
                    total += cur.rowcount
                if total:
                    updated_tables.append(f'other_games ({total} records)')

            profile = conn.execute(
                'SELECT photo_filename FROM player_profiles WHERE name = ?', (old_name,)
            ).fetchone()
            if profile:
                conn.execute('DELETE FROM player_profiles WHERE name = ?', (new_name,))
                conn.execute(
                    'UPDATE player_profiles SET name = ?, updated_at = ? WHERE name = ?',
                    (new_name, datetime.now().isoformat(timespec='seconds'), old_name)
                )

            current_time = datetime.now()
            if 'games' in tables:
                conn.execute(
                    'UPDATE games SET updated_at = ? WHERE winner1 = ? OR winner2 = ? OR loser1 = ? OR loser2 = ?',
                    (current_time, new_name, new_name, new_name, new_name)
                )
            if 'vollis_games' in tables:
                conn.execute(
                    'UPDATE vollis_games SET updated_at = ? WHERE winner = ? OR loser = ?',
                    (current_time, new_name, new_name)
                )
            if 'tennis_matches' in tables:
                conn.execute(
                    'UPDATE tennis_matches SET updated_at = ? WHERE winner = ? OR loser = ?',
                    (current_time, new_name, new_name)
                )
            if 'one_v_one_games' in tables:
                conn.execute(
                    'UPDATE one_v_one_games SET updated_at = ? WHERE winner = ? OR loser = ?',
                    (current_time, new_name, new_name)
                )
            if 'other_games' in tables:
                for col in other_columns:
                    conn.execute(
                        f'UPDATE other_games SET updated_at = ? WHERE {col} = ?',
                        (current_time, new_name)
                    )

        return True, updated_tables
    except Exception as e:
        return False, str(e)


def search_players(query):
    return [p['name'] for p in get_players_with_counts(search_query=query)]


def get_player_stats(player_name):
    """Get detailed stats for a player across all game types."""
    stats = {
        'total_games': 0,
        'games': {'wins': 0, 'losses': 0},
        'vollis': {'wins': 0, 'losses': 0},
        'tennis': {'wins': 0, 'losses': 0},
        'one_v_one': {'wins': 0, 'losses': 0},
        'other': {'wins': 0, 'losses': 0},
    }

    with db_manager.get_connection() as conn:
        tables = _existing_tables(conn)

        if 'games' in tables:
            result = conn.execute('''
                SELECT
                    SUM(CASE WHEN winner1 = ? OR winner2 = ? THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN loser1 = ? OR loser2 = ? THEN 1 ELSE 0 END) as losses
                FROM games
                WHERE winner1 = ? OR winner2 = ? OR loser1 = ? OR loser2 = ?
            ''', (player_name, player_name, player_name, player_name, player_name, player_name, player_name, player_name)).fetchone()
            if result and result[0] is not None:
                stats['games']['wins'] = result[0]
                stats['games']['losses'] = result[1]
                stats['total_games'] += result[0] + result[1]

        if 'vollis_games' in tables:
            result = conn.execute('''
                SELECT
                    SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN loser = ? THEN 1 ELSE 0 END) as losses
                FROM vollis_games
                WHERE winner = ? OR loser = ?
            ''', (player_name, player_name, player_name, player_name)).fetchone()
            if result and result[0] is not None:
                stats['vollis']['wins'] = result[0]
                stats['vollis']['losses'] = result[1]
                stats['total_games'] += result[0] + result[1]

        if 'tennis_matches' in tables:
            result = conn.execute('''
                SELECT
                    SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN loser = ? THEN 1 ELSE 0 END) as losses
                FROM tennis_matches
                WHERE winner = ? OR loser = ?
            ''', (player_name, player_name, player_name, player_name)).fetchone()
            if result and result[0] is not None:
                stats['tennis']['wins'] = result[0]
                stats['tennis']['losses'] = result[1]
                stats['total_games'] += result[0] + result[1]

        if 'one_v_one_games' in tables:
            result = conn.execute('''
                SELECT
                    SUM(CASE WHEN winner = ? THEN 1 ELSE 0 END) as wins,
                    SUM(CASE WHEN loser = ? THEN 1 ELSE 0 END) as losses
                FROM one_v_one_games
                WHERE winner = ? OR loser = ?
            ''', (player_name, player_name, player_name, player_name)).fetchone()
            if result and result[0] is not None:
                stats['one_v_one']['wins'] = result[0]
                stats['one_v_one']['losses'] = result[1]
                stats['total_games'] += result[0] + result[1]

        if 'other_games' in tables:
            other_wins = 0
            other_losses = 0
            for col in ['winner1', 'winner2', 'winner3', 'winner4', 'winner5', 'winner6']:
                other_wins += conn.execute(
                    f'SELECT COUNT(*) FROM other_games WHERE {col} = ?', (player_name,)
                ).fetchone()[0]
            for col in ['loser1', 'loser2', 'loser3', 'loser4', 'loser5', 'loser6']:
                other_losses += conn.execute(
                    f'SELECT COUNT(*) FROM other_games WHERE {col} = ?', (player_name,)
                ).fetchone()[0]
            stats['other']['wins'] = other_wins
            stats['other']['losses'] = other_losses
            stats['total_games'] += other_wins + other_losses

    return stats
