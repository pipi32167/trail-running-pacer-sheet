"""Fill missing GPX elevations as authorized; retain the original file."""
import bisect
import hashlib
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / '且听风吟60K.gpx'
OUT = Path(__file__).resolve().parent
DEST = OUT / '且听风吟60K-高程修复.gpx'
if DEST.exists():
    raise SystemExit(f'Refusing to overwrite {DEST}')
tree = ET.parse(SOURCE)
root = tree.getroot()
namespace = root.tag.split('}')[0][1:] if root.tag.startswith('{') else ''
if namespace:
    ET.register_namespace('', namespace)
points = root.findall('.//{*}trkpt')
distances = [0.0]
for a, b in zip(points, points[1:]):
    la, lb = [math.radians(float(p.attrib['lat'])) for p in (a, b)]
    dl = math.radians(float(b.attrib['lon']) - float(a.attrib['lon']))
    h = math.sin((lb-la)/2)**2 + math.cos(la)*math.cos(lb)*math.sin(dl/2)**2
    distances.append(distances[-1] + 6371000*2*math.asin(min(1, math.sqrt(h))))
known = {}
for i, p in enumerate(points):
    ele = p.find('{*}ele')
    try:
        value = float(ele.text) if ele is not None else float('nan')
    except (ValueError, TypeError):
        value = float('nan')
    if math.isfinite(value):
        known[i] = value
if not known:
    raise SystemExit('No valid elevation anchors')
indices = sorted(known)
repairs = []
for i, p in enumerate(points):
    if i in known:
        continue
    j = bisect.bisect_left(indices, i)
    if j == 0 or j == len(indices):
        anchor = indices[0] if j == 0 else indices[-1]
        value = known[anchor]
        method = 'nearest_valid_endpoint'
        anchors = [anchor]
    else:
        left, right = indices[j-1], indices[j]
        span = distances[right] - distances[left]
        fraction = (distances[i] - distances[left])/span if span > 0 else (i-left)/(right-left)
        value = known[left] + fraction*(known[right]-known[left])
        method = 'linear_by_horizontal_distance'
        anchors = [left, right]
    ele = p.find('{*}ele')
    if ele is None:
        ele = ET.Element(f'{{{namespace}}}ele' if namespace else 'ele')
        p.insert(0, ele)
    ele.text = f'{value:.6f}'
    repairs.append({'index_zero_based': i, 'distance_m': distances[i], 'elevation_m': value, 'method': method, 'anchor_indices': anchors})
tree.write(DEST, encoding='utf-8', xml_declaration=True)
assert len(points) == len(known) + len(repairs)
assert all(math.isfinite(float(p.find('{*}ele').text)) for p in points)
report = {'source': str(SOURCE), 'source_sha256': hashlib.sha256(SOURCE.read_bytes()).hexdigest(), 'repaired_file': str(DEST), 'point_count': len(points), 'repaired_count': len(repairs), 'raw_horizontal_distance_km': distances[-1]/1000, 'note': 'Estimated elevations, not terrain measurements. Original coordinates, timestamps and known elevations retained. Interior gaps use distance interpolation; endpoints use nearest valid elevation.', 'repairs': repairs}
(OUT / 'elevation-repair-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k != 'repairs'}, ensure_ascii=False, indent=2))
