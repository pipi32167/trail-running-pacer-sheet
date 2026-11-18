#!/usr/bin/env python3
"""Build the demo route bundle: thinned track points plus checkpoint positions.

The map demos load one small JSON file instead of the full 30k-point GPX.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

EARTH_R = 6371008.8


def haversine(a, b):
    lat1, lon1 = math.radians(a[0]), math.radians(a[1])
    lat2, lon2 = math.radians(b[0]), math.radians(b[1])
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(h))


def load(gpx: Path):
    root = ET.parse(gpx).getroot()
    track = root.find('.//{*}trk')
    name = (track.findtext('{*}name') or gpx.stem).strip()
    points, missing = [], 0
    for node in track.findall('.//{*}trkpt'):
        lat, lon = float(node.get('lat')), float(node.get('lon'))
        ele = node.findtext('{*}ele')
        if ele is None:
            missing += 1
        points.append([lat, lon, None if ele is None else float(ele)])
    if not any(p[2] is not None for p in points):
        raise SystemExit('no track points with elevation')
    # Same repair the app ships: interpolate gaps by index, ends copy the nearest value.
    known = [i for i, p in enumerate(points) if p[2] is not None]
    for i, point in enumerate(points):
        if point[2] is not None:
            continue
        before = [k for k in known if k < i]
        after = [k for k in known if k > i]
        if before and after:
            a, b = before[-1], after[0]
            ratio = (i - a) / (b - a)
            point[2] = points[a][2] + (points[b][2] - points[a][2]) * ratio
        else:
            point[2] = points[(before or after)[-1]][2]
    checkpoints = []
    for node in root.findall('.//{*}wpt'):
        label = (node.findtext('{*}name') or '').strip()
        if not label:
            continue
        checkpoints.append([float(node.get('lat')), float(node.get('lon')), label])
    return name, points, checkpoints, missing


def smooth(values, dists, window_m):
    """Moving average over a distance window, centred."""
    out, left, total = [], 0, 0.0
    for i, d in enumerate(dists):
        total += values[i]
        while dists[i] - dists[left] > window_m / 2:
            total -= values[left]
            left += 1
        # Right side grows until it passes the window edge.
        right = i
        while right + 1 < len(dists) and dists[right + 1] - dists[i] <= window_m / 2:
            right += 1
            total += values[right]
        # Drop the right side again for the next step.
        count = right - left + 1
        out.append(total / count)
        for j in range(i + 1, right + 1):
            total -= values[j]
    return out


def ascent_of(profile, threshold_m):
    """Sum of climbs, ignoring reversals smaller than the threshold."""
    gain, top, bottom, up = 0.0, profile[0], profile[0], True
    for value in profile[1:]:
        if up and value > top:
            top = value
        elif up and top - value > threshold_m:
            gain += top - bottom
            up, bottom = False, value
        elif not up and value < bottom:
            bottom = value
        elif not up and value - bottom > threshold_m:
            up, top = True, value
    if up:
        gain += top - bottom
    return gain


def cumulative(points):
    out = [0.0]
    for prev, cur in zip(points, points[1:]):
        out.append(out[-1] + haversine(prev, cur))
    return out


def thin(points, dists, tolerance_m):
    """Douglas-Peucker over projected metres; keeps both ends."""
    lat0 = math.radians(sum(p[0] for p in points) / len(points))
    kx = EARTH_R / max(math.cos(lat0), 1e-6)

    def xy(i):
        return (points[i][1] * math.pi / 180 * kx, points[i][0] * math.pi / 180 * EARTH_R)

    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        left, right = stack.pop()
        if right <= left + 1:
            continue
        ax, ay = xy(left)
        bx, by = xy(right)
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy) or 1.0
        worst, worst_i = -1.0, left
        for i in range(left + 1, right):
            px, py = xy(i)
            d = abs(dy * (px - ax) - dx * (py - ay)) / norm
            # Keep points that are far in distance too, so hairpins survive.
            if d > worst:
                worst, worst_i = d, i
        if worst > tolerance_m:
            keep[worst_i] = True
            stack.append((left, worst_i))
            stack.append((worst_i, right))
    return [p for p, k in zip(points, keep) if k], [d for d, k in zip(dists, keep) if k]


def project_checkpoints(points, dists, checkpoints):
    out = []
    for lat, lon, label in checkpoints:
        best_i, best_d = 0, float('inf')
        for i, (plat, plon, _) in enumerate(points):
            d = haversine((lat, lon), (plat, plon))
            if d < best_d:
                best_i, best_d = i, d
            elif best_d < 50 and i > best_i + 50:
                break
        out.append({'name': label, 'km': round(dists[best_i] / 1000, 2), 'lat': lat, 'lon': lon,
                    'offset_m': round(best_d, 1)})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('gpx', type=Path)
    ap.add_argument('-o', '--out', type=Path, default=Path('web/demo/route.json'))
    ap.add_argument('--tolerance', type=float, default=6.0)
    args = ap.parse_args()

    name, points, checkpoints, missing = load(args.gpx)
    dists = cumulative(points)
    profile = smooth([p[2] for p in points], dists, 100)
    ascent = ascent_of(profile, 10)
    thin_points, thin_dists = thin(points, dists, args.tolerance)
    bundle = {
        'name': name,
        'distance_km': round(dists[-1] / 1000, 2),
        'ascent_m': round(ascent),
        'source_points': len(points),
        'kept_points': len(thin_points),
        'missing_elevation': missing,
        'points': [[round(p[0], 5), round(p[1], 5), round(p[2]), round(d / 1000, 2)]
                   for p, d in zip(thin_points, thin_dists)],
        'checkpoints': project_checkpoints(points, dists, checkpoints),
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(bundle, ensure_ascii=False, separators=(',', ':')))
    print(f'{args.out} {args.out.stat().st_size / 1024:.0f} KB '
          f'{len(thin_points)}/{len(points)} points, {bundle["distance_km"]} km, {bundle["ascent_m"]} m')


if __name__ == '__main__':
    main()
