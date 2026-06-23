import re
import secrets

from db_utils import db_manager
from api.sport_templates import get_template, VISIBILITY_OPTIONS


def _slugify(name):
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug).strip("-")
    return slug or "league"


def _unique_slug(base_slug):
    slug = base_slug
    suffix = 2
    while get_league_by_slug(slug):
        slug = f"{base_slug}-{suffix}"
        suffix += 1
    return slug


def _row_to_dict(row):
    if row is None:
        return None
    return dict(row)


def _invite_code():
    return secrets.token_urlsafe(6)


def create_leagues_tables():
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS leagues (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                owner_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                description TEXT,
                visibility TEXT NOT NULL DEFAULT 'public',
                invite_code TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (owner_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS league_members (
                league_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                role TEXT NOT NULL DEFAULT 'member',
                joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (league_id, user_id),
                FOREIGN KEY (league_id) REFERENCES leagues(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS sports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                league_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                template_id TEXT NOT NULL,
                players_per_side INTEGER NOT NULL DEFAULT 1,
                score_direction TEXT NOT NULL DEFAULT 'higher_wins',
                min_games_for_rank INTEGER NOT NULL DEFAULT 10,
                legacy_table TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (league_id) REFERENCES leagues(id)
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS league_games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sport_id INTEGER NOT NULL,
                league_id INTEGER NOT NULL,
                game_date DATETIME NOT NULL,
                winners TEXT NOT NULL,
                losers TEXT NOT NULL,
                winner_score INTEGER,
                loser_score INTEGER,
                metadata TEXT,
                entered_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (sport_id) REFERENCES sports(id),
                FOREIGN KEY (league_id) REFERENCES leagues(id),
                FOREIGN KEY (entered_by) REFERENCES users(id)
            )
            """
        )
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leagues_slug ON leagues(slug)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_leagues_visibility ON leagues(visibility)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_sports_league_id ON sports(league_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_league_games_sport_id ON league_games(sport_id)")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_league_games_league_id ON league_games(league_id)")


def create_league(owner_id, name, visibility="public", description=None, slug=None):
    if visibility not in VISIBILITY_OPTIONS:
        raise ValueError(f"visibility must be one of {VISIBILITY_OPTIONS}")

    base_slug = _slugify(slug or name)
    final_slug = _unique_slug(base_slug)
    invite_code = _invite_code() if visibility == "private" else None

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO leagues (owner_id, name, slug, description, visibility, invite_code)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (owner_id, name.strip(), final_slug, description, visibility, invite_code),
        )
        league_id = cursor.lastrowid
        cursor.execute(
            """
            INSERT INTO league_members (league_id, user_id, role)
            VALUES (?, ?, 'owner')
            """,
            (league_id, owner_id),
        )

    return get_league_by_id(league_id)


def add_sport_to_league(league_id, template_id, name=None, players_per_side=None, score_direction=None):
    template = get_template(template_id)
    if not template:
        raise ValueError(f"Unknown sport template: {template_id}")

    sport_name = (name or template["default_name"]).strip()
    players = players_per_side if players_per_side is not None else template["players_per_side"]
    direction = score_direction or template["score_direction"]
    legacy_table = template.get("legacy_table")

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO sports (
                league_id, name, template_id, players_per_side,
                score_direction, legacy_table
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (league_id, sport_name, template_id, players, direction, legacy_table),
        )
        sport_id = cursor.lastrowid

    return get_sport_by_id(sport_id)


def get_league_by_id(league_id):
    row = db_manager.execute_query(
        "SELECT * FROM leagues WHERE id = ?",
        (league_id,),
        fetch_one=True,
    )
    return _row_to_dict(row)


def get_league_by_slug(slug):
    row = db_manager.execute_query(
        "SELECT * FROM leagues WHERE slug = ?",
        (slug,),
        fetch_one=True,
    )
    return _row_to_dict(row)


def get_leagues_for_user(user_id):
    rows = db_manager.execute_query(
        """
        SELECT l.*, lm.role
        FROM leagues l
        JOIN league_members lm ON lm.league_id = l.id
        WHERE lm.user_id = ?
        ORDER BY l.updated_at DESC
        """,
        (user_id,),
    )
    return [_row_to_dict(row) for row in rows]


def get_sports_for_league(league_id):
    rows = db_manager.execute_query(
        "SELECT * FROM sports WHERE league_id = ? ORDER BY created_at ASC",
        (league_id,),
    )
    return [_row_to_dict(row) for row in rows]


def get_sport_by_id(sport_id):
    row = db_manager.execute_query(
        "SELECT * FROM sports WHERE id = ?",
        (sport_id,),
        fetch_one=True,
    )
    return _row_to_dict(row)


def search_public_leagues(query=None, limit=20):
    params = []
    sql = """
        SELECT l.id, l.name, l.slug, l.description, l.visibility, l.created_at,
               COUNT(DISTINCT s.id) AS sport_count
        FROM leagues l
        LEFT JOIN sports s ON s.league_id = l.id
        WHERE l.visibility = 'public'
    """
    if query:
        sql += " AND (l.name LIKE ? OR l.description LIKE ?)"
        pattern = f"%{query.strip()}%"
        params.extend([pattern, pattern])
    sql += " GROUP BY l.id ORDER BY l.updated_at DESC LIMIT ?"
    params.append(limit)

    rows = db_manager.execute_query(sql, tuple(params))
    return [_row_to_dict(row) for row in rows]


def user_can_access_league(user_id, league):
    if league["visibility"] == "public" or league["visibility"] == "unlisted":
        return True
    if user_id is None:
        return False
    row = db_manager.execute_query(
        "SELECT 1 FROM league_members WHERE league_id = ? AND user_id = ?",
        (league["id"], user_id),
        fetch_one=True,
    )
    return row is not None


def league_to_dict(league, include_invite_code=False):
    if league is None:
        return None
    data = {
        "id": league["id"],
        "name": league["name"],
        "slug": league["slug"],
        "description": league["description"],
        "visibility": league["visibility"],
        "created_at": league["created_at"],
        "updated_at": league["updated_at"],
    }
    if include_invite_code and league.get("invite_code"):
        data["invite_code"] = league["invite_code"]
    if league.get("role"):
        data["role"] = league["role"]
    return data


def sport_to_dict(sport):
    if sport is None:
        return None
    return {
        "id": sport["id"],
        "league_id": sport["league_id"],
        "name": sport["name"],
        "template_id": sport["template_id"],
        "players_per_side": sport["players_per_side"],
        "score_direction": sport["score_direction"],
        "min_games_for_rank": sport["min_games_for_rank"],
        "created_at": sport["created_at"],
    }
