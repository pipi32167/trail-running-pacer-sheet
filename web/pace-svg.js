'use strict';
/* SVG export follows the existing Python renderer, including terrain graphics. */
(function(root){
const timing=typeof module!=='undefined'?require('./pace-time.js'):root.TrailTime;
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function wrap(value,units){const result=[];let line='',used=0;for(const c of value){const size=c.charCodeAt(0)>255?2:1;if(c==='\n'||(line&&used+size>units)){result.push(line);line='';used=0;}if(c!=='\n'){line+=c;used+=size;}}if(line||!result.length)result.push(line);return result;}
function text(x,y,lines,size=12,color='#111111',anchor='start',underline=false){return `<text x="${x}" y="${y}" fill="${color}" font-size="${size}" text-anchor="${anchor}" font-family="sans-serif"${underline?' text-decoration="underline"':''}>${lines.map((s,i)=>`<tspan x="${x}" dy="${i?size*1.45:0}">${esc(s)}</tspan>`).join('')}</text>`;}
function time(s,seconds=false){let total=Math.floor(s+.5);if(!seconds)total=Math.floor(s/60+1e-9)*60;return `${String(Math.floor(total/3600)).padStart(2,'0')}:${String(Math.floor(total%3600/60)).padStart(2,'0')}${seconds?`:${String(total%60).padStart(2,'0')}`:''}`;}
function histogram(f,x,y){const labels=['≤-15%','-15~-10%','-10~-5%','-5~5%','5~10%','10~15%','≥15%'];return `<g transform="translate(${x} ${y})" role="img"><title>坡度按距离加权的七档分布</title>${f.map((v,i)=>`<rect x="${i*100/7+1}" y="${48-v*43}" width="${100/7-2}" height="${v*43}" fill="${i===3?'#ffffff':'#111111'}"><title>${esc(labels[i])}: ${(v*100).toFixed(1)}%</title></rect>`).join('')}</g>`;}
function profile(points,x,y){let path='3,57 111,57';if(points.length>1){const left=points[0][0],right=points.at(-1)[0],low=points.reduce((v,p)=>Math.min(v,p[1]),Infinity),high=points.reduce((v,p)=>Math.max(v,p[1]),-Infinity);path=points.map(p=>`${3+(p[0]-left)/(right-left)*108},${58-(p[1]-low)/Math.max(high-low,1)*54}`).join(' ');}return `<g transform="translate(${x} ${y})" role="img"><title>分段海拔肖像，各段独立缩放</title><polyline points="${path}" fill="none" stroke="#111111" stroke-width="1.6"/></g>`;}
function render(plan){
const widths=[110,120,130,78,78,78,88,240,...plan.schedules.map(()=>plan.parameters.secondary_display==='equivalent_pace'?270:228)],width=widths.reduce((a,b)=>a+b,0)+2;
const labels={pace:'区间配速（分:秒/km）',equivalent_pace:'区间等效配速（分:秒/km）',arrival_time:'到站钟点（当地时间）'};
const metadata=[`发枪：${plan.parameters.start_time}　主数字：累计出站耗时　括号内：${labels[plan.parameters.secondary_display]}`,`水量（ml）：${plan.parameters.water_ml_per_10km} ml/10 等效公里，仅供赛段比较，非个人饮水建议`];
const parts=[`<rect width="${width}" height="100%" fill="#ffffff"/>`,text(6,30,metadata,23)];
let y=84,x=1;const headers=[['累积','距离'],['坡度','分布'],['肖像图'],['距离'],['爬升'],['下降'],['水'],['位置'],...plan.targets_seconds.map(t=>['Target',t%1800===0?`${(t/3600).toFixed(1)} Hr`:time(t,true)])];
headers.forEach((h,i)=>{parts.push(`<rect x="${x}" y="${y}" width="${widths[i]}" height="84" fill="#ffffff" stroke="#bbbbbb" stroke-width="1"/>`,text(x+widths[i]/2,y+(h.length>1?29:48),h,24,'#111111','middle'));x+=widths[i];});y+=84;
const heat={3:['segment_distance_m','#ffdb63','distance'],4:['ascent_m','#ef6262','ascent'],5:['descent_m','#52bda5','descent'],6:['water_ml','#4777c5','water']};
const limits=Object.fromEntries(Object.values(heat).map(([f])=>[f,Math.max(...plan.checkpoints.map(c=>c[f]))]));
plan.checkpoints.forEach((cp,i)=>{
let name=cp.name;for(const label of ['起点','终点'])if(name.endsWith(`（${label}）`)){name=name.slice(0,-4).replace(/起终点|起終點/g,label);break;}
const details=[];if(cp.official_distance_km!==null)details.push(`官方 ${cp.official_distance_km.toFixed(2)} km`);if(cp.rest_seconds)details.push(`停留 ${cp.rest_seconds/60} min`);if(cp.cutoff_seconds!==null)details.push(`关门 ${time(cp.cutoff_seconds,true)}`);
const names=wrap(name,20),timings=plan.schedules.map(s=>{const t=s.checkpoints[i],lines=[time(t.departure_seconds)];const secondary=timing.secondary(plan.parameters.secondary_display,plan.parameters.start_time,t,i,plan.checkpoints.length-1);if(secondary)lines.push(`(${secondary})`);if(cp.rest_seconds){lines.push(`到站耗时 ${time(t.arrival_seconds)}`);lines.push(`停留 ${cp.rest_seconds/60} 分`);}if(t.cutoff_status.includes('late'))lines.push(t.cutoff_status==='arrival_late'?'到站超时':'出站超时');return lines;});
const nameHeight=names.length*22*1.45+details.length*18,rowHeight=Math.max(94,nameHeight+26,...timings.map(t=>t.length*28+20));
const numbers={0:cp.distance_m?(cp.distance_m/1000).toFixed(2):'0',3:(cp.segment_distance_m/1000).toFixed(1),4:Math.round(cp.ascent_m),5:Math.round(cp.descent_m),6:Math.round(cp.water_ml)};
x=1;widths.forEach((w,col)=>{
let fill='#ffffff';if(heat[col]&&cp[heat[col][0]]){const [field,color]=heat[col],strength=.18+.72*cp[field]/limits[field];fill='#'+[1,3,5].map(j=>Math.round(255+(parseInt(color.slice(j,j+2),16)-255)*strength).toString(16).padStart(2,'0')).join('');}
parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${rowHeight}" fill="${fill}" stroke="#bbbbbb" stroke-width="1" data-column="${heat[col]?.[2]||`column-${col}`}"/>`);
if(col in numbers)parts.push(text(x+w/2,y+rowHeight/2+8,[numbers[col]],24,'#111111','middle'));
else if(col===1)parts.push(histogram(cp.grade_fractions,x+10,y+rowHeight/2-15));
else if(col===2)parts.push(profile(cp.profile,x+8,y+rowHeight/2-31));
else if(col===7){const nameY=y+(rowHeight-nameHeight)/2+23;parts.push(text(x+12,nameY,names,22,'#00008b','start',true));let detailY=nameY+(names.length-1)*22*1.45+28;details.forEach(d=>{parts.push(text(x+12,detailY,[d],12,'#666666'));detailY+=18;});}
else {const t=plan.schedules[col-8].checkpoints[i],lines=timings[col-8];parts.push(text(x+w/2,y+(rowHeight-lines.length*32)/2+25,lines,23,t.cutoff_status.includes('late')?'#b82020':'#111111','middle'));}
x+=w;});y+=rowHeight;
});
return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(y+1)}" viewBox="0 0 ${width} ${Math.round(y+1)}" role="img"><title>${esc(plan.name)} 体感一致配速表</title><desc>${esc(metadata.join('；'))}；累计出站时间，图示和文字均在此文件内。</desc>${parts.join('')}</svg>\n`;
}
root.TrailSVG={render};if(typeof module!=='undefined')module.exports=root.TrailSVG;
})(globalThis);
