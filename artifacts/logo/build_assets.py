"""山野有数 · C 方向定稿（顶点红帽版）。生成 web/ 下的主标与全套图标。"""
import pathlib, subprocess

OUT = pathlib.Path("/Volumes/WD_BLACK_2T/work/million/trail-running/web")
INK, RED, YELLOW, PAPER = "#23201c", "#e0533c", "#e0b23c", "#fbf7ef"

PEAKS = "M9 48L22 26L30 37L40 16L55 48"


def mark(peak_w=4.6, cap_r=4.4, band_w=8, band_y=45.5, band_op=".45", band_x=(6, 58), size=64):
    """双峰 + 荧光带 + 顶点红帽。size 只影响根节点声明，供 <img> 使用。"""
    bx0, bx1 = band_x
    mid = (bx0 + bx1) / 2
    band = (f'<path d="M{bx0} {band_y}C{round(mid - 12, 2)} {round(band_y - 3, 2)} '
            f'{round(mid + 12, 2)} {round(band_y - 2.7, 2)} {bx1} {round(band_y - 1, 2)}"'
            f' stroke="{YELLOW}" stroke-width="{band_w}" opacity="{band_op}" stroke-linecap="round" fill="none"/>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="{size}" height="{size}" '
            f'role="img" aria-label="山野有数">\n'
            f'  {band}\n'
            f'  <path d="{PEAKS}" stroke="{INK}" stroke-width="{peak_w}" stroke-linecap="round" '
            f'stroke-linejoin="round" fill="none"/>\n'
            f'  <circle cx="40" cy="16" r="{cap_r}" fill="{RED}"/>\n'
            f'</svg>\n')


# 主标：页头、分享图、深色底之外的所有大尺寸场景
(OUT / "logo.svg").write_text(mark(), encoding="utf-8")

# favicon：笔画更粗、荧光带更细更低，16px 下不糊成一团
(OUT / "favicon.svg").write_text(
    mark(peak_w=5.0, cap_r=4.6, band_w=6, band_y=47.4, band_op=".5", band_x=(10, 54)), encoding="utf-8")

# apple-touch-icon：纸底铺满 + 留边，规避 iOS 圆角裁切
apple = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="180" height="180">\n'
         f'  <rect width="180" height="180" fill="{PAPER}"/>\n'
         f'  <g transform="translate(33 33) scale(1.78)">\n'
         + "".join("    " + line.strip() + "\n" for line in mark().splitlines()[1:-1])
         + '  </g>\n</svg>\n')
(OUT / "_apple.svg").write_text(apple, encoding="utf-8")

for svg, png, w in (("favicon.svg", "favicon-16.png", 16), ("favicon.svg", "favicon-32.png", 32),
                    ("favicon.svg", "favicon-180.png", 180), ("_apple.svg", "apple-touch-icon.png", 180),
                    ("logo.svg", "logo-512.png", 512)):
    subprocess.run(["rsvg-convert", "-w", str(w), "-h", str(w), "-o", str(OUT / png), str(OUT / svg)], check=True)
(OUT / "_apple.svg").unlink()
print("ok")
