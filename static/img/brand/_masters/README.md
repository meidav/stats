# PlayTracker brand masters

Drop source files here with the **exact filenames** below. An agent will generate
web, mobile, splash, favicon, and store assets from these.

Only masters in this folder. No derived sizes.

## Required (7 files)

| Filename | Width × height | Background | Contents |
|---|---|---|---|
| `mark.svg` | vector (any viewBox; art centered) | **transparent** | PT monogram only. No wordmark, no square plate, no glow behind the mark. |
| `mark.png` | **1600 × 1600** | **transparent** (PNG with alpha) | Same as `mark.svg`, rasterized. Mark centered with a little padding so edges are not clipped. |
| `lockup-horizontal.svg` | vector | **transparent** | Mark, thin vertical rule, then "PlayTracker" wordmark in one horizontal row (as in your wide logo). |
| `lockup-horizontal.png` | **2200 × 560** | **transparent** (PNG with alpha) | Same as horizontal SVG. Art centered; leave a bit of padding on all sides. |
| `lockup-stacked.svg` | vector | **transparent** | Mark on top, "PlayTracker" wordmark below (as in your square lockup). |
| `lockup-stacked.png` | **1600 × 1600** | **transparent** (PNG with alpha) | Same as stacked SVG. Art centered with padding. |
| `app-icon.png` | **1024 × 1024** | **opaque** (solid / gradient fill, **no alpha**) | Mark centered on a dark full-bleed square. **No rounded corners** (stores mask that). **No transparency.** |

## Optional (skip unless easy)

| Filename | Notes |
|---|---|
| `wordmark.svg` | Gradient "PlayTracker" text only. Not required. |
| `notes.txt` | Hex colors, preferred splash/icon background, font names. |

## Transparency summary

- **Transparent:** `mark.*`, `lockup-horizontal.*`, `lockup-stacked.*`
- **Opaque only:** `app-icon.png`

## Photoshop → SVG

Photoshop is raster. A good SVG needs real vectors (paths / editable type), not a traced bitmap.

**Best:** design in **Figma** or **Illustrator**, export SVG + PNG from there.

**If you only have Photoshop:**

1. Export the **PNG masters** listed above (File → Export → Export As → PNG, Transparency on except for `app-icon.png`).
2. For SVG, either:
   - Rebuild the mark + wordmark in Figma/Illustrator and export SVG, or
   - Drop **PNG-only** masters and tell the agent; we can ship most surfaces from PNG (SVG is nicer for favicons and infinite scale, but not blocking).

Do **not** rely on Photoshop "Export as SVG" for this logo if the layers are flattened pixels; the SVG will be a huge embedded image, not useful vectors.

## Regenerate derived assets

```bash
python3 scripts/apply_brand_masters.py
```

Writes web, mobile, splash, favicon, adaptive icon, and Play feature graphic outputs.
The older `scripts/build_brand_assets.py` is for the previous volleyball mark and should not be used for this rebrand.
