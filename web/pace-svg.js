'use strict';
/* SVG export follows the existing Python renderer, including terrain graphics. */
(function(root){
const timing=typeof module!=='undefined'?require('./pace-time.js'):root.TrailTime;
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Column widths: the name and target columns stay narrow so the table fills a phone screen after rotation. */
const BASE_WIDTHS=[96,120,120,74,74,74,80];
const NAME_WIDTH=178,TARGET_WIDTH=112,TARGET_PADDING=10,NAME_PADDING=12;
const MAIN_SIZES=[24,22,20,18];
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
function histogram(f,x,y){const labels=['≤-15%','-15~-10%','-10~-5%','-5~5%','5~10%','10~15%','≥15%'];return `<g transform="translate(${x} ${y})" role="img"><title>坡度按距离加权的七档分布</title>${f.map((v,i)=>`<rect x="${i*100/7+1}" y="${48-v*43}" width="${100/7-2}" height="${v*43}" fill="${i===3?'#ffffff':'#111111'}"><title>${esc(labels[i])}: ${(v*100).toFixed(1)}%</title></rect>`).join('')}</g>`;}
function profile(points,x,y){let path='3,57 111,57';if(points.length>1){const left=points[0][0],right=points.at(-1)[0],low=points.reduce((v,p)=>Math.min(v,p[1]),Infinity),high=points.reduce((v,p)=>Math.max(v,p[1]),-Infinity);path=points.map(p=>`${3+(p[0]-left)/(right-left)*108},${58-(p[1]-low)/Math.max(high-low,1)*54}`).join(' ');}return `<g transform="translate(${x} ${y})" role="img"><title>分段海拔肖像，各段独立缩放</title><polyline points="${path}" fill="none" stroke="#111111" stroke-width="1.6"/></g>`;}

function columns(plan){return [...BASE_WIDTHS,NAME_WIDTH,...(plan.schedules||[]).map(()=>TARGET_WIDTH)];}
const SECOND_LEGEND={arrival_time:'下行：累计耗时（首行为发枪，末行为完赛）',pace:'下行：区间配速（分:秒/km）',equivalent_pace:'下行：区间等效配速（分:秒/km）'};

/* One target cell: 到站钟点 on top, secondary value below, optional rest notes. */
function cell(t,index,lastIndex,plan){
  const start=plan.parameters.start_time;
  const notes=[];
  if(t.cutoff_status.includes('late'))notes.push(t.cutoff_status==='arrival_late'?'到站超时':'出站超时');
  const mode=plan.parameters.secondary_display;
  const sub=mode==='arrival_time'
    ? `(${time(t.arrival_seconds)})`
    : (t.pace_seconds_per_km==null?'':`${mode==='equivalent_pace'?'等效配速':'配速'} ${timing.pace(t.pace_seconds_per_km)}/km`);
  const cp=plan.checkpoints[index];
  if(cp.rest_seconds){
    notes.unshift(`出站 ${timing.clock(start,t.departure_seconds)}`);
    notes.unshift(`停留 ${cp.rest_seconds/60} 分`);
  }
  return {clock:timing.clock(start,t.arrival_seconds),sub,notes,late:t.cutoff_status.includes('late')};
}

function layoutCell(value,sizes,maxWidth){
  const lines=[];
  for(const line of wrapPx(value.clock,maxWidth,sizes.main))lines.push({text:line,size:sizes.main,fill:'#111111',weight:600});
  if(value.sub)for(const line of wrapPx(value.sub,maxWidth,sizes.sub))lines.push({text:line,size:sizes.sub,fill:'#5e594f',weight:400});
  for(const note of value.notes)for(const line of wrapPx(note,maxWidth,sizes.note))lines.push({text:line,size:sizes.note,fill:value.late?'#b82020':'#5e594f',weight:400});
  const height=lines.reduce((sum,line,index)=>sum+(index?lines[index-1].size*1.45:line.size),0);
  return {lines,height};
}

function render(plan){
const widths=columns(plan),width=widths.reduce((a,b)=>a+b,0)+2;
const usable=TARGET_WIDTH-TARGET_PADDING;
const schedules=plan.schedules;
const cells=schedules.map((schedule)=>schedule.checkpoints.map((t,i)=>cell(t,i,plan.checkpoints.length-1,plan)));
const mainSize=MAIN_SIZES.find((size)=>cells.flat().every((value)=>value.clock.split(/\s+/).every((word)=>lineWidth(word,size)<=usable)))||MAIN_SIZES.at(-1);
const sizes={main:mainSize,sub:Math.max(14,Math.round(mainSize*.78)),note:13};
const laid=cells.map((column)=>column.map((value)=>layoutCell(value,sizes,usable)));
const metadata=[`发枪：${plan.parameters.start_time}　时间均为比赛当地时间`,`水量（ml）：${plan.parameters.water_ml_per_10km} ml/10 等效公里，仅供赛段比较，非个人饮水建议`];
const legend=['上行：到站钟点（当地时间）',SECOND_LEGEND[plan.parameters.secondary_display]||SECOND_LEGEND.arrival_time];
const legendSize=Math.max(...metadata.map((line)=>lineWidth(line,23)))+Math.max(...legend.map((line)=>lineWidth(line,23)))+24>width?19:23;
const parts=[`<rect width="${width}" height="100%" fill="#ffffff"/>`,text(6,30,metadata,23)];
legend.forEach((line,i)=>parts.push(`<text x="${width-6}" y="${30+i*28}" fill="#5e594f" font-size="${legendSize}" text-anchor="end" font-family="sans-serif">${esc(line)}</text>`));
let y=84,x=1;const headers=[['累积','距离'],['坡度','分布'],['肖像图'],['距离'],['爬升'],['下降'],['水'],['位置'],...plan.targets_seconds.map(t=>['Target',t%1800===0?`${(t/3600).toFixed(1)} Hr`:time(t,true)])];
headers.forEach((h,i)=>{parts.push(`<rect x="${x}" y="${y}" width="${widths[i]}" height="84" fill="#ffffff" stroke="#bbbbbb" stroke-width="1"/>`,text(x+widths[i]/2,y+(h.length>1?29:48),h,24,'#111111','middle'));x+=widths[i];});y+=84;
const heat={3:['segment_distance_m','#ffdb63','distance'],4:['ascent_m','#ef6262','ascent'],5:['descent_m','#52bda5','descent'],6:['water_ml','#4777c5','water']};
const limits=Object.fromEntries(Object.values(heat).map(([f])=>[f,Math.max(...plan.checkpoints.map(c=>c[f]))]));
plan.checkpoints.forEach((cp,i)=>{
let name=cp.name;for(const label of ['起点','终点'])if(name.endsWith(`（${label}）`)){name=name.slice(0,-4).replace(/起终点|起終點/g,label);break;}
const details=[];if(cp.official_distance_km!==null)details.push(`官方 ${cp.official_distance_km.toFixed(2)} km`);if(cp.rest_seconds)details.push(`停留 ${cp.rest_seconds/60} min`);if(cp.cutoff_seconds!==null)details.push(`关门 ${time(cp.cutoff_seconds,true)}`);
const names=wrapPx(name,NAME_WIDTH-NAME_PADDING*2,22),detailLines=details.flatMap(d=>wrapPx(d,NAME_WIDTH-NAME_PADDING*2,12));
const nameHeight=names.length*22*1.45+detailLines.length*18,rowHeight=Math.max(94,nameHeight+26,...laid.map((column)=>column[i].height+22));
const numbers={0:cp.distance_m?(cp.distance_m/1000).toFixed(2):'0',3:(cp.segment_distance_m/1000).toFixed(1),4:Math.round(cp.ascent_m),5:Math.round(cp.descent_m),6:Math.round(cp.water_ml)};
x=1;widths.forEach((w,col)=>{
let fill='#ffffff';if(heat[col]&&cp[heat[col][0]]){const [field,color]=heat[col],strength=.18+.72*cp[field]/limits[field];fill='#'+[1,3,5].map(j=>Math.round(255+(parseInt(color.slice(j,j+2),16)-255)*strength).toString(16).padStart(2,'0')).join('');}
parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${rowHeight}" fill="${fill}" stroke="#bbbbbb" stroke-width="1" data-column="${heat[col]?.[2]||`column-${col}`}"/>`);
if(col in numbers)parts.push(text(x+w/2,y+rowHeight/2+8,[numbers[col]],24,'#111111','middle'));
else if(col===1)parts.push(histogram(cp.grade_fractions,x+10,y+rowHeight/2-15));
else if(col===2)parts.push(profile(cp.profile,x+8,y+rowHeight/2-31));
else if(col===7){const nameY=y+(rowHeight-nameHeight)/2+23;parts.push(text(x+NAME_PADDING,nameY,names,22,'#00008b','start',true));let detailY=nameY+(names.length-1)*22*1.45+28;detailLines.forEach(d=>{parts.push(text(x+NAME_PADDING,detailY,[d],12,'#666666'));detailY+=18;});}
else {const value=laid[col-8][i],top=y+(rowHeight-value.height)/2;let base=top+value.lines[0].size;value.lines.forEach((line,index)=>{if(index)base+=value.lines[index-1].size*1.45;parts.push(text(x+w/2,base,[line.text],line.size,line.fill,'middle'));});}
x+=w;});y+=rowHeight;
});
return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${Math.round(y+1)}" viewBox="0 0 ${width} ${Math.round(y+1)}" role="img"><title>${esc(plan.name)} 体感一致配速表</title><desc>${esc(metadata.join('；'))}；${esc(legend.join('；'))}。</desc>${parts.join('')}</svg>\n`;
}
root.TrailSVG={render,columns,cell,wrapPx,lineWidth};if(typeof module!=='undefined')module.exports=root.TrailSVG;
})(globalThis);
