'use strict';
/* Contract: both languages carry the same copy, and every key used in the UI exists. */
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {readFileSync} = require('node:fs');
const {join} = require('node:path');
const i18n = require('../web/i18n.js');
const timing = require('../web/pace-time.js');
const sheet = require('../web/pace-svg.js');
const engine = require('../web/pace-engine.js');
const wallpaper = require('../web/pace-wallpaper.js');

const read = (name) => readFileSync(join(__dirname, '..', 'web', name), 'utf8');
const html = read('index.html');
const sources = ['app.js', 'pace-svg.js', 'pace-wallpaper.js', 'pace-time.js'].map(read).join('\n');

test('中英词典键完全一致，没有只翻译一半的条目', () => {
  const zh = Object.keys(i18n.MESSAGES.zh).sort();
  const en = Object.keys(i18n.MESSAGES.en).sort();
  assert.deepEqual(en, zh);
  for (const key of zh) {
    assert.ok(i18n.MESSAGES.zh[key].length > 0, `zh ${key} 为空`);
    assert.ok(i18n.MESSAGES.en[key].length > 0, `en ${key} 为空`);
  }
});

test('HTML 里每个 data-i18n 键都存在', () => {
  const keys = [...html.matchAll(/data-i18n(?:-html|-aria|-placeholder|-title)?="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(keys.length > 40, `只找到 ${keys.length} 个键`);
  for (const key of keys) assert.ok(i18n.MESSAGES.zh[key], `缺少 ${key}`);
});

test('脚本里直接引用的键都存在', () => {
  const used = new Set([...sources.matchAll(/\bt\('([A-Za-z][\w.]*)'/g)].map((match) => match[1]));
  for (const key of used) {
    assert.ok(i18n.MESSAGES.zh[key], `缺少 ${key}`);
    assert.ok(i18n.MESSAGES.en[key], `缺少英文 ${key}`);
  }
});

test('动态拼出的键覆盖全部风格与机型', () => {
  for (const key of Object.keys(sheet.STYLES)) assert.ok(i18n.MESSAGES.zh[`style.${key}`], key);
  for (const key of Object.keys(wallpaper.DEVICES)) assert.ok(i18n.MESSAGES.zh[`wall.device.${key}`], key);
  for (const key of Object.keys(wallpaper.THEMES)) {
    assert.ok(i18n.MESSAGES.zh[`wall.theme.${key}`], `缺少 wall.theme.${key}`);
    assert.ok(i18n.MESSAGES.en[`wall.theme.${key}`], `缺少英文 wall.theme.${key}`);
  }
});

test('计算引擎的每个错误码都有中英文提示', () => {
  const codes = new Set([...read('pace-engine.js').matchAll(/\bfail\('([a-z_]+)'/g)].map((match) => match[1]));
  const thrown = new Set([...read('pace-engine.js').matchAll(/fail\('([a-z_]+)'/g)].map((match) => match[1]));
  for (const code of thrown) {
    assert.ok(i18n.MESSAGES.zh[`err.${code}`], `缺少 err.${code}`);
    assert.ok(i18n.MESSAGES.en[`err.${code}`], `缺少英文 err.${code}`);
  }
  assert.ok(codes.size > 20, `只找到 ${codes.size} 个错误码`);
  for (const code of ['wall.errRange', 'wall.errPadding', 'wall.errMissing']) {
    assert.ok(i18n.MESSAGES.en[code], code);
  }
});

test('路径与站点名两种语言都正确', () => {
  assert.equal(i18n.t('time.nextDay', null, 'zh'), '次日');
  assert.equal(i18n.t('time.nextDay', null, 'en'), 'Next day');
  assert.equal(i18n.t('status.ready', {km: '55.31', ascent: 1906}, 'en'), 'Route ready: 55.31 km, 1906 m of ascent.');
  assert.equal(i18n.checkpointName({kind: 'start'}, 'zh'), '起点');
  assert.equal(i18n.checkpointName({kind: 'start'}, 'en'), 'Start');
  assert.equal(i18n.checkpointName({kind: 'finish', baseName: '奥体中心'}, 'en'), '奥体中心 (finish)');
  assert.equal(i18n.checkpointName({name: '奥体中心（起点）'}, 'en'), '奥体中心 (start)');
  assert.equal(i18n.checkpointName({name: 'CP1 上凡村'}, 'en'), 'CP1 上凡村', '原始站名不翻译');
  assert.equal(i18n.t('nope.missing'), 'nope.missing', '缺键时回退为键名');
});

test('钟点、跨日与括号标注跟随语言', () => {
  assert.equal(timing.clock('23:30', 43200, 'zh'), '次日 11:30');
  assert.equal(timing.clock('23:30', 43200, 'en'), 'Next day 11:30');
  assert.equal(timing.clock('00:00', 172800, 'en'), '+2 days 00:00');
  const cell = {arrival_seconds: 7200, pace_seconds_per_km: 604};
  assert.equal(timing.secondary('pace', '06:00', cell, 1, 3, 'zh'), '配速 10:04/km');
  assert.equal(timing.secondary('pace', '06:00', cell, 1, 3, 'en'), 'Pace 10:04/km');
  assert.equal(timing.secondary('arrival_time', '06:00', cell, 1, 3, 'en'), 'Arrival 08:00');
  assert.equal(timing.secondary('arrival_time', '06:00', {arrival_seconds: 0}, 0, 3, 'en'), 'Start 06:00');
  assert.equal(timing.secondary('arrival_time', '06:00', cell, 3, 3, 'en'), 'Finish 08:00');
});

test('导出的 SVG 按语言换文案，中文版保持不变', () => {
  const checkpoints = ['Base（起点）', 'CP1 Shangfan', 'Base（终点）'].map((name, index) => ({
    name, kind: index === 0 ? 'start' : index === 2 ? 'finish' : 'checkpoint', baseName: index === 1 ? undefined : 'Base',
    distance_m: index * 25000, segment_distance_m: index ? 25000 : 0, ascent_m: index ? 150 : 0, descent_m: index ? 120 : 0,
    water_ml: index ? 600 : 900, rest_seconds: 0, cutoff_seconds: null, official_distance_km: null,
    profile: [[0, 100], [1, 120]], grade_fractions: [0, 0, 0, 0, 1, 0, 0]
  }));
  const plan = {
    name: 'route',
    parameters: {start_time: '07:00', secondary_display: 'arrival_time', water_ml_per_10km: 700},
    route: {distance_m: 50000, ascent_m: 600, descent_m: 400},
    checkpoints, targets_seconds: [43200],
    schedules: [{target_seconds: 43200, checkpoints: checkpoints.map((cp) => ({
      arrival_seconds: cp.distance_m / 50000 * 43200, departure_seconds: cp.distance_m / 50000 * 43200,
      cutoff_status: 'on_time', pace_seconds_per_km: 600, eq_pace_seconds_per_km: 640
    }))}]
  };
  const zh = sheet.render(plan, {lang: 'zh'});
  const en = sheet.render(plan, {lang: 'en'});
  assert.ok(zh.includes('上行：到站钟点（当地时间）'), '中文导出版本不应改变');
  assert.ok(zh.includes('Base（起点）'));
  assert.ok(en.includes('Top: arrival clock (local time)'));
  assert.ok(en.includes('Bottom: elapsed time'));
  assert.ok(en.includes('Base (start)'));
  assert.ok(en.includes('Station'), '表头应翻译');
  assert.ok(!/[\u4e00-\u9fa5]/.test(en), '英文版不应残留中文文案');
});

test('语言检测顺序：参数 > 浏览器 > 默认中文', () => {
  assert.equal(i18n.detect('?lang=en', {language: 'zh-CN'}), 'en');
  assert.equal(i18n.detect('?fix=1&lang=zh-CN', {language: 'en-US'}), 'zh');
  assert.equal(i18n.detect('', {language: 'zh-TW'}), 'zh');
  assert.equal(i18n.detect('', {language: 'de-DE'}), 'en');
  assert.equal(i18n.detect('', null), 'zh');
  assert.equal(i18n.normalize('EN-gb'), 'en');
  assert.equal(i18n.normalize(''), null);
});

test('切换语言只改当前语言状态，缺省回中文', () => {
  const before = i18n.lang();
  assert.equal(i18n.setLang('en', {persist: false}), 'en');
  assert.equal(i18n.lang(), 'en');
  assert.equal(i18n.t('form.generate'), 'Generate pace sheet');
  assert.equal(i18n.setLang('eo', {persist: false}), 'en', '未知语言回退到英文');
  assert.equal(i18n.setLang('zh', {persist: false}), 'zh');
  assert.equal(i18n.lang(), before);
});

test('英文词典不含中文文案，白名单只允许英文界面隐藏的键与专有名词', () => {
  // brand.tag / advanced.titleAlt 在 html[lang=en] 下被 CSS 隐藏。
  const HIDDEN_IN_EN = new Set(['brand.tag', 'advanced.titleAlt']);
  for (const [key, value] of Object.entries(i18n.MESSAGES.en)) {
    if (HIDDEN_IN_EN.has(key)) continue;
    assert.ok(!/[\u3400-\u9fa5]/.test(value), `英文 ${key} 残留中文：${value}`);
  }
  assert.match(i18n.MESSAGES.en['brand.tag'], /[\u3400-\u9fa5]/);
  assert.match(i18n.MESSAGES.en['advanced.titleAlt'], /[\u3400-\u9fa5]/);
  assert.match(i18n.MESSAGES.en['detail.independent'], /Institute of Endurance Science and Technology \(IEST\)/);
});

test('英文界面隐藏中文副标签，语言按钮显示 ZH', () => {
  const css = read('style.css');
  assert.match(css, /html\[lang="en"\] \.brand-en,html\[lang="en"\] \.summary-cn\{display:none\}/);
  assert.equal(i18n.MESSAGES.en['lang.zh'], 'ZH');
  assert.equal(i18n.MESSAGES.zh['lang.zh'], '中文');
});
