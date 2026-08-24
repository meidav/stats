"""Helpers for rebuilding the PlayTracker brand previews from source SVGs."""

import math
import re

NUM = re.compile(r"[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?")
CMD = re.compile(r"[MmZzLlHhVvCcSsQqTtAa]")


def tokenize(d):
    """Yield (command, [numbers]) pairs from a path data string."""
    tokens = []
    pos = 0
    while pos < len(d):
        m = CMD.search(d, pos)
        if not m:
            break
        cmd = m.group()
        nxt = CMD.search(d, m.end())
        chunk = d[m.end():nxt.start() if nxt else len(d)]
        tokens.append((cmd, [float(x) for x in NUM.findall(chunk)]))
        pos = nxt.start() if nxt else len(d)
    return tokens


ARGC = {
    "M": 2, "L": 2, "T": 2,
    "H": 1, "V": 1,
    "C": 6, "S": 4, "Q": 4,
    "A": 7, "Z": 0,
}


def subpaths(d):
    """Split path data into absolute-coordinate subpaths.

    Returns a list of dicts with the rewritten absolute ``d`` string and the
    point cloud, so callers can classify subpaths by position.
    """
    out = []
    cur = None
    x = y = 0.0
    sx = sy = 0.0

    def flush():
        nonlocal cur
        if cur and cur["pts"]:
            out.append(cur)
        cur = None

    for cmd, nums in tokenize(d):
        up = cmd.upper()
        rel = cmd.islower()
        n = ARGC[up]

        if up == "Z":
            if cur is not None:
                cur["d"] += " Z"
            x, y = sx, sy
            continue

        groups = [nums[i:i + n] for i in range(0, len(nums), n)] if n else []
        for gi, g in enumerate(groups):
            if len(g) < n:
                continue
            if up == "M":
                px, py = (x + g[0], y + g[1]) if rel else (g[0], g[1])
                if gi == 0:
                    flush()
                    cur = {"d": f"M {px} {py}", "pts": [(px, py)]}
                    sx, sy = px, py
                else:
                    cur["d"] += f" L {px} {py}"
                    cur["pts"].append((px, py))
                x, y = px, py
            elif up == "L":
                px, py = (x + g[0], y + g[1]) if rel else (g[0], g[1])
                cur["d"] += f" L {px} {py}"
                cur["pts"].append((px, py))
                x, y = px, py
            elif up == "H":
                px = x + g[0] if rel else g[0]
                cur["d"] += f" L {px} {y}"
                cur["pts"].append((px, y))
                x = px
            elif up == "V":
                py = y + g[0] if rel else g[0]
                cur["d"] += f" L {x} {py}"
                cur["pts"].append((x, py))
                y = py
            elif up == "C":
                if rel:
                    c1 = (x + g[0], y + g[1])
                    c2 = (x + g[2], y + g[3])
                    pe = (x + g[4], y + g[5])
                else:
                    c1, c2, pe = (g[0], g[1]), (g[2], g[3]), (g[4], g[5])
                cur["d"] += (
                    f" C {c1[0]} {c1[1]} {c2[0]} {c2[1]} {pe[0]} {pe[1]}"
                )
                cur["pts"].extend([c1, c2, pe])
                x, y = pe
            elif up == "S":
                if rel:
                    c2 = (x + g[0], y + g[1])
                    pe = (x + g[2], y + g[3])
                else:
                    c2, pe = (g[0], g[1]), (g[2], g[3])
                cur["d"] += f" S {c2[0]} {c2[1]} {pe[0]} {pe[1]}"
                cur["pts"].extend([c2, pe])
                x, y = pe
    flush()

    for sp in out:
        xs = [p[0] for p in sp["pts"]]
        ys = [p[1] for p in sp["pts"]]
        sp["cx"] = sum(xs) / len(xs)
        sp["cy"] = sum(ys) / len(ys)
        sp["xmin"], sp["xmax"] = min(xs), max(xs)
        sp["ymin"], sp["ymax"] = min(ys), max(ys)
    return out


def path_bounds(d):
    nums = [float(x) for x in NUM.findall(d)]
    if len(nums) < 4:
        return None
    xs, ys = nums[0::2], nums[1::2]
    return {
        "cx": sum(xs) / len(xs),
        "cy": sum(ys) / len(ys),
        "xmin": min(xs), "xmax": max(xs),
        "ymin": min(ys), "ymax": max(ys),
        "w": max(xs) - min(xs),
        "h": max(ys) - min(ys),
    }


def flatten(d, per_curve=24):
    """Sample an absolute-coordinate path into a dense list of on-curve points."""
    pts = []
    x = y = 0.0
    for cmd, nums in tokenize(d):
        if cmd == "M":
            x, y = nums[0], nums[1]
            pts.append((x, y))
        elif cmd == "L":
            for i in range(0, len(nums), 2):
                x, y = nums[i], nums[i + 1]
                pts.append((x, y))
        elif cmd in ("C", "S"):
            n = 6 if cmd == "C" else 4
            for i in range(0, len(nums), n):
                g = nums[i:i + n]
                if len(g) < n:
                    break
                if cmd == "C":
                    p1, p2, p3 = (g[0], g[1]), (g[2], g[3]), (g[4], g[5])
                else:
                    p1 = (x, y)
                    p2, p3 = (g[0], g[1]), (g[2], g[3])
                for k in range(1, per_curve + 1):
                    t = k / per_curve
                    u = 1 - t
                    bx = (
                        u ** 3 * x + 3 * u * u * t * p1[0]
                        + 3 * u * t * t * p2[0] + t ** 3 * p3[0]
                    )
                    by = (
                        u ** 3 * y + 3 * u * u * t * p1[1]
                        + 3 * u * t * t * p2[1] + t ** 3 * p3[1]
                    )
                    pts.append((bx, by))
                x, y = p3
    return pts


def fit_ellipse(points, seed, iterations=6):
    """Coordinate-descent fit of an axis-aligned ellipse to boundary points."""
    cx, cy, rx, ry = seed
    step = [40.0, 40.0, 40.0, 40.0]

    def cost(params):
        cx, cy, rx, ry = params
        total = 0.0
        for px, py in points:
            r = math.hypot((px - cx) / rx, (py - cy) / ry)
            total += (r - 1.0) ** 2
        return total

    best = [cx, cy, rx, ry]
    best_cost = cost(best)
    for _ in range(iterations):
        improved = True
        while improved:
            improved = False
            for i in range(4):
                for sign in (1, -1):
                    trial = list(best)
                    trial[i] += sign * step[i]
                    if trial[2] <= 1 or trial[3] <= 1:
                        continue
                    c = cost(trial)
                    if c < best_cost:
                        best, best_cost = trial, c
                        improved = True
        step = [s / 2 for s in step]
    return tuple(best), best_cost


def ellipse_arc_points(cx, cy, rx, ry, n, samples=4000):
    """Points spaced by equal arc length around an ellipse."""
    pts, cum = [], [0.0]
    for i in range(samples + 1):
        t = 2 * math.pi * i / samples
        pts.append((cx + rx * math.cos(t), cy + ry * math.sin(t)))
        if i:
            dx = pts[i][0] - pts[i - 1][0]
            dy = pts[i][1] - pts[i - 1][1]
            cum.append(cum[-1] + math.hypot(dx, dy))
    total = cum[-1]
    out, j = [], 0
    for i in range(n):
        target = total * i / n
        while j < len(cum) - 1 and cum[j] < target:
            j += 1
        out.append(pts[j])
    return out
