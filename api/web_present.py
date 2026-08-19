from datetime import datetime
from urllib.parse import quote


def win_pct_class(pct):
    value = float(pct or 0)
    if value >= 0.6:
        return "mkt-win"
    if value <= 0.4:
        return "mkt-loss"
    return "mkt-neutral"


def plus_minus_class(value):
    number = int(value or 0)
    if number > 0:
        return "mkt-win"
    if number < 0:
        return "mkt-loss"
    return "mkt-neutral"


def format_plus_minus(value):
    number = int(value or 0)
    if number > 0:
        return f"+{number}"
    return str(number)


def player_initials(name):
    parts = [part for part in str(name or "").strip().split() if part]
    if not parts:
        return "?"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()


def player_href(slug, player, sport_id):
    encoded = quote(str(player or ""), safe="")
    return f"/l/{slug}/p/{encoded}?sport={sport_id}"


def annotate_stat_rows(rows, slug, sport_id):
    annotated = []
    for row in rows or []:
        item = dict(row)
        item["href"] = player_href(slug, row.get("player"), sport_id)
        item["pct_class"] = win_pct_class(row.get("win_pct"))
        item["pct_label"] = str(int(round(float(row.get("win_pct") or 0) * 100)))
        annotated.append(item)
    return annotated


def format_game_stamp(value):
    text = str(value or "").strip().replace("T", " ")
    dt = None
    for size, fmt in ((19, "%Y-%m-%d %H:%M:%S"), (16, "%Y-%m-%d %H:%M")):
        try:
            dt = datetime.strptime(text[:size], fmt)
            break
        except ValueError:
            continue
    if dt is None:
        return text
    hour = dt.strftime("%I").lstrip("0") or "12"
    return f"{dt.strftime('%a')}, {dt.strftime('%b')} {dt.day} · {hour}:{dt.strftime('%M')} {dt.strftime('%p')}"


def format_set_line(metadata):
    if not isinstance(metadata, dict):
        return None
    raw = metadata.get("sets")
    if not isinstance(raw, list) or not raw:
        return None
    parts = []
    for item in raw:
        if isinstance(item, (list, tuple)) and len(item) >= 2:
            parts.append(f"{item[0]}-{item[1]}")
    return ", ".join(parts) if parts else None


def present_games(games, win_loss=False):
    presented = []
    for game in games or []:
        set_line = format_set_line(game.get("metadata"))
        if win_loss:
            winner_score, loser_score = "W", "L"
        elif set_line:
            winner_score, loser_score = "", ""
        else:
            winner_score = game.get("winner_score")
            loser_score = game.get("loser_score")
        presented.append(
            {
                "when": format_game_stamp(game.get("game_date")),
                "winners": game.get("winners") or [],
                "losers": game.get("losers") or [],
                "winner_score": winner_score,
                "loser_score": loser_score,
                "set_line": set_line,
            }
        )
    return presented


def present_player(profile, slug, sport_id):
    data = dict(profile)
    data["initials"] = player_initials(profile.get("player"))
    data["pct_label"] = f"{int(round(float(profile.get('win_pct') or 0) * 100))}%"
    data["pct_class"] = win_pct_class(profile.get("win_pct"))
    data["plus_minus_label"] = format_plus_minus(profile.get("plus_minus"))
    data["plus_minus_class"] = plus_minus_class(profile.get("plus_minus"))
    streak = str(profile.get("streak") or "0")
    if streak.endswith("W"):
        data["streak_class"] = "mkt-win"
    elif streak.endswith("L"):
        data["streak_class"] = "mkt-loss"
    else:
        data["streak_class"] = "mkt-neutral"
    rank = profile.get("rank")
    field_size = profile.get("field_size")
    if rank:
        data["streak_label"] = f"Streak · #{rank} of {field_size}"
    else:
        data["streak_label"] = "Streak"
    data["partners"] = annotate_stat_rows(profile.get("partners"), slug, sport_id)
    data["opponents"] = annotate_stat_rows(profile.get("opponents"), slug, sport_id)
    return data
