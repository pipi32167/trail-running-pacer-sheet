/* Shared time labels for the web table and SVG/PNG exports. */
'use strict';
(function(root){
  const minutes = seconds => Math.floor(seconds / 60 + 1e-9);
  const pad = value => String(value).padStart(2,'0');
  function elapsed(seconds) {
    const total=minutes(seconds);
    return `${pad(Math.floor(total/60))}:${pad(total%60)}`;
  }
  function clock(startTime,seconds) {
    const [h,m]=startTime.slice(-5).split(':').map(Number);
    const total=h*60+m+minutes(seconds),days=Math.floor(total/1440);
    return `${days===1?'次日 ':days?`+${days}天 `:''}${pad(Math.floor(total%1440/60))}:${pad(total%60)}`;
  }
  function pace(seconds) {
    const total=Math.floor(seconds+.5);
    return `${pad(Math.floor(total/60))}:${pad(total%60)}`;
  }
  function secondary(mode,startTime,timing,index,lastIndex) {
    if(mode==='arrival_time') {
      const label=index===0?'发枪':index===lastIndex?'完赛':'到站';
      return `${label} ${clock(startTime,timing.arrival_seconds)}`;
    }
    if(timing.pace_seconds_per_km==null)return '';
    return `${mode==='equivalent_pace'?'等效配速':'配速'} ${pace(timing.pace_seconds_per_km)}/km`;
  }
  const api={elapsed,clock,pace,secondary};
  if(typeof module!=='undefined')module.exports=api;
  root.TrailTime=api;
})(globalThis);
