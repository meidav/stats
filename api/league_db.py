import re
import secrets

from db_utils import db_manager
from api.brand import APP_URL
from api.sport_templates import (
    FOCUS_OPTIONS,
    VISIBILITY_OPTIONS,
    focus_for_template,
    get_template,
    typical_win_score_for,
)

LINKABLE_VISIBILITY = ("public", "unlisted")

_UNSET = object()


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
        _ensure_column(cursor, "leagues", "focus", "TEXT NOT NULL DEFAULT 'mixed'")
        _ensure_column(cursor, "leagues", "icon", "TEXT")


def _ensure_column(cursor, table, column, definition):
    cursor.execute(f"PRAGMA table_info({table})")
    existing = [row[1] for row in cursor.fetchall()]
    if column not in existing:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")


def create_league(owner_id, name, visibility="public", description=None, slug=None, focus="mixed"):
    if visibility not in VISIBILITY_OPTIONS:
        raise ValueError(f"visibility must be one of {VISIBILITY_OPTIONS}")
    if focus not in FOCUS_OPTIONS:
        raise ValueError(f"focus must be one of {FOCUS_OPTIONS}")

    base_slug = _slugify(slug or name)
    final_slug = _unique_slug(base_slug)
    invite_code = _invite_code() if visibility == "private" else None

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO leagues (owner_id, name, slug, description, visibility, invite_code, focus)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (owner_id, name.strip(), final_slug, description, visibility, invite_code, focus),
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


def update_league(league_id, name=None, icon=_UNSET, visibility=_UNSET):
    league = get_league_by_id(league_id)
    if not league:
        raise ValueError("league not found")

    next_name = league["name"] if name is None else str(name).strip()
    if not next_name:
        raise ValueError("name is required")
    if icon is _UNSET:
        next_icon = league.get("icon")
    elif not icon:
        next_icon = None
    else:
        next_icon = str(icon).strip() or None

    next_visibility = league.get("visibility") or "public"
    next_invite = league.get("invite_code")
    if visibility is not _UNSET:
        next_visibility = str(visibility).strip()
        if next_visibility not in VISIBILITY_OPTIONS:
            raise ValueError(f"visibility must be one of {VISIBILITY_OPTIONS}")
        if next_visibility == "private" and not next_invite:
            next_invite = _invite_code()

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE leagues
            SET name = ?, icon = ?, visibility = ?, invite_code = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (next_name, next_icon, next_visibility, next_invite, league_id),
        )
    return get_league_by_id(league_id)


def delete_league(league_id):
    league = get_league_by_id(league_id)
    if not league:
        raise ValueError("league not found")

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM league_games WHERE league_id = ?", (league_id,))
        cursor.execute("DELETE FROM sports WHERE league_id = ?", (league_id,))
        cursor.execute("DELETE FROM league_members WHERE league_id = ?", (league_id,))
        cursor.execute("DELETE FROM leagues WHERE id = ?", (league_id,))
    return True


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

    widen_league_focus(league_id, template_id)
    return get_sport_by_id(sport_id)


def widen_league_focus(league_id, template_id):
    league = get_league_by_id(league_id)
    if not league:
        return
    current = league.get("focus") or "mixed"
    incoming = focus_for_template(template_id)
    if current == "mixed" or incoming == "mixed" or current == incoming:
        return
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE leagues SET focus = 'mixed', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (league_id,),
        )


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
    db_manager.execute_query(
        """
        INSERT OR IGNORE INTO league_members (league_id, user_id, role)
        SELECT id, owner_id, 'owner' FROM leagues WHERE owner_id = ?
        """,
        (user_id,),
        fetch_all=False,
    )
    rows = db_manager.execute_query(
        """
        SELECT l.*, COALESCE(lm.role, 'owner') AS role
        FROM leagues l
        LEFT JOIN league_members lm
          ON lm.league_id = l.id AND lm.user_id = ?
        WHERE l.owner_id = ? OR lm.user_id = ?
        GROUP BY l.id
        ORDER BY COALESCE(
          (SELECT MAX(created_at) FROM league_games WHERE league_id = l.id),
          l.created_at
        ) DESC
        """,
        (user_id, user_id, user_id),
    )
    return [_row_to_dict(row) for row in rows or []]


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
        SELECT l.id, l.name, l.slug, l.description, l.visibility, l.icon, l.focus,
               l.created_at, l.updated_at,
               u.email AS owner_email,
               u.username AS owner_username,
               COUNT(DISTINCT s.id) AS sport_count,
               COUNT(DISTINCT g.id) AS game_count,
               (
                 SELECT s2.name FROM sports s2
                 WHERE s2.league_id = l.id
                 ORDER BY s2.created_at ASC LIMIT 1
               ) AS sport_name,
               (
                 SELECT s2.template_id FROM sports s2
                 WHERE s2.league_id = l.id
                 ORDER BY s2.created_at ASC LIMIT 1
               ) AS template_id
        FROM leagues l
        LEFT JOIN users u ON u.id = l.owner_id
        LEFT JOIN sports s ON s.league_id = l.id
        LEFT JOIN league_games g ON g.league_id = l.id
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


def league_is_linkable(league):
    return bool(league) and league.get("visibility") in LINKABLE_VISIBILITY


def league_share_url(league):
    if not league_is_linkable(league) or not league.get("slug"):
        return None
    return f"{APP_URL}/l/{league['slug']}"


def user_is_league_member(user_id, league):
    if not user_id or not league:
        return False
    if league.get("owner_id") == user_id:
        return True
    row = db_manager.execute_query(
        "SELECT 1 FROM league_members WHERE league_id = ? AND user_id = ?",
        (league["id"], user_id),
        fetch_one=True,
    )
    return row is not None


def user_can_access_league(user_id, league):
    if league_is_linkable(league):
        return True
    return user_is_league_member(user_id, league)


def _classify_league_family(league, template_ids):
    focus = league.get("focus") or "mixed"
    if focus == "sports":
        return "sports"
    if focus == "table":
        return "games"
    sports = 0
    games = 0
    for template_id in template_ids:
        family = focus_for_template(template_id)
        if family == "sports":
            sports += 1
        elif family == "table":
            games += 1
    if sports > games:
        return "sports"
    if games > sports:
        return "games"
    if sports:
        return "sports"
    if games:
        return "games"
    return None


def league_icon_usage():
    leagues = [_row_to_dict(row) for row in db_manager.execute_query("SELECT id, focus, icon FROM leagues") or []]
    sport_rows = [_row_to_dict(row) for row in db_manager.execute_query("SELECT league_id, template_id FROM sports") or []]
    templates_by_league = {}
    for row in sport_rows:
        templates_by_league.setdefault(row["league_id"], []).append(row["template_id"])

    sports_leagues = 0
    games_leagues = 0
    icon_counts = {}
    for league in leagues:
        family = _classify_league_family(league, templates_by_league.get(league["id"], []))
        if family == "sports":
            sports_leagues += 1
        elif family == "games":
            games_leagues += 1
        icon = (league["icon"] or "").strip() if league["icon"] else ""
        if icon:
            icon_counts[icon] = icon_counts.get(icon, 0) + 1

    return {
        "sports_leagues": sports_leagues,
        "games_leagues": games_leagues,
        "icon_counts": icon_counts,
    }


def league_to_dict(league, include_invite_code=False):
    if league is None:
        return None
    data = {
        "id": league["id"],
        "name": league["name"],
        "slug": league["slug"],
        "description": league["description"],
        "visibility": league["visibility"],
        "focus": league["focus"] if league.get("focus") else "mixed",
        "icon": league.get("icon") or None,
        "share_url": league_share_url(league),
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
    template_id = sport.get("template_id")
    template = get_template(template_id) or {}
    return {
        "id": sport["id"],
        "league_id": sport["league_id"],
        "name": sport["name"],
        "template_id": template_id,
        "category": template.get("category", "custom"),
        "players_per_side": sport.get("players_per_side") or 1,
        "score_direction": sport.get("score_direction") or "higher_wins",
        "score_mode": template.get("score_mode", "points"),
        "score_shape": template.get("score_shape", "points"),
        "side_kind": template.get("side_kind", "player"),
        "typical_win_score": typical_win_score_for(template_id),
        "min_games_for_rank": sport.get("min_games_for_rank") or 1,
        "created_at": sport.get("created_at"),
    }
