"""Central brand config. Change the name here, not scattered through the codebase."""

APP_NAME = "PlayTracker"
APP_TAGLINE = "Track everything you play"
APP_SLUG = "playtracker"
APP_DOMAIN = "playtracker.org"
APP_URL = f"https://{APP_DOMAIN}"

# App Store listing (PlayTracker Stats)
APP_STORE_APP_ID = "6803964661"
APP_STORE_URL = (
    f"https://apps.apple.com/us/app/playtracker-stats/id{APP_STORE_APP_ID}"
)
# Opens the native App Store app on iPhone and iPad (Safari otherwise falls back to the web page).
APP_STORE_ITMS_URL = f"itms-apps://apps.apple.com/app/id{APP_STORE_APP_ID}"
