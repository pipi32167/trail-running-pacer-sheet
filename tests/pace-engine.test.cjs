'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {createHash} = require('node:crypto');
const path = require('node:path');
const engine = require('../web/pace-engine.js');
const fixtures = JSON.parse(execFileSync('python3',[path.join(__dirname,'export_parity.py')],{maxBuffer:40*1024*1024,encoding:'utf8'}));
const plain=(svg)=>svg.replace(/<[^>]*>/g,'');
function close(a,b,label) { assert.ok(Number.isFinite(a)&&Math.abs(a-b)<1e-5, `${label}: ${a} != ${b}`); }
for (const f of fixtures) test(f.name, () => {
  const data={...f.data, document:f.document, sha256:createHash('sha256').update(f.data.gpx).digest('hex')};
  if(f.error) return assert.throws(()=>engine.process(data,true));
  const r=engine.process(data,true), e=f.expected;
  assert.deepEqual(r.repair,e.repair);
  for(const k of ['distance_m','ascent_m','descent_m','eq_distance_km']) close(r.plan.route[k],e.plan.route[k],k);
  assert.equal(r.plan.checkpoints.length,e.plan.checkpoints.length);
  r.plan.checkpoints.forEach((cp,i)=>{
    const expected=e.plan.checkpoints[i];
    assert.equal(cp.id,expected.id); assert.equal(cp.name,expected.name);
    for(const k of ['distance_m','ascent_m','descent_m','segment_distance_m','eq_distance_km','water_ml','rest_seconds']) close(cp[k],expected[k],`CP ${i} ${k}`);
  });
  assert.deepEqual(r.plan.targets_seconds,e.plan.targets_seconds);
  r.plan.schedules.forEach((s,i)=>s.checkpoints.forEach((t,j)=>{
    const expected=e.plan.schedules[i].checkpoints[j];
    for(const k of ['arrival_seconds','departure_seconds','moving_seconds','pace_seconds_per_km']) {
      if(expected[k]===null) assert.equal(t[k],null); else close(t[k],expected[k],`schedule ${i}/${j} ${k}`);
    }
    assert.equal(t.cutoff_status,expected.cutoff_status);
  }));
  assert.deepEqual(r.verification,e.verification);
  assert.equal(r.profile.length,e.profile.length);
  r.profile.forEach((p,i)=>p.forEach((v,j)=>close(v,e.profile[i][j],`profile ${i}/${j}`)));
  assert.match(r.svg, /^<svg/); assert.ok(!r.svg.includes('<script>'));
  assert.match(r.csv,/checkpoint_id/);
  assert.equal(r.plan.parameters.start_time,e.plan.parameters.start_time);
  if (f.name === 'overnight arrival') assert.match(plain(r.svg),/次日\s*02:30/);
  if (f.name === 'midnight start') assert.match(plain(r.svg),/00:00\(00:00\)/);
});
