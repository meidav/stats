#!/usr/bin/env python3
"""Build every PlayTracker brand derivative from static/img/brand/_masters/.

Masters (PNG + optional SVG):
  mark, lockup-horizontal, lockup-stacked, app-icon, wordmark (optional)

SVGs from Inkscape may embed PNG; we treat PNG as the raster source of truth.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
MASTERS = ROOT / "static/img/brand/_masters"
BRAND = ROOT / "static/img/brand"
IMG = ROOT / "static/img"
PROMO = IMG / "promo"
STATIC = ROOT / "static"
MOBILE = ROOT / "mobile/assets"
PREVIEW = BRAND / "_preview"

# Dark purple ramp sampled from app-icon.png edges.
BG_TOP = (54, 4, 142)
BG_BOTTOM = (0, 0, 18)
SPLASH_W, SPLASH_H = 1284, 2778


def require_master(name: str) -> Path:
    path = MASTERS / name
    if not path.exists():
        raise SystemExit(f"Missing master: {path.relative_to(ROOT)}")
    return path


def vertical_gradient(size: tuple[int, int], top=BG_TOP, bottom=BG_BOTTOM) -> Image.Image:
    w, h = size
    im = Image.new("RGB", size)
    draw = ImageDraw.Draw(im)
    for y in range(h):
        t = y / max(h - 1, 1)
        color = tuple(int(top[i] * (1 - t) + bottom[i] * t) for i in range(3))
        draw.line([(0, y), (w, y)], fill=color)
    return im


def flatten_opaque(src: Image.Image, size: tuple[int, int] | None = None) -> Image.Image:
    """Composite onto brand gradient so store icons have no alpha."""
    rgba = src.convert("RGBA")
    if size and rgba.size != size:
        rgba = rgba.resize(size, Image.Resampling.LANCZOS)
    bg = vertical_gradient(rgba.size).convert("RGBA")
    return Image.alpha_composite(bg, rgba).convert("RGB")


def fit_contain(src: Image.Image, box: tuple[int, int]) -> Image.Image:
    """Scale src to fit inside box, preserving aspect, centered on transparent canvas."""
    src = src.convert("RGBA")
    bw, bh = box
    sw, sh = src.size
    scale = min(bw / sw, bh / sh)
    nw, nh = max(1, int(sw * scale)), max(1, int(sh * scale))
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", box, (0, 0, 0, 0))
    canvas.paste(resized, ((bw - nw) // 2, (bh - nh) // 2), resized)
    return canvas


def save(im: Image.Image, path: Path, **kwargs) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, **kwargs)
    print(f"  {path.relative_to(ROOT)}")


def copy_file(src: Path, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    print(f"  {dest.relative_to(ROOT)} (copy)")


def write_brand_svgs() -> None:
    """Publish master SVGs under the names the site already references."""
    mapping = {
        "mark.svg": [
            BRAND / "playtracker-icon.svg",
            BRAND / "playtracker-sticker-dark.svg",
            BRAND / "playtracker-sticker-light.svg",
            BRAND / "playtracker-sticker-peach.svg",
            BRAND / "playtracker-sticker-sky.svg",
        ],
        "lockup-horizontal.svg": [
            BRAND / "playtracker-lockup.svg",
            BRAND / "playtracker-lockup-dark.svg",
            BRAND / "playtracker-lockup-light.svg",
            BRAND / "playtracker-lockup-peach.svg",
            BRAND / "playtracker-lockup-sky.svg",
        ],
        "lockup-stacked.svg": [
            IMG / "playtracker-logo.svg",
            MOBILE / "playtracker-logo.svg",
            MOBILE / "playtracker-splash.svg",
        ],
    }

    for master_name, dests in mapping.items():
        src = require_master(master_name)
        for dest in dests:
            copy_file(src, dest)


def write_raster_brand() -> None:
    mark = Image.open(require_master("mark.png")).convert("RGBA")
    horizontal = Image.open(require_master("lockup-horizontal.png")).convert("RGBA")
    stacked = Image.open(require_master("lockup-stacked.png")).convert("RGBA")
    app_icon_src = Image.open(require_master("app-icon.png"))

    # Core brand PNGs
    save(mark, BRAND / "playtracker-icon.png")
    save(horizontal, BRAND / "playtracker-lockup.png")
    for variant in ("-dark", "-light", "-peach", "-sky"):
        save(horizontal, BRAND / f"playtracker-lockup{variant}.png")
        save(mark, BRAND / f"playtracker-sticker{variant}.png")

    # Legacy site logo path: stacked lockup at 1024
    save(fit_contain(stacked, (1024, 1024)), IMG / "playtracker-logo.png")

    # Opaque store / home-screen icon
    store = flatten_opaque(app_icon_src, (1024, 1024))
    store_outs = [
        MOBILE / "PlayTracker-iOS-App-Icon-1024.png",
        MOBILE / "icon.png",
        MOBILE / "adaptive-icon.png",
        MOBILE / "splash-icon.png",
        MOBILE / "favicon.png",
        PROMO / "PlayTracker-iOS-App-Icon-1024.png",
    ]
    for out in store_outs:
        save(store, out)

    play_512 = store.resize((512, 512), Image.Resampling.LANCZOS)
    save(play_512, PROMO / "play-icon-512.png")

    # Adaptive foreground: mark in ~66% safe zone on transparent 1024
    foreground = fit_contain(mark, (676, 676))
    fg_canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    fg_canvas.paste(foreground, ((1024 - 676) // 2, (1024 - 676) // 2), foreground)
    save(fg_canvas, MOBILE / "android-icon-foreground.png")

    # Adaptive background
    save(vertical_gradient((1024, 1024)), MOBILE / "android-icon-background.png")

    # Monochrome: white silhouette from mark alpha
    mono_src = fit_contain(mark, (432, 432))
    alpha = mono_src.split()[3]
    mono = Image.new("RGBA", (432, 432), (0, 0, 0, 0))
    white = Image.new("RGBA", (432, 432), (255, 255, 255, 255))
    mono.paste(white, mask=alpha)
    save(mono, MOBILE / "android-icon-monochrome.png")

    # In-app lockup + small mark
    save(fit_contain(stacked, (1024, 1024)), MOBILE / "playtracker-logo.png")
    save(fit_contain(mark, (512, 512)), MOBILE / "playtracker-icon.png")

    # Splash: phone canvas, stacked lockup centered
    splash_bg = vertical_gradient((SPLASH_W, SPLASH_H)).convert("RGBA")
    art = fit_contain(stacked, (820, 820))
    sx = (SPLASH_W - art.width) // 2
    sy = (SPLASH_H - art.height) // 2 - 60
    splash_bg.paste(art, (sx, sy), art)
    save(splash_bg.convert("RGB"), MOBILE / "splash.png")

    # Play feature / OG: 1024x500
    feature = vertical_gradient((1024, 500)).convert("RGBA")
    lock = fit_contain(horizontal, (928, 320))
    feature.paste(lock, ((1024 - lock.width) // 2, (500 - lock.height) // 2), lock)
    save(feature.convert("RGB"), PROMO / "play-feature-graphic.png")

    # Favicons / PWA
    save(fit_contain(mark, (16, 16)).convert("RGBA"), STATIC / "favicon-16x16.png")
    save(fit_contain(mark, (32, 32)).convert("RGBA"), STATIC / "favicon-32x32.png")
    apple = flatten_opaque(fit_contain(mark, (180, 180)), (180, 180))
    save(apple, STATIC / "apple-touch-icon.png")
    save(flatten_opaque(fit_contain(mark, (192, 192)), (192, 192)), STATIC / "android-chrome-192x192.png")
    save(flatten_opaque(fit_contain(mark, (512, 512)), (512, 512)), STATIC / "android-chrome-512x512.png")

    ico16 = fit_contain(mark, (16, 16)).convert("RGBA")
    ico32 = fit_contain(mark, (32, 32)).convert("RGBA")
    ico_path = STATIC / "favicon.ico"
    ico16.save(
        ico_path,
        format="ICO",
        sizes=[(16, 16), (32, 32)],
        append_images=[ico32],
    )
    print(f"  {ico_path.relative_to(ROOT)}")

    # Dark previews for QA
    for src, name, box in (
        (mark, "playtracker-icon-preview.png", (1024, 1024)),
        (horizontal, "playtracker-lockup-preview.png", (2200, 560)),
    ):
        preview = vertical_gradient(box).convert("RGBA")
        art = fit_contain(src, box)
        preview = Image.alpha_composite(preview, art)
        save(preview.convert("RGB"), PREVIEW / name)


def write_mobile_logo_note() -> None:
    """In-app SVG xml is obsolete for the new raster lockup; BrandLockup uses PNG."""
    out = ROOT / "mobile/src/components/playtrackerLogoXml.ts"
    out.write_text(
        "// Deprecated for the 2026 rebrand: Inkscape masters embed PNG and are too large\n"
        "// for SvgXml. BrandLockup / PlayTrackerLogo use mobile/assets/playtracker-logo.png.\n"
        "export const PLAYTRACKER_LOGO_SVG = '';\n"
    )
    print(f"  {out.relative_to(ROOT)} (cleared)")


def main() -> None:
    print("PlayTracker brand masters -> derived assets")
    print(f"Masters: {MASTERS.relative_to(ROOT)}")
    write_brand_svgs()
    write_raster_brand()
    write_mobile_logo_note()
    print("Done.")


if __name__ == "__main__":
    main()
