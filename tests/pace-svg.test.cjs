'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const sheet=require('../web/pace-svg.js');

function makePlan({start='07:00', target=43200, secondary='arrival_time', rest=false, count=4, total=55000, ascent=150}={}) {
  const names=count===4?['起点-奥体中心','CP1上凡村','CP2大雷头村','终点-奥体中心']
    :Array.from({length:count},(_,i)=>i===0?'起点-奥体中心':i===count-1?'终点-奥体中心':`CP${i} ${['上凡村','大雷头村','岳鑫村','水桶岙村','龟山道院','白沙岛','东沙村','朱家尖','南沙'][i%9]}`);
  const cps=names.map((name,i)=>{
    const distance=i===names.length-1?total:i*total/(names.length-1);
    return {name, distance_m:distance, segment_distance_m:i?distance-(i-1)*total/(names.length-1):0,
      ascent_m:i?ascent:0, descent_m:i?ascent*0.8:0, water_ml:i?900:1500, rest_seconds:rest&&i===1?300:0,
      cutoff_seconds:null, official_distance_km:null, profile:[[0,100],[1,120]], grade_fractions:[0,0,0,0,1,0,0]};
  });
  const schedules=[target].map((t)=>({target_seconds:t, checkpoints:cps.map((cp,i)=>({
    arrival_seconds: t*cp.distance_m/total, departure_seconds: t*cp.distance_m/total+(cp.rest_seconds||0),
    cutoff_status:'on_time', pace_seconds_per_km:600, eq_pace_seconds_per_km:640}))}));
  return {name:'route', parameters:{start_time:start, secondary_display:secondary, water_ml_per_10km:700},
    route:{distance_m:total, ascent_m:600, descent_m:400}, checkpoints:cps, targets_seconds:[target], schedules};
}
const plain=(out)=>out.replace(/<[^>]*>/g,'');
const cellLines=(out)=>[...out.matchAll(/<text[^>]*text-anchor="middle"[^>]*>([\s\S]*?)<\/text>/g)]
  .map((m)=>({x:Number(/x="([\d.]+)"/.exec(m[0])[1]),lines:[...m[1].matchAll(/<tspan[^>]*font-size="(\d+)"[^>]*>([^<]*)<\/tspan>/g)].map((t)=>({size:Number(t[1]),text:t[2]}))}));

test('主数字为到站钟点，括号为累计耗时', () => {
  const out=sheet.render(makePlan());
  assert.match(plain(out), /07:00\(00:00\)/, '首行为发枪钟点与零耗时');
  assert.match(plain(out), /19:00\(12:00\)/, "末行为完赛钟点与总耗时");
});

test('右上角给出读表解释', () => {
  const out=sheet.render(makePlan());
  assert.ok(out.includes('上行：到站钟点（当地时间）'));
  assert.ok(out.includes('下行：累计耗时'));
  assert.ok(out.includes('第一行') || out.includes('首行'));
  const paced=sheet.render(makePlan({secondary:'pace'}));
  assert.ok(paced.includes('下行：区间配速（分:秒/km）'));
  assert.ok(!paced.includes('下行：累计耗时'));
});

test('跨日时钟另起一行，不溢出列宽', () => {
  const plan=makePlan({start:'23:30'});
  const out=sheet.render(plan);
  const columns=sheet.columns(plan);
  assert.match(plain(out), /次日/);
  for (const cell of cellLines(out)) {
    const start=columns.slice(0,8).reduce((a,b)=>a+b,0);
    if (cell.x<start) continue;
    for (const line of cell.lines) {
      assert.ok(sheet.lineWidth(line.text,line.size)<=columns[8]-8, `跨日列溢出: ${line.text}`);
    }
  }
});

test('有停留的站点补出站时间', () => {
  const out=plain(sheet.render(makePlan({rest:true})));
  assert.ok(out.includes('停留 5 分'));
  assert.ok(out.includes('出站'));
});

test('百公里路线：三位数里程与四位数爬升不溢出', () => {
  const plan=makePlan({count:12, total:100550, ascent:620, target:57600, start:'05:00'});
  const out=sheet.render(plan);
  const columns=sheet.columns(plan);
  assert.equal(columns.length,9);
  for (const cell of cellLines(out)) {
    const column=columns.findIndex((width,index)=>{
      const start=columns.slice(0,index).reduce((a,b)=>a+b,0);
      return cell.x>start && cell.x<start+width;
    });
    if (column<8) continue;
    for (const line of cell.lines) {
      assert.ok(sheet.lineWidth(line.text,line.size)<=columns[column]-8, `百公里列溢出: ${line.text} @${line.size}px`);
    }
  }
  assert.match(plain(out), /100\.55|次日/);
  const rows=(out.match(/data-column="column-0"/g)||[]).length;
  assert.equal(rows,12);
});

test('百公里 12 站加停留，表格高度仍按内容自适应', () => {
  const plan=makePlan({count:12, total:100550, ascent:620, target:57600, start:'05:00', rest:true});
  const out=sheet.render(plan);
  const height=Number(/height="(\d+)"/.exec(out)[1]);
  assert.ok(height>900 && height<3200, `高度异常: ${height}`);
  assert.ok(!/NaN|undefined/.test(out));
});
