"""Competition-style ranks (ties share a rank; next rank skips)."""


def standings_rank_key(row):
    return (
        row.get("win_pct") or 0,
        row.get("wins") or 0,
    )


def pair_rank_key(row):
    return (
        row.get("win_pct") or 0,
        row.get("wins") or 0,
        row.get("games") or 0,
    )


def competition_ranks(rows, key_fn):
    """Return 1-based ranks parallel to rows."""
    if not rows:
        return []
    ranks = []
    current_rank = 1
    for index, row in enumerate(rows):
        if index > 0 and key_fn(row) != key_fn(rows[index - 1]):
            current_rank = index + 1
        ranks.append(current_rank)
    return ranks


def player_rank_in_rows(rows, player_name, key_fn=standings_rank_key):
    """Rank and field size for a player within an already-sorted list."""
    ranks = competition_ranks(rows, key_fn)
    field_size = len(rows)
    for row, rank in zip(rows, ranks):
        if row.get("player") == player_name:
            return rank, field_size
    return None, field_size


def with_ranks(rows, key_fn=standings_rank_key):
    ranked = []
    for row, rank in zip(rows, competition_ranks(rows, key_fn)):
        item = dict(row)
        item["rank"] = rank
        ranked.append(item)
    return ranked
