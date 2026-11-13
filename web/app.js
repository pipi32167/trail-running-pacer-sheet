'use strict';
const documentURL = document.currentScript.src;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('./service-worker.js?v=frontend-v20',documentURL)).then(()=>navigator.serviceWorker.ready).then(()=>{
    $('privacy-note').textContent='GPX 仅在浏览器内处理。页面已缓存，断网也能计算。';
  }).catch(()=>{});
}
const $ = (id) => document.getElementById(id);
const state = {file: null, text: '', inspection: null, result: null, inspecting: false, generating: false, version: 0, controller: null};
const MAX_SIZE = 12 * 1024 * 1024;
const fmt = TrailTime.elapsed;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const km = (m) => (m / 1000).toFixed(2);
function status(message, type = '') { $('status').hidden = !message; $('status').textContent = message; $('status').className = `status ${type}`; }
function busy() {
  const isBusy = state.inspecting || state.generating;
  $('generate').disabled = isBusy;
  $('generate').innerHTML = state.generating ? '正在计算山路节奏…' : state.inspecting ? '正在读取路线…' : '生成配速表 <span aria-hidden="true">↗</span>';
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
function clearResult() { if (state.result) status('设置已修改，点击“生成配速表”更新结果。'); state.result = null; $('results').hidden = true; $('wallpaper-panel').hidden = true; $('wallpaper-open').setAttribute('aria-expanded','false'); }
function numeric(id) { const input = $(id); const v = input.value.trim(); if (!v || !input.checkValidity() || !Number.isFinite(Number(v))) throw new Error(`请检查“${input.closest('label').firstChild.textContent.trim()}”的数值。`); return Number(v); }
function options(includeCP = false) {
  const startTime = $('start-time').value;
  if (includeCP && !/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
    $('start-time').focus();
    throw new Error('填写发枪时间后再生成，例如 06:00。使用比赛当地时间。');
  }
  const o = {ascent_smoothing_m: numeric('ascent-window'), ascent_threshold_m: numeric('ascent-threshold'), ascent_km_per_100m: numeric('ascent-factor'), fatigue_rate: numeric('fatigue') / 100, target_step_minutes: numeric('target-step'), secondary_display: $('secondary-display').value};
  if (startTime) o.start_time = startTime;
  if (!$('track-panel').hidden && $('track-index').value) o.track_index = Number($('track-index').value);
  if ($('target-count').value === 'one') o.targets = [$('target').value.trim()];
  if (!includeCP || !state.inspection) return o;
  const rows = [...document.querySelectorAll('.cp-row')];
  if (rows.length) {
    const selected = rows.filter((r) => r.querySelector('.cp-include').checked);
    if (!selected.length) throw new Error('请至少选择一个路线站点。');
    o.cp_selection = selected.map((r) => r.dataset.id);
    o.checkpoint_overrides = {};
    for (const row of selected) {
      const fields = {};
      const position = row.querySelector('.cp-position');
      if (position) {
        if (!position.value) { $('advanced').open = true; position.focus(); throw new Error(`请选择 ${row.dataset.name} 的经过位置。`); }
        fields.distance_km = Number(position.value);
      }
      const allow = row.querySelector('.cp-off-route');
      if (allow) { if (!allow.checked) { $('advanced').open = true; allow.focus(); throw new Error(`请确认 ${row.dataset.name} 的偏离位置，或取消该站点。`); } fields.allow_off_route = true; }
      const rest = row.querySelector('.cp-rest');
      if (rest.value === '' || !rest.checkValidity()) throw new Error(`请检查 ${row.dataset.name} 的停留时间。`);
      fields.rest_minutes = Number(rest.value);
      const cutoff = row.querySelector('.cp-cutoff').value.trim();
      if (cutoff) { if (!/^\d{1,4}:[0-5]\d$/.test(cutoff)) throw new Error(`${row.dataset.name} 关门时间应使用 H:MM 格式。`); fields.cutoff = cutoff; }
      o.checkpoint_overrides[row.dataset.id] = fields;
    }
  } else if (!$('manual-panel').hidden && $('manual-cps').value.trim()) {
    const total = state.inspection.inspection.distance_m / 1000;
    o.checkpoints = $('manual-cps').value.trim().split('\n').filter((s) => s.trim()).map((line, i) => {
      const [name, distance, rest = '0', cutoff = ''] = line.split(/[,，]/).map((s) => s.trim());
      if (!name || !distance || !Number.isFinite(Number(distance)) || Number(distance) <= 0 || Number(distance) >= total) throw new Error(`手动站点第 ${i + 1} 行：名称和累计里程无效，里程应位于起终点之间。`);
      if (!rest || !Number.isFinite(Number(rest)) || Number(rest) < 0) throw new Error(`手动站点第 ${i + 1} 行：停留分钟无效。`);
      const cp = {name, distance_km: Number(distance), rest_minutes: Number(rest)};
      if (cutoff) cp.cutoff = cutoff;
      return cp;
    });
    o.checkpoints.push({name: '终点', distance_km: total});
  }
  return o;
}
function parseDocument(text) {
  if (!text.trim()) throw new Error('请选择一个 GPX 文件。');
  if (/<!\s*(?:DOCTYPE|ENTITY)/i.test(text)) throw new Error('不支持包含 DTD 或实体声明的 GPX。');
  const xml = new DOMParser().parseFromString(text, 'application/xml');
  if (xml.getElementsByTagName('parsererror').length || xml.documentElement.localName !== 'gpx') throw new Error('文件不是有效的 GPX XML，请重新导出路线。');
  let points = 0;
  // Only GPX fields used by the calculator cross the worker boundary.
  const tags = new Set(['gpx','trk','trkseg','trkpt','rte','rtept','wpt','name','type','ele']);
  function convert(node) {
    if (['trkpt','rtept'].includes(node.localName) && ++points > 200000) throw new Error('轨迹超过 200000 个点，请先精简文件。');
    return {tag:node.localName, attrs:Object.fromEntries(['lat','lon'].filter(k=>node.hasAttribute(k)).map(k=>[k,node.getAttribute(k)])), text:['name','type','ele'].includes(node.localName)?node.textContent.trim():'', children:[...node.children].filter(n=>tags.has(n.localName)).map(convert)};
  }
  return convert(xml.documentElement);
}
async function api(path, body, signal) {
  if (signal?.aborted) {const e=new Error('已取消旧路线的读取。');e.cancelled=true;throw e;}
  const document = parseDocument(body.gpx);
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.gpx));
  const sha256 = [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
  return new Promise((resolve,reject)=>{
    if(signal?.aborted) {const e=new Error('已取消旧路线的读取。');e.cancelled=true;reject(e);return;}
    const worker = new Worker(new URL('./pace-worker.js?v=frontend-v20',documentURL));
    const cleanup=()=>{clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();};
    const abort=()=>{cleanup();const e=new Error('已取消旧路线的读取。');e.cancelled=true;reject(e);};
    const timer=setTimeout(()=>{cleanup();reject(new Error('处理超时，请精简 GPX 后重试，已选路线会保留。'));},45000);
    signal?.addEventListener('abort',abort,{once:true});
    worker.onmessage=({data})=>{cleanup();if(data.error){const e=new Error(data.error.message);e.data=data.error;reject(e);}else resolve(data.result);};
    worker.onerror=()=>{cleanup();reject(new Error('浏览器计算模块未能启动，请刷新页面后重试。'));};
    worker.postMessage({generate:path==='/api/generate',body:{document,sha256,filename:body.filename,target:body.target,options:body.options}});
  });
}
function routeError(error) {
  const d = error.data;
  if (d?.code === 'select_track') {
    $('advanced').open = true;
    $('track-panel').hidden = false;
    $('track-index').innerHTML = '<option value="">请选择路线</option>' + d.details.map((t) => `<option value="${t.track_index}">${esc(t.name)}</option>`).join('');
    $('track-index').focus();
  }
  status(error.message, 'error');
}
async function inspectFile() {
  if (!state.text) return;
  const version = ++state.version;
  state.controller?.abort();
  state.controller = new AbortController();
  state.inspecting = true; busy(); status('正在读取路线、修复缺失高程并识别站点…');
  try {
    const response = await api('/api/inspect', {gpx:state.text, filename:state.file.name, options:options()}, state.controller.signal);
    if (version !== state.version) return;
    state.inspection = response;
    renderCheckpoints(response);
    const r = response.inspection;
    $('file-state').hidden = false;
    $('file-state').textContent = `${km(r.distance_m)} km · 爬升 ${Math.round(r.ascent_m)} m`;
    const count = response.repair.repaired_count;
    let message = `路线已就绪：${km(r.distance_m)} km，爬升 ${Math.round(r.ascent_m)} m。`;
    if (count) message += ` 已自动补齐 ${count} 个缺失高程点。`;
    if (response.confirmed_overrides['wpt:5']) message += ' 已沿用这条路线的 CP10 第一次经过位置。';
    status(message, 'success');
  } catch (e) { if (version === state.version && !e.cancelled) routeError(e); }
  finally { if (version === state.version) {state.inspecting = false; busy();} }
}
async function acceptFile(file) {
  if (state.generating) return;
  ++state.version; state.controller?.abort(); state.inspecting = false;
  state.file = null; state.text = ''; state.inspection = null; clearResult();
  $('track-panel').hidden = true; $('track-index').innerHTML = ''; $('checkpoint-panel').hidden = true; $('manual-panel').hidden = true; $('manual-cps').value = '';
  $('file-state').hidden = true; $('drop-zone').classList.remove('has-file');
  $('file-title').textContent = '拖入 GPX 路线文件'; $('file-hint').textContent = '或点击选择 · GPX 格式，最大 12 MB'; busy();
  if (!file) return;
  if (!/\.gpx$/i.test(file.name)) return status('请选择 .gpx 格式的路线文件。', 'error');
  if (file.size > MAX_SIZE) return status('GPX 文件不能超过 12 MB。', 'error');
  if (!file.size) return status('GPX 文件为空，请重新选择。', 'error');
  state.file = file;
  $('file-title').textContent = file.name;
  $('file-hint').textContent = `${file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(0)} KB`} · 点击可更换路线`;
  $('drop-zone').classList.add('has-file');
  const version = state.version;
  try { const text = await file.text(); if (version !== state.version) return; state.text = text; await inspectFile(); }
  catch (e) { if (version === state.version) status(e.message || '文件读取失败，请重新选择。', 'error'); }
}
function renderCheckpoints(response) {
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
    const position = hasMultiple ? `<label>经过位置<select class="cp-position" aria-label="${esc(cp.name)}经过位置"><option value="">请选择经过位置</option>${opts.map((p, i) => `<option value="${p.distance_m/1000}" ${override && Math.abs(override.distance_km*1000-p.distance_m)<.1 ? 'selected' : ''}>第 ${i+1} 次 · ${km(p.distance_m)} km</option>`).join('')}</select></label>` : `<span class="cp-position-note">${combined ? '共用起终点' : `${km(opts[0]?.distance_m ?? 0)} km`}</span>${offRoute ? `<label><input type="checkbox" class="cp-off-route"> 确认偏离 ${Math.round(opts[0].offset_m)} m</label>` : ''}`;
    return `<div class="cp-row ${(hasMultiple && !override) || offRoute ? 'needs-choice' : ''}" data-id="${esc(cp.id)}" data-name="${esc(cp.name)}"><label class="cp-name"><input class="cp-include" type="checkbox" ${cp.recognized ? 'checked' : ''} aria-label="选择${esc(cp.name)}">${esc(cp.name)}</label><div>${position}</div><label>停留 / 分钟<input class="cp-rest" type="number" min="0" max="10000" value="0" ${endpoint ? 'disabled' : ''} aria-label="${esc(cp.name)}停留分钟"></label><label>关门 / H:MM<input class="cp-cutoff" type="text" maxlength="9" placeholder="未设置" aria-label="${esc(cp.name)}关门用时"></label></div>`;
  }).join('');
  if (ambiguous.length) $('advanced').open = true;
  $('cp-hint').textContent = ambiguous.length ? `${ambiguous.join('、')} 存在位置歧义，需要选择后再生成。` : '已识别路线内站点。默认不停站，原始名称与编号保留。';
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
  const p = response.plan, route = p.route, central = $('target').value.trim().split(':').map(Number); const target = central[0]*3600+central[1]*60+(central[2]||0);
  $('result-title').textContent = p.name;
  $('route-stats').innerHTML = [['路线距离',(route.distance_m/1000).toFixed(2),'km'],['累计爬升',Math.round(route.ascent_m),'m'],['累计下降',Math.round(route.descent_m),'m'],['等效距离',route.eq_distance_km.toFixed(2),'km']].map(([label,value,unit]) => `<div class="stat"><span class="stat-label">${label}</span><span class="stat-value">${value}<small>${unit}</small></span></div>`).join('');
  const label = {pace:'区间配速（分:秒/km）',equivalent_pace:'区间等效配速（分:秒/km）',arrival_time:'累计耗时'}[p.parameters.secondary_display];
  $('table-legend').textContent = `发枪 ${p.parameters.start_time} · 主数字：到站钟点（当地时间） · 括号：${label}`;
  $('pace-table').classList.add('clock-display');
  $('result-notes').innerHTML = `<p><strong>高程处理：</strong>${p.parameters.ascent_smoothing_m} m 窗口平滑 + ${p.parameters.ascent_threshold_m} m 峰谷反转阈值。${response.repair.repaired_count ? `已补齐 ${response.repair.repaired_count} 个缺失高程点，爬升为估计值。` : '高程未发现缺失。'}</p><p><strong>停站：</strong>共 ${Math.round(p.parameters.rest_total_seconds/60)} 分钟，已包含在完赛时间中。<strong>关门：</strong>${response.verification.cutoff_unchecked_stations ? `${response.verification.cutoff_unchecked_stations} 个站点未提供关门时间。` : '已按所填时间校核。'} 水量按等效距离比较，非个人饮水建议。</p><p><strong>读表：</strong>主数字为到站钟点（当地时间），括号内为累计耗时。首行为发枪时间，末行为完赛钟点。有停留的站点另列出站钟点。</p>`;
  $('pace-table').innerHTML = `<thead><tr><th scope="col">站点 / 累计里程</th><th scope="col">分段距离<br>km</th><th scope="col">爬升 / 下降<br>m</th><th scope="col">下一段水量<br>ml · 比较值</th>${p.targets_seconds.map((t) => `<th scope="col" class="target-col ${Math.abs(t-target)<1?'chosen':''}">${Math.abs(t-target)<1?'目标方案':'参考方案'}<span class="target-label">${fmt(t)}</span></th>`).join('')}</tr></thead><tbody>${p.checkpoints.map((cp,i) => `<tr><td>${esc(cp.name)}<span class="station-km">${km(cp.distance_m)} km</span>${cp.cutoff_seconds!==null?`<span class="station-cutoff">关门 ${fmt(cp.cutoff_seconds)}</span>`:''}</td><td>${i ? km(cp.segment_distance_m) : '—'}</td><td>${i?`${Math.round(cp.ascent_m)} / ${Math.round(cp.descent_m)}`:'—'}</td><td>${Math.round(cp.water_ml)}</td>${p.schedules.map((s) => { const t = s.checkpoints[i]; const secondary = p.parameters.secondary_display==='arrival_time' ? `(${fmt(t.arrival_seconds)})` : TrailTime.secondary(p.parameters.secondary_display,p.parameters.start_time,t,i,p.checkpoints.length-1); const clock = TrailTime.clock(p.parameters.start_time,t.arrival_seconds); return `<td class="target-col ${Math.abs(s.target_seconds-target)<1?'chosen':''}"><span class="time-main">${clock}</span>${secondary?`<span class="time-secondary">${secondary}</span>`:''}${cp.rest_seconds>0?`<span class="arrival-line">停留 ${cp.rest_seconds/60} 分</span><span class="arrival-line">出站 ${TrailTime.clock(p.parameters.start_time,t.departure_seconds)}</span>`:''}${t.cutoff_status.includes('late')?`<span class="late">${t.cutoff_status==='arrival_late'?'到站超时':'出站超时'}</span>`:''}</td>`; }).join('')}</tr>`).join('')}</tbody>`;
  const diagnostics = route.diagnostics;
  const warnings = [
    `爬升系数：每爬升 100 m 增加 ${p.parameters.ascent_km_per_100m} 等效 km；距离翻倍的平均配速增幅：${(p.parameters.fatigue_rate*100).toFixed(1)}%。`,
    `发枪时间：${p.parameters.start_time}。时间为从发枪开始的累计用时；目标时间包含已配置停站。`,
    `水量采用 ${p.parameters.water_ml_per_10km} ml / 10 等效 km，仅用于比较下一段负担。`,
    `水平路线保留原始路径，未缩放至文件名里程。最大原始点间距 ${Math.round(diagnostics.spacing_max_m)} m。`,
    '模型未计入技术路面、陡下坡额外负担、天气、拥堵与个人肌力差异。目标完赛时间不代表能力评估。',
    '基于耐力学社体感一致配速思路的独立实现，并非 RunArt.Net 官方输出。'
  ];
  if (Object.keys(response.confirmed_overrides).length) warnings.unshift('这条路线沿用已确认的 CP10 第一次经过位置；如需更改，可在高级选项中选择。');
  if (response.repair.repaired_count) warnings.push(response.repair.method);
  $('calculation-detail').innerHTML = `<ul>${warnings.map((s)=>`<li>${esc(s)}</li>`).join('')}</ul>`;
  renderProfile(response); $('results').hidden = false;
}
$('pace-form').addEventListener('submit', async (event) => {
  event.preventDefault(); if (state.generating || state.inspecting) return;
  if (!state.file || !state.text) { status('先选择你的 GPX 路线文件。','error'); $('drop-zone').focus(); return; }
  if (!/^\d{1,4}:[0-5]\d(?::[0-5]\d)?$/.test($('target').value.trim()) || /^0+:00(?::00)?$/.test($('target').value.trim())) { status('完赛时间使用 H:MM 格式，例如 12:00。时间必须大于 0。','error'); $('target').focus(); return; }
  let settings;
  try { settings = options(true); } catch (e) { status(e.message,'error'); return; }
  if (settings.targets) { delete settings.target_step_minutes; }
  clearResult(); state.generating = true; busy(); status('正在按路线起伏分配时间…');
  try {
    const response = await api('/api/generate', {gpx:state.text, filename:state.file.name, target:$('target').value.trim(), options:settings});
    state.result = response;
    $('file-state').textContent = `${km(response.plan.route.distance_m)} km · 爬升 ${Math.round(response.plan.route.ascent_m)} m`;
    renderResult(response);
    status(`配速表已生成，${response.plan.targets_seconds.length === 1 ? '目标' : '五档'}时间与停站计算已核对。`,'success');
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
$('pace-form').addEventListener('input', (e) => {if (e.target.id==='gpx-file') return;clearResult(); if ($('target-count').value==='one') $('target-note').textContent='仅生成目标方案'; else $('target-note').textContent=`五档参考方案 · 相邻间隔 ${$('target-step').value || '—'} 分钟`;});
function saveFile(blob, filename) { const a = document.createElement('a'), url = URL.createObjectURL(blob); a.href=url; a.download=filename; document.body.append(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),1000); }
function save(blob, suffix) { saveFile(blob, `${state.result.plan.name}-配速表.${suffix}`); }
for (const btn of document.querySelectorAll('[data-export]')) btn.addEventListener('click', async () => {
  if (!state.result) return;
  const format = btn.dataset.export;
  try {
    if (format==='svg') return save(new Blob([state.result.svg],{type:'image/svg+xml;charset=utf-8'}),'svg');
    if (format==='csv') return save(new Blob([state.result.csv],{type:'text/csv;charset=utf-8'}),'csv');
    btn.disabled=true; const original=btn.textContent; btn.textContent='导出中…';
    try {
      const svg=state.result.svg, width=Number(svg.match(/width="(\d+)"/)[1]), height=Number(svg.match(/height="(\d+)"/)[1]);
      const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
      try {
        const image=new Image(); image.src=url; await image.decode();
        const canvas=document.createElement('canvas'); canvas.width=width*2;canvas.height=height*2;
        const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0,canvas.width,canvas.height);
        const blob=await new Promise((resolve)=>canvas.toBlob(resolve,'image/png'));
        if (!blob) throw new Error('PNG 导出未完成，请使用 SVG 下载。'); save(blob,'png');
      } finally { URL.revokeObjectURL(url); }
    } finally { btn.disabled=false;btn.textContent=original; }
  } catch(e) {status(e.message || '下载未完成，请重试。','error');}
});
$('print').addEventListener('click',()=>window.print());

/* ---- 手机壁纸导出 ---- */
const WALL = TrailWallpaper;
for (const [key, device] of Object.entries(WALL.DEVICES)) {
  const option = document.createElement('option');
  option.value = key; option.textContent = key === 'custom' ? device.label : `${device.label} ${device.width}×${device.height}`;
  $('wallpaper-device').append(option);
}
$('wallpaper-device').value = 'iphone-61';
function wallpaperOptions() {
  const device = $('wallpaper-device').value;
  const options = {device, rotation:Number($('wallpaper-rotation').value), top:$('wallpaper-top').value, bottom:$('wallpaper-bottom').value, anchor:Number($('wallpaper-rotation').value)?'top':'center', theme:$('wallpaper-theme').value};
  if (device === 'custom') { options.width = $('wallpaper-width').value; options.height = $('wallpaper-height').value; }
  return options;
}
function drawWallpaper() {
  if (!state.result) return;
  const options = wallpaperOptions();
  try {
    const layout = WALL.layout(state.result.svg, options);
    $('wallpaper-preview').innerHTML = WALL.render(state.result.svg, options);
    const overlay = $('wallpaper-overlay').checked;
    $('wallpaper-mask').hidden = !overlay;
    $('wallpaper-mask').innerHTML = overlay ? WALL.maskOverlay(layout) : '';
    $('wallpaper-error').hidden = true;
    $('wallpaper-png').disabled = false; $('wallpaper-svg').disabled = false;
    if (options.device !== 'custom') {
      $('wallpaper-width').value = layout.width; $('wallpaper-height').value = layout.height;
    }
    $('wallpaper-width').disabled = options.device !== 'custom';
    $('wallpaper-height').disabled = options.device !== 'custom';
    const board = options.rotation ? '横版' : '竖版';
    const share = Math.round(layout.image.height / layout.height * 100);
    const other = Math.round(WALL.layout(state.result.svg, {...options, rotation: options.rotation ? 0 : 90}).image.height / layout.height * 100);
    const tip = !options.rotation && share + 10 < other
      ? `竖版受屏宽限制，表格只占屏高 ${share}%；切横版可占 ${other}%。`
      : `表格占屏高 ${share}%。`;
    $('wallpaper-note').textContent = `${board} · ${layout.width} × ${layout.height} px。${tip}保留原表全部内容，预览叠层不会导出。展开的通知仍可能遮挡表格；可收起通知或增加底部留白。`;
  } catch (error) {
    $('wallpaper-error').hidden = false; $('wallpaper-error').textContent = error.message;
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
    btn.disabled = true; btn.textContent = '导出中…';
    const svg = WALL.render(result.svg, options);
    const suffix = `${options.device}-${options.rotation ? '横版' : '竖版'}`;
    if (type === 'wallpaper-svg') return saveFile(new Blob([svg], {type:'image/svg+xml;charset=utf-8'}), `${result.plan.name}-壁纸-${suffix}.svg`);
    const layout = WALL.layout(result.svg, options);
    const url = URL.createObjectURL(new Blob([svg], {type:'image/svg+xml;charset=utf-8'}));
    try {
      const image = new Image(); image.src = url; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = layout.width; canvas.height = layout.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, layout.width, layout.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('PNG 导出未完成，请改用 SVG 下载。');
      saveFile(blob, `${result.plan.name}-壁纸-${suffix}.png`);
    } finally { URL.revokeObjectURL(url); }
  } catch (error) { $('wallpaper-error').hidden = false; $('wallpaper-error').textContent = error.message || '壁纸下载未完成，请重试。'; }
  finally { btn.disabled = false; btn.textContent = original; }
});
