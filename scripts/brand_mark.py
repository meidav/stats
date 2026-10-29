"""The PlayTracker mark rebuild, applied to any SVG that embeds it.

Every brand file (icon, lockups, stickers, splash) carries the same mark path
data at the same coordinates, either at the document root or inside a nested
<svg>. This module locates that host element and applies three changes:

  * replaces the hand-traced volleyball with the Wilson-style panel geometry,
    with the middle panel of each visible band picked out in lilac
  * drops the misshapen ring that sat on the chip's top plate and replaces it
    with evenly spaced dots along the plate's rim
  * retunes the wordmark to a single lilac-to-peach sweep

Re-running is safe: generated groups are found by id and rebuilt in place.
"""

import math
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from brand_svg_util import ellipse_arc_points, path_bounds, subpaths

SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "static/img/brand/_ref/wilson-volleyball.svg"

# Wilson source ball geometry -> placement on the mark (pre-scale coords).
SRC_BALL = (384.28571, 549.1914, 313.8279)
DST_BALL = (1042.0, 455.0, 158.0)
PANEL_SHIFT = (17.389861, 160.12705)

# Middle panel of each visible band: top, right, left.
ACCENT_PANELS = (2, 5, 9)

# Rim of the lilac top plate, least-squares fitted to the back arc of that
# plate's outline (see fit_ellipse in brand_svg_util).
PLATE = {"cx": 1044.8, "cy": 1156.2, "rx": 350.0, "ry": 127.5}
DOT_INSET = 0.88
# Nudge toward the front edge, in pre-scale units (the mark is drawn at
# scale 0.5, so this is half as much on screen).
DOT_DROP = 14.0
CHIP_DOTS = 20

# Wordmark reads lilac to peach, using the mid stop of each logo gradient.
WORD_STOPS = (("0%", "#A78BFA"), ("100%", "#FDBA74"))
WORD_GRADIENTS = ("pt-word", "pt-word-lockup")

INK = "#0F172A"
GENERATED_IDS = ("volleyball", "volleyball-wrap", "base", "chip-rim-clean", "chip-dots")

# Stray ink blob sitting just right of the die's 6 face.
STRAY_DOTS = ((1317.0, 1117.0),)


def is_ball(d):
    b = path_bounds(d)
    if not b:
        return False
    return 250 <= b["cy"] <= 560 and 900 <= b["cx"] <= 1200 and b["ymax"] < 650


def chip_radius(b):
    return math.hypot((b["cx"] - 1047.0) / 320.0, (b["cy"] - 1226.0) / 78.0)


def is_stray(b):
    return any(
        abs(b["cx"] - sx) < 25 and abs(b["cy"] - sy) < 25 for sx, sy in STRAY_DOTS
    )


def is_rim_dot(d, fill):
    """Hand-traced dots on the chip rim - not the die pips."""
    b = path_bounds(d)
    if not b or "pt-ink" not in fill:
        return False
    if b["w"] >= 55 or b["h"] >= 60:
        return False
    if is_stray(b):
        return True
    if not 1140 <= b["cy"] <= 1400:
        return False
    return chip_radius(b) > 0.50


def is_rim_fragment(d, fill):
    """Leftovers of the old hand-traced ring on the chip's top plate.

    Two kinds: the misshapen peach/lilac arcs that sat inside the plate, and
    long flat ink strokes that smudge across the bottom of the die. The plate
    itself is a much wider path, so the width bound keeps it safe.
    """
    b = path_bounds(d)
    if not b:
        return False

    if "pt-peach" in fill or "pt-lilac" in fill:
        return 1110 <= b["ymin"] and b["ymax"] <= 1275 and b["w"] < 360 and b["h"] < 165

    if "pt-ink" in fill:
        # Die pips are roughly square; these shards are long and flat.
        return (
            1205 <= b["cy"] <= 1275
            and 15 < b["h"] < 40
            and 60 < b["w"] < 150
            and b["w"] / b["h"] > 2.2
        )

    return False


def find_mark_host(root):
    """The element whose direct children are the mark's paths."""
    for el in root.iter():
        marks = [
            c
            for c in el
            if c.tag.endswith("path") and c.get("transform") == "scale(0.5 0.5)"
        ]
        if len(marks) >= 20:
            return el
    return None


def volleyball_group():
    ref = ET.parse(REF).getroot()
    outline = ref.find(f".//{{{SVG}}}path[@id='path3069']").get("d")
    panels = ref.find(f".//{{{SVG}}}path[@id='path3026']").get("d")

    ocx, ocy, orad = SRC_BALL
    tcx, tcy, trad = DST_BALL
    scale = trad / orad

    g = ET.Element("g")
    g.set("id", "volleyball")
    g.set("transform", f"translate({tcx} {tcy}) scale({scale}) translate({-ocx} {-ocy})")

    body = ET.SubElement(g, "path")
    body.set("d", outline)
    body.set("fill", "url(#pt-ink)")

    pg = ET.SubElement(g, "g")
    pg.set("transform", "translate({},{})".format(*PANEL_SHIFT))
    for i, sp in enumerate(subpaths(panels)):
        p = ET.SubElement(pg, "path")
        p.set("d", sp["d"])
        p.set("fill", "url(#pt-lilac)" if i in ACCENT_PANELS else "url(#pt-peach)")

    wrap = ET.Element("g")
    wrap.set("id", "volleyball-wrap")
    wrap.set("transform", "scale(0.5 0.5)")
    wrap.append(g)
    return wrap


def chip_dots_group():
    g = ET.Element("g")
    g.set("id", "chip-dots")
    g.set("transform", "scale(0.5 0.5)")
    cy = PLATE["cy"] + DOT_DROP
    pts = ellipse_arc_points(
        PLATE["cx"], cy, PLATE["rx"] * DOT_INSET, PLATE["ry"] * DOT_INSET, CHIP_DOTS
    )
    # The die hides the back arc, so only emit the front half.
    for x, y in [p for p in pts if p[1] >= cy - 1]:
        e = ET.SubElement(g, "ellipse")
        e.set("cx", f"{x:.2f}")
        e.set("cy", f"{y:.2f}")
        e.set("rx", "13")
        e.set("ry", "8")
        e.set("fill", INK)
    return g


def set_word_gradient(grad, root):
    """Retune a wordmark gradient to one lilac-to-peach sweep.

    The source gradients are in objectBoundingBox units. For the logo that
    means every letter path got its own full sweep, so those switch to
    userSpaceOnUse across the whole word. The lockup draws its wordmark as a
    single <text>, where the default units already span the word.
    """
    grad_ref = f"url(#{grad.get('id')})"
    users = [el for el in root.iter() if (el.get("fill") or "") == grad_ref]

    for stop in list(grad):
        grad.remove(stop)
    for offset, color in WORD_STOPS:
        stop = ET.SubElement(grad, f"{{{SVG}}}stop")
        stop.set("offset", offset)
        stop.set("stop-color", color)

    spans = [
        path_bounds(el.get("d") or "") for el in users if el.tag.endswith("path")
    ]
    spans = [b for b in spans if b]
    if not spans:
        return

    grad.set("gradientUnits", "userSpaceOnUse")
    grad.set("x1", f"{min(b['xmin'] for b in spans):.1f}")
    grad.set("x2", f"{max(b['xmax'] for b in spans):.1f}")
    grad.set("y1", "0")
    grad.set("y2", "0")


def transform(tree):
    """Apply the mark rebuild and wordmark retune to a parsed brand SVG."""
    root = tree.getroot()

    for grad in root.iter():
        if grad.tag.endswith("linearGradient") and grad.get("id") in WORD_GRADIENTS:
            set_word_gradient(grad, root)

    host = find_mark_host(root)
    if host is None:
        return {"ball": 0, "dot": 0, "fragment": 0}

    removed = {"ball": 0, "dot": 0, "fragment": 0}
    kept = []
    ball_at = None
    dots_at = None

    for el in list(host):
        host.remove(el)
        gid = el.get("id")
        if el.tag.endswith("g") and gid in GENERATED_IDS:
            # Remember where a previous run put these so re-runs are stable.
            if gid in ("volleyball", "volleyball-wrap") and ball_at is None:
                ball_at = len(kept)
            elif gid == "chip-dots" and dots_at is None:
                dots_at = len(kept)
            continue
        if not el.tag.endswith("path"):
            kept.append(el)
            continue

        d = el.get("d") or ""
        fill = el.get("fill") or ""
        if is_ball(d):
            if ball_at is None:
                ball_at = len(kept)
            removed["ball"] += 1
        elif is_rim_dot(d, fill):
            # The die is drawn after the old dots, so reusing their slot lets
            # the die occlude the dots on the far side of the chip.
            if dots_at is None:
                dots_at = len(kept)
            removed["dot"] += 1
        elif is_rim_fragment(d, fill):
            removed["fragment"] += 1
        else:
            kept.append(el)

    kept.insert(dots_at if dots_at is not None else len(kept), chip_dots_group())
    if ball_at is not None and dots_at is not None and ball_at > dots_at:
        ball_at += 1
    kept.insert(ball_at if ball_at is not None else len(kept), volleyball_group())

    for el in kept:
        host.append(el)
    return removed
