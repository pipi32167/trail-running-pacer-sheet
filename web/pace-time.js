/* Shared time labels for the web table and SVG/PNG exports. */
'use strict';
(function(root){
  const i18n = typeof module!=='undefined' ? require('./i18n.js') : root.TrailI18n;
  const minutes = seconds => Math.floor(seconds / 60 + 1e-9);
  const pad = value => String(value).padStart(2,'0');
  function elapsed(seconds) {
    const total=minutes(seconds);
    return `${pad(Math.floor(total/60))}:${pad(total%60)}`;
  }
  function clock(startTime,seconds,lang) {
    const t=i18n.forLang(lang);
    const [h,m]=startTime.slice(-5).split(':').map(Number);
    const total=h*60+m+minutes(seconds),days=Math.floor(total/1440);
    const prefix=days===1?t('time.nextDay'):days?t('time.daysLater',{days}):'';
    return `${prefix?`${prefix} `:''}${pad(Math.floor(total%1440/60))}:${pad(total%60)}`;
  }
  function pace(seconds) {
    const total=Math.floor(seconds+.5);
    return `${pad(Math.floor(total/60))}:${pad(total%60)}`;
  }
  function durationDigits(value) { return String(value==null?'':value).replace(/\D/g,'').slice(0,4); }
  /* Typing only digits: the colon is inserted after the hour so a numeric keypad is enough. */
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
  function secondary(mode,startTime,timing,index,lastIndex,lang) {
    const t=i18n.forLang(lang);
    if(mode==='arrival_time') {
      const label=index===0?t('time.start'):index===lastIndex?t('time.finish'):t('time.arrival');
      return `${label} ${clock(startTime,timing.arrival_seconds,lang)}`;
    }
    if(timing.pace_seconds_per_km==null)return '';
    return `${mode==='equivalent_pace'?t('time.eqPace'):t('time.pace')} ${pace(timing.pace_seconds_per_km)}/km`;
  }
  const api={elapsed,clock,pace,secondary,maskDuration,normalizeDuration};
  if(typeof module!=='undefined')module.exports=api;
  root.TrailTime=api;
})(globalThis);
