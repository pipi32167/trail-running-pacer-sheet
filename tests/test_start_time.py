"""Required race clock input must be visible and explicitly supplied."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class RaceClock(HTMLParser):
    def __init__(self):
        super().__init__()
        self.advanced = False
        self.clocks = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'details' and attrs.get('id') == 'advanced':
            self.advanced = True
        if attrs.get('id') == 'start-time':
            self.clocks.append((attrs, self.advanced))

    def handle_endtag(self, tag):
        if tag == 'details':
            self.advanced = False


class RaceClockTests(unittest.TestCase):
    def test_race_start_is_required_visible_and_has_no_assumed_time(self):
        parser = RaceClock()
        parser.feed((ROOT / 'web/index.html').read_text())
        self.assertEqual(len(parser.clocks), 1)
        attrs, advanced = parser.clocks[0]
        self.assertFalse(advanced, 'Race start must be visible in the main form')
        self.assertEqual(attrs.get('type'), 'time')
        self.assertIn('required', attrs)
        self.assertFalse(attrs.get('value'), 'Do not silently assume 06:00')


if __name__ == '__main__':
    unittest.main()
