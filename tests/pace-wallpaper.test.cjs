'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const wallpaper=require('../web/pace-wallpaper.js');
const source='<svg xmlns="http://www.w3.org/2000/svg" width="2062" height="1150" viewBox="0 0 2062 1150"><rect width="2062" height="1150" fill="white"/><text x="10" y="30">原版 &amp; 全部五档</text></svg>';
test('保留原版图形和全部方案，不重新绘制表格',()=>{
 const svg=wallpaper.render(source);
 assert.ok(svg.includes(source));
 assert.ok(!svg.includes('data-station='));
 assert.match(svg,/width="1179" height="2556"/);
});
test('等比旋转并完整放入留白区，所有机型无裁切',()=>{
 for(const device of Object.keys(wallpaper.DEVICES)){
  const l=wallpaper.layout(source,{device});
  assert.equal(l.source.width,2062); assert.equal(l.source.height,1150);
  assert.ok(l.image.x>=l.band.left-0.001);
  assert.ok(l.image.y>=l.band.top-0.001);
  assert.ok(l.image.x+l.image.width<=l.band.right+0.001);
  assert.ok(l.image.y+l.image.height<=l.band.bottom+0.001);
  assert.ok(Math.abs(l.image.width/l.image.height-1150/2062)<1e-10);
  assert.ok(l.band.top>=l.height*.26);
  assert.ok(l.band.bottom<=l.height*.96);
 }
});
test('自定义尺寸与留白有效，横版原图也能保留方向',()=>{
 const l=wallpaper.layout(source,{device:'custom',width:1080,height:2400,top:40,bottom:20,rotation:0});
 assert.equal(l.width,1080); assert.equal(l.band.top,960); assert.equal(l.band.bottom,1920);
 assert.equal(l.rotation,0); assert.ok(Math.abs(l.image.width/l.image.height-2062/1150)<1e-10);
 assert.match(wallpaper.render(source,{rotation:0}),/rotate\(0\)/);
});
test('非法留白与尺寸返回明确错误，不静默缩放',()=>{
 for(const options of [{device:'custom',width:0,height:2400},{top:90,bottom:20},{top:''}]){
  assert.throws(()=>wallpaper.layout(source,options));
 }
 assert.throws(()=>wallpaper.render(''));
});
test('不支持的机型回落到默认值，锁屏叠层不进入下载',()=>{
 const l=wallpaper.layout(source,{device:'unknown'});
 assert.equal(l.width,1179);
 assert.ok(wallpaper.maskOverlay(l).includes('09:24'));
 assert.ok(!wallpaper.render(source).includes('09:24'));
});
test('背景只影响留白，原图白底与图形保持原样',()=>{
 assert.ok(wallpaper.render(source,{theme:'light'}).includes(source));
 assert.ok(wallpaper.render(source,{theme:'dark'}).includes(source));
});
