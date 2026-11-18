'use strict';
/* 三版高度剖面轴的试验台：同一份数据，三种视觉与信息密度。 */
(function () {
  const NS = 'http://www.w3.org/2000/svg';
  const RAMP = [
    { max: -15, color: '#2f6bb0' }, { max: -10, color: '#7fa8d6' }, { max: -5, color: '#b9cfe4' },
    { max: 5, color: '#cabb98' }, { max: 10, color: '#e8c46a' }, { max: 15, color: '#d98a4a' },
    { max: Infinity, color: '#b03a2e' }
  ];
  const GRADE_WINDOW_M = 400;

  function el(name, attrs = {}, parent) {
    const node = document.createElementNS(NS, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (parent) parent.append(node);
    return node;
  }

  function buildSeries(route) {
    const pts = route.points;
    const km = pts.map((p) => p[3]);
    const ele = pts.map((p) => p[2]);
    // ±400 m grade window: 60 m steps flicker, wider bands read as terrain.
    const grade = [];
    let left = 0, right = 0;
    for (let i = 0; i < pts.length; i++) {
      const at = km[i] * 1000;
      while (left < pts.length - 1 && at - km[left] * 1000 > GRADE_WINDOW_M) left++;
      while (right < pts.length - 1 && km[right] * 1000 - at < GRADE_WINDOW_M) right++;
      const run = (km[right] - km[left]) * 1000;
      grade.push(run > 1 ? (ele[right] - ele[left]) / run * 100 : 0);
    }
    // Ascent/descent follows the app's rule or the numbers drift from the table:
    // 100 m smoothing window (±50 m), then a 10 m peak-valley reversal threshold.
    const prefix = [0];
    for (let i = 0; i < ele.length; i++) prefix.push(prefix[i] + ele[i]);
    const smooth = ele.map((_, i) => {
      let lo = i, hi = i;
      while (lo > 0 && (km[i] - km[lo - 1]) * 1000 <= 50) lo--;
      while (hi < ele.length - 1 && (km[hi + 1] - km[i]) * 1000 <= 50) hi++;
      return (prefix[hi + 1] - prefix[lo]) / (hi - lo + 1);
    });
    const gain = [], loss = [];
    let up = 0, down = 0, peak = smooth[0], trough = smooth[0], dir = 1;
    for (let i = 0; i < smooth.length; i++) {
      const value = smooth[i];
      // Commit a finished swing only when a 10 m reversal confirms it.
      if (dir === 1) {
        if (value > peak) peak = value;
        else if (peak - value > 10) { up += peak - trough; dir = -1; trough = value; }
      } else if (value < trough) trough = value;
      else if (value - trough > 10) { down += peak - trough; dir = 1; peak = value; }
      gain.push(up); loss.push(down);
    }
    const rawBucket = grade.map((g) => RAMP.findIndex((step) => g < step.max));
    // A median pass over five points removes one-off flips that read as barcode stripes.
    const bucket = rawBucket.map((_, i) => {
      const window = rawBucket.slice(Math.max(0, i - 4), i + 5).slice().sort((a, b) => a - b);
      return window[Math.floor(window.length / 2)];
    });
    // Absorb runs under 350 m into the previous run: they render as 1 px barcode stripes.
    const runs = [];
    let runStart = 0;
    for (let i = 1; i <= bucket.length; i++) {
      if (i === bucket.length || bucket[i] !== bucket[runStart]) {
        runs.push([runStart, i - 1, bucket[runStart]]);
        runStart = i;
      }
    }
    for (let r = 1; r < runs.length; r++) {
      const [from, to] = runs[r];
      if (km[to] - km[from] >= 0.35) continue;
      for (let i = from; i <= to; i++) bucket[i] = runs[r - 1][2];
    }
    return { km, ele, grade, gain, loss, bucket, cps: route.checkpoints.slice().sort((a, b) => a.km - b.km) };
  }

  function layout(host, baseHeight, padL, padR) {
    const width = Math.max(340, Math.round(host.getBoundingClientRect().width));
    const compact = width < 620;
    return {
      W: width,
      H: compact ? Math.round(baseHeight * 1.18) : baseHeight,
      compact,
      pad: {
        l: compact ? Math.round(padL * 0.62) : padL,
        r: compact ? Math.round(padR * 0.5) : padR,
        t: compact ? 16 : 26,
        b: compact ? 26 : 32
      }
    };
  }

  function nearestIndex(series, kmValue) {
    let lo = 0, hi = series.km.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (series.km[mid] < kmValue) lo = mid + 1; else hi = mid;
    }
    if (lo > 0 && Math.abs(series.km[lo - 1] - kmValue) < Math.abs(series.km[lo] - kmValue)) lo -= 1;
    return lo;
  }

  function fmtKm(v) { return v.toFixed(1); }
  function fmtPct(v) { return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`; }
  function fmtTime(v) { return `${Math.round(v)}`; }

  /* ---------- V1 仪表条：单条高程面积，读数在上，极简 ---------- */
  function mountV1(host, series) {
    const { W, H, pad, compact } = layout(host, 168, 46, 18);
    const maxKm = series.km.at(-1), maxEle = Math.max(...series.ele) * 1.12;
    const x = (km) => pad.l + km / maxKm * (W - pad.l - pad.r);
    const y = (ele) => pad.t + (1 - ele / maxEle) * (H - pad.t - pad.b);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'p-chart v1-chart', role: 'img' });
    svg.innerHTML = `<title>高度剖面</title>`;

    for (let e = 0; e <= maxEle; e += 200) {
      el('line', { x1: pad.l, x2: W - pad.r, y1: y(e), y2: y(e), class: 'v1-grid' }, svg);
      const label = el('text', { x: pad.l - 8, y: y(e) + 3.5, class: 'v1-axis', 'text-anchor': 'end' }, svg);
      label.textContent = `${e} m`;
    }
    for (let k = 0; k <= maxKm; k += (compact ? 10 : 5)) {
      const label = el('text', { x: x(k), y: H - 8, class: 'v1-axis', 'text-anchor': 'middle' }, svg);
      label.textContent = `${k} km`;
    }

    const area = el('path', { class: 'v1-area' }, svg);
    const line = el('path', { class: 'v1-line' }, svg);
    const build = () => {
      const d = series.km.map((km, i) => `${i ? 'L' : 'M'}${x(km).toFixed(1)} ${y(series.ele[i]).toFixed(1)}`).join(' ');
      line.setAttribute('d', d);
      area.setAttribute('d', `${d} L${x(maxKm).toFixed(1)} ${y(0)} L${x(0)} ${y(0)} Z`);
    };
    build();

    for (const cp of series.cps) {
      el('line', { x1: x(cp.km), x2: x(cp.km), y1: pad.t, y2: H - pad.b, class: 'v1-cp-line' }, svg);
      if (compact && !/^(CP1|CP10|起点)/.test(cp.name)) continue;
      const name = el('text', { x: x(cp.km) + 4, y: pad.t + 9, class: 'v1-cp-label' }, svg);
      name.textContent = cp.name.replace(/^(CP\d+)/, '$1 ');
    }

    const cursor = el('g', { class: 'v1-cursor' }, svg);
    const rule = el('line', { y1: pad.t, y2: H - pad.b }, cursor);
    const dot = el('circle', { r: 4 }, cursor);
    const badge = el('g', { class: 'v1-badge' }, cursor);
    const badgeRect = el('rect', { height: 19, rx: 3 }, badge);
    const badgeText = el('text', { y: 13.5 }, badge);

    // A transparent hit strip spans the plot so a click anywhere starts a drag.
    const hit = el('rect', { x: pad.l, y: pad.t, width: W - pad.l - pad.r, height: H - pad.t - pad.b, class: 'p-hit' }, svg);
    host.append(svg);

    return {
      setCursor(i) {
        const cx = x(series.km[i]), cy = y(series.ele[i]);
        rule.setAttribute('x1', cx); rule.setAttribute('x2', cx);
        dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
        badgeText.textContent = `${fmtKm(series.km[i])} km · ${Math.round(series.ele[i])} m`;
        badgeRect.setAttribute('width', badgeText.textContent.length * 6.4 + 12);
        badgeRect.setAttribute('x', Math.min(Math.max(cx - 40, pad.l), W - pad.r - 110));
        badgeRect.setAttribute('y', Math.max(cy - 34, 2));
        badgeText.setAttribute('x', Number(badgeRect.getAttribute('x')) + 6);
        badgeText.setAttribute('y', Number(badgeRect.getAttribute('y')) + 13.5);
      },
      xToKm(clientX) {
        const rect = svg.getBoundingClientRect();
        const px = (clientX - rect.left) / rect.width * W;
        return Math.min(1, Math.max(0, (px - pad.l) / (W - pad.l - pad.r))) * maxKm;
      },
      hit
    };
  }

  /* ---------- V2 地形剖面卡：手绘纸张，斜线填充，站点小旗 ---------- */
  function mountV2(host, series) {
    const { W, H, pad, compact } = layout(host, 176, 52, 20);
    const maxKm = series.km.at(-1), maxEle = Math.max(...series.ele) * 1.15;
    const x = (km) => pad.l + km / maxKm * (W - pad.l - pad.r);
    const y = (ele) => pad.t + (1 - ele / maxEle) * (H - pad.t - pad.b);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'p-chart v2-chart', role: 'img' });
    svg.innerHTML = `<defs>
      <pattern id="v2-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <line x1="0" y1="0" x2="0" y2="7" stroke="#8a7a55" stroke-width="1" opacity=".38"/>
      </pattern>
      <pattern id="v2-hatch-deep" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
        <line x1="0" y1="0" x2="0" y2="5" stroke="#6b5a38" stroke-width="1.1" opacity=".5"/>
      </pattern>
    </defs><title>地形剖面</title>`;

    const d = series.km.map((km, i) => `${i ? 'L' : 'M'}${x(km).toFixed(1)} ${y(series.ele[i]).toFixed(1)}`).join(' ');
    const closing = `L${x(maxKm).toFixed(1)} ${y(0).toFixed(1)} L${x(0)} ${y(0).toFixed(1)} Z`;
    // Rock band under the highest third, paper fill below: reads like a printed profile.
    el('path', { d: `${d} ${closing}`, fill: '#f4ecd7' }, svg);
    el('path', { d: `${d} ${closing}`, fill: 'url(#v2-hatch)' }, svg);
    el('path', { d: d, fill: 'none', stroke: '#3b2f1d', 'stroke-width': 1.8, 'stroke-linejoin': 'round' }, svg);
    el('line', { x1: pad.l, x2: W - pad.r, y1: y(0), y2: y(0), stroke: '#3b2f1d', 'stroke-width': 1.2 }, svg);

    for (let e = 200; e <= maxEle; e += 200) {
      el('line', { x1: pad.l, x2: W - pad.r, y1: y(e), y2: y(e), stroke: '#3b2f1d22', 'stroke-dasharray': '3 5' }, svg);
      const label = el('text', { x: pad.l - 10, y: y(e) + 4, class: 'v2-axis', 'text-anchor': 'end' }, svg);
      label.textContent = `${e}`;
    }
    for (let k = 0; k <= maxKm; k += (compact ? 10 : 10)) {
      const label = el('text', { x: x(k), y: H - 10, class: 'v2-axis', 'text-anchor': 'middle' }, svg);
      label.textContent = `${k} km`;
    }
    const unit = el('text', { x: W - pad.r + 4, y: H - 10, class: 'v2-axis' }, svg);
    unit.textContent = '里程';

    const localHigh = (kmCenter) => {
      let high = 0;
      series.km.forEach((km, i) => { if (Math.abs(km - kmCenter) <= 0.9) high = Math.max(high, series.ele[i]); });
      return high;
    };
    for (const cp of series.cps) {
      const cx = x(cp.km);
      // Flags share one annotation lane at the top; the leader points at the ridge below.
      const top = pad.t + 3;
      el('line', { x1: cx, x2: cx, y1: top + 11, y2: y(localHigh(cp.km)), stroke: '#3b2f1d55', 'stroke-width': 1, 'stroke-dasharray': '2 3' }, svg);
      el('path', { d: `M${cx} ${top} L${cx + 12} ${top + 4} L${cx} ${top + 9} Z`, fill: '#e0533c' }, svg);
      const label = el('text', { x: cx + 15, y: top + 8, class: 'v2-cp' }, svg);
      // On a phone the full names collide, so the flag keeps only the checkpoint number.
      label.textContent = compact ? (cp.name.match(/^CP\d+/)?.[0] || '起') : cp.name.replace(/^CP(\d+)/, 'CP$1');
    }

    const cursor = el('g', { class: 'v2-cursor' }, svg);
    el('line', { y1: pad.t - 6, y2: H - pad.b, stroke: '#e0533c', 'stroke-width': 1.4, 'stroke-dasharray': '4 4' }, cursor).classList.add('v2-rule');
    const dot = el('circle', { r: 5, fill: '#fffdf9', stroke: '#e0533c', 'stroke-width': 2 }, cursor);
    const flag = el('g', { class: 'v2-flag' }, cursor);
    const flagRect = el('rect', { height: 20, rx: 4, fill: '#fffdf9', stroke: '#3b2f1d' }, flag);
    const flagText = el('text', { y: 14, class: 'v2-flag-text' }, flag);

    const hit = el('rect', { x: pad.l, y: pad.t, width: W - pad.l - pad.r, height: H - pad.t - pad.b, class: 'p-hit' }, svg);
    host.append(svg);

    return {
      setCursor(i) {
        const cx = x(series.km[i]), cy = y(series.ele[i]);
        cursor.querySelector('.v2-rule').setAttribute('x1', cx);
        cursor.querySelector('.v2-rule').setAttribute('x2', cx);
        dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
        flagText.textContent = `现在 ${fmtKm(series.km[i])} km`;
        flagRect.setAttribute('width', flagText.textContent.length * 7.5 + 14);
        const fx = Math.min(Math.max(cx - 40, pad.l), W - pad.r - 130);
        flagRect.setAttribute('x', fx); flagRect.setAttribute('y', pad.t - 26);
        flagText.setAttribute('x', fx + 7); flagText.setAttribute('y', pad.t - 11);
      },
      xToKm(clientX) {
        const rect = svg.getBoundingClientRect();
        const px = (clientX - rect.left) / rect.width * W;
        return Math.min(1, Math.max(0, (px - pad.l) / (W - pad.l - pad.r))) * maxKm;
      },
      hit
    };
  }

  /* ---------- V3 数据密集：坡度色带 + 累计爬升/下降双线 + 十字光标 ---------- */
  function mountV3(host, series) {
    const { W, H, pad, compact } = layout(host, 214, 52, 62);
    const maxKm = series.km.at(-1), maxEle = Math.max(...series.ele) * 1.12;
    const maxAcc = Math.max(series.gain.at(-1), series.loss.at(-1)) * 1.08;
    const x = (km) => pad.l + km / maxKm * (W - pad.l - pad.r);
    const y = (ele) => pad.t + (1 - ele / maxEle) * (H - pad.t - pad.b);
    const y2 = (acc) => pad.t + (1 - acc / maxAcc) * (H - pad.t - pad.b);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'p-chart v3-chart', role: 'img' });
    svg.innerHTML = `<title>高度剖面</title>`;

    for (let e = 0; e <= maxEle; e += 200) {
      el('line', { x1: pad.l, x2: W - pad.r, y1: y(e), y2: y(e), class: 'v3-grid' }, svg);
      const label = el('text', { x: pad.l - 8, y: y(e) + 3.5, class: 'v3-axis', 'text-anchor': 'end' }, svg);
      label.textContent = `${e}`;
    }
    for (let k = 0; k <= maxKm; k += (compact ? 10 : 5)) {
      el('line', { x1: x(k), x2: x(k), y1: H - pad.b, y2: H - pad.b + 4, class: 'v3-tick' }, svg);
      const label = el('text', { x: x(k), y: H - 10, class: 'v3-axis', 'text-anchor': 'middle' }, svg);
      label.textContent = `${k}`;
    }
    // Right-hand scale belongs to the two cumulative curves, so it needs its own ticks.
    for (let a = 0; a <= maxAcc; a += 500) {
      el('line', { x1: W - pad.r, x2: W - pad.r + 4, y1: y2(a), y2: y2(a), class: 'v3-tick' }, svg);
      const label = el('text', { x: W - pad.r + 7, y: y2(a) + 3.5, class: 'v3-axis' }, svg);
      label.textContent = `${a}`;
    }

    // Grade bands: one rect per run, so colour changes stay visible at this height.
    let start = 0;
    for (let i = 1; i <= series.km.length; i++) {
      if (i === series.km.length || series.bucket[i] !== series.bucket[start]) {
        const d = series.km.slice(start, i).map((km, j) => `${j ? 'L' : 'M'}${x(km).toFixed(1)} ${y(series.ele[start + j]).toFixed(1)}`).join(' ');
        el('path', { d: `${d} L${x(series.km[i - 1]).toFixed(1)} ${y(0)} L${x(series.km[start]).toFixed(1)} ${y(0)} Z`, fill: RAMP[series.bucket[start]].color, opacity: .55 }, svg);
        start = i;
      }
    }
    const lineD = series.km.map((km, i) => `${i ? 'L' : 'M'}${x(km).toFixed(1)} ${y(series.ele[i]).toFixed(1)}`).join(' ');
    el('path', { d: lineD, fill: 'none', stroke: '#f4efe6', 'stroke-width': 1.6, opacity: .9 }, svg);

    const gainD = series.km.map((km, i) => `${i ? 'L' : 'M'}${x(km).toFixed(1)} ${y2(series.gain[i]).toFixed(1)}`).join(' ');
    const lossD = series.km.map((km, i) => `${i ? 'L' : 'M'}${x(km).toFixed(1)} ${y2(series.loss[i]).toFixed(1)}`).join(' ');
    el('path', { d: gainD, fill: 'none', stroke: '#e8c46a', 'stroke-width': 1.3, 'stroke-dasharray': '5 3' }, svg);
    el('path', { d: lossD, fill: 'none', stroke: '#7fa8d6', 'stroke-width': 1.3, 'stroke-dasharray': '1 3' }, svg);

    const kmUnit = el('text', { x: W - pad.r + 2, y: H - 10, class: 'v3-axis' }, svg);
    kmUnit.textContent = 'km';

    for (const cp of series.cps) {
      el('line', { x1: x(cp.km), x2: x(cp.km), y1: pad.t, y2: H - pad.b, class: 'v3-cp-line' }, svg);
      const label = el('text', { x: x(cp.km) + 4, y: pad.t + 9, class: 'v3-cp' }, svg);
      label.textContent = cp.name.match(/^CP\d+/)?.[0] || '起点';
    }

    const cursor = el('g', { class: 'v3-cursor' }, svg);
    const vrule = el('line', { y1: pad.t, y2: H - pad.b, class: 'v3-vrule' }, cursor);
    const hrule = el('line', { x1: pad.l, x2: W - pad.r, class: 'v3-hrule' }, cursor);
    const dot = el('circle', { r: 3.4, class: 'v3-dot' }, cursor);
    const tip = el('g', { class: 'v3-tip' }, cursor);
    const tipRect = el('rect', { height: 62, rx: 4 }, tip);
    const tipLines = [0, 1, 2, 3].map((i) => el('text', { y: 16 + i * 14 }, tip));

    const hit = el('rect', { x: pad.l, y: pad.t, width: W - pad.l - pad.r, height: H - pad.t - pad.b, class: 'p-hit' }, svg);
    host.append(svg);

    return {
      setCursor(i) {
        const cx = x(series.km[i]), cy = y(series.ele[i]);
        vrule.setAttribute('x1', cx); vrule.setAttribute('x2', cx);
        hrule.setAttribute('y1', cy); hrule.setAttribute('y2', cy);
        dot.setAttribute('cx', cx); dot.setAttribute('cy', cy);
        const rows = [
          `${fmtKm(series.km[i])} km · ${Math.round(series.ele[i])} m`,
          `坡度 ${fmtPct(series.grade[i])}`,
          `累计爬升 ${fmtTime(series.gain[i])} m`,
          `累计下降 ${fmtTime(series.loss[i])} m`
        ];
        const width = Math.max(...rows.map((r) => r.length)) * 6.6 + 16;
        const flip = cx + width + 12 > W;
        const bx = flip ? cx - width - 10 : cx + 10;
        const by = Math.min(Math.max(cy - 30, pad.t), H - pad.b - 62);
        tipRect.setAttribute('x', bx); tipRect.setAttribute('y', by); tipRect.setAttribute('width', width);
        rows.forEach((row, index) => {
          tipLines[index].textContent = row;
          tipLines[index].setAttribute('x', bx + 8);
          tipLines[index].setAttribute('y', by + 16 + index * 14);
        });
      },
      xToKm(clientX) {
        const rect = svg.getBoundingClientRect();
        const px = (clientX - rect.left) / rect.width * W;
        return Math.min(1, Math.max(0, (px - pad.l) / (W - pad.l - pad.r))) * maxKm;
      },
      hit
    };
  }

  /* ---------- 组装：地图 + 剖面 + 拖动联动 ---------- */
  const VARIANTS = { 1: mountV1, 2: mountV2, 3: mountV3 };

  (async function main() {
    const variant = String(new URLSearchParams(location.search).get('v') || localStorage.getItem('profile-variant') || '1');
    document.body.dataset.variant = VARIANTS[variant] ? variant : '1';
    for (const button of document.querySelectorAll('[data-variant]')) {
      button.setAttribute('aria-pressed', String(button.dataset.variant === document.body.dataset.variant));
      button.addEventListener('click', () => {
        const next = button.dataset.variant;
        localStorage.setItem('profile-variant', next);
        location.search = `?v=${next}`;
      });
    }

    const route = await fetch('./route.json', { cache: 'no-cache' }).then((r) => r.json());
    const series = buildSeries(route);
    const chartHost = document.querySelector('#profile-chart');
    const chart = VARIANTS[document.body.dataset.variant](chartHost, series);

    const readout = {
      km: document.querySelector('#r-km'),
      ele: document.querySelector('#r-ele'),
      grade: document.querySelector('#r-grade'),
      gain: document.querySelector('#r-gain'),
      loss: document.querySelector('#r-loss')
    };

    // Map: light vector style so the profile strip stays the hero.
    const map = new maplibregl.Map({
      container: 'map', style: 'https://tiles.openfreemap.org/styles/positron',
      center: [121.30877, 28.26228], zoom: 11.4, attributionControl: false
    });
    window.__map = map;
    map.addControl(new maplibregl.AttributionControl({ compact: true, customAttribution: '© OpenFreeMap' }));
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    const routeLine = { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.points.map((p) => [p[1], p[0]]) } };
    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [routeLine] } });
      map.addLayer({ id: 'route-casing', type: 'line', source: 'route', paint: { 'line-color': '#fffdf9', 'line-width': 9, 'line-opacity': .9 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.addLayer({ id: 'route', type: 'line', source: 'route', paint: { 'line-color': '#2a4d9b', 'line-width': 3.6 }, layout: { 'line-cap': 'round', 'line-join': 'round' } });
      map.fitBounds([[Math.min(...route.points.map((p) => p[1])), Math.min(...route.points.map((p) => p[0]))],
        [Math.max(...route.points.map((p) => p[1])), Math.max(...route.points.map((p) => p[0]))]], { padding: 40, duration: 0 });
      positionMarker();
    });

    const markerNode = document.createElement('div');
    markerNode.className = 'scrub-marker';
    markerNode.innerHTML = '<span></span>';
    const marker = new maplibregl.Marker({ element: markerNode, anchor: 'center' }).setLngLat([route.points[0][1], route.points[0][0]]);
    let mapReady = false;
    map.on('load', () => { mapReady = true; marker.addTo(map); });

    function positionMarker() {
      if (!mapReady) return;
      const point = route.points[state.index];
      marker.setLngLat([point[1], point[0]]);
      // Keep the point inside the middle band; only pan when it drifts out.
      const projected = map.project([point[1], point[0]]);
      const { clientWidth: w, clientHeight: h } = map.getContainer();
      const marginX = w * 0.25, marginY = h * 0.22;
      if (projected.x < marginX || projected.x > w - marginX || projected.y < marginY || projected.y > h - marginY) {
        map.jumpTo({ center: [point[1], point[0]] });
      }
    }

    const state = { index: 0 };
    function setIndex(index, fromMap = false) {
      state.index = Math.min(series.km.length - 1, Math.max(0, index));
      chart.setCursor(state.index);
      const i = state.index;
      readout.km.textContent = `${fmtKm(series.km[i])} km`;
      readout.ele.textContent = `${Math.round(series.ele[i])} m`;
      readout.grade.textContent = fmtPct(series.grade[i]);
      readout.gain.textContent = `${fmtTime(series.gain[i])} m`;
      readout.loss.textContent = `${fmtTime(series.loss[i])} m`;
      if (!fromMap) positionMarker();
      const range = document.querySelector('#scrub-range');
      if (range) range.value = String(Math.round(series.km[i] * 1000));
    }

    let dragging = false;
    let frame = 0;
    let pendingKm = 0;
    function queueFromX(clientX) {
      pendingKm = chart.xToKm(clientX);
      if (frame) return;
      frame = requestAnimationFrame(() => { frame = 0; setIndex(nearestIndex(series, pendingKm)); });
    }
    const surface = document.querySelector('#profile-card');
    surface.addEventListener('pointerdown', (event) => {
      // Stops the browser's native drag/selection defaults, which can hijack the gesture.
      event.preventDefault();
      dragging = true;
      try { surface.setPointerCapture(event.pointerId); } catch { /* synthetic pointers may not capture */ }
      queueFromX(event.clientX);
    });
    surface.addEventListener('pointermove', (event) => { if (dragging) queueFromX(event.clientX); });
    surface.addEventListener('pointerup', (event) => {
      dragging = false;
      try { surface.releasePointerCapture(event.pointerId); } catch { /* nothing captured */ }
    });
    surface.addEventListener('pointercancel', () => { dragging = false; });

    // Accessible base: a real range input keeps keyboard and screen readers working.
    const range = document.querySelector('#scrub-range');
    range.max = String(Math.round(series.km.at(-1) * 1000));
    range.addEventListener('input', () => {
      const kmValue = Number(range.value) / 1000;
      setIndex(nearestIndex(series, kmValue));
    });

    // Clicking the track on the map also moves the cursor.
    map.on('click', 'route', (event) => {
      const hitPoint = event.lngLat;
      let best = 0, bestD = Infinity;
      route.points.forEach((p, i) => {
        const d = (p[0] - hitPoint.lat) ** 2 + (p[1] - hitPoint.lng) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      });
      setIndex(best);
    });
    map.on('mouseenter', 'route', () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', 'route', () => { map.getCanvas().style.cursor = ''; });

    setIndex(0);
    window.__profile = { series, setIndex };
  })().catch((error) => {
    document.body.insertAdjacentHTML('beforeend', `<p class="load-error">加载失败：${error.message}</p>`);
  });
})();
