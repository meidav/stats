"""Product roadmap items for the admin console."""

ROADMAP_PRINCIPLE = (
    "Keep the core loop simple: create a league, log games, see standings. "
    "New power belongs in settings and optional tiers, not in the default path."
)

ROADMAP_SECTIONS = [
    {
        "id": "account",
        "title": "Account settings (mobile)",
        "subtitle": "Expand the Account modal beyond sign out and delete.",
        "entries": [
            {
                "title": "Theme / color scheme",
                "detail": "User-selectable palettes. Default stays the current gradient look.",
                "status": "planned",
            },
            {
                "title": "Default occasional-player threshold",
                "detail": "Global default (e.g. 5%) with optional per-league override later.",
                "status": "planned",
            },
            {
                "title": "Default sport when creating a league",
                "detail": "Remember last used or let users pick a default template.",
                "status": "planned",
            },
            {
                "title": "Linked sign-in methods",
                "detail": "Show Apple / Google connected, add email password if missing.",
                "status": "planned",
            },
            {
                "title": "Export my data",
                "detail": "Download leagues, games, and profile data (privacy-friendly).",
                "status": "planned",
            },
            {
                "title": "Version / build footer",
                "detail": "Show app version and build at the bottom for support and debugging.",
                "status": "planned",
            },
        ],
    },
    {
        "id": "subscriptions",
        "title": "Subscriptions",
        "subtitle": "Long-term monetization. Free tier stays usable; paid unlocks scale.",
        "entries": [
            {
                "title": "Unlimited leagues",
                "detail": "Primary paid benefit to flesh out. Cap or limit on free tier TBD.",
                "status": "exploring",
            },
            {
                "title": "What else is included?",
                "detail": "Advanced stats, exports, custom branding, priority support - still open.",
                "status": "exploring",
            },
            {
                "title": "Keep free tier simple",
                "detail": "One or a few leagues with full standings should remain free so casual groups are not blocked.",
                "status": "principle",
            },
        ],
    },
    {
        "id": "sports",
        "title": "More games and sports",
        "subtitle": "Grow the template library without overwhelming create-league.",
        "entries": [
            {
                "title": "User-created sport / game types",
                "detail": "Settings like players per team, win needs a score or win/loss only, score direction.",
                "status": "planned",
            },
            {
                "title": "Curated templates first",
                "detail": "Keep the current pick-a-sport flow as the default; custom types are advanced.",
                "status": "principle",
            },
            {
                "title": "More built-in templates",
                "detail": "Add popular sports and table games before opening full custom builder.",
                "status": "planned",
            },
        ],
    },
    {
        "id": "platform",
        "title": "Platform and polish",
        "subtitle": "Near-term shipping items outside Account.",
        "entries": [
            {
                "title": "Android parity",
                "detail": "Google Sign-In, border styling, Play Store submit after Apple.",
                "status": "in_progress",
            },
            {
                "title": "Open in PlayTracker (web)",
                "detail": "Deep link from public league / player pages into the app.",
                "status": "planned",
            },
        ],
    },
]
