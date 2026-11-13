import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import process_request, AppError

ROOT = Path(__file__).resolve().parents[1]


def small_gpx(elevations=(10, 20, 15), waypoint=''):
    points = ''.join(f'<trkpt lat="28" lon="{121 + i*.01}">{"" if z is None else f"<ele>{z}</ele>"}</trkpt>'
                     for i, z in enumerate(elevations))
    return f'<gpx version="1.1">{waypoint}<trk><name>测试路线</name><trkseg>{points}</trkseg></trk></gpx>'


class RouteBehaviourTests(unittest.TestCase):
    def test_uploaded_route_uses_confirmed_defaults_and_first_cp10(self):
        source = (ROOT / '且听风吟60K.gpx').read_text()
        result = process_request({'gpx': source, 'filename': '且听风吟60K.gpx', 'target': '12:00'}, generate=True)
        plan = result['plan']
        self.assertAlmostEqual(plan['route']['distance_m'], 55307.66, delta=0.1)
        self.assertAlmostEqual(plan['route']['ascent_m'], 1906.04, delta=0.1)
        self.assertEqual(result['repair']['repaired_count'], 217)
        cp10 = next(cp for cp in plan['checkpoints'] if cp['id'] == 'wpt:5')
        self.assertAlmostEqual(cp10['distance_m'], 47768.57, delta=0.1)
        self.assertEqual(plan['targets_seconds'], [39600, 41400, 43200, 45000, 46800])
        for schedule in plan['schedules']:
            self.assertAlmostEqual(schedule['checkpoints'][-1]['departure_seconds'], schedule['target_seconds'])
        self.assertTrue(result['verification']['finish_targets_match'])
        self.assertIn('<svg', result['svg'])

    def test_missing_elevations_are_estimated_and_no_station_uses_endpoints(self):
        result = process_request({'gpx': small_gpx((None, 20, None, 40, None)), 'target': '03:00'}, generate=True)
        self.assertEqual(result['repair']['repaired_count'], 3)
        self.assertEqual(result['repair']['endpoint_count'], 2)
        self.assertAlmostEqual(result['plan']['route']['ascent_m'], 20, places=3)
        self.assertEqual(len(result['plan']['checkpoints']), 2)

    def test_all_missing_elevation_is_actionable(self):
        with self.assertRaises(AppError) as ctx:
            process_request({'gpx': small_gpx((None, None))})
        self.assertEqual(ctx.exception.code, 'no_elevation')

    def test_multiple_tracks_require_a_selection(self):
        route = small_gpx()
        route = route.replace('</gpx>', '<trk><name>另一条</name><trkseg><trkpt lat="29" lon="121"><ele>20</ele></trkpt><trkpt lat="29" lon="121.01"><ele>30</ele></trkpt></trkseg></trk></gpx>')
        with self.assertRaises(AppError) as ctx:
            process_request({'gpx': route})
        self.assertEqual(ctx.exception.code, 'select_track')
        self.assertEqual(len(ctx.exception.details), 2)
        result = process_request({'gpx': route, 'options': {'track_index': 2}})
        self.assertEqual(result['repair']['point_count'], 2)

    def test_one_target_above_24_hours_and_station_rest(self):
        gpx = small_gpx(waypoint='<wpt lat="28" lon="121.01"><name>CP1</name></wpt>')
        result = process_request({'gpx': gpx, 'target': '30:00', 'options': {
            'targets': ['30:00'], 'checkpoint_overrides': {'wpt:1': {'rest_minutes': 12}}}}, generate=True)
        plan = result['plan']
        self.assertEqual(plan['targets_seconds'], [108000])
        self.assertEqual(plan['parameters']['rest_total_seconds'], 720)
        cp = plan['schedules'][0]['checkpoints'][1]
        self.assertAlmostEqual(cp['departure_seconds'] - cp['arrival_seconds'], 720)
        self.assertAlmostEqual(plan['schedules'][0]['checkpoints'][-1]['departure_seconds'], 108000)

    def test_rest_cannot_exceed_target(self):
        gpx = small_gpx(waypoint='<wpt lat="28" lon="121.01"><name>CP1</name></wpt>')
        with self.assertRaises(AppError) as ctx:
            process_request({'gpx': gpx, 'target': '01:00', 'options': {
                'targets': ['01:00'], 'checkpoint_overrides': {'wpt:1': {'rest_minutes': 90}}}}, generate=True)
        self.assertIn('停站', str(ctx.exception))

    def test_malformed_and_unsafe_xml_rejected(self):
        for xml in ('<gpx>', '<!DOCTYPE gpx [<!ENTITY a "x">]><gpx/>', '<html/>', ''):
            with self.subTest(xml=xml), self.assertRaises(AppError):
                process_request({'gpx': xml})

    def test_filename_does_not_allow_path_or_html_in_render(self):
        result = process_request({'gpx': small_gpx(), 'filename': '../../<script>alert(1)</script>.gpx',
                                  'target': '03:00'}, generate=True)
        self.assertNotIn('<script>', result['svg'])
        self.assertNotIn('../', result['plan']['source']['filename'])

    def test_nonfinite_or_out_of_range_parameters_rejected(self):
        for options in ({'ascent_smoothing_m': float('nan')}, {'ascent_smoothing_m': -1}, {'fatigue_rate': 2}):
            with self.subTest(options=options), self.assertRaises(AppError):
                process_request({'gpx': small_gpx(), 'options': options})

    def test_short_target_with_five_columns_has_actionable_error(self):
        with self.assertRaises(AppError):
            process_request({'gpx': small_gpx(), 'target': '00:30'}, generate=True)
        result = process_request({'gpx': small_gpx(), 'target': '00:30',
                                  'options': {'targets': ['00:30']}}, generate=True)
        self.assertEqual(result['plan']['targets_seconds'], [1800])


if __name__ == '__main__':
    unittest.main()
