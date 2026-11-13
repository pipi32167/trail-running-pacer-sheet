.PHONY: serve test check

serve:
	python3 -m http.server 8765 --bind 127.0.0.1 --directory web

test:
	python3 -m unittest discover -s tests -v
	node --test tests/pace-engine.test.cjs tests/pace-time.test.cjs tests/service-worker.test.cjs

check:
	python3 -m compileall -q app.py tests
	node --check web/app.js
	node --check web/pace-engine.js
	node --check web/pace-time.js
	node --check web/pace-svg.js
	node --check web/pace-worker.js
	node --check web/service-worker.js
