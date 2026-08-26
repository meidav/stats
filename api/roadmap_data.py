"""Product roadmap board: SQLite-backed Kanban for the admin console."""

from __future__ import annotations

import json
import re
from datetime import date

from db_utils import db_manager
from api.league_db import _row_to_dict

ROADMAP_PRINCIPLE = (
    "Keep the core loop simple: create a league, log games, see standings. "
    "New power belongs in settings and optional tiers, not in the default path."
)

ROADMAP_COLUMNS = [
    {"id": "now", "label": "Now", "blurb": "Active / quick wins"},
    {"id": "next", "label": "Next", "blurb": "Committed, starting soon"},
    {"id": "later", "label": "Later", "blurb": "Planned, not scheduled"},
    {"id": "idea", "label": "Ideas", "blurb": "Exploring, unshaped"},
    {"id": "done", "label": "Done", "blurb": "Shipped"},
]

VALID_STATUSES = {col["id"] for col in ROADMAP_COLUMNS}

ROADMAP_CATEGORIES = {
    "account": {"label": "Account", "color": "#2563eb"},
    "monetization": {"label": "Monetization", "color": "#059669"},
    "sports": {"label": "Sports", "color": "#ea580c"},
    "platform": {"label": "Platform", "color": "#5b21b6"},
    "sharing": {"label": "Sharing", "color": "#db2777"},
}

VALID_CATEGORIES = set(ROADMAP_CATEGORIES)
VALID_EFFORTS = {"S", "M", "L"}

# Seeded once into SQLite on first visit.
SEED_ITEMS = [
    {
        "id": "android-parity",
        "title": "Android parity",
        "status": "now",
        "category": "platform",
        "effort": "M",
        "premium": False,
        "summary": "Google Sign-In, border styling, then Play Store submit after Apple.",
        "details": [
            "Google Sign-In on Android builds",
            "Fix thick borders on intro / login / tables",
            "Play Console listing + review account",
        ],
        "target": "",
        "sort_order": 0,
    },
    {
        "id": "account-theme",
        "title": "Theme / color scheme",
        "status": "next",
        "category": "account",
        "effort": "M",
        "premium": False,
        "summary": "User-selectable palettes in the Account modal. Default stays the current gradient.",
        "details": [
            "Ship inside Account settings (not a separate screen yet)",
            "Persist preference per account",
        ],
        "target": "",
        "sort_order": 0,
    },
    {
        "id": "account-version-footer",
        "title": "Version / build in Account",
        "status": "next",
        "category": "account",
        "effort": "S",
        "premium": False,
        "summary": "Show app version and build at the bottom of Account for support and debugging.",
        "details": [],
        "target": "",
        "sort_order": 1,
    },
    {
        "id": "open-in-app",
        "title": "Open in PlayTracker (web)",
        "status": "next",
        "category": "sharing",
        "effort": "S",
        "premium": False,
        "summary": "Deep link from public league and player pages into the app.",
        "details": [
            "Replace disabled Open in PlayTracker CTA",
            "playtracker:// and universal links",
        ],
        "target": "",
        "sort_order": 2,
    },
    {
        "id": "occasional-threshold",
        "title": "Occasional-player threshold",
        "status": "later",
        "category": "account",
        "effort": "M",
        "premium": False,
        "summary": "Global default (e.g. 5%) with optional per-league override later.",
        "details": [
            "Account setting for default %",
            "Per-league override when sports differ in roster size",
        ],
        "target": "",
        "sort_order": 0,
    },
    {
        "id": "default-sport",
        "title": "Default sport on create",
        "status": "later",
        "category": "account",
        "effort": "S",
        "premium": False,
        "summary": "Remember last used template or let users pick a default for new leagues.",
        "details": [],
        "target": "",
        "sort_order": 1,
    },
    {
        "id": "linked-sign-in",
        "title": "Linked sign-in methods",
        "status": "later",
        "category": "account",
        "effort": "M",
        "premium": False,
        "summary": "Show Apple / Google connected; add email password if missing.",
        "details": [],
        "target": "",
        "sort_order": 2,
    },
    {
        "id": "export-data",
        "title": "Export my data",
        "status": "later",
        "category": "account",
        "effort": "M",
        "premium": False,
        "summary": "Download leagues, games, and profile data (privacy-friendly).",
        "details": [],
        "target": "",
        "sort_order": 3,
    },
    {
        "id": "more-templates",
        "title": "More built-in templates",
        "status": "done",
        "category": "sports",
        "effort": "M",
        "premium": False,
        "summary": "Shipped in 1.1.4: pickleball, badminton, ping pong, softball, Dominoes, Mahjong, Rummikub, Ticket to Ride, Connect Four, Mancala, plus optional scoring.",
        "details": [
            "Keep pick-a-sport as the default create flow",
            "Custom types stay advanced / later",
        ],
        "target": "1.1.4",
        "sort_order": 4,
    },
    {
        "id": "custom-sport-types",
        "title": "User-created sport types",
        "status": "later",
        "category": "sports",
        "effort": "L",
        "premium": False,
        "summary": "Settings like players per team, win needs a score vs win/loss only, score direction.",
        "details": [
            "Do not overwhelm the create-league path",
            "Curated templates remain the happy path",
        ],
        "target": "",
        "sort_order": 5,
    },
    {
        "id": "subscriptions",
        "title": "Subscriptions",
        "status": "idea",
        "category": "monetization",
        "effort": "L",
        "premium": True,
        "summary": "Long-term plan. Free tier stays usable; paid unlocks scale (e.g. unlimited leagues).",
        "details": [
            "Primary paid benefit: unlimited leagues (cap on free TBD)",
            "Other candidates: advanced stats, exports, custom branding",
            "Principle: one or a few leagues with full standings stay free",
        ],
        "target": "",
        "sort_order": 0,
    },
    {
        "id": "account-modal",
        "title": "Account modal",
        "status": "done",
        "category": "account",
        "effort": "S",
        "premium": False,
        "summary": "Cog next to email opens Account with Sign out confirm and Delete account.",
        "details": ["Delete account two-step confirm kept for App Store"],
        "target": "1.1.3",
        "sort_order": 0,
    },
    {
        "id": "account-deletion",
        "title": "In-app account deletion",
        "status": "done",
        "category": "platform",
        "effort": "M",
        "premium": False,
        "summary": "DELETE /auth/account plus mobile flow for Apple Guideline 5.1.1(v).",
        "details": [],
        "target": "1.1.3",
        "sort_order": 1,
    },
    {
        "id": "player-profile-polish",
        "title": "Player profile polish",
        "status": "done",
        "category": "platform",
        "effort": "M",
        "premium": False,
        "summary": "Occasional partners/opponents, hide partners for singles, W L % G order, win% rank on KPI.",
        "details": [
            "Qualified-only win% rank (excludes occasional)",
            "Competition-style ties in standings",
        ],
        "target": "1.1.3",
        "sort_order": 2,
    },
]


def ensure_roadmap_schema():
    with db_manager.get_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS roadmap_items (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                status TEXT NOT NULL,
                category TEXT NOT NULL DEFAULT 'platform',
                effort TEXT,
                premium INTEGER NOT NULL DEFAULT 0,
                summary TEXT,
                details_json TEXT NOT NULL DEFAULT '[]',
                target TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            "CREATE INDEX IF NOT EXISTS idx_roadmap_status_sort ON roadmap_items(status, sort_order)"
        )


def _slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (title or "").lower()).strip("-")
    return (slug or "item")[:80]


def _sanitize(value, max_len=2000):
    if value is None:
        return None
    text = re.sub(r"<[^>]*>", "", str(value)).strip()
    if not text:
        return None
    return text[:max_len]


def _parse_details(raw):
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    if not raw:
        return []
    try:
        data = json.loads(raw)
    except (TypeError, ValueError, json.JSONDecodeError):
        return []
    if not isinstance(data, list):
        return []
    return [str(item).strip() for item in data if str(item).strip()]


def _map_item(row):
    data = _row_to_dict(row) if not isinstance(row, dict) else dict(row)
    category = data.get("category") or "platform"
    cat_meta = ROADMAP_CATEGORIES.get(category) or ROADMAP_CATEGORIES["platform"]
    return {
        "id": data["id"],
        "title": data.get("title") or "",
        "status": data.get("status") or "idea",
        "category": category,
        "category_meta": cat_meta,
        "effort": data.get("effort") or "",
        "premium": bool(data.get("premium")),
        "summary": data.get("summary") or "",
        "details": _parse_details(data.get("details_json")),
        "target": data.get("target") or "",
        "sort_order": int(data.get("sort_order") or 0),
        "updated_at": data.get("updated_at"),
    }


def seed_roadmap_if_empty():
    ensure_roadmap_schema()
    count = db_manager.execute_query(
        "SELECT COUNT(*) AS n FROM roadmap_items",
        fetch_one=True,
    )
    if count and int(dict(count)["n"]) > 0:
        return
    for item in SEED_ITEMS:
        db_manager.execute_query(
            """
            INSERT INTO roadmap_items (
                id, title, status, category, effort, premium, summary, details_json, target, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item["id"],
                item["title"],
                item["status"],
                item["category"],
                item.get("effort") or None,
                1 if item.get("premium") else 0,
                item.get("summary") or None,
                json.dumps(item.get("details") or []),
                item.get("target") or None,
                int(item.get("sort_order") or 0),
            ),
            fetch_all=False,
        )


def list_roadmap_items():
    seed_roadmap_if_empty()
    rows = db_manager.execute_query(
        "SELECT * FROM roadmap_items ORDER BY status ASC, sort_order ASC, created_at ASC",
        fetch_all=True,
    ) or []
    return [_map_item(row) for row in rows]


def get_roadmap_item(item_id):
    ensure_roadmap_schema()
    row = db_manager.execute_query(
        "SELECT * FROM roadmap_items WHERE id = ?",
        (item_id,),
        fetch_one=True,
    )
    return _map_item(row) if row else None


def _next_sort_order(status):
    row = db_manager.execute_query(
        "SELECT COALESCE(MAX(sort_order), -1) AS m FROM roadmap_items WHERE status = ?",
        (status,),
        fetch_one=True,
    )
    return int(dict(row)["m"] if row else -1) + 1


def _unique_id(title):
    base = _slugify(title)
    candidate = base
    suffix = 2
    while True:
        exists = db_manager.execute_query(
            "SELECT 1 AS ok FROM roadmap_items WHERE id = ?",
            (candidate,),
            fetch_one=True,
        )
        if not exists:
            return candidate
        candidate = f"{base}-{suffix}"
        suffix += 1


def create_roadmap_item(payload):
    ensure_roadmap_schema()
    title = _sanitize(payload.get("title"), 200)
    if not title:
        raise ValueError("title required")
    status = payload.get("status") if payload.get("status") in VALID_STATUSES else "idea"
    category = payload.get("category") if payload.get("category") in VALID_CATEGORIES else "platform"
    effort = payload.get("effort") if payload.get("effort") in VALID_EFFORTS else None
    details = _parse_details(payload.get("details"))
    item_id = _unique_id(title)
    sort_order = _next_sort_order(status)
    db_manager.execute_query(
        """
        INSERT INTO roadmap_items (
            id, title, status, category, effort, premium, summary, details_json, target, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            item_id,
            title,
            status,
            category,
            effort,
            1 if payload.get("premium") else 0,
            _sanitize(payload.get("summary")),
            json.dumps(details),
            _sanitize(payload.get("target"), 20),
            sort_order,
        ),
        fetch_all=False,
    )
    return get_roadmap_item(item_id)


def update_roadmap_item(item_id, payload):
    ensure_roadmap_schema()
    existing = get_roadmap_item(item_id)
    if not existing:
        return None

    title = existing["title"]
    if "title" in payload:
        title = _sanitize(payload.get("title"), 200) or existing["title"]

    status = existing["status"]
    if "status" in payload and payload.get("status") in VALID_STATUSES:
        status = payload["status"]

    category = existing["category"]
    if "category" in payload and payload.get("category") in VALID_CATEGORIES:
        category = payload["category"]

    effort = existing["effort"] or None
    if "effort" in payload:
        effort = payload.get("effort") if payload.get("effort") in VALID_EFFORTS else None

    premium = existing["premium"]
    if "premium" in payload:
        premium = bool(payload.get("premium"))

    summary = existing["summary"] or None
    if "summary" in payload:
        summary = _sanitize(payload.get("summary"))

    details = existing["details"]
    if "details" in payload:
        details = _parse_details(payload.get("details"))

    target = existing["target"] or None
    if "target" in payload:
        target = _sanitize(payload.get("target"), 20)

    sort_order = existing["sort_order"]
    if "sort_order" in payload:
        try:
            sort_order = int(payload.get("sort_order"))
        except (TypeError, ValueError):
            sort_order = existing["sort_order"]

    # Moving to a new column without an explicit sort: append to end.
    if "status" in payload and status != existing["status"] and "sort_order" not in payload:
        sort_order = _next_sort_order(status)

    db_manager.execute_query(
        """
        UPDATE roadmap_items SET
            title = ?,
            status = ?,
            category = ?,
            effort = ?,
            premium = ?,
            summary = ?,
            details_json = ?,
            target = ?,
            sort_order = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
        """,
        (
            title,
            status,
            category,
            effort,
            1 if premium else 0,
            summary,
            json.dumps(details),
            target,
            sort_order,
            item_id,
        ),
        fetch_all=False,
    )
    return get_roadmap_item(item_id)


def delete_roadmap_item(item_id):
    ensure_roadmap_schema()
    existing = get_roadmap_item(item_id)
    if not existing:
        return False
    db_manager.execute_query(
        "DELETE FROM roadmap_items WHERE id = ?",
        (item_id,),
        fetch_all=False,
    )
    return True


def move_roadmap_item(item_id, direction):
    """direction: left | right | up | down."""
    item = get_roadmap_item(item_id)
    if not item:
        return None

    status_ids = [col["id"] for col in ROADMAP_COLUMNS]
    lane_index = status_ids.index(item["status"]) if item["status"] in status_ids else 0
    column_items = [
        row for row in list_roadmap_items() if row["status"] == item["status"]
    ]
    column_items.sort(key=lambda row: (row["sort_order"], row["id"]))
    idx = next((i for i, row in enumerate(column_items) if row["id"] == item_id), -1)

    if direction == "left" and lane_index > 0:
        return update_roadmap_item(
            item_id,
            {"status": status_ids[lane_index - 1]},
        )
    if direction == "right" and lane_index < len(status_ids) - 1:
        return update_roadmap_item(
            item_id,
            {"status": status_ids[lane_index + 1]},
        )
    if direction == "up" and idx > 0:
        neighbor = column_items[idx - 1]
        update_roadmap_item(item_id, {"sort_order": neighbor["sort_order"]})
        update_roadmap_item(neighbor["id"], {"sort_order": item["sort_order"]})
        return get_roadmap_item(item_id)
    if direction == "down" and 0 <= idx < len(column_items) - 1:
        neighbor = column_items[idx + 1]
        update_roadmap_item(item_id, {"sort_order": neighbor["sort_order"]})
        update_roadmap_item(neighbor["id"], {"sort_order": item["sort_order"]})
        return get_roadmap_item(item_id)
    return item


def roadmap_board():
    items = list_roadmap_items()
    by_status = {col["id"]: [] for col in ROADMAP_COLUMNS}
    updated = None
    for item in items:
        status = item["status"] if item["status"] in by_status else "idea"
        by_status[status].append(item)
        stamp = item.get("updated_at")
        if stamp and (updated is None or str(stamp) > str(updated)):
            updated = stamp

    columns = []
    for col in ROADMAP_COLUMNS:
        entries = by_status[col["id"]]
        columns.append({**col, "entries": entries, "count": len(entries)})

    shipped = [item for item in items if item["status"] == "done" and item.get("target")]
    updated_label = str(updated)[:10] if updated else date.today().isoformat()
    return {
        "columns": columns,
        "categories": ROADMAP_CATEGORIES,
        "statuses": ROADMAP_COLUMNS,
        "shipped": shipped,
        "principle": ROADMAP_PRINCIPLE,
        "updated": updated_label,
        "items_json": items,
    }
