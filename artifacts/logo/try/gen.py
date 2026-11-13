"""C 方向细化：比较红点的三种处理（顶点红帽 / 无点 / 悬浮点）与荧光带位置。"""
import pathlib, subprocess
D = pathlib.Path("/Volumes/WD_BLACK_2T/work/million/trail-running/artifacts/logo/try")
D.mkdir(exist_ok=True)
INK, RED, YELLOW = "#23201c", "#e0533c", "#e0b23c"

PEAKS = "M9 48L22 26L30 37L40 16L55 48"
SWASH = "M6 45.5C20 42.5 44 42.8 58 44.5"

def svg(dot):
    parts = [f'<path d="{SWASH}" stroke="{YELLOW}" stroke-width="8" opacity=".45" stroke-linecap="round" fill="none"/>',
             f'<path d="{PEAKS}" stroke="{INK}" stroke-width="4.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>']
    if dot == "cap":
        parts.append(f'<circle cx="40" cy="16" r="4.4" fill="{RED}"/>')
    elif dot == "float":
        parts.append(f'<circle cx="40" cy="8.4" r="3.2" fill="{RED}"/>')
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">\n  '
            + "\n  ".join(parts) + "\n</svg>")

for k in ("cap", "none", "float"):
    (D / f"c-{k}.svg").write_text(svg(k), encoding="utf-8")
    for s in (16, 32, 36, 128):
        subprocess.run(["rsvg-convert", "-w", str(s), "-h", str(s), "-o", str(D / f"c-{k}-{s}.png"), str(D / f"c-{k}.svg")], check=True)

rows = []
for k, label in (("cap", "X 顶点红帽"), ("none", "Y 无红点"), ("float", "Z 悬浮红点")):
    cells = "".join(f'<figure><img src="c-{k}-{s}.png" width="{s}" height="{s}"><figcaption>{s}</figcaption></figure>' for s in (16, 32, 36, 128))
    rows.append(f'<div class="row"><span class="lbl">{label}</span>{cells}</div>')
html = f'''<!doctype html><html><head><meta charset="utf-8"><style>
body{{margin:0;padding:32px 40px;background:#fbf7ef;color:#23201c;font:13px/1.6 ui-sans-serif,-apple-system,"PingFang SC",sans-serif}}
h1{{font:600 20px/1.3 Georgia,serif;margin:0 0 22px}}
.row{{display:flex;align-items:flex-end;gap:30px;background:#fff;border:2px solid #23201c;border-radius:10px;padding:18px 22px;margin-bottom:16px;box-shadow:3px 3px 0 rgba(35,32,28,.7)}}
.lbl{{font:11px ui-monospace,Menlo,monospace;color:#5e594f;width:96px;padding-bottom:20px}}
figure{{margin:0;text-align:center}}figcaption{{font:9px ui-monospace,Menlo,monospace;color:#5e594f;margin-top:5px}}
.px{{image-rendering:pixelated}}
</style></head><body><h1>C 方向细化 · 红点三种处理（16 / 32 / 36 / 128）</h1>
{"".join(rows)}
<div class="row"><span class="lbl">16px 放大</span>
<figure><img class="px" src="c-cap-16.png" width="160" height="160"><figcaption>X</figcaption></figure>
<figure><img class="px" src="c-none-16.png" width="160" height="160"><figcaption>Y</figcaption></figure>
<figure><img class="px" src="c-float-16.png" width="160" height="160"><figcaption>Z</figcaption></figure>
</div></body></html>'''
(D / "sheet.html").write_text(html, encoding="utf-8")
print("ok")
