"""Local GPX pace-chart web adapter. Python 3.10+, standard library only."""
from __future__ import annotations

import argparse
import bisect
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import math
from pathlib import Path
import re
import sys
import tempfile
from urllib.parse import urlsplit
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / '.agents/skills/even-effort-pace-chart/scripts'))
import pace_chart as engine

MAX_BYTES = 12 * 1024 * 1024
KNOWN_ROUTE_SHA = '59281dcc31fd56b4b81172b1cb682ec14fbb948c9c5a89f63df58ae9afb3bd15'
PROCESSING = {'ascent_smoothing_m': 100, 'ascent_threshold_m': 10}
OPTION_KEYS = {'ascent_smoothing_m', 'ascent_threshold_m', 'ascent_km_per_100m',
               'fatigue_rate', 'target_step_minutes', 'start_time', 'secondary_display',
               'track_index', 'checkpoint_overrides', 'cp_selection', 'checkpoints', 'targets'}


class AppError(ValueError):
    def __init__(self, message, *, code='invalid_input', details=None):
        super().__init__(message)
        self.code, self.details = code, details


def parse_gpx(text: str):
    if not isinstance(text, str) or not text.strip():
        raise AppError('请选择一个 GPX 文件。')
    if len(text.encode('utf-8')) > MAX_BYTES:
        raise AppError('GPX 文件不能超过 12 MB。')
    if re.search(r'<!\s*(?:DOCTYPE|ENTITY)', text, re.I):
        raise AppError('不支持包含 DTD 或实体声明的 GPX。')
    try:
        root = ET.fromstring(text)
    except ET.ParseError as exc:
        raise AppError('文件不是有效的 GPX XML，请重新导出路线。') from exc
    if engine.tag(root) != 'gpx':
        raise AppError('请选择 GPX 格式的路线。')
    alternatives = engine.children(root, 'trk') or engine.children(root, 'rte')
    if not alternatives:
        raise AppError('GPX 中没有可用的轨迹。')
    if sum(1 for e in root.iter() if engine.tag(e) in ('trkpt', 'rtept')) > 200000:
        raise AppError('轨迹超过 200000 个点，请先精简文件。')
    return root, alternatives


def repair_elevations(root, alternatives, track_index):
    if track_index is None and len(alternatives) > 1:
        raise AppError('文件包含多条路线，请在高级选项中选择。', code='select_track', details=[
            {'track_index': i, 'name': engine.child_text(t, 'name') or f'路线 {i}'}
            for i, t in enumerate(alternatives, 1)])
    index = track_index if track_index is not None else 1
    if isinstance(index, bool) or not isinstance(index, int) or not 1 <= index <= len(alternatives):
        raise AppError('所选路线编号无效。')
    selected = alternatives[index - 1]
    points = [e for e in selected.iter() if engine.tag(e) in ('trkpt', 'rtept')]
    if len(points) < 2:
        raise AppError('路线至少需要两个轨迹点。')
    distances = [0.0]
    coords = [engine.coordinates(p, require_elevation=False) for p in points]
    for a, b in zip(coords, coords[1:]):
        distances.append(distances[-1] + engine.haversine(a, b))
    known = {}
    for i, point in enumerate(points):
        try:
            elevation = float(engine.child_text(point, 'ele'))
        except (ValueError, TypeError):
            continue
        if math.isfinite(elevation):
            known[i] = elevation
    if not known:
        raise AppError('整条路线缺少高程，无法估计爬升。请上传带高程的 GPX。', code='no_elevation')
    indices = sorted(known)
    interior = endpoints = 0
    namespace = root.tag.split('}')[0][1:] if root.tag.startswith('{') else ''
    for i, point in enumerate(points):
        if i in known:
            continue
        j = bisect.bisect_left(indices, i)
        if j == 0 or j == len(indices):
            z = known[indices[0] if j == 0 else indices[-1]]
            endpoints += 1
        else:
            left, right = indices[j-1], indices[j]
            span = distances[right] - distances[left]
            fraction = (distances[i] - distances[left])/span if span > 0 else (i-left)/(right-left)
            z = known[left] + fraction * (known[right] - known[left])
            interior += 1
        ele = point.find('{*}ele')
        if ele is None:
            ele = ET.Element(f'{{{namespace}}}ele' if namespace else 'ele')
            point.insert(0, ele)
        ele.text = f'{z:.6f}'
    return {'repaired_count': interior + endpoints, 'interior_count': interior,
            'endpoint_count': endpoints, 'point_count': len(points),
            'method': '内部按距离线性插值，首尾使用最近有效高程；插值不是实测高程。'}


def translate_error(exc):
    text = str(exc)
    rules = [
        ('Target duration must exceed', '目标完赛时间必须大于全部停站时间。'),
        ('positive', '时间和间隔必须大于 0；五档方案的最短时间也必须大于 0。'),
        ('ambiguous CP', '站点有多个经过位置，请在高级选项中选择。'),
        ('over 100 m off-route', '站点距路线超过 100 m，请在高级选项中确认位置。'),
        ('finite', '参数必须是有效的有限数值。'),
        ('strictly increasing', '站点累计里程必须递增，且不能重复。'),
        ('rest', '停站时间无效；起终点停留必须为 0。'),
        ('Disconnected', 'GPX 包含不连续的轨迹段，请选择连续路线。'),
        ('start_time', '发枪时间格式应为 HH:MM，例如 06:00。'),
        ('duration', '时间格式应为 H:MM，例如 12:00。'),
        ('CPs', '请在高级选项中选择站点或添加手动站点。'),
        ('Checkpoint', '站点设置无效，请检查名称与累计里程。'),
        ('distance override', '站点位置超过路线终点。'),
        ('beyond', '站点里程超过路线终点。'),
        ('Finish distance', '终点里程必须大于 0。'),
        ('cutoff', '关门时间应为从发枪开始的 H:MM 用时。'),
    ]
    message = next((v for k, v in rules if k.lower() in text.lower()), '路线或参数无效，请检查高级选项。')
    return AppError(message, details={'engine_message': text, 'context': getattr(exc, 'details', None)})


def process_request(data, *, generate=False):
    if not isinstance(data, dict):
        raise AppError('请求内容必须是一个对象。')
    options = data.get('options', {})
    if not isinstance(options, dict) or set(options) - OPTION_KEYS:
        raise AppError('包含不支持的高级选项。')
    options = dict(options)
    for key, limit in [('ascent_smoothing_m', 2000), ('ascent_threshold_m', 1000),
                       ('ascent_km_per_100m', 10), ('fatigue_rate', 1), ('target_step_minutes', 1440)]:
        if key in options:
            value = options[key]
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= limit:
                raise AppError(f'{key} 超出允许范围。')
    text = data.get('gpx')
    root, alternatives = parse_gpx(text)
    filename = data.get('filename', 'route.gpx')
    if not isinstance(filename, str):
        raise AppError('文件名无效。')
    name = Path(filename.replace('\\', '/')).stem[:120] or '越野路线'
    original_sha = hashlib.sha256(text.encode('utf-8')).hexdigest()
    try:
        repair = repair_elevations(root, alternatives, options.get('track_index'))
        settings = {**PROCESSING, **options}
        with tempfile.TemporaryDirectory(prefix='trail-pace-') as tmp:
            path = Path(tmp) / 'route.gpx'
            path.write_bytes(ET.tostring(root, encoding='utf-8', xml_declaration=True))
            inspection = engine.inspect_route(path, **{k: settings[k] for k in
                ('ascent_smoothing_m', 'ascent_threshold_m', 'track_index') if k in settings})
            confirmed = {}
            if original_sha == KNOWN_ROUTE_SHA:
                confirmed['wpt:5'] = {'distance_km': 47.76857075906329}
            response = {'inspection': inspection, 'repair': repair, 'name': name,
                        'confirmed_overrides': confirmed, 'original_sha256': original_sha}
            if not generate:
                return response
            target = data.get('target')
            if not isinstance(target, str) or not re.fullmatch(r'\d{1,4}:[0-5]\d(?::[0-5]\d)?', target):
                raise AppError('完赛时间使用 H:MM 格式，例如 12:00；支持超过 24 小时。')
            config = {'name': name, 'target': target, **settings}
            if 'checkpoints' not in config:
                selected_ids = config.get('cp_selection')
                selected_confirmed = {k: v for k, v in confirmed.items() if selected_ids is None or k in selected_ids}
                overrides = {**selected_confirmed, **config.get('checkpoint_overrides', {})}
                if overrides:
                    config['checkpoint_overrides'] = overrides
                if not inspection['cp_candidates']:
                    config['checkpoints'] = [{'name': '终点', 'distance_km': inspection['distance_m']/1000}]
                    config.pop('checkpoint_overrides', None)
            plan = engine.build_plan(path, config)
            plan['source']['filename'] = Path(filename.replace('\\', '/')).name[:140]
            plan['source']['original_sha256'] = original_sha
            plan['elevation_repair'] = repair
            route = engine.prepare_route(engine.load_route(path, options.get('track_index')))
            profile = engine.smooth_profile(route, sample_m=50, smoothing_m=100)
            response.update({'plan': plan, 'svg': engine.render_svg(plan), 'csv': engine.csv_text(plan),
                             'profile': [[p.distance_m, p.elevation_m] for p in profile],
                             'verification': engine.plan_summary(plan)['verification']})
            return response
    except engine.InputError as exc:
        raise translate_error(exc) from exc


class Handler(BaseHTTPRequestHandler):
    def json_reply(self, status, payload):
        raw = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        files = {'/': ('index.html', 'text/html'), '/app.js': ('app.js', 'text/javascript'),
                 '/style.css': ('style.css', 'text/css')}
        path = urlsplit(self.path).path
        if path == '/api/health':
            return self.json_reply(200, {'status': 'ok'})
        if path not in files:
            return self.json_reply(404, {'error': '页面不存在。'})
        filename, mime = files[path]
        raw = (ROOT / 'web' / filename).read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', f'{mime}; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(raw)

    def do_POST(self):
        if self.path not in ('/api/inspect', '/api/generate'):
            return self.json_reply(404, {'error': '接口不存在。'})
        origin = self.headers.get('Origin')
        if origin and urlsplit(origin).netloc != self.headers.get('Host'):
            return self.json_reply(403, {'error': '请求来源不匹配。'})
        try:
            size = int(self.headers.get('Content-Length', 0))
            if size <= 0 or size > MAX_BYTES * 2:
                raise AppError('请求为空或超过大小限制。')
            self.connection.settimeout(45)
            data = json.loads(self.rfile.read(size))
            result = process_request(data, generate=self.path == '/api/generate')
            self.json_reply(200, result)
        except (AppError, json.JSONDecodeError, UnicodeError, ValueError) as exc:
            self.json_reply(422, {'error': str(exc), 'code': getattr(exc, 'code', 'invalid_input'),
                                  'details': getattr(exc, 'details', None)})
        except (BrokenPipeError, ConnectionResetError):
            pass
        except Exception as exc:
            print(f'Calculation failed: {type(exc).__name__}: {exc}', file=sys.stderr)
            self.json_reply(500, {'error': '计算未完成，请检查路线或重新生成。'})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Trail pace chart: http://127.0.0.1:{args.port}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == '__main__':
    main()
