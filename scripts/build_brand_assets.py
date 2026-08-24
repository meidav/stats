"""Regenerate every PlayTracker brand asset from the shared mark geometry.

Rewrites the brand SVGs in place (see brand_mark.transform), re-renders the
PNGs that ship alongside them, and refreshes the inline SVG the mobile app
embeds for in-app branding.

Usage: python3 scripts/build_brand_assets.py
"""

import json
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
import brand_mark

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
IMG = ROOT / "static/img"
BRAND = IMG / "brand"
MOBILE = ROOT / "mobile/assets"
MOBILE_SRC = ROOT / "mobile/src/components"
PREVIEW = BRAND / "_preview"
PROMO = IMG / "promo"

SVG_NS = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG_NS)

# Dark surface used for QA renders of the transparent marks.
PREVIEW_BG = "#0B0B10"
BRAND_PURPLE = "#3B0764"
# Store / splash canvas: same purple ramp as BrandLockup and marketing chrome.
ICON_BG_STOPS = (
    ("0%", "#6D28D9"),
    ("45%", "#5B21B6"),
    ("100%", "#3B0764"),
)
# Full-bleed splash canvas (matches StackTracker's splash.png size).
SPLASH_W, SPLASH_H = 1284, 2778


def _purple_bg_rect(width, height, grad_id="pt-icon-bg"):
    """Opaque purple gradient fill for store icons and splash canvases."""
    stops = "\n".join(
        f'<stop offset="{offset}" stop-color="{color}"/>' for offset, color in ICON_BG_STOPS
    )
    return (
        f"<defs>\n"
        f'<linearGradient id="{grad_id}" x1="0%" y1="0%" x2="0%" y2="100%">\n'
        f"{stops}\n"
        f"</linearGradient>\n"
        f"</defs>\n"
        f'<rect width="{width}" height="{height}" fill="url(#{grad_id})"/>\n'
    )

LOCKUP_VARIANTS = ("", "-dark", "-light", "-peach", "-sky")
STICKER_VARIANTS = ("-dark", "-light", "-peach", "-sky")

# Every SVG that embeds the mark. Rewritten in place.
SVG_TARGETS = [
    IMG / "playtracker-logo.svg",
    BRAND / "playtracker-icon.svg",
    *[BRAND / f"playtracker-lockup{v}.svg" for v in LOCKUP_VARIANTS],
    *[BRAND / f"playtracker-sticker{v}.svg" for v in STICKER_VARIANTS],
    MOBILE / "playtracker-logo.svg",
    MOBILE / "playtracker-splash.svg",
]

# PNGs to re-render: (source svg, output png, render width).
# Widths match what already shipped, except the lockups, which had been
# rendered onto a square canvas that left three quarters of the image empty.
PNG_TARGETS = [
    (IMG / "playtracker-logo.svg", IMG / "playtracker-logo.png", 1024),
    (BRAND / "playtracker-icon.svg", BRAND / "playtracker-icon.png", 1600),
    *[
        (
            BRAND / f"playtracker-lockup{v}.svg",
            BRAND / f"playtracker-lockup{v}.png",
            2200,
        )
        for v in LOCKUP_VARIANTS
    ],
    *[
        (
            BRAND / f"playtracker-sticker{v}.svg",
            BRAND / f"playtracker-sticker{v}.png",
            1600,
        )
        for v in STICKER_VARIANTS
    ],
    (MOBILE / "playtracker-logo.svg", MOBILE / "playtracker-logo.png", 1024),
    (MOBILE / "playtracker-logo.svg", MOBILE / "splash-icon.png", 1024),
]

# Dark-background QA renders.
PREVIEW_TARGETS = [
    (BRAND / "playtracker-icon.svg", PREVIEW / "playtracker-icon-preview.png", 1024),
    (IMG / "playtracker-logo.svg", PREVIEW / "playtracker-lockup-preview.png", 1024),
]


def rewrite_svgs():
    print("SVG")
    for path in SVG_TARGETS:
        if not path.exists():
            print(f"  missing, skipped: {path.relative_to(ROOT)}")
            continue
        tree = ET.parse(path)
        removed = brand_mark.transform(tree)
        tree.write(path, encoding="utf-8", xml_declaration=True)
        counts = " ".join(f"{k}={v}" for k, v in removed.items())
        print(f"  {path.relative_to(ROOT)}  ({counts})")


def write_mobile_logo_xml():
    """Keep the in-app SvgXml string in sync with the logo SVG."""
    src = MOBILE / "playtracker-logo.svg"
    out = MOBILE_SRC / "playtrackerLogoXml.ts"
    svg = src.read_text()
    out.write_text("export const PLAYTRACKER_LOGO_SVG = " + json.dumps(svg) + ";\n")
    print(f"  {out.relative_to(ROOT)}")


def _mark_inset_box(content=676):
    """Place the icon mark in the Android adaptive-icon safe zone (~66%)."""
    # Icon viewBox is 310 115 430 630.
    w = content * 430 / 630
    h = content
    return (1024 - w) / 2, (1024 - h) / 2, w, h


def write_app_icon_svgs(tmpdir: Path):
    """Build store / adaptive / splash SVGs from the mark.

    Store icon is a full-bleed opaque square (no rounded corners, no alpha) so
    Apple can mask it. Adaptive foreground is the mark alone, inset for the
    66% safe zone. Splash is the transparent logo on a phone-sized purple
    canvas, matching StackTracker's splash.png role.
    """
    icon = ET.parse(BRAND / "playtracker-icon.svg").getroot()
    icon.attrib.pop("xmlns", None)
    children = "\n".join(ET.tostring(c, encoding="unicode") for c in icon)
    x, y, w, h = _mark_inset_box(700)
    ax, ay, aw, ah = _mark_inset_box(676)

    def mark_doc(path, ox, oy, ow, oh, with_bg=False):
        bg = _purple_bg_rect(1024, 1024) if with_bg else ""
        path.write_text(
            f'<?xml version="1.0" encoding="utf-8"?>\n'
            f'<svg xmlns="{SVG_NS}" width="1024" height="1024" viewBox="0 0 1024 1024" '
            f'role="img" aria-label="PlayTracker">\n{bg}'
            f'<svg x="{ox:.1f}" y="{oy:.1f}" width="{ow:.1f}" height="{oh:.1f}" '
            f'viewBox="310 115 430 630">\n{children}\n</svg>\n</svg>\n'
        )

    store = tmpdir / "store-icon.svg"
    mark_doc(store, x, y, w, h, with_bg=True)

    foreground = tmpdir / "android-icon-foreground.svg"
    mark_doc(foreground, ax, ay, aw, ah, with_bg=False)

    background = tmpdir / "android-icon-background.svg"
    background.write_text(
        f'<?xml version="1.0" encoding="utf-8"?>\n'
        f'<svg xmlns="{SVG_NS}" width="1024" height="1024" viewBox="0 0 1024 1024">\n'
        f"{_purple_bg_rect(1024, 1024)}"
        f"</svg>\n"
    )

    logo = ET.parse(MOBILE / "playtracker-logo.svg").getroot()
    logo.attrib.pop("xmlns", None)
    logo_children = "\n".join(ET.tostring(c, encoding="unicode") for c in logo)
    art = 820
    sx = (SPLASH_W - art) / 2
    sy = (SPLASH_H - art) / 2 - 60
    splash = tmpdir / "splash.svg"
    splash.write_text(
        f'<?xml version="1.0" encoding="utf-8"?>\n'
        f'<svg xmlns="{SVG_NS}" width="{SPLASH_W}" height="{SPLASH_H}" '
        f'viewBox="0 0 {SPLASH_W} {SPLASH_H}">\n'
        f"{_purple_bg_rect(SPLASH_W, SPLASH_H, 'pt-splash-bg')}"
        f'<svg x="{sx}" y="{sy}" width="{art}" height="{art}" viewBox="0 0 1024 1024">\n'
        f"{logo_children}\n</svg>\n</svg>\n"
    )

    lockup = ET.parse(BRAND / "playtracker-lockup.svg").getroot()
    lockup.attrib.pop("xmlns", None)
    lockup_children = "\n".join(ET.tostring(c, encoding="unicode") for c in lockup)
    scale = min(928 / 1100, 320 / 280)
    lw, lh = 1100 * scale, 280 * scale
    lx, ly = (1024 - lw) / 2, (500 - lh) / 2
    feature = tmpdir / "feature.svg"
    feature.write_text(
        f'<?xml version="1.0" encoding="utf-8"?>\n'
        f'<svg xmlns="{SVG_NS}" width="1024" height="500" viewBox="0 0 1024 500">\n'
        f"{_purple_bg_rect(1024, 500, 'pt-feature-bg')}"
        f'<svg x="{lx:.1f}" y="{ly:.1f}" width="{lw:.1f}" height="{lh:.1f}" '
        f'viewBox="0 0 1100 280">\n{lockup_children}\n</svg>\n</svg>\n'
    )

    return store, foreground, background, splash, feature


def render_pngs():
    PROMO.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        store, foreground, background, splash, feature = write_app_icon_svgs(tmpdir)

        # Same 1024 store icon under the ST-style names Expo / humans expect.
        store_outs = [
            MOBILE / "PlayTracker-iOS-App-Icon-1024.png",
            MOBILE / "icon.png",
            MOBILE / "adaptive-icon.png",
            MOBILE / "splash-icon.png",
            MOBILE / "favicon.png",
            PROMO / "PlayTracker-iOS-App-Icon-1024.png",
        ]

        jobs = [
            {"src": str(src), "out": str(out), "width": w}
            for src, out, w in PNG_TARGETS
        ]
        jobs += [
            {"src": str(store), "out": str(out), "width": 1024} for out in store_outs
        ]
        jobs += [
            {
                "src": str(foreground),
                "out": str(MOBILE / "android-icon-foreground.png"),
                "width": 1024,
            },
            {
                "src": str(background),
                "out": str(MOBILE / "android-icon-background.png"),
                "width": 1024,
            },
            {"src": str(splash), "out": str(MOBILE / "splash.png"), "width": SPLASH_W},
            {
                "src": str(feature),
                "out": str(PROMO / "play-feature-graphic.png"),
                "width": 1024,
            },
        ]
        jobs += [
            {
                "src": str(src),
                "out": str(out),
                "width": w,
                "background": PREVIEW_BG,
            }
            for src, out, w in PREVIEW_TARGETS
        ]

        jobs_path = tmpdir / "jobs.json"
        jobs_path.write_text(json.dumps(jobs))

        print("PNG")
        subprocess.run(
            ["node", str(SCRIPTS / "render_brand_assets.js"), str(jobs_path)],
            cwd=ROOT,
            check=True,
        )

    # Play Console also wants a 512 icon.
    store_png = MOBILE / "PlayTracker-iOS-App-Icon-1024.png"
    play_512 = PROMO / "play-icon-512.png"
    if shutil.which("sips"):
        subprocess.run(
            ["sips", "-z", "512", "512", str(store_png), "--out", str(play_512)],
            check=True,
            capture_output=True,
        )
        print(f"  {play_512.relative_to(ROOT)}")


if __name__ == "__main__":
    if shutil.which("node") is None:
        sys.exit("node is required; run `npm install` in scripts/ first")
    rewrite_svgs()
    print("TS")
    write_mobile_logo_xml()
    render_pngs()
