"""Generate temporary JavaScript parity cases from the Python reference."""
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app import process_request, AppError
from tests_support import cases


def document(text):
    root = ET.fromstring(text)
    def convert(node):
        return {'tag': node.tag.rsplit('}', 1)[-1], 'attrs': dict(node.attrib),
                'text': (node.text or '').strip(), 'children': [convert(c) for c in node]}
    return convert(root)


if __name__ == '__main__':
    results = []
    for name, data in cases(ROOT):
        item = {'name': name, 'data': data, 'document': document(data['gpx'])}
        try:
            result = process_request(data, generate=True)
            item['expected'] = {k: result[k] for k in ('plan', 'repair', 'inspection', 'profile', 'verification')}
        except AppError as exc:
            item['error'] = {'code': exc.code, 'message': str(exc)}
        results.append(item)
    print(json.dumps(results, ensure_ascii=False))
