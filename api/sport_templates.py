"""Sport template definitions for league creation."""

SPORT_TEMPLATES = [
    {
        "id": "beach_volleyball_2s",
        "name": "Beach Volleyball 2's",
        "players_per_side": 2,
        "score_direction": "higher_wins",
        "default_name": "Beach Volleyball 2's",
        "legacy_table": "games",
    },
    {
        "id": "beach_volleyball_4s",
        "name": "Beach Volleyball 4's",
        "players_per_side": 4,
        "score_direction": "higher_wins",
        "default_name": "Beach Volleyball 4's",
    },
    {
        "id": "vollis",
        "name": "Vollis",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "default_name": "Vollis",
        "legacy_table": "vollis_games",
    },
    {
        "id": "tennis_singles",
        "name": "Tennis Singles",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "default_name": "Tennis Singles",
        "legacy_table": "tennis_matches",
    },
    {
        "id": "tennis_doubles",
        "name": "Tennis Doubles",
        "players_per_side": 2,
        "score_direction": "higher_wins",
        "default_name": "Tennis Doubles",
    },
    {
        "id": "custom",
        "name": "Custom",
        "players_per_side": 1,
        "score_direction": "higher_wins",
        "default_name": "Custom Sport",
        "configurable": True,
    },
]

VISIBILITY_OPTIONS = ("public", "private", "unlisted")
SCORE_DIRECTIONS = ("higher_wins", "lower_wins")

_TEMPLATE_BY_ID = {t["id"]: t for t in SPORT_TEMPLATES}


def get_template(template_id):
    return _TEMPLATE_BY_ID.get(template_id)


def list_templates():
    return SPORT_TEMPLATES
