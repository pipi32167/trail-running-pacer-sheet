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
  function durationDigits(value) { return String(value==null?'':value).replace(/\D/g,'').slice(0,4); }
  /* Typing only digits: the colon is inserted after the hour so a numeric keypad is enough. */
  /* Typing only digits: the colon is inserted automatically so a numeric keypad is enough. */
  function maskDuration(value) {
    const text=String(value==null?'':value).replace(/[^\d:]/g,'');
    const digits=text.replace(/\D/g,'').slice(0,4);
    if(digits.length<3) return digits;
    const colon=text.indexOf(':');
    /* Three digits are ambiguous: prefer a two-digit hour only when it is a usable hour. */
    const split=colon>0&&colon<digits.length?colon:(digits.length===3?(Number(digits.slice(0,2))<=24?2:1):2);
    return `${digits.slice(0,split)}:${digits.slice(split)}`;
  }
  /* Commit as HH:MM, keeping the hour width the field already shows. */
  function normalizeDuration(value) {
    const text=String(value==null?'':value).trim();
    const parsed=/^(\d{1,4})\s*:\s*(\d{0,2})$/.exec(text);
    if(parsed) return `${parsed[1].padStart(2,'0')}:${parsed[2].padStart(2,'0')}`;
    const digits=text.replace(/\D/g,'').slice(0,4);
    if(!digits) return '';
    const hour=digits.length>2?digits.slice(0,-2):digits,minute=digits.length>2?digits.slice(-2):'';
    return `${hour.padStart(2,'0')}:${minute.padStart(2,'0')}`;
  }
  function secondary(mode,startTime,timing,index,lastIndex) {
    if(mode==='arrival_time') {
      const label=index===0?'发枪':index===lastIndex?'完赛':'到站';
      return `${label} ${clock(startTime,timing.arrival_seconds)}`;
    }
    if(timing.pace_seconds_per_km==null)return '';
    return `${mode==='equivalent_pace'?'等效配速':'配速'} ${pace(timing.pace_seconds_per_km)}/km`;
  }
  const api={elapsed,clock,pace,secondary,maskDuration,normalizeDuration};
  if(typeof module!=='undefined')module.exports=api;
  root.TrailTime=api;
})(globalThis);
