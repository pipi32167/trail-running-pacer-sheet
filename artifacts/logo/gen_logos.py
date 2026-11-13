"""生成山野有数 logo 候选 SVG（手绘风格，64 网格）。"""
import math, pathlib

OUT = pathlib.Path(__file__).parent
INK = "#23201c"
BLUE = "#2a4d9b"
RED = "#e0533c"
YELLOW = "#e0b23c"
PAPER = "#fbf7ef"

rng_state = [12345]
def rnd():
    rng_state[0] = (1103515245 * rng_state[0] + 12345) % 2147483648
    return rng_state[0] / 2147483648.0
def jitter(a):  # ±a
    return (rnd() * 2 - 1) * a

def wobbly_circle(cx, cy, r, n=16, amp=0.9, seed=1):
    rng_state[0] = seed
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        rr = r + jitter(amp)
        pts.append((cx + rr * math.cos(t), cy + rr * math.sin(t)))
    return closed_smooth(pts)

def closed_smooth(pts):
    n = len(pts)
    d = [f"M{pts[0][0]:.2f} {pts[0][1]:.2f}"]
    for i in range(n):
        p0 = pts[(i - 1) % n]; p1 = pts[i]; p2 = pts[(i + 1) % n]; p3 = pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(f"C{c1[0]:.2f} {c1[1]:.2f} {c2[0]:.2f} {c2[1]:.2f} {p2[0]:.2f} {p2[1]:.2f}")
    d.append("Z")
    return "".join(d)

def wobbly_rect(x, y, w, h, rad=10, amp=0.6, seed=7):
    """圆角方形，四边轻微抖动。"""
    rng_state[0] = seed
    d = []
    d.append(f"M{x+rad:.2f} {y:.2f}")
    # top
    d.append(f"Q{(x+w/2):.2f} {y+jitter(amp):.2f} {x+w-rad:.2f} {y:.2f}")
    d.append(f"Q{x+w:.2f} {y:.2f} {x+w:.2f} {y+rad:.2f}")
    d.append(f"Q{(x+w+jitter(amp)):.2f} {(y+h/2):.2f} {x+w:.2f} {y+h-rad:.2f}")
    d.append(f"Q{x+w:.2f} {y+h:.2f} {x+w-rad:.2f} {y+h:.2f}")
    d.append(f"Q{(x+w/2):.2f} {(y+h+jitter(amp)):.2f} {x+rad:.2f} {y+h:.2f}")
    d.append(f"Q{x:.2f} {y+h:.2f} {x:.2f} {y+h-rad:.2f}")
    d.append(f"Q{(x+jitter(amp)):.2f} {(y+h/2):.2f} {x:.2f} {y+rad:.2f}")
    d.append(f"Q{x:.2f} {y:.2f} {x+rad:.2f} {y:.2f}Z")
    return "".join(d)

# ---------- A 徽章 · 山径 ----------
def logo_a(size=64, mono=False):
    ink = INK if not mono else INK
    blue = BLUE if not mono else INK
    red = RED if not mono else INK
    ring = wobbly_circle(32, 32, 27.2, n=18, amp=0.85, seed=11)
    ridge_back = "M19 46L27 32L33 39L41 27L48 46"
    ridge = "M14 47L24 29L31 37L41 18L50 47"
    route = "M16 45C22 43 23 36 28 33C33 30 35 26 40 20"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}" role="img" aria-label="山野有数">
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="{ring}" stroke="{ink}" stroke-width="2.4"/>
    <path d="{ridge_back}" stroke="{ink}" stroke-width="1.1" opacity=".45"/>
    <path d="{ridge}" stroke="{ink}" stroke-width="2.6"/>
    <path d="{route}" stroke="{blue}" stroke-width="2.6" stroke-dasharray="3.4 4.2"/>
    <path d="M41 18.5V9.5" stroke="{ink}" stroke-width="2"/>
    <path d="M41 9.6L50.5 13.2L41 16.8Z" fill="{red}" stroke="{red}" stroke-width="1.2"/>
    <circle cx="16.4" cy="45" r="2.4" fill="{blue}" stroke="none"/>
  </g>
</svg>'''

# ---------- B 高程剖面卡 ----------
def logo_b(size=64, mono=False):
    ink = INK
    blue = BLUE if not mono else INK
    red = RED if not mono else INK
    frame = wobbly_rect(5, 5, 54, 54, rad=11, amp=0.7, seed=23)
    profile = "M11 46L19 37L25 40L32 24L38 31L46 17L53 45"
    ticks = "".join(
        f'<path d="M{x:.1f} 50.5v2.6"/>' for x in (14, 21.5, 29, 36.5, 44, 51)
    )
    fill = f'<path d="{profile}L53 50L11 50Z" fill="{blue}" opacity=".10" stroke="none"/>'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}" role="img" aria-label="山野有数">
  <path d="{frame}" fill="{PAPER}" stroke="{ink}" stroke-width="2.3"/>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    {fill}
    <path d="{profile}" stroke="{ink}" stroke-width="2.7"/>
    <g stroke="{blue}" stroke-width="1.8">{ticks}</g>
    <circle cx="46" cy="17" r="3.1" fill="{red}" stroke="none"/>
  </g>
</svg>'''

# ---------- C 山字马克笔 ----------
def logo_c(size=64, mono=False):
    ink = INK
    blue = BLUE if not mono else INK
    red = RED if not mono else INK
    yellow = YELLOW if not mono else INK
    swash = '<path d="M9 45.5C20 41.5 44 41.8 55 43.6" stroke="%s" stroke-width="7" opacity=".55" stroke-linecap="round" fill="none"/>' % yellow
    peaks = "M11 47L23 25L31 38L39 17L53 47"
    route = "M13 44C19 41 22 34 27 31C33 27 35 23 39 18"
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}" role="img" aria-label="山野有数">
  {swash}
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="{peaks}" stroke="{ink}" stroke-width="4.2"/>
    <path d="{route}" stroke="{blue}" stroke-width="2.6" stroke-dasharray="3.6 4.4"/>
    <circle cx="39" cy="17.5" r="3.4" fill="{red}" stroke="none"/>
  </g>
</svg>'''

for name, fn in (("logo-a-badge.svg", logo_a), ("logo-b-profile.svg", logo_b), ("logo-c-mark.svg", logo_c)):
    (OUT / name).write_text(fn(64), encoding="utf-8")
    (OUT / name.replace(".svg", "-mono.svg")).write_text(fn(64, mono=True), encoding="utf-8")

# favicon 16/32 预览用 PNG 由浏览器渲染，这里只出 SVG
print("ok", [p.name for p in sorted(OUT.glob("*.svg"))])
