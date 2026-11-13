"""File-picker compatibility contract for iOS document providers."""
from html.parser import HTMLParser
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class Inputs(HTMLParser):
    def __init__(self):
        super().__init__()
        self.inputs = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'input' and 'id' in attrs:
            self.inputs[attrs['id']] = attrs


class MobileFilePickerTests(unittest.TestCase):
    def test_gpx_picker_does_not_filter_unknown_ios_document_types(self):
        parser = Inputs()
        parser.feed((ROOT / 'web/index.html').read_text())
        picker = parser.inputs['gpx-file']
        self.assertEqual(picker['type'], 'file')
        self.assertNotIn('accept', picker,
                         'iOS can disable GPX documents when accept maps to an unknown UTI; validate after selection')
        self.assertNotIn('capture', picker)


if __name__ == '__main__':
    unittest.main()
