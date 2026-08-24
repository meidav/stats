"""Game templates for league creation. Keep this list product-facing and simple."""

SPORT_TEMPLATES = [
    {
        "id": "beach_volleyball_2s",
        "name": "Beach Volleyball 2's",
        "category": "sports",
        "players_per_side": 2,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Beach Volleyball 2's",
        "legacy_table": "games",
    },
    {
        "id": "beach_volleyball_4s",
        "name": "Beach Volleyball 4's",
        "category": "sports",
        "players_per_side": 4,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Beach Volleyball 4's",
    },
    {
        "id": "indoor_volleyball",
        "name": "Indoor Volleyball",
        "category": "sports",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "side_kind": "team",
        "default_name": "Indoor Volleyball",
    },
    {
        "id": "vollis",
        "name": "Vollis",
        "category": "sports",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Vollis",
        "legacy_table": "vollis_games",
    },
    {
        "id": "tennis_singles",
        "name": "Tennis Singles",
        "category": "sports",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "score_shape": "sets",
        "default_name": "Tennis Singles",
        "legacy_table": "tennis_matches",
    },
    {
        "id": "tennis_doubles",
        "name": "Tennis Doubles",
        "category": "sports",
        "players_per_side": 2,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "score_shape": "sets",
        "default_name": "Tennis Doubles",
    },
    {
        "id": "basketball_3v3",
        "name": "Basketball 3v3",
        "category": "sports",
        "players_per_side": 3,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Basketball 3v3",
    },
    {
        "id": "gin",
        "name": "Gin",
        "category": "cards",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Gin",
    },
    {
        "id": "pusoy_dos",
        "name": "Pusoy Dos",
        "category": "cards",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Pusoy Dos",
    },
    {
        "id": "cribbage",
        "name": "Cribbage",
        "category": "cards",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Cribbage",
    },
    {
        "id": "spades",
        "name": "Spades",
        "category": "cards",
        "players_per_side": 2,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Spades",
    },
    {
        "id": "hearts",
        "name": "Hearts",
        "category": "cards",
        "players_per_side": 1,
        "score_direction": "lower_wins",
        "score_mode": "points",
        "default_name": "Hearts",
    },
    {
        "id": "chess",
        "name": "Chess",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Chess",
    },
    {
        "id": "checkers",
        "name": "Checkers",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Checkers",
    },
    {
        "id": "backgammon",
        "name": "Backgammon",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Backgammon",
    },
    {
        "id": "yahtzee",
        "name": "Yahtzee",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Yahtzee",
    },
    {
        "id": "scrabble",
        "name": "Scrabble",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Scrabble",
    },
    {
        "id": "uno",
        "name": "Uno",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Uno",
    },
    {
        "id": "catan",
        "name": "Catan",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Catan",
    },
    {
        "id": "monopoly",
        "name": "Monopoly",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Monopoly",
    },
    {
        "id": "custom",
        "name": "Custom",
        "category": "custom",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Custom Game",
        "configurable": True,
    },
]

VISIBILITY_OPTIONS = ("public", "private", "unlisted")
SCORE_DIRECTIONS = ("higher_wins", "lower_wins")
# Create/update only sports or table. mixed remains valid for legacy leagues in the DB.
CREATE_FOCUS_OPTIONS = ("sports", "table")
FOCUS_OPTIONS = ("sports", "table", "mixed")
TEMPLATE_CATEGORIES = (
    {"id": "sports", "name": "Sports"},
    {"id": "cards", "name": "Cards"},
    {"id": "board", "name": "Board games"},
    {"id": "custom", "name": "Custom"},
)

_TEMPLATE_BY_ID = {t["id"]: t for t in SPORT_TEMPLATES}


def get_template(template_id):
    return _TEMPLATE_BY_ID.get(template_id)


def list_templates():
    return SPORT_TEMPLATES


def focus_for_template(template_id):
    template = get_template(template_id)
    if not template:
        return "sports"
    if template["category"] == "sports":
        return "sports"
    if template["category"] in ("cards", "board"):
        return "table"
    return "sports"


def default_icon_for_template(template_id):
    """Match mobile iconIdForSport so create and edit share the same marks."""
    template = get_template(template_id) or {}
    tid = str(template_id or "")
    category = template.get("category")
    if tid.startswith("beach_volleyball") or tid == "vollis":
        return "beach_volleyball"
    if tid == "indoor_volleyball":
        return "volleyball"
    if tid.startswith("tennis"):
        return "tennis"
    if tid.startswith("basketball"):
        return "basketball"
    if tid == "chess":
        return "chess"
    if tid == "checkers":
        return "checkers"
    if tid == "monopoly":
        return "monopoly"
    if tid == "scrabble":
        return "scrabble"
    if tid == "catan":
        return "catan"
    if tid in ("backgammon", "yahtzee"):
        return "dice"
    if category == "cards" or tid == "uno":
        return "cards"
    if category == "sports":
        return "medal"
    if category == "board":
        return "puzzle"
    return None


TYPICAL_WIN_SCORES = {
    "beach_volleyball_2s": 21,
    "beach_volleyball_4s": 21,
    "indoor_volleyball": 25,
    "vollis": 21,
    "tennis_singles": 6,
    "tennis_doubles": 6,
    "basketball_3v3": 21,
    "gin": 100,
    "cribbage": 121,
    "spades": 500,
    "hearts": 0,
    "yahtzee": 250,
    "scrabble": 350,
    "catan": 10,
}


def typical_win_score_for(template_id):
    return TYPICAL_WIN_SCORES.get(template_id)


def public_template(template):
    return {
        "id": template["id"],
        "name": template["name"],
        "category": template["category"],
        "players_per_side": template["players_per_side"],
        "score_direction": template["score_direction"],
        "score_mode": template.get("score_mode", "points"),
        "score_shape": template.get("score_shape", "points"),
        "side_kind": template.get("side_kind", "player"),
        "typical_win_score": typical_win_score_for(template["id"]),
        "default_name": template["default_name"],
        "configurable": template.get("configurable", False),
    }
