'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const timing=require('../web/pace-time.js');

test('arrival clock includes race start and next-day rollover',()=>{
 assert.equal(timing.clock('06:00',43200),'18:00');
 assert.equal(timing.clock('23:30',43200),'次日 11:30');
 assert.equal(timing.clock('00:00',172800),'+2天 00:00');
});
test('clock and elapsed use the same minute boundary',()=>{
 assert.equal(timing.clock('06:00',3600-1e-8),'07:00');
 assert.equal(timing.elapsed(3600-1e-8),'01:00');
});
test('bracket text explicitly distinguishes pace and wall clock',()=>{
 const t={arrival_seconds:7200,pace_seconds_per_km:604};
 assert.equal(timing.secondary('pace','06:00',t,1,3),'配速 10:04/km');
 assert.equal(timing.secondary('equivalent_pace','06:00',t,1,3),'等效配速 10:04/km');
 assert.equal(timing.secondary('arrival_time','06:00',t,1,3),'到站 08:00');
 assert.equal(timing.secondary('arrival_time','06:00',t,3,3),'完赛 08:00');
 assert.equal(timing.secondary('arrival_time','06:00',{arrival_seconds:0},0,3),'发枪 06:00');
});
test('station rest does not shift the arrival clock to departure',()=>{
 const t={arrival_seconds:7200,departure_seconds:7500,pace_seconds_per_km:600};
 assert.equal(timing.secondary('arrival_time','06:00',t,1,3),'到站 08:00');
 assert.equal(timing.elapsed(t.departure_seconds),'02:05');
 assert.equal(timing.elapsed(t.arrival_seconds),'02:00');
});

test('完赛时间只按数字输入，冒号自动补，不依赖键盘冒号键',()=>{
 const t=require('../web/pace-time.js');
 assert.equal(t.maskDuration('1200'),'12:00');
 assert.equal(t.maskDuration('12'),'12');
 assert.equal(t.maskDuration('130'),'13:0');
 assert.equal(t.maskDuration('845'),'8:45');
 assert.equal(t.maskDuration('12:00'),'12:00');
 assert.equal(t.maskDuration(''),'');
 assert.equal(t.maskDuration('ab1cd2'),'12');
 assert.equal(t.maskDuration('123456'),'12:34');
 assert.equal(t.maskDuration('3000'),'30:00');
 assert.equal(t.maskDuration('120'),'12:0');
 assert.equal(t.maskDuration('845'),'8:45');
 assert.equal(t.maskDuration('12:0'),'12:0');
});
test('失焦补零成 HH:MM，非法输入返回空串',()=>{
 const t=require('../web/pace-time.js');
 assert.equal(t.normalizeDuration('9'),'09:00');
 assert.equal(t.normalizeDuration('845'),'08:45');
 assert.equal(t.normalizeDuration('123'),'01:23');
 assert.equal(t.normalizeDuration('1230'),'12:30');
 assert.equal(t.normalizeDuration('3000'),'30:00');
 assert.equal(t.normalizeDuration('12:00'),'12:00');
 assert.equal(t.normalizeDuration(''),'');
 assert.equal(t.normalizeDuration('abc'),'');
});
