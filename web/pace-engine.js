/* Browser/Node numerical core. Keep parity with the Python reference in app.py. */
'use strict';
(function (root) {
  const svgRenderer = typeof module !== 'undefined' ? require('./pace-svg.js') : root.TrailSVG;
  const R = 6371008.8, RAD = Math.PI / 180;
  const KNOWN_SHA = '59281dcc31fd56b4b81172b1cb682ec14fbb948c9c5a89f63df58ae9afb3bd15';
  const DEFAULTS = {sample_m:5, smoothing_m:20, ascent_smoothing_m:100, ascent_threshold_m:10,
    elevation_spike_m:30, distance_tolerance_m:0, ascent_km_per_100m:1, fatigue_rate:.08,
    water_ml_per_10km:700, target_step_minutes:30, start_time:'06:00', secondary_display:'pace'};
  class InputError extends Error {
    constructor(message, code='invalid_input', details=null) { super(message); this.code=code; this.details=details; }
  }
  const fail = (message, code, details) => { throw new InputError(message,code,details); };
  const children = (n,t) => n.children.filter(c=>c.tag===t);
  const text = (n,t) => children(n,t)[0]?.text || '';
  function descendants(n,t) { const result=[]; const visit=(p)=>{ if(t.includes(p.tag))result.push(p); p.children.forEach(visit); }; visit(n); return result; }
  function numeric(value,label,min=0,max=Infinity) { if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max) fail(`${label} 超出允许范围。`); return value; }
  function duration(value) {
    if(typeof value!=='string'||!/^\d{1,4}:[0-5]\d(?::[0-5]\d)?$/.test(value)) fail('时间格式应为 H:MM，例如 12:00。');
    const [h,m,s=0]=value.split(':').map(Number); return h*3600+m*60+s;
  }
  const delta = (a,b) => {const v=(b-a+180)%360;return (v<0?v+360:v)-180;};
  function haversine(a,b) {
    const h=Math.sin((b[0]*RAD-a[0]*RAD)/2)**2+Math.cos(a[0]*RAD)*Math.cos(b[0]*RAD)*Math.sin(delta(a[1],b[1])*RAD/2)**2;
    return 2*R*Math.asin(Math.sqrt(Math.min(1,Math.max(0,h))));
  }
  function coords(n) {
    const lat=n.attrs.lat?.trim(),lon=n.attrs.lon?.trim();
    const a=Number(lat),b=Number(lon);
    if(!lat||!lon||!Number.isFinite(a)||!Number.isFinite(b)||Math.abs(a)>90||Math.abs(b)>180) fail('GPX 经纬度无效。');
    const z=text(n,'ele'); return [a,b,z&&Number.isFinite(Number(z))?Number(z):null];
  }
  function load(doc,trackIndex) {
    if(doc.tag!=='gpx') fail('请选择 GPX 格式的路线。');
    if(descendants(doc,['trkpt','rtept']).length>200000) fail('轨迹超过 200000 个点，请先精简文件。');
    const tracks=children(doc,'trk'),routes=children(doc,'rte'),alternatives=tracks.length?tracks:routes;
    if(!alternatives.length) fail('GPX 中没有可用的轨迹。');
    if(trackIndex===undefined&&alternatives.length>1) fail('文件包含多条路线，请在高级选项中选择。','select_track',alternatives.map((n,i)=>({track_index:i+1,name:text(n,'name')||`路线 ${i+1}`})));
    const index=trackIndex??1;
    if(!Number.isInteger(index)||index<1||index>alternatives.length) fail('所选路线编号无效。');
    const selected=alternatives[index-1],raw=descendants(selected,['trkpt','rtept']);
    if(raw.length<2) fail('路线至少需要两个轨迹点。');
    const coordinates=raw.map(coords),distances=[0],known=[];
    coordinates.forEach((p,i)=>{if(i) distances.push(distances[i-1]+haversine(coordinates[i-1],p)); if(p[2]!==null)known.push(i);});
    if(!known.length) fail('整条路线缺少高程，无法估计爬升。请上传带高程的 GPX。','no_elevation');
    let interior=0,endpoints=0,j=0;
    coordinates.forEach((p,i)=>{
      while(j<known.length&&known[j]<i)j++;
      if(p[2]!==null)return;
      if(!j||j===known.length) {p[2]=coordinates[known[j?known.length-1:0]][2];endpoints++;}
      else {const left=known[j-1],right=known[j],span=distances[right]-distances[left];const ratio=span>0?(distances[i]-distances[left])/span:(i-left)/(right-left);p[2]=Number((coordinates[left][2]+ratio*(coordinates[right][2]-coordinates[left][2])).toFixed(6));interior++;}
    });
    const repaired=new Map(raw.map((n,i)=>[n,coordinates[i]]));
    const segments=tracks.length?children(selected,'trkseg').map(s=>children(s,'trkpt')):[children(selected,'rtept')];
    const points=[];
    for(const seg of segments) {
      if(!seg.length)continue;
      const current=seg.map(n=>repaired.get(n));
      if(points.length&&haversine(points.at(-1),current[0])>1) fail('GPX 包含不连续的轨迹段，请选择连续路线。');
      for(const p of current) if(!points.length||haversine(points.at(-1),p)>=.001)points.push(p);
    }
    if(points.length<2)fail('路线至少需要两个不同的轨迹位置。');
    const samples=[[0,points[0][2]]];
    for(let i=1;i<points.length;i++)samples.push([samples.at(-1)[0]+haversine(points[i-1],points[i]),points[i][2]]);
    const sources=[['wpt',children(doc,'wpt')]];
    if(tracks.length)routes.forEach((n,i)=>sources.push([`rte${i+1}:rtept`,children(n,'rtept')]));
    else sources.push(['rtept',children(selected,'rtept')]);
    const candidates=[];
    const cpPattern=/(?<![A-Za-z])(?:CP|SP)\s*[-_#]?\s*\d*(?![A-Za-z])|\b(?:checkpoint|aid\s*station|water\s*station|start|finish)\b|补给|補給|检查点|檢查點|水站|起点|起點|终点|終點|起终点|起終點/i;
    for(const [prefix,nodes]of sources)nodes.forEach((n,i)=>{const name=text(n,'name'),type=text(n,'type');if(!name&&!type)return;const [lat,lon]=coords(n);candidates.push({id:`${prefix}:${i+1}`,name:name||type,type,lat,lon,recognized:cpPattern.test(`${name} ${type}`)});});
    const gaps=samples.slice(1).map((p,i)=>p[0]-samples[i][0]);
    const corrected=[];
    for(let i=1;i<samples.length-1;i++) {
      const [a,p,b]=samples.slice(i-1,i+2),left=p[0]-a[0],right=b[0]-p[0],estimate=a[1]+(b[1]-a[1])*left/(left+right),up=p[1]-a[1],down=p[1]-b[1];
      if(left+right<=50&&up*down>0&&Math.abs(p[1]-estimate)>=30&&Math.abs(up)/left>2&&Math.abs(down)/right>2&&Math.abs(a[1]-b[1])<15)corrected.push([i,estimate]);
    }
    const flagged=new Set(corrected.map(p=>p[0]));let correctedCount=0;
    for(const [i,z] of corrected) if(!flagged.has(i-1)&&!flagged.has(i+1)){samples[i]=[samples[i][0],z];points[i]=[points[i][0],points[i][1],z];correctedCount++;}
    return {points,samples,candidates,total:samples.at(-1)[0],diagnostics:{spacing_max_m:gaps.reduce((v,g)=>Math.max(v,g),0),elevation_spikes_corrected:correctedCount},
      repair:{repaired_count:interior+endpoints,interior_count:interior,endpoint_count:endpoints,point_count:raw.length,method:'内部按距离线性插值，首尾使用最近有效高程；插值不是实测高程。'}};
  }
  function bisect(source,x,right=true) {let lo=0,hi=source.length;while(lo<hi){const mid=(lo+hi)>>>1;if(source[mid][0]<x||(right&&source[mid][0]===x))lo=mid+1;else hi=mid;}return lo;}
  function interpolate(source,x) {const i=Math.max(0,Math.min(bisect(source,x)-1,source.length-2));const [a,b]=source.slice(i,i+2);return a[1]+(x-a[0])/(b[0]-a[0])*(b[1]-a[1]);}
  function smooth(route,step=5,window=20) {
    const total=route.total,source=route.samples,count=Math.ceil(total/step);
    if(count>2000000)fail('路线过长，采样点超过 2000000 个。');
    if(window>0&&window<16*Number.EPSILON*total)fail('高程窗口过小，请增大窗口或设为 0。');
    const distances=Array.from({length:count},(_,i)=>i*step);distances.push(total);
    const areas=[0];for(let i=1;i<source.length;i++){const [a,b]=source.slice(i-1,i+1);areas.push(areas.at(-1)+(b[0]-a[0])*(a[1]+b[1])/2);}
    return distances.map(x=>{
      const radius=Math.min(window/2,x,total-x);
      if(radius<=16*Number.EPSILON*total)return [x,interpolate(source,x)];
      const left=x-radius,right=x+radius,first=Math.max(0,Math.min(bisect(source,left)-1,source.length-2)),last=Math.max(0,Math.min(bisect(source,right)-1,source.length-2));
      const start=interpolate(source,left),end=interpolate(source,right);
      if(first===last)return [x,(start+end)/2];
      const a=source[first+1],b=source[last];
      return [x,((a[0]-left)*(start+a[1])/2+areas[last]-areas[first+1]+(right-b[0])*(b[1]+end)/2)/(right-left)];
    });
  }
  function ascent(route,window,threshold) {
    const source=window?smooth(route,5,window):route.samples;
    if(!threshold)return source;
    const anchors=[0];let low=0,high=0,extreme=0,direction=0;
    for(let i=1;i<source.length;i++) {
      const z=source[i][1];
      if(!direction){if(z<source[low][1])low=i;if(z>source[high][1])high=i;if(source[high][1]-source[low][1]>=threshold){direction=high>low?1:-1;const first=direction===1?low:high;if(first)anchors.push(first);extreme=direction===1?high:low;}}
      else if(direction*(z-source[extreme][1])>=0)extreme=i;
      else if(direction*(source[extreme][1]-z)>=threshold){anchors.push(extreme);direction=-direction;extreme=i;}
    }
    if(direction&&extreme>anchors.at(-1))anchors.push(extreme);
    if(anchors.at(-1)!==source.length-1)anchors.push(source.length-1);
    const result=[source[0]];
    for(let j=1;j<anchors.length;j++){const left=anchors[j-1],right=anchors[j],start=source[left][1],end=source[right][1];let previous=start;
      for(let i=left+1;i<=right;i++){const z=source[i][1];previous=end>=start?Math.min(end,Math.max(previous,z)):Math.max(end,Math.min(previous,z));result.push([source[i][0],previous]);}}
    return result;
  }
  function projections(route,cp) {
    const cosine=Math.cos(cp.lat*RAD),list=[];
    for(let i=1;i<route.points.length;i++){
      const a=route.points[i-1],b=route.points[i],ax=delta(cp.lon,a[1])*RAD*cosine*R,ay=(a[0]-cp.lat)*RAD*R,bx=delta(cp.lon,b[1])*RAD*cosine*R,by=(b[0]-cp.lat)*RAD*R,dx=bx-ax,dy=by-ay,len=dx*dx+dy*dy;
      const ratio=len?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/len)):0;
      list.push({distance_m:route.samples[i-1][0]+ratio*(route.samples[i][0]-route.samples[i-1][0]),offset_m:Math.hypot(ax+ratio*dx,ay+ratio*dy)});
    }
    const nearest=list.reduce((v,p)=>Math.min(v,p.offset_m),Infinity),nearby=list.filter(p=>p.offset_m<=nearest+20).sort((a,b)=>a.distance_m-b.distance_m),groups=[[nearby[0]]];
    for(const p of nearby.slice(1)){if(p.distance_m-groups.at(-1).at(-1).distance_m>50)groups.push([]);groups.at(-1).push(p);}
    const choices=groups.map(g=>g.reduce((a,b)=>a.offset_m<=b.offset_m?a:b)),best=choices.reduce((a,b)=>a.offset_m<=b.offset_m?a:b);
    return choices.filter(p=>Math.abs(p.distance_m-best.distance_m)>100||p===best);
  }
  function station(item) {
    if(typeof item.name!=='string'||!item.name.trim())fail('每个站点都需要名称。');
    return {name:item.name.trim(),rest_seconds:numeric(item.rest_minutes??0,'停站时间')*60,cutoff_seconds:item.cutoff==null?null:duration(item.cutoff)};
  }
  function checkpoints(route,options,candidates) {
    let cps=[];
    if(options.checkpoints) {
      if(!Array.isArray(options.checkpoints)||!options.checkpoints.length)fail('手动站点不能为空。');
      if(options.cp_selection||options.checkpoint_overrides)fail('手动站点不能同时使用站点选择。');
      cps=options.checkpoints.map((c,i)=>({id:`manual:${i+1}`,distance_m:numeric(c.distance_km,'站点距离')*1000,official_distance_km:c.distance_km,...station(c)}));
      if(cps.at(-1).distance_m<=0||Math.abs(cps.at(-1).distance_m-route.total)>Math.max(100,route.total*.005))fail('终点里程与路线不一致。');
      for(let i=1;i<cps.length;i++)if(cps[i].distance_m<=cps[i-1].distance_m)fail('站点累计里程必须递增，且不能重复。');
      cps.at(-1).distance_m=route.total;
    } else {
      let selected=candidates.filter(c=>c.recognized);
      if(options.cp_selection){const ids=options.cp_selection;if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)fail('站点选择无效。');selected=ids.map(id=>{const cp=candidates.find(c=>c.id===id);if(!cp)fail('站点编号无效。');return cp;});}
      if(!selected.length)fail('请在高级选项中选择站点或添加手动站点。');
      const overrides=options.checkpoint_overrides??{};
      if(Object.keys(overrides).some(id=>!selected.some(c=>c.id===id)))fail('站点设置引用了未选中的站点。');
      for(const cp of selected){
        const override=overrides[cp.id]??{},item={...cp,...override},endpoint=`${cp.name} ${cp.type}`,fields=station(item),combined=/起终点|起終點/.test(endpoint)||(/\bstart\b/i.test(endpoint)&&/\bfinish\b/i.test(endpoint));
        if(combined&&override.distance_km===undefined){
          if([route.points[0],route.points.at(-1)].some(p=>haversine([cp.lat,cp.lon],p)>100))fail('共用起终点距离路线端点超过 100 m，请确认站点位置。');
          cps.push({...fields,id:`${cp.id}:start`,distance_m:0,name:`${fields.name}（起点）`,official_distance_km:null,cutoff_seconds:null},{...fields,id:`${cp.id}:finish`,distance_m:route.total,name:`${fields.name}（终点）`,official_distance_km:null});continue;
        }
        let position;
        if(override.distance_km!==undefined){position=numeric(override.distance_km,'站点距离')*1000;if(position>route.total)fail('站点位置超过路线终点。');}
        else if(/\bstart\b|起点|起點/i.test(endpoint)){position=0;if(haversine([cp.lat,cp.lon],route.points[0])>100)fail('起点距路线超过 100 m，请确认站点位置。');}
        else if(/\bfinish\b|终点|終點/i.test(endpoint)){position=route.total;if(haversine([cp.lat,cp.lon],route.points.at(-1))>100)fail('终点距路线超过 100 m，请确认站点位置。');}
        else {const choices=cp.projection_options;if(choices.length>1)fail(`${cp.name} 有多个经过位置，请在高级选项中选择。`);if(choices[0].offset_m>100&&!override.allow_off_route)fail(`${cp.name} 距路线超过 100 m，请在高级选项中确认。`);position=choices[0].distance_m;}
        cps.push({id:cp.id,distance_m:position,official_distance_km:null,...fields});
      }
      cps.sort((a,b)=>a.distance_m-b.distance_m);
    }
    if(cps[0].distance_m>.001)cps.unshift({id:'start',name:'起点',distance_m:0,official_distance_km:options.checkpoints?0:null,rest_seconds:0,cutoff_seconds:null});
    if(route.total-cps.at(-1).distance_m>.001)cps.push({id:'finish',name:'终点',distance_m:route.total,official_distance_km:null,rest_seconds:0,cutoff_seconds:null});
    for(let i=1;i<cps.length;i++)if(cps[i].distance_m-cps[i-1].distance_m<.001)fail('站点累计里程必须递增，且不能重复。');
    if(cps[0].rest_seconds||cps.at(-1).rest_seconds)fail('起终点停站时间必须为 0。');
    return cps;
  }
  function section(profile,left,right) {if(left===right)return [[left,interpolate(profile,left)]];return [[left,interpolate(profile,left)],...profile.slice(bisect(profile,left),bisect(profile,right,false)),[right,interpolate(profile,right)]];}
  function stats(profile,gain,left,right,factor=1,water=700) {
    const segment=section(profile,left,right),gainSegment=section(gain,left,right);let up=0,down=0;const bins=Array(7).fill(0);
    for(let i=1;i<gainSegment.length;i++){const dz=gainSegment[i][1]-gainSegment[i-1][1];up+=Math.max(0,dz);down+=Math.max(0,-dz);}
    for(let i=1;i<segment.length;i++){const dx=segment[i][0]-segment[i-1][0],grade=100*(segment[i][1]-segment[i-1][1])/dx;const b=grade<=-15?0:grade<=-10?1:grade<=-5?2:grade<5?3:grade<10?4:grade<15?5:6;bins[b]+=dx;}
    const distance=right-left,eq=distance/1000+up/100*factor;
    return {segment_distance_m:distance,ascent_m:up,descent_m:down,eq_distance_km:eq,segment_water_ml:eq/10*water,grade_fractions:bins.map(v=>distance?v/distance:0),profile:segment};
  }
  function process(data,generate=false) {
    const o={...(data.options??{})};
    const limits={ascent_smoothing_m:2000,ascent_threshold_m:1000,ascent_km_per_100m:10,fatigue_rate:1,target_step_minutes:1440};
    const allowed=new Set([...Object.keys(limits),'start_time','secondary_display','track_index','checkpoint_overrides','cp_selection','checkpoints','targets']);
    for(const [key,value]of Object.entries(o)){if(!allowed.has(key))fail('包含不支持的高级选项。');if(key in limits)numeric(value,key,0,limits[key]);}
    const p={...DEFAULTS,...o},route=load(data.document,o.track_index),profile=smooth(route),gain=ascent(route,p.ascent_smoothing_m,p.ascent_threshold_m);
    const candidates=route.candidates.map(cp=>({...cp,projection_options:projections(route,cp)}));
    const confirmed=data.sha256===KNOWN_SHA?{'wpt:5':{distance_km:47.76857075906329}}:{};
    const filename=(data.filename||'route.gpx').replaceAll('\\','/').split('/').at(-1),name=(filename.replace(/\.[^.]*$/,'').slice(0,120)||'越野路线');
    const routeStats=stats(profile,gain,0,route.total);
    const response={name,repair:route.repair,confirmed_overrides:confirmed,original_sha256:data.sha256,inspection:{distance_m:route.total,ascent_m:routeStats.ascent_m,descent_m:routeStats.descent_m,cp_candidates:candidates,diagnostics:route.diagnostics}};
    if(!generate)return response;
    if(!o.checkpoints) {
      const defaults=Object.fromEntries(Object.entries(confirmed).filter(([id])=>!o.cp_selection||o.cp_selection.includes(id)));
      o.checkpoint_overrides={...defaults,...o.checkpoint_overrides};
      if(!candidates.length){o.checkpoints=[{name:'终点',distance_km:route.total/1000}];delete o.checkpoint_overrides;}
    }
    if(!['pace','equivalent_pace','arrival_time'].includes(p.secondary_display))fail('表格显示方式无效。');
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(p.start_time))fail('发枪时间格式应为 HH:MM，例如 06:00。');
    if(p.target_step_minutes<=0)fail('方案间隔必须大于 0。');
    const cps=checkpoints(route,o,candidates);let eqTotal=0;
    cps.forEach((cp,i)=>{Object.assign(cp,stats(profile,gain,i?cps[i-1].distance_m:0,cp.distance_m,p.ascent_km_per_100m));eqTotal+=cp.eq_distance_km;cp.cumulative_eq_distance_km=eqTotal;});
    cps.forEach((cp,i)=>cp.water_ml=cps[i+1]?.segment_water_ml??0);
    const center=duration(data.target);
    if(o.targets&&(!Array.isArray(o.targets)||!o.targets.length))fail('目标方案不能为空。');
    const targets=o.targets?o.targets.map(duration):[-2,-1,0,1,2].map(i=>center+i*p.target_step_minutes*60);
    if(targets.some(t=>t<=0)||new Set(targets).size!==targets.length)fail('方案时间必须大于 0 且不能重复。短目标可在高级选项中选择“仅目标方案”。');targets.sort((a,b)=>a-b);
    const rest=cps.reduce((s,c)=>s+c.rest_seconds,0),exponent=1+Math.log2(1+p.fatigue_rate);
    const schedules=targets.map(target=>{
      if(target<=rest)fail('目标完赛时间必须大于全部停站时间。');
      let priorMoving=0,priorRest=0;
      const times=cps.map((cp,i)=>{const cumulative=(target-rest)*(cp.cumulative_eq_distance_km/eqTotal)**exponent,moving=cumulative-priorMoving,arrival=cumulative+priorRest,departure=arrival+cp.rest_seconds,cutoff=cp.cutoff_seconds;
        const t={arrival_seconds:arrival,departure_seconds:departure,moving_seconds:moving,eq_pace_seconds_per_km:i?moving/cp.eq_distance_km:null,distance_pace_seconds_per_km:i?moving/(cp.segment_distance_m/1000):null,pace_seconds_per_km:i?moving/(p.secondary_display==='equivalent_pace'?cp.eq_distance_km:cp.segment_distance_m/1000):null,cutoff_status:cutoff===null?'not_checked':arrival>cutoff+1e-7?'arrival_late':departure>cutoff+1e-7?'departure_late':'on_time'};
        priorMoving=cumulative;priorRest+=cp.rest_seconds;return t;});
      return {target_seconds:target,checkpoints:times};
    });
    const totalStats=stats(profile,gain,0,route.total,p.ascent_km_per_100m);
    const plan={schema_version:2,name,source:{filename,original_sha256:data.sha256},parameters:{...p,fatigue_exponent:exponent,rest_total_seconds:rest},route:{distance_m:route.total,ascent_m:totalStats.ascent_m,descent_m:totalStats.descent_m,eq_distance_km:eqTotal,diagnostics:route.diagnostics,grade_fractions:totalStats.grade_fractions},checkpoints:cps,targets_seconds:targets,schedules};
    const verification={finish_targets_match:schedules.every(s=>Math.abs(s.checkpoints.at(-1).departure_seconds-s.target_seconds)<1e-7),rests_match:schedules.every(s=>s.checkpoints.every((t,i)=>Math.abs(t.departure_seconds-t.arrival_seconds-cps[i].rest_seconds)<1e-7)),cutoff_checked_stations:cps.slice(1).filter(c=>c.cutoff_seconds!==null).length,cutoff_unchecked_stations:cps.slice(1).filter(c=>c.cutoff_seconds===null).length,cutoff_failures:[]};
    schedules.forEach(s=>s.checkpoints.slice(1).forEach((t,i)=>{if(t.cutoff_status.includes('late'))verification.cutoff_failures.push({target_seconds:s.target_seconds,checkpoint_id:cps[i+1].id,status:t.cutoff_status});}));
    return {...response,plan,profile:smooth(route,50,100),verification,svg:svgRenderer.render(plan),csv:renderCSV(plan)};
  }
  function formatTime(s,seconds=false) {const total=seconds?Math.floor(s+.5):Math.floor((s+1e-7)/60)*60;return `${String(Math.floor(total/3600)).padStart(2,'0')}:${String(Math.floor(total%3600/60)).padStart(2,'0')}${seconds?`:${String(total%60).padStart(2,'0')}`:''}`;}
  const formatPace=s=>s===null?'-':`${Math.floor(Math.floor(s+.5)/60)}:${String(Math.floor(s+.5)%60).padStart(2,'0')}`;
  function renderCSV(plan) {
    const fields=['checkpoint_id','checkpoint_name','gpx_distance_km','official_distance_km','segment_distance_km','ascent_m','descent_m','eq_distance_km','segment_water_ml','water_ml','rest_seconds','cutoff_seconds','target_seconds','arrival_seconds','departure_seconds','moving_seconds','eq_pace_seconds_per_km','distance_pace_seconds_per_km','pace_seconds_per_km','cutoff_status','arrival','departure','eq_pace','pace'];
    const csv=v=>{const s=v==null?'':String(v);return /[",\r\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s;};
    const rows=[fields.join(',')];
    for(const schedule of plan.schedules)plan.checkpoints.forEach((cp,i)=>{
      const timing=schedule.checkpoints[i],name=/^\s*[=+\-@]/.test(cp.name)?`'${cp.name}`:cp.name;
      const row={...cp,...timing,checkpoint_id:cp.id,checkpoint_name:name,gpx_distance_km:cp.distance_m/1000,segment_distance_km:cp.segment_distance_m/1000,target_seconds:schedule.target_seconds,arrival:formatTime(timing.arrival_seconds,true),departure:formatTime(timing.departure_seconds,true),eq_pace:formatPace(timing.eq_pace_seconds_per_km),pace:formatPace(timing.pace_seconds_per_km)};
      rows.push(fields.map(k=>csv(row[k])).join(','));
    });
    return '\ufeff'+rows.join('\n')+'\n';
  }
  const engine={process,InputError};
  if(typeof module!=='undefined')module.exports=engine;
  root.TrailPace=engine;
})(typeof globalThis!=='undefined'?globalThis:this);
