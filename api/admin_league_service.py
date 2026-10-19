"""Super-admin league mutations. Privacy rules for members stay unchanged."""

import json

from auth import get_user_by_email, get_user_by_id, get_user_by_username
from db_utils import db_manager
from api.league_db import (
    _ensure_column,
    _invite_code,
    _row_to_dict,
    _slugify,
    _unique_slug,
    get_league_by_id,
    get_league_by_slug,
    get_sport_by_id,
    get_sports_for_league,
    sync_owner_memberships,
)
from api.sport_templates import VISIBILITY_OPTIONS, get_template


MEMBER_ROLES = ("owner", "admin", "member")
ADMIN_FLAGS = ("", "review", "spam", "test")
PREVIOUS_OWNER_ROLE = "admin"  # after transfer, previous owner keeps edit access


def ensure_admin_league_schema():
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        _ensure_column(cursor, "leagues", "deleted_at", "DATETIME")
        _ensure_column(cursor, "leagues", "admin_flag", "TEXT NOT NULL DEFAULT ''")
        _ensure_column(cursor, "leagues", "invite_disabled", "INTEGER NOT NULL DEFAULT 0")
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS league_activity (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                league_id INTEGER NOT NULL,
                admin_user_id INTEGER,
                action TEXT NOT NULL,
                detail TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (league_id) REFERENCES leagues(id)
            )
            """
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_league_activity_league ON league_activity(league_id, created_at)"
        )


def log_league_activity(league_id, action, admin_user_id=None, detail=None):
    ensure_admin_league_schema()
    db_manager.execute_query(
        """
        INSERT INTO league_activity (league_id, admin_user_id, action, detail)
        VALUES (?, ?, ?, ?)
        """,
        (league_id, admin_user_id, action, detail),
        fetch_all=False,
    )


def _require_league(league_id, allow_deleted=True):
    ensure_admin_league_schema()
    league = get_league_by_id(league_id)
    if not league:
        raise ValueError("league not found")
    if not allow_deleted and league.get("deleted_at"):
        raise ValueError("league is soft-deleted")
    return league


def league_is_deleted(league):
    return bool(league and league.get("deleted_at"))


def list_league_members(league_id):
    sync_owner_memberships()
    rows = db_manager.execute_query(
        """
        SELECT lm.user_id, lm.role, lm.joined_at,
               u.username, u.email, u.is_admin
        FROM league_members lm
        JOIN users u ON u.id = lm.user_id
        WHERE lm.league_id = ?
        ORDER BY
          CASE lm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END,
          u.username COLLATE NOCASE
        """,
        (league_id,),
    )
    return [_row_to_dict(row) for row in rows or []]


_UNSET = object()


def admin_update_league_fields(
    league_id,
    *,
    name=None,
    slug=None,
    description=_UNSET,
    icon=_UNSET,
    visibility=_UNSET,
    admin_user_id=None,
):
    league = _require_league(league_id)
    next_name = league["name"] if name is None else str(name).strip()
    if not next_name:
        raise ValueError("name is required")

    next_slug = league["slug"]
    if slug is not None:
        base = _slugify(slug)
        if not base:
            raise ValueError("slug is required")
        if base != league["slug"]:
            existing = get_league_by_slug(base)
            if existing and existing["id"] != league_id:
                next_slug = _unique_slug(base)
            else:
                next_slug = base

    if description is _UNSET:
        next_description = league.get("description")
    else:
        next_description = (str(description).strip() if description is not None else None) or None

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
        if next_visibility == "private" and not next_invite and not league.get("invite_disabled"):
            next_invite = _invite_code()

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE leagues
            SET name = ?, slug = ?, description = ?, icon = ?, visibility = ?,
                invite_code = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (
                next_name,
                next_slug,
                next_description,
                next_icon,
                next_visibility,
                next_invite,
                league_id,
            ),
        )

    changes = []
    if next_name != league["name"]:
        changes.append(f"name:{league['name']}->{next_name}")
    if next_slug != league["slug"]:
        changes.append(f"slug:{league['slug']}->{next_slug}")
    if next_visibility != league.get("visibility"):
        changes.append(f"visibility:{league.get('visibility')}->{next_visibility}")
        log_league_activity(
            league_id,
            "visibility.change",
            admin_user_id=admin_user_id,
            detail=f"{league.get('visibility')} -> {next_visibility}",
        )
    if changes:
        log_league_activity(
            league_id,
            "league.update",
            admin_user_id=admin_user_id,
            detail="; ".join(changes),
        )
    return get_league_by_id(league_id)


def set_league_visibility(league_id, visibility, admin_user_id=None):
    return admin_update_league_fields(
        league_id,
        visibility=visibility,
        admin_user_id=admin_user_id,
    )


def add_league_member(league_id, identifier, role="member", admin_user_id=None):
    league = _require_league(league_id, allow_deleted=False)
    role = (role or "member").strip().lower()
    if role not in ("admin", "member"):
        raise ValueError("role must be admin or member")
    identifier = (identifier or "").strip()
    if not identifier:
        raise ValueError("email or username is required")
    user = get_user_by_email(identifier) if "@" in identifier else get_user_by_username(identifier)
    if not user and "@" not in identifier:
        user = get_user_by_email(identifier)
    if not user:
        user = get_user_by_username(identifier)
    if not user:
        raise ValueError("user not found")
    if user.id == league["owner_id"]:
        raise ValueError("user is already the owner")

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO league_members (league_id, user_id, role)
            VALUES (?, ?, ?)
            ON CONFLICT(league_id, user_id) DO UPDATE SET role = excluded.role
            """,
            (league_id, user.id, role),
        )
    log_league_activity(
        league_id,
        "member.add",
        admin_user_id=admin_user_id,
        detail=f"{user.email} as {role}",
    )
    return list_league_members(league_id)


def set_member_role(league_id, user_id, role, admin_user_id=None):
    league = _require_league(league_id, allow_deleted=False)
    role = (role or "").strip().lower()
    if role not in ("admin", "member"):
        raise ValueError("role must be admin or member")
    user_id = int(user_id)
    if user_id == league["owner_id"]:
        raise ValueError("change ownership to reassign the owner role")

    row = db_manager.execute_query(
        "SELECT role FROM league_members WHERE league_id = ? AND user_id = ?",
        (league_id, user_id),
        fetch_one=True,
    )
    if not row:
        raise ValueError("member not found")

    db_manager.execute_query(
        "UPDATE league_members SET role = ? WHERE league_id = ? AND user_id = ?",
        (role, league_id, user_id),
        fetch_all=False,
    )
    user = get_user_by_id(user_id)
    log_league_activity(
        league_id,
        "member.role",
        admin_user_id=admin_user_id,
        detail=f"{getattr(user, 'email', user_id)} -> {role}",
    )
    return list_league_members(league_id)


def remove_league_member(league_id, user_id, admin_user_id=None):
    league = _require_league(league_id, allow_deleted=False)
    user_id = int(user_id)
    if user_id == league["owner_id"]:
        raise ValueError("transfer ownership before removing the sole owner")

    user = get_user_by_id(user_id)
    deleted = db_manager.execute_query(
        "DELETE FROM league_members WHERE league_id = ? AND user_id = ?",
        (league_id, user_id),
        fetch_all=False,
    )
    if not deleted:
        raise ValueError("member not found")
    log_league_activity(
        league_id,
        "member.remove",
        admin_user_id=admin_user_id,
        detail=getattr(user, "email", str(user_id)),
    )
    return list_league_members(league_id)


def transfer_league_owner(league_id, new_owner_id, admin_user_id=None):
    """Transfer ownership. Previous owner becomes admin (keeps edit access)."""
    league = _require_league(league_id, allow_deleted=False)
    new_owner_id = int(new_owner_id)
    new_owner = get_user_by_id(new_owner_id)
    if not new_owner:
        raise ValueError("new owner not found")
    old_owner_id = league["owner_id"]
    if old_owner_id == new_owner_id:
        return get_league_by_id(league_id)

    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE leagues SET owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (new_owner_id, league_id),
        )
        cursor.execute(
            """
            INSERT INTO league_members (league_id, user_id, role)
            VALUES (?, ?, 'owner')
            ON CONFLICT(league_id, user_id) DO UPDATE SET role = 'owner'
            """,
            (league_id, new_owner_id),
        )
        if old_owner_id:
            cursor.execute(
                """
                INSERT INTO league_members (league_id, user_id, role)
                VALUES (?, ?, ?)
                ON CONFLICT(league_id, user_id) DO UPDATE SET role = excluded.role
                """,
                (league_id, old_owner_id, PREVIOUS_OWNER_ROLE),
            )

    old = get_user_by_id(old_owner_id) if old_owner_id else None
    log_league_activity(
        league_id,
        "owner.transfer",
        admin_user_id=admin_user_id,
        detail=(
            f"{getattr(old, 'email', old_owner_id)} -> {new_owner.email} "
            f"(previous owner role={PREVIOUS_OWNER_ROLE})"
        ),
    )
    return get_league_by_id(league_id)


def change_primary_sport_template(league_id, template_id, sport_id=None, admin_user_id=None):
    league = _require_league(league_id, allow_deleted=False)
    template = get_template(template_id)
    if not template:
        raise ValueError("unknown sport template")
    sports = get_sports_for_league(league_id) or []
    if not sports:
        raise ValueError("league has no sports")
    sport = None
    if sport_id is not None:
        sport = get_sport_by_id(int(sport_id))
        if not sport or sport["league_id"] != league_id:
            raise ValueError("sport not found in this league")
    else:
        sport = sports[0]

    old_template = sport.get("template_id")
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE sports
            SET template_id = ?,
                name = ?,
                players_per_side = ?,
                score_direction = ?,
                legacy_table = ?
            WHERE id = ?
            """,
            (
                template["id"],
                template.get("default_name") or template["name"],
                template.get("players_per_side") or 1,
                template.get("score_direction") or "higher_wins",
                template.get("legacy_table"),
                sport["id"],
            ),
        )
        cursor.execute(
            "UPDATE leagues SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (league_id,),
        )
    log_league_activity(
        league_id,
        "sport.template",
        admin_user_id=admin_user_id,
        detail=f"sport {sport['id']}: {old_template} -> {template['id']}",
    )
    return get_sport_by_id(sport["id"])


def rotate_invite_code(league_id, admin_user_id=None):
    league = _require_league(league_id, allow_deleted=False)
    code = _invite_code()
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE leagues
            SET invite_code = ?, invite_disabled = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (code, league_id),
        )
    log_league_activity(league_id, "invite.rotate", admin_user_id=admin_user_id, detail=code)
    return get_league_by_id(league_id)


def set_invite_disabled(league_id, disabled, admin_user_id=None):
    league = _require_league(league_id, allow_deleted=False)
    disabled = 1 if disabled else 0
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE leagues
            SET invite_disabled = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
            """,
            (disabled, league_id),
        )
        if not disabled and not league.get("invite_code"):
            cursor.execute(
                "UPDATE leagues SET invite_code = ? WHERE id = ?",
                (_invite_code(), league_id),
            )
    log_league_activity(
        league_id,
        "invite.disable" if disabled else "invite.enable",
        admin_user_id=admin_user_id,
    )
    return get_league_by_id(league_id)


def set_admin_flag(league_id, flag, admin_user_id=None):
    league = _require_league(league_id)
    flag = (flag or "").strip().lower()
    if flag not in ADMIN_FLAGS:
        raise ValueError("flag must be empty, review, spam, or test")
    db_manager.execute_query(
        "UPDATE leagues SET admin_flag = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (flag, league_id),
        fetch_all=False,
    )
    log_league_activity(
        league_id,
        "flag.set",
        admin_user_id=admin_user_id,
        detail=flag or "cleared",
    )
    return get_league_by_id(league_id)


def soft_delete_league(league_id, admin_user_id=None):
    league = _require_league(league_id)
    if league.get("deleted_at"):
        return league
    db_manager.execute_query(
        "UPDATE leagues SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (league_id,),
        fetch_all=False,
    )
    log_league_activity(league_id, "league.soft_delete", admin_user_id=admin_user_id)
    return get_league_by_id(league_id)


def restore_league(league_id, admin_user_id=None):
    league = _require_league(league_id)
    if not league.get("deleted_at"):
        return league
    db_manager.execute_query(
        "UPDATE leagues SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (league_id,),
        fetch_all=False,
    )
    log_league_activity(league_id, "league.restore", admin_user_id=admin_user_id)
    return get_league_by_id(league_id)


def hard_delete_league(league_id, confirm, admin_user_id=None):
    from api.league_db import delete_league

    league = _require_league(league_id)
    confirm = (confirm or "").strip()
    if confirm not in (league["name"], league["slug"]):
        raise ValueError("type the league name or slug to confirm hard delete")
    log_league_activity(
        league_id,
        "league.hard_delete",
        admin_user_id=admin_user_id,
        detail=f"{league['name']} ({league['slug']})",
    )
    delete_league(league_id)
    return True


def merge_player_names_in_sport(sport_id, from_name, into_name, admin_user_id=None):
    """Merge from_name into into_name. Historical games keep their scores."""
    from api.player_profiles import ensure_player_profile_table, _names_in_sport

    from_name = (from_name or "").strip()
    into_name = (into_name or "").strip()
    if not from_name or not into_name:
        raise ValueError("both player names are required")
    if from_name == into_name:
        raise ValueError("names must be different")
    sport = get_sport_by_id(sport_id)
    if not sport:
        raise ValueError("sport not found")
    names = _names_in_sport(sport_id)
    if from_name not in names:
        raise ValueError("source player not found")

    ensure_player_profile_table()
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        rows = cursor.execute(
            "SELECT id, winners, losers FROM league_games WHERE sport_id = ?",
            (sport_id,),
        ).fetchall()
        for row in rows:
            winners = json.loads(row["winners"]) if not isinstance(row["winners"], list) else row["winners"]
            losers = json.loads(row["losers"]) if not isinstance(row["losers"], list) else row["losers"]
            next_winners = [into_name if item == from_name else item for item in winners]
            next_losers = [into_name if item == from_name else item for item in losers]
            if next_winners == winners and next_losers == losers:
                continue
            cursor.execute(
                """
                UPDATE league_games
                SET winners = ?, losers = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (json.dumps(next_winners), json.dumps(next_losers), row["id"]),
            )
        cursor.execute(
            "DELETE FROM sport_player_profiles WHERE sport_id = ? AND name = ?",
            (sport_id, from_name),
        )
        cursor.execute(
            """
            INSERT OR IGNORE INTO sport_player_profiles (sport_id, name, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            """,
            (sport_id, into_name),
        )
        cursor.execute(
            "UPDATE leagues SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (sport["league_id"],),
        )
    log_league_activity(
        sport["league_id"],
        "player.merge",
        admin_user_id=admin_user_id,
        detail=f"{from_name} -> {into_name} (sport {sport_id})",
    )
    return {"from": from_name, "into": into_name, "sport_id": sport_id}


def list_league_activity(league_id, limit=40):
    ensure_admin_league_schema()
    rows = db_manager.execute_query(
        """
        SELECT a.*, u.email AS admin_email, u.username AS admin_username
        FROM league_activity a
        LEFT JOIN users u ON u.id = a.admin_user_id
        WHERE a.league_id = ?
        ORDER BY a.created_at DESC
        LIMIT ?
        """,
        (league_id, limit),
    )
    return [_row_to_dict(row) for row in rows or []]


def player_names_for_sport(sport_id):
    from api.player_profiles import _names_in_sport

    return sorted(_names_in_sport(sport_id), key=str.lower)


def serialize_league_admin(league):
    if not league:
        return None
    sports = get_sports_for_league(league["id"]) or []
    members = list_league_members(league["id"])
    return {
        "id": league["id"],
        "name": league["name"],
        "slug": league["slug"],
        "description": league.get("description"),
        "visibility": league.get("visibility"),
        "focus": league.get("focus") or "mixed",
        "icon": league.get("icon"),
        "owner_id": league.get("owner_id"),
        "invite_code": league.get("invite_code"),
        "invite_disabled": bool(league.get("invite_disabled")),
        "admin_flag": league.get("admin_flag") or "",
        "deleted_at": league.get("deleted_at"),
        "created_at": league.get("created_at"),
        "updated_at": league.get("updated_at"),
        "members": members,
        "sports": [
            {
                "id": s["id"],
                "name": s["name"],
                "template_id": s["template_id"],
                "players_per_side": s.get("players_per_side"),
            }
            for s in sports
        ],
        "previous_owner_role_default": PREVIOUS_OWNER_ROLE,
    }
