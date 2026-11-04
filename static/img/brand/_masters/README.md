# PlayTracker brand masters

Drop the new rebrand source files here. An agent (or `scripts/build_brand_assets.py`)
will generate every derived web, mobile, splash, favicon, and store asset from these.

Do not put derived outputs in this folder. Only masters.

## Required files (use these exact names)

| Filename | Canvas | Background | What it is |
|---|---|---|---|
| `mark.svg` | vector | transparent | PT monogram only |
| `mark.png` | **1600×1600** | transparent | Same mark as PNG |
| `lockup-horizontal.svg` | vector | transparent | Mark + vertical rule + "PlayTracker" wordmark (side by side) |
| `lockup-horizontal.png` | **2200×560** | transparent | Same horizontal lockup as PNG |
| `lockup-stacked.svg` | vector | transparent | Mark above "PlayTracker" wordmark |
| `lockup-stacked.png` | **1600×1600** | transparent | Same stacked lockup as PNG |
| `app-icon.png` | **1024×1024** | **opaque** (dark fill) | Store / home-screen icon art. Full bleed. No rounded corners. No transparency. |

## Optional

| Filename | Notes |
|---|---|
| `wordmark.svg` | Gradient "PlayTracker" text only. Skip unless you need it. |
| `notes.txt` | Hex colors, preferred splash/icon background, anything else to preserve |

## Rules

- Prefer SVG for anything with gradients so we can re-export cleanly.
- PNG masters should be PNG-24 (or PNG-32 with alpha where transparent).
- `app-icon.png` must be opaque; Apple rejects icons with alpha.
- You do not need sticker variants, favicons, splash, adaptive icons, or feature graphics. Those get generated from the masters above.

## When ready

Tell the agent the masters are in place. Expected next step: generate all derived assets into `static/img/brand/`, `static/`, `static/img/promo/`, and `mobile/assets/`.
