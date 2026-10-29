"""Game templates for league creation. Keep this list product-facing and simple."""

SPORT_TEMPLATES = [
    {
        "id": "badminton_doubles",
        "name": "Badminton Doubles",
        "category": "sports",
        "players_per_side": 2,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Badminton Doubles",
    },
    {
        "id": "badminton_singles",
        "name": "Badminton Singles",
        "category": "sports",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Badminton Singles",
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
        "id": "pickleball_doubles",
        "name": "Pickleball Doubles",
        "category": "sports",
        "players_per_side": 2,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Pickleball Doubles",
    },
    {
        "id": "pickleball_singles",
        "name": "Pickleball Singles",
        "category": "sports",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Pickleball Singles",
    },
    {
        "id": "ping_pong",
        "name": "Ping Pong",
        "category": "sports",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Ping Pong",
    },
    {
        "id": "softball",
        "name": "Softball",
        "category": "sports",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "side_kind": "team",
        "default_name": "Softball",
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
        "id": "backgammon",
        "name": "Backgammon",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Backgammon",
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
        "id": "checkers",
        "name": "Checkers",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Checkers",
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
        "id": "connect_four",
        "name": "Connect Four",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Connect Four",
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
        "id": "dominoes",
        "name": "Dominoes",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "optional_points",
        "default_name": "Dominoes",
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
        "id": "hearts",
        "name": "Hearts",
        "category": "cards",
        "players_per_side": 1,
        "score_direction": "lower_wins",
        "score_mode": "points",
        "default_name": "Hearts",
    },
    {
        "id": "mahjong",
        "name": "Mahjong",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "optional_points",
        "default_name": "Mahjong",
    },
    {
        "id": "mancala",
        "name": "Mancala",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Mancala",
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
        "id": "pusoy_dos",
        "name": "Pusoy Dos",
        "category": "cards",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Pusoy Dos",
    },
    {
        "id": "rummikub",
        "name": "Rummikub",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "optional_points",
        "default_name": "Rummikub",
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
        "id": "spades",
        "name": "Spades",
        "category": "cards",
        "players_per_side": 2,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Spades",
    },
    {
        "id": "ticket_to_ride",
        "name": "Ticket to Ride",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "win_loss",
        "default_name": "Ticket to Ride",
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
        "id": "yahtzee",
        "name": "Yahtzee",
        "category": "board",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "score_mode": "points",
        "default_name": "Yahtzee",
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
SCORE_MODES = ("points", "win_loss", "optional_points")
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
    """Alphabetical by name; Custom always last for create-league grids."""
    return sorted(
        SPORT_TEMPLATES,
        key=lambda t: (t["id"] == "custom", (t.get("name") or "").lower()),
    )


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
    if tid.startswith("pickleball"):
        return "pickleball"
    if tid == "ping_pong":
        return "ping_pong"
    if tid.startswith("badminton"):
        return "badminton"
    if tid == "softball":
        return "softball"
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
    if tid == "connect_four":
        return "connect_four"
    if tid == "rummikub":
        return "rummikub"
    if tid == "ticket_to_ride":
        return "ticket_to_ride"
    if tid in ("backgammon", "yahtzee", "dominoes", "mancala"):
        return "dice"
    if tid == "mahjong":
        return "puzzle"
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
    "pickleball_singles": 11,
    "pickleball_doubles": 11,
    "ping_pong": 11,
    "badminton_singles": 21,
    "badminton_doubles": 21,
    "softball": 7,
    "gin": 100,
    "cribbage": 121,
    "spades": 500,
    "hearts": 0,
    "yahtzee": 250,
    "scrabble": 350,
    "catan": 10,
    "dominoes": 100,
    "mahjong": 0,
    "rummikub": 0,
}


def typical_win_score_for(template_id):
    return TYPICAL_WIN_SCORES.get(template_id)


def public_template(template):
    score_mode = template.get("score_mode", "points")
    return {
        "id": template["id"],
        "name": template["name"],
        "category": template["category"],
        "players_per_side": template["players_per_side"],
        "score_direction": template["score_direction"],
        "score_mode": score_mode,
        "scores_optional": score_mode in ("win_loss", "optional_points"),
        "score_shape": template.get("score_shape", "points"),
        "side_kind": template.get("side_kind", "player"),
        "typical_win_score": typical_win_score_for(template["id"]),
        "default_name": template["default_name"],
        "configurable": template.get("configurable", False),
    }
