'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const sheet=require('../web/pace-svg.js');

function makePlan(){
  const total=55000;
  const names=['起点-奥体中心','CP1上凡村','CP2大雷头村','终点-奥体中心'];
  const checkpoints=names.map((name,i)=>{
    const d=i===names.length-1?total:i*total/(names.length-1);
    return {name,distance_m:d,segment_distance_m:i?d-(i-1)*total/(names.length-1):0,ascent_m:i?150:0,
      descent_m:i?120:0,water_ml:i?600:900,rest_seconds:i===1?300:0,cutoff_seconds:null,
      official_distance_km:null,profile:[[0,100],[1,120]],grade_fractions:[0,0,0,0,1,0,0]};
  });
  const schedules=[43200].map((t)=>({target_seconds:t,checkpoints:checkpoints.map((cp)=>({
    arrival_seconds:t*cp.distance_m/total,departure_seconds:t*cp.distance_m/total+(cp.rest_seconds||0),
    cutoff_status:'on_time',pace_seconds_per_km:600,eq_pace_seconds_per_km:640}))}));
  return {name:'route',parameters:{start_time:'07:00',secondary_display:'arrival_time',water_ml_per_10km:700},
    route:{distance_m:total,ascent_m:600,descent_m:400},checkpoints,targets_seconds:[43200],schedules};
}
const geometry=(svg)=>svg.replace(/ (fill|stroke)="[^"]*"/g,'');

test('四套风格都有中文名与色板', () => {
  const keys=Object.keys(sheet.STYLES);
  assert.deepEqual(keys,['paper','night','ink','map']);
  for (const key of keys) {
    const style=sheet.STYLES[key];
    assert.ok(style.label && style.label.length>1, `${key} 缺少名称`);
    assert.match(style.paper,/^#[0-9a-f]{6}$/);
    assert.equal(style.heat.length,4,`${key} 热力需要四档`);
  }
});

test('换风格不改任何布局：几何标记完全一致', () => {
  const plan=makePlan();
  const base=geometry(sheet.render(plan,{style:'paper'}));
  for (const key of ['night','ink','map']) {
    assert.equal(geometry(sheet.render(plan,{style:key})),base,`${key} 改变了布局`);
  }
  assert.equal(geometry(sheet.render(plan)),base,'默认风格应等同 paper');
});

test('每种风格用各自的底色与主色', () => {
  const plan=makePlan();
  for (const [key,style] of Object.entries(sheet.STYLES)) {
    const out=sheet.render(plan,{style:key});
    assert.ok(out.includes(`height="100%" fill="${style.paper}"`),`${key} 底色不对`);
    assert.ok(out.includes(`fill="${style.ink}"`),`${key} 主文字色不对`);
    const paperOut=sheet.render(plan,{style:'paper'});
    if (key!=='paper') assert.notEqual(out,paperOut,`${key} 与纸张风格没有差别`);
    const colors=new Set([...out.matchAll(/(?:fill|stroke)="#([0-9a-f]{6})"/g)].map((m)=>m[1]));
    assert.ok(colors.size>=6,`${key} 颜色过少: ${colors.size}`);
  }
});

test('未知风格回落到纸张风格', () => {
  const plan=makePlan();
  assert.equal(sheet.render(plan,{style:'nope'}),sheet.render(plan,{style:'paper'}));
});

test('深色风格：格子底色为深底、文字为浅色', () => {
  const out=sheet.render(makePlan(),{style:'night'});
  assert.ok(out.includes('fill="#14120f"'));
  assert.ok(out.includes('fill="#f4efe6"'));
  assert.ok(!out.includes('stroke="#bbbbbb"'),'深色风格不应保留浅色网格线');
});

test('风格切换后百公里表仍不溢出', () => {
  const plan=makePlan();
  const cps=Array.from({length:12},(_,i)=>({...plan.checkpoints[1],name:`CP${i+1} 站点`,distance_m:i*9000,
    segment_distance_m:9000,ascent_m:620,descent_m:520,water_ml:1200,rest_seconds:0,
    profile:[[0,100],[1,150]],grade_fractions:[.1,.2,.3,.4,.3,.2,.1]}));
  const big={...plan,checkpoints:cps,route:{distance_m:100550,ascent_m:6000,descent_m:4000},
    targets_seconds:[57600],schedules:[{target_seconds:57600,checkpoints:cps.map((cp,i)=>({arrival_seconds:57600*i/11,
      departure_seconds:57600*i/11,cutoff_status:'on_time',pace_seconds_per_km:600,eq_pace_seconds_per_km:640}))}]};
  const widths=sheet.columns(big);
  for (const key of Object.keys(sheet.STYLES)) {
    const out=sheet.render(big,{style:key});
    for (const m of out.matchAll(/<text[^>]*x="([\d.]+)"[^>]*text-anchor="middle"[^>]*>([\s\S]*?)<\/text>/g)) {
      const x=Number(m[1]);
      const first=widths.slice(0,8).reduce((a,b)=>a+b,0);
      if (x<first) continue;
      for (const t of m[2].matchAll(/font-size="(\d+)"[^>]*>([^<]*)</g)) {
        assert.ok(sheet.lineWidth(t[2],Number(t[1]))<=widths[8]-8,`${key} 溢出: ${t[2]}`);
      }
    }
  }
});
