'use strict';
const i18n = globalThis.TrailI18n;
const t = (key, params) => i18n.t(key, params);
const documentURL = document.currentScript.src;
const ASSET_VERSION = 'frontend-v30';
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL(`./service-worker.js?v=${ASSET_VERSION}`,documentURL)).then(()=>navigator.serviceWorker.ready).then(()=>{
    state.offlineReady = true; $('privacy-note').textContent=t('form.privacyCached');
  }).catch(()=>{});
}
const $ = (id) => document.getElementById(id);
const state = {file: null, text: '', inspection: null, result: null, inspecting: false, generating: false, version: 0, controller: null, style: 'paper', statusRender: null, offlineReady: false};
const FIELD_KEYS = {'ascent-window':'ascent_smoothing_m','ascent-threshold':'ascent_threshold_m','ascent-factor':'ascent_km_per_100m','fatigue':'fatigue_rate','target-step':'target_step_minutes'};
const MAX_SIZE = 12 * 1024 * 1024;
const fmt = TrailTime.elapsed;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const km = (m) => (m / 1000).toFixed(2);
const lang = () => i18n.lang();
function appError(key, params) { const error = new Error(t(key, params)); error.key = key; error.params = params || null; return error; }
function errorParams(params) {
  const next = {...params};
  if (next.field) next.field = i18n.MESSAGES.zh[`field.${next.field}`] ? t(`field.${next.field}`) : next.field;
  if (typeof next.label === 'string' && i18n.MESSAGES.zh[next.label]) next.label = t(next.label);
  return next;
}
function errorText(error) {
  if (error.key) return t(error.key, error.params);
  const code = error.code;
  if (code && i18n.MESSAGES.zh[`err.${code}`]) return t(`err.${code}`, errorParams(error.params));
  if (code && i18n.MESSAGES.zh[code]) return t(code, errorParams(error.params));
  return error.message || t('err.unknown');
}
/* Keep the status text as a function so a language switch can rebuild it. */
function setStatus(render, type = '') {
  state.statusRender = render ? render : null;
  const node = $('status');
  node.hidden = !render;
  node.textContent = render ? render() : '';
  node.className = `status ${type}`;
}
function busy() {
  const isBusy = state.inspecting || state.generating;
  $('generate').disabled = isBusy;
  $('generate-label').textContent = state.generating ? t('form.generating') : state.inspecting ? t('form.inspecting') : t('form.generate');
  $('pace-form').setAttribute('aria-busy', String(isBusy));
  for (const input of $('pace-form').querySelectorAll('input,select,textarea')) {
    if (state.generating && input.dataset.busyDisabled === undefined) {
      input.dataset.busyDisabled = String(input.disabled);
      input.disabled = true;
    } else if (!state.generating && input.dataset.busyDisabled !== undefined) {
      input.disabled = input.dataset.busyDisabled === 'true';
      delete input.dataset.busyDisabled;
    }
  }
}
function planName(plan) { return plan.name && plan.name !== 'route' ? plan.name : t('route.unnamed'); }
function clearResult() { if (state.result) setStatus(()=>t('status.modified')); state.result = null; $('results').hidden = true; $('wallpaper-panel').hidden = true; $('wallpaper-open').setAttribute('aria-expanded','false'); }
function numeric(id) { const input = $(id); const v = input.value.trim(); if (!v || !input.checkValidity() || !Number.isFinite(Number(v))) throw appError('error.optionNumber',{field:FIELD_KEYS[id]||id}); return Number(v); }
function options(includeCP = false) {
  const startTime = $('start-time').value;
  if (includeCP && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    $('start-time').focus();
    throw appError('error.startRequired');
  }
  const o = {ascent_smoothing_m: numeric('ascent-window'), ascent_threshold_m: numeric('ascent-threshold'), ascent_km_per_100m: numeric('ascent-factor'), fatigue_rate: numeric('fatigue') / 100, target_step_minutes: numeric('target-step'), secondary_display: $('secondary-display').value, lang: lang()};
  if (startTime) o.start_time = startTime;
  if (!$('track-panel').hidden && $('track-index').value) o.track_index = Number($('track-index').value);
  if ($('target-count').value === 'one') o.targets = [$('target').value.trim()];
  if (!includeCP || !state.inspection) return o;
  const rows = [...document.querySelectorAll('.cp-row')];
  if (rows.length) {
    const selected = rows.filter((r) => r.querySelector('.cp-include').checked);
    if (!selected.length) throw appError('error.selectStation');
    o.cp_selection = selected.map((r) => r.dataset.id);
    o.checkpoint_overrides = {};
    for (const row of selected) {
      const fields = {};
      const position = row.querySelector('.cp-position');
      if (position) {
        if (!position.value) { $('advanced').open = true; position.focus(); throw appError('error.choosePosition',{name:row.dataset.name}); }
        fields.distance_km = Number(position.value);
      }
      const allow = row.querySelector('.cp-off-route');
      if (allow) { if (!allow.checked) { $('advanced').open = true; allow.focus(); throw appError('error.confirmOffset',{name:row.dataset.name}); } fields.allow_off_route = true; }
      const rest = row.querySelector('.cp-rest');
      if (rest.value === '' || !rest.checkValidity()) throw appError('error.checkRest',{name:row.dataset.name});
      fields.rest_minutes = Number(rest.value);
      const cutoff = row.querySelector('.cp-cutoff').value.trim();
      if (cutoff) { if (!/^\d{1,4}:[0-5]\d$/.test(cutoff)) throw appError('error.cutoffFormat',{name:row.dataset.name}); fields.cutoff = cutoff; }
      o.checkpoint_overrides[row.dataset.id] = fields;
    }
  } else if (!$('manual-panel').hidden && $('manual-cps').value.trim()) {
    const total = state.inspection.inspection.distance_m / 1000;
    o.checkpoints = $('manual-cps').value.trim().split('\n').filter((s) => s.trim()).map((line, i) => {
      const [name, distance, rest = '0', cutoff = ''] = line.split(/[,，]/).map((s) => s.trim());
      if (!name || !distance || !Number.isFinite(Number(distance)) || Number(distance) <= 0 || Number(distance) >= total) throw appError('error.manualLine',{line:i + 1});
      if (!rest || !Number.isFinite(Number(rest)) || Number(rest) < 0) throw appError('error.manualRest',{line:i + 1});
      const cp = {name, distance_km: Number(distance), rest_minutes: Number(rest)};
      if (cutoff) cp.cutoff = cutoff;
      return cp;
    });
    o.checkpoints.push({name: '终点', distance_km: total});
  }
  return o;
}
function parseDocument(text) {
  if (!text.trim()) throw appError('error.missingFile');
  if (/<!\s*(?:DOCTYPE|ENTITY)/i.test(text)) throw appError('error.dtd');
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.getElementsByTagName('parsererror').length || xml.documentElement.localName !== 'gpx') throw appError('error.notXml');
  let points = 0;
  // Only GPX fields used by the calculator cross the worker boundary.
  const tags = new Set(['gpx','trk','trkseg','trkpt','rte','rtept','wpt','name','type','ele']);
  function convert(node) {
    if (['trkpt','rtept'].includes(node.localName) && ++points > 200000) throw appError('error.tooManyPoints');
    return {tag:node.localName, attrs:Object.fromEntries(['lat','lon'].filter(k=>node.hasAttribute(k)).map(k=>[k,node.getAttribute(k)])), text:['name','type','ele'].includes(node.localName)?node.textContent.trim():'', children:[...node.children].filter(n=>tags.has(n.localName)).map(convert)};
  }
  return convert(xml.documentElement);
}
async function api(path, body, signal) {
  if (signal?.aborted) {const e=appError('error.cancelled');e.cancelled=true;throw e;}
  const document = parseDocument(body.gpx);
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.gpx));
  const sha256 = [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  return new Promise((resolve,reject)=>{
    if(signal?.aborted) {const e=appError('error.cancelled');e.cancelled=true;reject(e);return;}
    const worker = new Worker(new URL(`./pace-worker.js?v=${ASSET_VERSION}`,documentURL));
    const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();};
    const abort=()=>{cleanup();const e=appError('error.cancelled');e.cancelled=true;reject(e);};
    const timer=setTimeout(()=>{cleanup();reject(appError('error.timeout'));},45000);
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>{cleanup();if(data.error){const e=new Error(data.error.message);e.code=data.error.code;e.params=data.error.params??null;e.data=data.error;reject(e);}else resolve(data.result);};
    worker.onerror=()=>{cleanup();reject(appError('error.worker'));};
    worker.postMessage({generate:path==='/api/generate',body:{document,sha256,filename:body.filename,target:body.target,options:body.options}});
  });
}
function routeError(error) {
  const d = error.data;
  if (d?.code === 'select_track') {
    $('advanced').open = true;
    $('track-panel').hidden = false;
    $('track-index').innerHTML = `<option value="">${esc(t('advanced.track'))}</option>` + d.details.map((track) => `<option value="${track.track_index}">${esc(track.name || t('route.unnamed'))}</option>`).join('');
    $('track-index').focus();
  }
  setStatus(()=>errorText(error),'error');
}
function fileHint() {
  if (!state.file) return t('form.dropHint');
  const size = state.file.size < 1024 ? `${state.file.size} B` : `${(state.file.size / 1024).toFixed(0)} KB`;
  return t('status.fileHint',{size});
}
function listSeparator() { return lang() === 'zh' ? '、' : ', '; }
function refreshFileLabels() {
  if (state.file) { $('file-title').textContent = state.file.name; $('file-hint').textContent = fileHint(); $('drop-zone').classList.add('has-file'); }
  else { $('file-title').textContent = t('form.dropTitle'); $('file-hint').textContent = t('form.dropHint'); $('drop-zone').classList.remove('has-file'); }
  if (state.offlineReady) $('privacy-note').textContent = t('form.privacyCached');
  if (state.inspection) { $('file-state').hidden = false; $('file-state').textContent = inspectionState(state.inspection); }
  else { $('file-state').hidden = true; $('file-state').textContent = ''; }
}
function inspectionState(response) {
  const r = response.inspection;
  return t('status.fileState',{km:km(r.distance_m),ascent:Math.round(r.ascent_m)});
}
async function inspectFile() {
  if (!state.text) return;
  const version = ++state.version;
  state.controller?.abort();
  state.controller = new AbortController();
  state.inspecting = true; busy(); setStatus(()=>t('status.reading'));
  try {
    const response = await api('/api/inspect', {gpx:state.text, filename:state.file.name, options:options()}, state.controller.signal);
    if (version !== state.version) return;
    state.inspection = response;
    renderCheckpoints(response);
    const r = response.inspection;
    $('file-state').hidden = false;
    $('file-state').textContent = inspectionState(response);
    const count = response.repair.repaired_count;
    const confirmed = Boolean(response.confirmed_overrides['wpt:5']);
    setStatus(()=>t('status.ready',{km:km(r.distance_m),ascent:Math.round(r.ascent_m)})
      + (count ? t('status.readyRepair',{count}) : '')
      + (confirmed ? t('status.readyConfirmed') : ''),'success');
  } catch (e) { if (version === state.version && !e.cancelled) routeError(e); }
  finally { if (version === state.version) {state.inspecting = false; busy();} }
}
async function acceptFile(file) {
  if (state.generating) return;
  ++state.version; state.controller?.abort(); state.inspecting = false;
  state.file = null; state.text = ''; state.inspection = null; clearResult();
  $('track-panel').hidden = true; $('track-index').innerHTML = ''; $('checkpoint-panel').hidden = true; $('manual-panel').hidden = true; $('manual-cps').value = '';
  refreshFileLabels(); busy();
  if (!file) return;
  if (!/\.gpx$/i.test(file.name)) return setStatus(()=>t('error.ext'),'error');
  if (file.size > MAX_SIZE) return setStatus(()=>t('error.tooBig'),'error');
  if (!file.size) return setStatus(()=>t('error.empty'),'error');
  state.file = file;
  refreshFileLabels();
  const version = state.version;
  try { const text = await file.text(); if (version !== state.version) return; state.text = text; await inspectFile(); }
  catch (e) { if (version === state.version) setStatus(()=>e.message || t('error.readFailed'),'error'); }
}
/* Keep what the user typed when the panel is rebuilt for another language. */
function checkpointDraft() {
  const draft = {};
  for (const row of document.querySelectorAll('.cp-row')) {
    draft[row.dataset.id] = {
      include: row.querySelector('.cp-include').checked,
      position: row.querySelector('.cp-position')?.value ?? null,
      rest: row.querySelector('.cp-rest').value,
      cutoff: row.querySelector('.cp-cutoff').value,
      offRoute: row.querySelector('.cp-off-route')?.checked ?? false
    };
  }
  return draft;
}
function restoreCheckpointDraft(draft) {
  for (const row of document.querySelectorAll('.cp-row')) {
    const saved = draft[row.dataset.id];
    if (!saved) continue;
    row.querySelector('.cp-include').checked = saved.include;
    const position = row.querySelector('.cp-position');
    if (position && saved.position !== null) position.value = saved.position;
    row.querySelector('.cp-rest').value = saved.rest;
    row.querySelector('.cp-cutoff').value = saved.cutoff;
    const offRoute = row.querySelector('.cp-off-route');
    if (offRoute) offRoute.checked = saved.offRoute;
  }
}
function renderCheckpoints(response, draft = null) {
  const candidates = response.inspection.cp_candidates;
  $('checkpoint-panel').hidden = !candidates.length; $('manual-panel').hidden = !!candidates.length;
  const ambiguous = [];
  $('checkpoint-fields').innerHTML = candidates.map((cp) => {
    const combined = /起终点|起終點/i.test(cp.name) || (/\bstart\b/i.test(cp.name) && /\bfinish\b/i.test(cp.name));
    const endpoint = combined || /起点|终点|起點|終點|\bstart\b|\bfinish\b/i.test(cp.name);
    const opts = cp.projection_options;
    const override = response.confirmed_overrides[cp.id];
    const hasMultiple = opts.length > 1 && !endpoint;
    const offRoute = !endpoint && opts.length === 1 && opts[0].offset_m > 100;
    if ((hasMultiple && !override) || offRoute) ambiguous.push(cp.name);
    const position = hasMultiple
      ? `<label>${esc(t('cp.positionLabel'))}<select class="cp-position" aria-label="${esc(t('cp.positionAria',{name:cp.name}))}"><option value="">${esc(t('cp.positionPlaceholder'))}</option>${opts.map((p, i) => `<option value="${p.distance_m/1000}" ${override && Math.abs(override.distance_km*1000-p.distance_m)<.1 ? 'selected' : ''}>${esc(t('cp.pass',{pass:i+1,km:km(p.distance_m)}))}</option>`).join('')}</select></label>`
      : `<span class="cp-position-note">${combined ? esc(t('cp.combined')) : `${km(opts[0]?.distance_m ?? 0)} km`}</span>${offRoute ? `<label><input type="checkbox" class="cp-off-route"> ${esc(t('cp.offRoute',{meters:Math.round(opts[0].offset_m)}))}</label>` : ''}`;
    return `<div class="cp-row ${(hasMultiple && !override) || offRoute ? 'needs-choice' : ''}" data-id="${esc(cp.id)}" data-name="${esc(cp.name)}"><label class="cp-name"><input class="cp-include" type="checkbox" ${cp.recognized ? 'checked' : ''} aria-label="${esc(t('cp.includeAria',{name:cp.name}))}">${esc(cp.name)}</label><div>${position}</div><label>${esc(t('cp.stay'))}<input class="cp-rest" type="number" min="0" max="10000" value="0" ${endpoint ? 'disabled' : ''} aria-label="${esc(t('cp.stayAria',{name:cp.name}))}"></label><label>${esc(t('cp.cutoff'))}<input class="cp-cutoff" type="text" maxlength="9" placeholder="${esc(t('cp.cutoffPlaceholder'))}" aria-label="${esc(t('cp.cutoffAria',{name:cp.name}))}"></label></div>`;
  }).join('');
  if (draft) restoreCheckpointDraft(draft);
  if (ambiguous.length) $('advanced').open = true;
  $('cp-hint').textContent = ambiguous.length ? t('cp.hintAmbiguous',{names:ambiguous.join(listSeparator())}) : t('cp.hintReady');
}
function renderProfile(response) {
  const points = response.profile, total = response.plan.route.distance_m;
  const elevations = points.map((p) => p[1]), low = Math.floor(Math.min(...elevations)/50)*50, high = Math.ceil(Math.max(...elevations)/50)*50;
  const span = Math.max(50, high-low), x = (m) => 44+m/total*1010, y = (z) => 137-(z-low)/span*105;
  const line = points.map((p,i) => `${i ? 'L':'M'}${x(p[0]).toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
  const grid = [0,.5,1].map((f) => `<path d="M44 ${137-f*105}H1054" stroke="#23201c18" stroke-dasharray="3 5"/><text x="0" y="${140-f*105}">${Math.round(low+f*span)}m</text>`).join('');
  const cps = response.plan.checkpoints.map((cp,i) => { const near = points.reduce((best,p) => Math.abs(p[0]-cp.distance_m)<Math.abs(best[0]-cp.distance_m)?p:best,points[0]); return `<circle cx="${x(cp.distance_m)}" cy="${y(near[1])}" r="3" fill="#2a4d9b"/><text x="${x(cp.distance_m)}" y="166" text-anchor="${i===0?'start':i===response.plan.checkpoints.length-1?'end':'middle'}">${km(cp.distance_m)}</text>`; }).join('');
  $('elevation-chart').innerHTML = `${grid}<path d="${line} L1054 137 L44 137 Z" fill="#e0b23c22"/><path d="${line}" stroke="#2a4d9b" stroke-width="2" fill="none" stroke-linejoin="round"/>${cps}`;
}
function renderResult(response) {
  const p = response.plan, route = p.route, current = lang();
  const central = $('target').value.trim().split(':').map(Number); const target = central[0]*3600+central[1]*60+(central[2]||0);
  $('result-title').textContent = planName(p);
  $('route-stats').innerHTML = [[t('result.statDistance'),(route.distance_m/1000).toFixed(2),'km'],[t('result.statAscent'),Math.round(route.ascent_m),'m'],[t('result.statDescent'),Math.round(route.descent_m),'m'],[t('result.statEquivalent'),route.eq_distance_km.toFixed(2),'km']].map(([label,value,unit]) => `<div class="stat"><span class="stat-label">${label}</span><span class="stat-value">${value}<small>${unit}</small></span></div>`).join('');
  const label = {pace:t('option.pace'),equivalent_pace:t('option.eqPace'),arrival_time:t('time.elapsed')}[p.parameters.secondary_display];
  $('table-legend').textContent = t('result.legend',{start:p.parameters.start_time,label});
  $('pace-table').classList.add('clock-display');
  const repairs = response.repair.repaired_count;
  $('result-notes').innerHTML = `<p><strong>${esc(t('result.noteElevationLabel'))}</strong>${esc(t('result.noteElevation',{window:p.parameters.ascent_smoothing_m,threshold:p.parameters.ascent_threshold_m}))}${esc(repairs ? t('result.noteElevationRepair',{count:repairs}) : t('result.noteElevationClean'))}</p><p><strong>${esc(t('result.noteStopLabel'))}</strong>${esc(t('result.noteStop',{minutes:Math.round(p.parameters.rest_total_seconds/60)}))}<strong>${esc(t('result.noteCutoffLabel'))}</strong>${esc(response.verification.cutoff_unchecked_stations ? t('result.noteCutoffUnchecked',{count:response.verification.cutoff_unchecked_stations}) : t('result.noteCutoffChecked'))}${esc(t('result.noteWater'))}</p><p><strong>${esc(t('result.noteReadLabel'))}</strong>${esc(t('result.noteRead'))}</p>`;
  $('pace-table').innerHTML = `<thead><tr><th scope="col">${esc(t('result.thStation'))}</th><th scope="col">${esc(t('result.thSegment'))}<br>${esc(t('result.thSegmentUnit'))}</th><th scope="col">${esc(t('result.thGrade'))}<br>${esc(t('result.thGradeUnit'))}</th><th scope="col">${esc(t('result.thWater'))}<br>${esc(t('result.thWaterUnit'))}</th>${p.targets_seconds.map((seconds) => `<th scope="col" class="target-col ${Math.abs(seconds-target)<1?'chosen':''}">${esc(Math.abs(seconds-target)<1?t('result.thTarget'):t('result.thReference'))}<span class="target-label">${fmt(seconds)}</span></th>`).join('')}</tr></thead><tbody>${p.checkpoints.map((cp,i) => `<tr><td>${esc(i18n.checkpointName(cp,current))}<span class="station-km">${esc(t('result.stationKm',{km:km(cp.distance_m)}))}</span>${cp.cutoff_seconds!==null?`<span class="station-cutoff">${esc(t('result.cutoffBadge',{time:fmt(cp.cutoff_seconds)}))}</span>`:''}</td><td>${i ? km(cp.segment_distance_m) : '—'}</td><td>${i?`${Math.round(cp.ascent_m)} / ${Math.round(cp.descent_m)}`:'—'}</td><td>${Math.round(cp.water_ml)}</td>${p.schedules.map((s) => { const timing = s.checkpoints[i]; const secondary = p.parameters.secondary_display==='arrival_time' ? `(${fmt(timing.arrival_seconds)})` : TrailTime.secondary(p.parameters.secondary_display,p.parameters.start_time,timing,i,p.checkpoints.length-1,current); const clock = TrailTime.clock(p.parameters.start_time,timing.arrival_seconds,current); return `<td class="target-col ${Math.abs(s.target_seconds-target)<1?'chosen':''}"><span class="time-main">${clock}</span>${secondary?`<span class="time-secondary">${secondary}</span>`:''}${cp.rest_seconds>0?`<span class="arrival-line">${esc(t('result.stayLine',{minutes:cp.rest_seconds/60}))}</span><span class="arrival-line">${esc(t('result.leaveLine',{clock:TrailTime.clock(p.parameters.start_time,timing.departure_seconds,current)}))}</span>`:''}${timing.cutoff_status.includes('late')?`<span class="late">${esc(timing.cutoff_status==='arrival_late'?t('result.lateArrival'):t('result.lateDeparture'))}</span>`:''}</td>`; }).join('')}</tr>`).join('')}</tbody>`;
  const diagnostics = route.diagnostics;
  const warnings = [
    t('detail.ascent',{factor:p.parameters.ascent_km_per_100m,fatigue:(p.parameters.fatigue_rate*100).toFixed(1)}),
    t('detail.start',{start:p.parameters.start_time}),
    t('detail.water',{water:p.parameters.water_ml_per_10km}),
    t('detail.spacing',{spacing:Math.round(diagnostics.spacing_max_m)}),
    t('detail.model'),
    t('detail.independent')
  ];
  if (Object.keys(response.confirmed_overrides).length) warnings.unshift(t('detail.confirmed'));
  if (repairs) warnings.push(t('repair.method'));
  $('calculation-detail').innerHTML = `<ul>${warnings.map((s)=>`<li>${esc(s)}</li>`).join('')}</ul>`;
  renderProfile(response); $('results').hidden = false;
}
$('pace-form').addEventListener('submit', async (event) => {
  event.preventDefault(); if (state.generating || state.inspecting) return;
  $('target').value = TrailTime.normalizeDuration($('target').value);
  if (!state.file || !state.text) { setStatus(()=>t('error.noFile'),'error'); $('drop-zone').focus(); return; }
  if (!/^\d{1,4}:[0-5]\d(?::[0-5]\d)?$/.test($('target').value.trim()) || /^0+:00(?::00)?$/.test($('target').value.trim())) { setStatus(()=>t('error.targetFormat'),'error'); $('target').focus(); return; }
  let settings;
  try { settings = options(true); } catch (e) { setStatus(()=>errorText(e),'error'); return; }
  if (settings.targets) { delete settings.target_step_minutes; }
  clearResult(); state.generating = true; busy(); setStatus(()=>t('status.generating'));
  try {
    const response = await api('/api/generate', {gpx:state.text, filename:state.file.name, target:$('target').value.trim(), options:settings});
    response.svg = TrailSVG.render(response.plan, {style: state.style, lang: lang()});
    state.result = response;
    $('file-state').textContent = inspectionState({inspection:response.plan.route});
    renderResult(response);
    setStatus(()=>t('status.generated'),'success');
    $('results').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
  } catch (e) { routeError(e); }
  finally { state.generating = false; busy(); }
});
$('gpx-file').addEventListener('change', (e) => acceptFile(e.target.files[0]));
$('drop-zone').addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (!state.generating) $('gpx-file').click(); } });
for (const event of ['dragenter','dragover']) $('drop-zone').addEventListener(event, (e) => {e.preventDefault();$('drop-zone').classList.add('dragover');});
for (const event of ['dragleave','drop']) $('drop-zone').addEventListener(event, (e) => {e.preventDefault();$('drop-zone').classList.remove('dragover');});
$('drop-zone').addEventListener('drop', (e) => acceptFile(e.dataTransfer.files[0]));
$('track-index').addEventListener('change', () => {clearResult();state.inspection=null;inspectFile();});
$('target').addEventListener('input', (event) => {
  const masked = TrailTime.maskDuration(event.target.value);
  if (masked !== event.target.value) event.target.value = masked;
});
$('target').addEventListener('blur', (event) => {
  event.target.value = TrailTime.normalizeDuration(event.target.value);
});
function targetNote() {
  return $('target-count').value==='one' ? t('form.targetNoteOne') : t('form.targetNoteStep',{minutes:$('target-step').value || '—'});
}
$('pace-form').addEventListener('input', (e) => {if (e.target.id==='gpx-file') return;clearResult(); $('target-note').textContent=targetNote();});
function saveFile(blob, filename) { const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href=url; a.download=filename; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
function save(blob, suffix) { saveFile(blob, `${planName(state.result.plan)}-${t('export.sheetName')}.${suffix}`); }
for (const btn of document.querySelectorAll('[data-export]')) btn.addEventListener('click', async () => {
  if (!state.result) return;
  const format = btn.dataset.export;
  try {
    if (format==='svg') return save(new Blob([state.result.svg],{type:'image/svg+xml;charset=utf-8'}),'svg');
    if (format==='csv') return save(new Blob([state.result.csv],{type:'text/csv;charset=utf-8'}),'csv');
    btn.disabled=true; const original=btn.textContent; btn.textContent=t('wall.exporting');
    try {
      const svg=state.result.svg, width=Number(svg.match(/width="(\d+)"/)[1]), height=Number(svg.match(/height="(\d+)"/)[1]);
      const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
      try {
        const image=new Image(); image.src=url; await image.decode();
        const canvas=document.createElement('canvas'); canvas.width=width*2;canvas.height=height*2;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
        const blob=await new Promise((resolve)=>canvas.toBlob(resolve,'image/png'));
        if (!blob) throw appError('error.exportPng'); save(blob,'png');
      } finally { URL.revokeObjectURL(url); }
    } finally { btn.disabled=false;btn.textContent=original; }
  } catch(e) {setStatus(()=>errorText(e),'error');}
});
$('print').addEventListener('click',()=>window.print());

/* ---- 导出图风格 ---- */
function isDarkColor(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}
function tableTokens(key) {
  const style = TrailSVG.STYLES[key] || TrailSVG.STYLES.paper;
  const dark = isDarkColor(style.paper);
  return {
    '--table-paper': style.paper, '--table-ink': style.ink, '--table-sub': style.sub,
    '--table-rule': dark ? TrailSVG.mix(style.paper, style.ink, .22) : '#23201c22',
    '--table-head': style.head, '--table-name': dark ? style.name : style.ink,
    '--table-late': style.late, '--table-strong': style.name,
    '--table-chosen': TrailSVG.mix(style.paper, style.heat[0], .3),
    '--table-chosen-strong': TrailSVG.mix(style.paper, style.heat[0], .45),
    '--table-foot': TrailSVG.mix(style.paper, style.ink, .05)
  };
}
function applyStyle(key) {
  state.style = TrailSVG.STYLES[key] ? key : 'paper';
  for (const [name, value] of Object.entries(tableTokens(state.style))) document.documentElement.style.setProperty(name, value);
  if ($('table-style').value !== state.style) $('table-style').value = state.style;
  if (!state.result) return;
  state.result.svg = TrailSVG.render(state.result.plan, {style: state.style, lang: lang()});
  renderResult(state.result);
  if (!$('wallpaper-panel').hidden) drawWallpaper();
}
function fillStyleOptions() {
  const select = $('table-style');
  for (const key of Object.keys(TrailSVG.STYLES)) {
    const option = document.createElement('option');
    option.value = key; option.textContent = t(`style.${key}`);
    select.append(option);
  }
}
fillStyleOptions();
$('table-style').addEventListener('change', (event) => applyStyle(event.target.value));
applyStyle('paper');

/* ---- 手机壁纸导出 ---- */
const WALL = TrailWallpaper;
function fillDeviceOptions() {
  const select = $('wallpaper-device');
  const current = select.value || 'iphone-61';
  select.innerHTML = '';
  for (const key of Object.keys(WALL.DEVICES)) {
    const device = WALL.DEVICES[key];
    const option = document.createElement('option');
    option.value = key;
    option.textContent = key === 'custom' ? t('wall.device.custom') : `${t(`wall.device.${key}`)} ${device.width}×${device.height}`;
    select.append(option);
  }
  select.value = current;
}
fillDeviceOptions();
$('wallpaper-device').value = 'iphone-61';
function wallpaperOptions() {
  const device = $('wallpaper-device').value;
  const options = {device, rotation:Number($('wallpaper-rotation').value), top:$('wallpaper-top').value, bottom:$('wallpaper-bottom').value, anchor:Number($('wallpaper-rotation').value)?'top':'center', theme:$('wallpaper-theme').value, lang:lang()};
  if (device === 'custom') { options.width = $('wallpaper-width').value; options.height = $('wallpaper-height').value; }
  return options;
}
function wallpaperError(error) {
  const code = error.code;
  const params = errorParams(error.params);
  return code && i18n.MESSAGES.zh[code] ? t(code, params) : (error.message || t('err.unknown'));
}
function drawWallpaper() {
  if (!state.result) return;
  const options = wallpaperOptions();
  try {
    const layout = WALL.layout(state.result.svg, options);
    $('wallpaper-preview').innerHTML = WALL.render(state.result.svg, options);
    const overlay = $('wallpaper-overlay').checked;
    $('wallpaper-mask').hidden = !overlay;
    $('wallpaper-mask').innerHTML = overlay ? WALL.maskOverlay(layout, lang()) : '';
    $('wallpaper-error').hidden = true;
    $('wallpaper-png').disabled = false; $('wallpaper-svg').disabled = false;
    if (options.device !== 'custom') {
      $('wallpaper-width').value = layout.width; $('wallpaper-height').value = layout.height;
    }
    $('wallpaper-width').disabled = options.device !== 'custom';
    $('wallpaper-height').disabled = options.device !== 'custom';
    const board = options.rotation ? t('wall.boardLandscape') : t('wall.boardPortrait');
    const share = Math.round(layout.image.height / layout.height * 100);
    const other = Math.round(WALL.layout(state.result.svg, {...options, rotation: options.rotation ? 0 : 90}).image.height / layout.height * 100);
    const tip = !options.rotation && share + 10 < other
      ? t('wall.tipRotate',{share,other})
      : t('wall.tipShare',{share});
    $('wallpaper-note').textContent = t('wall.note',{board,width:layout.width,height:layout.height,tip});
  } catch (error) {
    $('wallpaper-error').hidden = false; $('wallpaper-error').textContent = wallpaperError(error);
    $('wallpaper-preview').innerHTML = ''; $('wallpaper-mask').innerHTML = '';
    $('wallpaper-png').disabled = true; $('wallpaper-svg').disabled = true;
  }
}
$('wallpaper-open').addEventListener('click', () => {
  const panel = $('wallpaper-panel');
  panel.hidden = !panel.hidden;
  $('wallpaper-open').setAttribute('aria-expanded', String(!panel.hidden));
  if (!panel.hidden) { drawWallpaper(); panel.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'center'}); }
});
for (const id of ['wallpaper-device','wallpaper-rotation','wallpaper-top','wallpaper-bottom','wallpaper-theme','wallpaper-width','wallpaper-height','wallpaper-overlay']) $(id).addEventListener('input', drawWallpaper);
for (const type of ['wallpaper-png','wallpaper-svg']) $(type).addEventListener('click', async () => {
  if (!state.result) return;
  const btn = $(type), original = btn.textContent;
  const options = wallpaperOptions();
  const result = state.result;
  try {
    btn.disabled = true; btn.textContent = t('wall.exporting');
    const svg = WALL.render(result.svg, options);
    const board = options.rotation ? t('wall.boardLandscape') : t('wall.boardPortrait');
    const suffix = t('wall.fileSuffix',{name:planName(result.plan),device:options.device,board});
    if (type === 'wallpaper-svg') return saveFile(new Blob([svg], {type:'image/svg+xml;charset=utf-8'}), `${suffix}.svg`);
    const layout = WALL.layout(result.svg, options);
    const url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml;charset=utf-8'}));
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = layout.width; canvas.height = layout.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, layout.width, layout.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw appError('error.wallpaperPng');
      saveFile(blob, `${suffix}.png`);
    } finally { URL.revokeObjectURL(url); }
  } catch (error) { $('wallpaper-error').hidden = false; $('wallpaper-error').textContent = wallpaperError(error) || t('error.wallpaperDownload'); }
  finally { btn.disabled = false; btn.textContent = original; }
});

/* ---- 语言切换 ---- */
for (const btn of document.querySelectorAll('[data-lang-button]')) {
  btn.addEventListener('click', () => i18n.setLang(btn.dataset.langButton));
}
i18n.onChange(() => {
  $('generate').setAttribute('aria-label', t('form.generate'));
  busy();
  refreshFileLabels();
  $('target-note').textContent = targetNote();
  if (state.statusRender) $('status').textContent = state.statusRender();
  if (state.inspection) renderCheckpoints(state.inspection, checkpointDraft());
  if (state.result) {
    state.result.svg = TrailSVG.render(state.result.plan, {style: state.style, lang: lang()});
    renderResult(state.result);
    if (!$('wallpaper-panel').hidden) drawWallpaper();
  }
  for (const option of $('table-style').options) option.textContent = t(`style.${option.value}`);
  fillDeviceOptions();
});
i18n.apply(document);
for (const node of document.querySelectorAll('[data-lang-button]')) node.setAttribute('aria-pressed', String(node.dataset.langButton === lang()));
document.documentElement.lang = i18n.htmlLang(lang());
document.title = t('page.title');
