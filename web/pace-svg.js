'use strict';
/* SVG export follows the existing Python renderer, including terrain graphics. */
(function(root){
const i18n=typeof module!=='undefined'?require('./i18n.js'):root.TrailI18n;
const timing=typeof module!=='undefined'?require('./pace-time.js'):root.TrailTime;
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Column widths: the name and target columns stay narrow so the table fills a phone screen after rotation. */
const BASE_WIDTHS=[96,120,120,74,74,74,80];
const NAME_WIDTH=178,TARGET_WIDTH=112,TARGET_PADDING=10,NAME_PADDING=12;
const MAIN_SIZES=[24,22,20,18];
/* Style presets only change colors: every other value is shared so the layout never shifts. */
const STYLES={
  paper:{label:'山野纸张',paper:'#ffffff',ink:'#111111',sub:'#5e594f',rule:'#bbbbbb',head:'#ffffff',name:'#00008b',detail:'#666666',late:'#b82020',hist:'#111111',histOn:'#ffffff',line:'#111111',heat:['#ffdb63','#ef6262','#52bda5','#4777c5'],blend:'white'},
  night:{label:'夜跑仪表盘',paper:'#14120f',ink:'#f4efe6',sub:'#a89f92',rule:'#3b3630',head:'#1b1815',name:'#7fd0ff',detail:'#8d8578',late:'#ff6b5a',hist:'#e8e0d2',histOn:'#14120f',line:'#e8e0d2',heat:['#d8a63f','#bd4b3f','#2f7a6b','#3d63a6'],blend:'paper'},
  ink:{label:'极简墨线',paper:'#ffffff',ink:'#1a1a1a',sub:'#6f6f6f',rule:'#d8d8d8',head:'#ffffff',name:'#1a1a1a',detail:'#8a8a8a',late:'#1a1a1a',hist:'#1a1a1a',histOn:'#ffffff',line:'#1a1a1a',heat:['#c9c9c9','#b3b3b3','#a0a0a0','#8a8a8a'],blend:'white'},
  map:{label:'复古等高线',paper:'#f7eeda',ink:'#3b2b1b',sub:'#6b5844',rule:'#c9b48e',head:'#f2e6cd',name:'#7a4a1f',detail:'#8a7355',late:'#a3341f',hist:'#3b2b1b',histOn:'#f7eeda',line:'#3b2b1b',heat:['#e8c46a','#cf7a5a','#9dbb8f','#8fa8c8'],blend:'paper'}
};
function mix(base,color,strength){return '#'+[1,3,5].map((i)=>{const b=parseInt(base.slice(i,i+2),16),c=parseInt(color.slice(i,i+2),16);return Math.round(b+(c-b)*strength).toString(16).padStart(2,'0');}).join('');}
function charWidth(ch){const c=ch.codePointAt(0);if(c>0x2e7f)return 1;if(ch===' ')return .3;if(/[0-9]/.test(ch))return .6;if(/[A-Z]/.test(ch))return .66;return .55;}
function lineWidth(value,size){let w=0;for(const ch of String(value))w+=charWidth(ch)*size;return w;}
function hardWrap(value,maxWidth,size){const out=[];let line='',w=0;for(const ch of value){const cw=charWidth(ch)*size;if(line&&w+cw>maxWidth){out.push(line);line='';w=0;}line+=ch;w+=cw;}out.push(line);return out;}
function wrapPx(value,maxWidth,size){
  const text=String(value);
  if(lineWidth(text,size)<=maxWidth)return [text];
  const lines=[];
  for(const segment of text.split(/\s+/).filter(Boolean)){
    const tail=lines[lines.length-1];
    const joined=tail?`${tail} ${segment}`:segment;
    if(tail&&lineWidth(joined,size)<=maxWidth){lines[lines.length-1]=joined;continue;}
    lines.push(...hardWrap(segment,maxWidth,size));
  }
  return lines.length?lines:[''];
}
function text(x,y,lines,size=12,color='#111111',anchor='start',underline=false){return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}" font-family="sans-serif"${underline?' text-decoration="underline"':''}>${lines.map((s,i)=>`<tspan x="${x}" dy="${i?size*1.45:0}">${esc(s)}</tspan>`).join('')}</text>`;}
function time(s,seconds=false){let total=Math.floor(s+.5);if(!seconds)total=Math.floor(s/60+1e-9)*60;return `${String(Math.floor(total/3600)).padStart(2,'0')}:${String(Math.floor(total%3600/60)).padStart(2,'0')}${seconds?`:${String(total%60).padStart(2,'0')}`:''}`;}
function histogram(f,x,y,T,t){const labels=['≤-15%','-15~-10%','-10~-5%','-5~5%','5~10%','10~15%','≥15%'];return `<g transform="translate(${x} ${y})" role="img"><title>${esc(t('svg.gradeTitle'))}</title>${f.map((v,i)=>`<rect x="${i*100/7+1}" y="${48-v*43}" width="${100/7-2}" height="${v*43}" fill="${i===3?T.histOn:T.hist}"><title>${esc(labels[i])}: ${(v*100).toFixed(1)}%</title></rect>`).join('')}</g>`;}
function profile(points,x,y,T,t){let path='3,57 111,57';if(points.length>1){const left=points[0][0],right=points.at(-1)[0],low=points.reduce((v,p)=>Math.min(v,p[1]),Infinity),high=points.reduce((v,p)=>Math.max(v,p[1]),-Infinity);path=points.map(p=>`${3+(p[0]-left)/(right-left)*108},${58-(p[1]-low)/Math.max(high-low,1)*54}`).join(' ');}return `<g transform="translate(${x} ${y})" role="img"><title>${esc(t('svg.profileTitle'))}</title><polyline points="${path}" fill="none" stroke="${T.line}" stroke-width="1.6"/></g>`;}

function columns(plan){return [...BASE_WIDTHS,NAME_WIDTH,...(plan.schedules||[]).map(()=>TARGET_WIDTH)];}
function legendLines(mode,t){
  const second={arrival_time:t('svg.legendElapsed'),pace:t('svg.legendPace'),equivalent_pace:t('svg.legendEqPace')}[mode]||t('svg.legendElapsed');
  return [t('svg.legendTop'),second];
}

/* One target cell: 到站钟点 on top, secondary value below, optional rest notes. */
function cell(timing_value,index,lastIndex,plan,t,lang){
  const start=plan.parameters.start_time;
  const notes=[];
  if(timing_value.cutoff_status.includes('late'))notes.push(timing_value.cutoff_status==='arrival_late'?t('result.lateArrival'):t('result.lateDeparture'));
  const mode=plan.parameters.secondary_display;
  const sub=mode==='arrival_time'
    ? `(${time(timing_value.arrival_seconds)})`
    : (timing_value.pace_seconds_per_km==null?'':`${mode==='equivalent_pace'?t('time.eqPace'):t('time.pace')} ${timing.pace(timing_value.pace_seconds_per_km)}/km`);
  const cp=plan.checkpoints[index];
  if(cp.rest_seconds){
    notes.unshift(t('svg.leaveLine',{clock:timing.clock(start,timing_value.departure_seconds,lang)}));
    notes.unshift(t('svg.stopLine',{minutes:cp.rest_seconds/60}));
  }
  return {clock:timing.clock(start,timing_value.arrival_seconds,lang),sub,notes,late:timing_value.cutoff_status.includes('late')};
}

function layoutCell(value,sizes,maxWidth,T){
  const lines=[];
  for(const line of wrapPx(value.clock,maxWidth,sizes.main))lines.push({text:line,size:sizes.main,fill:T.ink,weight:600});
  if(value.sub)for(const line of wrapPx(value.sub,maxWidth,sizes.sub))lines.push({text:line,size:sizes.sub,fill:T.sub,weight:400});
  for(const note of value.notes)for(const line of wrapPx(note,maxWidth,sizes.note))lines.push({text:line,size:sizes.note,fill:value.late?T.late:T.sub,weight:400});
  const height=lines.reduce((sum,line,index)=>sum+(index?lines[index-1].size*1.45:line.size),0);
  return {lines,height};
}

function render(plan,options={}){
const t=i18n.forLang(options.lang);
const lang=options.lang;
const T=STYLES[options.style]||STYLES.paper;
const widths=columns(plan),width=widths.reduce((a,b)=>a+b,0)+2;
const usable=TARGET_WIDTH-TARGET_PADDING;
const schedules=plan.schedules;
const cells=schedules.map((schedule)=>schedule.checkpoints.map((value,i)=>cell(value,i,plan.checkpoints.length-1,plan,t,lang)));
const mainSize=MAIN_SIZES.find((size)=>cells.flat().every((value)=>value.clock.split(/\s+/).every((word)=>lineWidth(word,size)<=usable)))||MAIN_SIZES.at(-1);
const sizes={main:mainSize,sub:Math.max(14,Math.round(mainSize*.78)),note:13};
const laid=cells.map((column)=>column.map((value)=>layoutCell(value,sizes,usable,T)));
const metadata=[t('svg.metadata',{time:plan.parameters.start_time}),t('svg.water',{water:plan.parameters.water_ml_per_10km})];
const legend=legendLines(plan.parameters.secondary_display,t);
const legendSize=Math.max(...metadata.map((line)=>lineWidth(line,23)))+Math.max(...legend.map((line)=>lineWidth(line,23)))+24>width?19:23;
const parts=[`<rect width="${width}" height="100%" fill="${T.paper}"/>`,text(6,30,metadata,23,T.ink)];
legend.forEach((line,i)=>parts.push(`<text x="${width-6}" y="${30+i*28}" fill="${T.sub}" font-size="${legendSize}" text-anchor="end" font-family="sans-serif">${esc(line)}</text>`));
let y=84,x=1;const headers=[[t('svg.headTotal'),t('svg.headTotalUnit')],[t('svg.headGrade'),t('svg.headGradeUnit')],[t('svg.headProfile')],[t('svg.headDistance')],[t('svg.headAscent')],[t('svg.headDescent')],[t('svg.headWater')],[t('svg.headPosition')],...plan.targets_seconds.map(value=>[t('svg.headTarget'),value%1800===0?`${(value/3600).toFixed(1)} Hr`:time(value,true)])];
headers.forEach((h,i)=>{parts.push(`<rect x="${x}" y="${y}" width="${widths[i]}" height="84" fill="${T.head}" stroke="${T.rule}" stroke-width="1"/>`,text(x+widths[i]/2,y+(h.length>1?29:48),h,24,T.ink,'middle'));x+=widths[i];});y+=84;
const heat={3:['segment_distance_m',T.heat[0],'distance'],4:['ascent_m',T.heat[1],'ascent'],5:['descent_m',T.heat[2],'descent'],6:['water_ml',T.heat[3],'water']};
const limits=Object.fromEntries(Object.values(heat).map(([f])=>[f,Math.max(...plan.checkpoints.map(c=>c[f]))]));
plan.checkpoints.forEach((cp,i)=>{
const name=i18n.checkpointName(cp,lang);
const details=[];if(cp.official_distance_km!==null)details.push(t('svg.official',{km:cp.official_distance_km.toFixed(2)}));if(cp.rest_seconds)details.push(t('svg.stopLine',{minutes:cp.rest_seconds/60}));if(cp.cutoff_seconds!==null)details.push(t('svg.cutoffLine',{time:time(cp.cutoff_seconds,true)}));
const names=wrapPx(name,NAME_WIDTH-NAME_PADDING*2,22),detailLines=details.flatMap(d=>wrapPx(d,NAME_WIDTH-NAME_PADDING*2,12));
const nameHeight=names.length*22*1.45+detailLines.length*18,rowHeight=Math.max(94,nameHeight+26,...laid.map((column)=>column[i].height+22));
const numbers={0:cp.distance_m?(cp.distance_m/1000).toFixed(2):'0',3:(cp.segment_distance_m/1000).toFixed(1),4:Math.round(cp.ascent_m),5:Math.round(cp.descent_m),6:Math.round(cp.water_ml)};
x=1;widths.forEach((w,col)=>{
let fill=T.paper;if(heat[col]&&cp[heat[col][0]]){const [field,color]=heat[col],strength=.18+.72*cp[field]/limits[field];fill=mix(T.blend==='paper'?T.paper:'#ffffff',color,strength);}
parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${rowHeight}" fill="${fill}" stroke="${T.rule}" stroke-width="1" data-column="${heat[col]?.[2]||`column-${col}`}"/>`);
if(col in numbers)parts.push(text(x+w/2,y+rowHeight/2+8,[numbers[col]],24,T.ink,'middle'));
else if(col===1)parts.push(histogram(cp.grade_fractions,x+10,y+rowHeight/2-15,T,t));
else if(col===2)parts.push(profile(cp.profile,x+8,y+rowHeight/2-31,T,t));
else if(col===7){const nameY=y+(rowHeight-nameHeight)/2+23;parts.push(text(x+NAME_PADDING,nameY,names,22,T.name,'start',true));let detailY=nameY+(names.length-1)*22*1.45+28;detailLines.forEach(d=>{parts.push(text(x+NAME_PADDING,detailY,[d],12,T.detail));detailY+=18;});}
else {const value=laid[col-8][i],top=y+(rowHeight-value.height)/2;let base=top+value.lines[0].size;value.lines.forEach((line,index)=>{if(index)base+=value.lines[index-1].size*1.45;parts.push(text(x+w/2,base,[line.text],line.size,line.fill,'middle'));});}
x+=w;});y+=rowHeight;
});
return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(y+1)}" viewBox="0 0 ${width} ${Math.round(y+1)}" role="img"><title>${esc(t('svg.title',{name:plan.name}))}</title><desc>${esc(metadata.join('；'))}；${esc(legend.join('；'))}。</desc>${parts.join('')}</svg>\n`;
}
root.TrailSVG={render,columns,cell,wrapPx,lineWidth,STYLES,mix};if(typeof module!=='undefined')module.exports=root.TrailSVG;
})(globalThis);
