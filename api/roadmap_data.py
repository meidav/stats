"""Product roadmap for the admin console (StackTracker-style board)."""

ROADMAP_UPDATED = "2026-08-25"

ROADMAP_PRINCIPLE = (
    "Keep the core loop simple: create a league, log games, see standings. "
    "New power belongs in settings and optional tiers, not in the default path."
)

# Columns match StackTracker: Now / Next / Later / Ideas / Done
ROADMAP_COLUMNS = [
    {"id": "now", "label": "Now", "blurb": "Active / quick wins"},
    {"id": "next", "label": "Next", "blurb": "Committed, starting soon"},
    {"id": "later", "label": "Later", "blurb": "Planned, not scheduled"},
    {"id": "idea", "label": "Ideas", "blurb": "Exploring, unshaped"},
    {"id": "done", "label": "Done", "blurb": "Shipped"},
]

ROADMAP_CATEGORIES = {
    "account": {"label": "Account", "color": "#2563eb"},
    "monetization": {"label": "Monetization", "color": "#059669"},
    "sports": {"label": "Sports", "color": "#ea580c"},
    "platform": {"label": "Platform", "color": "#5b21b6"},
    "sharing": {"label": "Sharing", "color": "#db2777"},
}

# Effort: S / M / L. Premium = subscription candidate.
ROADMAP_ITEMS = [
    # Now
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
    },
    # Next
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
    },
    # Later
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
    },
    {
        "id": "more-templates",
        "title": "More built-in templates",
        "status": "later",
        "category": "sports",
        "effort": "M",
        "premium": False,
        "summary": "Add popular sports and table games before opening a full custom builder.",
        "details": [
            "Keep pick-a-sport as the default create flow",
            "Custom types stay advanced / later",
        ],
        "target": "",
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
    },
    # Ideas
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
    },
    # Done
    {
        "id": "account-modal",
        "title": "Account modal",
        "status": "done",
        "category": "account",
        "effort": "S",
        "premium": False,
        "summary": "Cog next to email opens Account with Sign out confirm and Delete account.",
        "details": [
            "Delete account two-step confirm kept for App Store",
        ],
        "target": "1.1.3",
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
    },
]


def roadmap_board():
    """Group items into columns for the template."""
    by_status = {col["id"]: [] for col in ROADMAP_COLUMNS}
    for item in ROADMAP_ITEMS:
        status = item.get("status") or "idea"
        if status not in by_status:
            status = "idea"
        cat = ROADMAP_CATEGORIES.get(item.get("category") or "platform", ROADMAP_CATEGORIES["platform"])
        by_status[status].append({**item, "category_meta": cat})
    columns = []
    for col in ROADMAP_COLUMNS:
        entries = by_status[col["id"]]
        columns.append({**col, "entries": entries, "count": len(entries)})
    shipped = [
        item
        for item in ROADMAP_ITEMS
        if item.get("status") == "done" and item.get("target")
    ]
    return {
        "columns": columns,
        "categories": ROADMAP_CATEGORIES,
        "shipped": shipped,
        "principle": ROADMAP_PRINCIPLE,
        "updated": ROADMAP_UPDATED,
    }
