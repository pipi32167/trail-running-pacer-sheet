'use strict';
/* Shared data and styling for the two map demos. No build step: plain globals. */
(function (root) {
  // Grade ramp: blue reads as descent, paper as flat, amber to red as climb.
  const RAMP = [
    { max: -15, color: '#2f6bb0', label: '≤ -15%' },
    { max: -10, color: '#7fa8d6', label: '-15 ~ -10%' },
    { max: -5, color: '#b9cfe4', label: '-10 ~ -5%' },
    { max: 5, color: '#cabb98', label: '-5 ~ 5%' },
    { max: 10, color: '#e8c46a', label: '5 ~ 10%' },
    { max: 15, color: '#d98a4a', label: '10 ~ 15%' },
    { max: Infinity, color: '#b03a2e', label: '≥ 15%' }
  ];
  const INK = '#23201c';
  const WINDOW_M = 400; // grade measured over ±400 m: 60 m steps flicker at fit zoom

  function bucketOf(grade) {
    return RAMP.findIndex((step) => grade < step.max);
  }

  function haversine(a, b) {
    const toRad = Math.PI / 180, R = 6371008.8;
    const dLat = (b[0] - a[0]) * toRad, dLon = (b[1] - a[1]) * toRad;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * toRad) * Math.cos(b[0] * toRad) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }

  /* Two pointers keep the window lookup linear instead of re-scanning every point. */
  function segments(route) {
    const points = route.points;
    const out = [];
    let left = 0, right = 0;
    for (let i = 1; i < points.length; i++) {
      const at = points[i][3] * 1000;
      while (left < points.length - 1 && at - points[left][3] * 1000 > WINDOW_M) left++;
      while (right < points.length - 1 && points[right][3] * 1000 - at < WINDOW_M) right++;
      const a = points[left], b = points[right];
      const run = (b[3] - a[3]) * 1000;
      const grade = run > 1 ? (b[2] - a[2]) / run * 100 : 0;
      out.push({
        from: [points[i - 1][0], points[i - 1][1]],
        to: [points[i][0], points[i][1]],
        km: points[i][3],
        grade,
        bucket: bucketOf(grade)
      });
    }
    return out;
  }

  /* Merge neighbouring points that share a bucket, so the line reads as bands
     instead of 900 two-pixel colour changes. */
  function runs(route) {
    const points = route.points;
    const out = [];
    let current = null;
    for (const seg of segments(route)) {
      if (current && current.bucket === seg.bucket) {
        current.coords.push(seg.to);
        continue;
      }
      current = { bucket: seg.bucket, color: RAMP[seg.bucket].color, coords: [seg.from, seg.to] };
      out.push(current);
    }
    return out;
  }

  function fitBounds(route) {
    const lats = route.points.map((p) => p[0]), lons = route.points.map((p) => p[1]);
    return [[Math.min(...lats), Math.min(...lons)], [Math.max(...lats), Math.max(...lons)]];
  }

  /* MapLibre wants [lng, lat], the opposite order of the route arrays. */
  function center(route) {
    const box = fitBounds(route);
    return [(box[0][1] + box[1][1]) / 2, (box[0][0] + box[1][0]) / 2];
  }

  /* One label style for both maps, so the comparison is about the basemap only. */
  function checkpointElement(cp, index, total) {
    const node = document.createElement('div');
    node.className = 'cp-pin';
    const kind = index === 0 ? 'start' : index === total - 1 ? 'finish' : 'cp';
    node.classList.add(kind);
    const dot = document.createElement('span');
    dot.className = 'cp-dot';
    const label = document.createElement('span');
    label.className = 'cp-label';
    label.innerHTML = `<b>${escapeHtml(shortName(cp.name))}</b><i>${cp.km.toFixed(1)} km</i>`;
    node.append(dot, label);
    return node;
  }

  function shortName(name) {
    return String(name).replace(/^起终点[-—]?/, '');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  /* Waypoints are ordered by路线顺序, and the closing waypoint is the finish. */
  function orderedCheckpoints(route) {
    return route.checkpoints.slice().sort((a, b) => a.km - b.km);
  }

  function legendHtml() {
    return RAMP.map((step) => `<li><span class="swatch" style="background:${step.color}"></span>${step.label}</li>`).join('');
  }

  function statsHtml(route, extra) {
    const rows = [
      ['距离', `${route.distance_km.toFixed(2)} km`],
      ['累计爬升', `${Math.round(route.ascent_m)} m`],
      ['站点', `${orderedCheckpoints(route).length} 个`],
      ['轨迹点', `${route.kept_points} / ${route.source_points}`]
    ];
    if (extra) rows.push(...extra);
    return rows.map(([k, v]) => `<div class="stat-row"><span>${k}</span><b>${v}</b></div>`).join('');
  }

  async function load(url) {
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`路线数据读取失败：${response.status}`);
    return response.json();
  }

  root.Demo = { RAMP, INK, WINDOW_M, bucketOf, haversine, segments, runs, fitBounds, center,
    checkpointElement, orderedCheckpoints, legendHtml, statsHtml, load };
})(globalThis);
