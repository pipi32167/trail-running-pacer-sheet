'use strict';
/* Fit the existing export into a phone canvas without changing its contents. */
(function(root){
const i18n=typeof module!=='undefined'?require('./i18n.js'):root.TrailI18n;
/* Layout errors carry a code; the page adds the localized copy. */
const failCopy=(code,params)=>{const error=new Error(code);error.code=code;error.params=params||null;throw error;};
const DEVICES={
 'iphone-61':{label:'iPhone 15 / 15 Pro（6.1 英寸）',width:1179,height:2556},
 'iphone-67':{label:'iPhone 15 Plus / Pro Max（6.7 英寸）',width:1290,height:2796},
 'iphone-69':{label:'iPhone 16 Pro Max（6.9 英寸）',width:1320,height:2868},
 'iphone-16pro':{label:'iPhone 16 Pro（6.3 英寸）',width:1206,height:2622},
 'android-1080':{label:'Android',width:1080,height:2400},
 custom:{label:'自定义尺寸',width:1179,height:2556}
};
function number(value,fallback,min,max,label){
 const n=value===undefined?fallback:Number(value);
 if(value===''||!Number.isFinite(n)||n<min||n>max)failCopy('wall.errRange',{label,min,max});
 return n;
}
function luminance(hex){const [r,g,b]=[1,3,5].map((i)=>parseInt(hex.slice(i,i+2),16)/255);return .2126*r+.7152*g+.0722*b;}
function paperOf(svg){const m=/height="100%" fill="(#[0-9a-fA-F]{6})"/.exec(svg);return m?m[1]:'#ffffff';}
/* Palettes only change the field behind the sheet. keeps: solid base for contrast checks,
   stops for the gradient, accent for the top glow, plus grain/vignette/shadow weights. */
const THEMES={
 dark:{label:'墨黑',base:'#14120f',darkBase:'#080706',stops:['#262019','#0c0a08'],darkStops:['#12100c','#050404'],accent:'#e0b23c',glow:.16,grain:.05,vignette:.32,shadow:.34},
 light:{label:'米白',base:'#fbf7ef',darkBase:'#efe9dc',stops:['#fffdf8','#efe8d9'],darkStops:['#f7f1e4','#e3dccd'],accent:'#2a4d9b',glow:.10,grain:.04,vignette:.14,shadow:.28},
 moss:{label:'苔绿',base:'#12301f',darkBase:'#091b11',stops:['#24593c','#0c2618'],darkStops:['#153823','#05140c'],accent:'#cbe6b4',glow:.20,grain:.06,vignette:.34,shadow:.36},
 mossLight:{label:'苔绿·浅',base:'#eef3e6',darkBase:'#dde8d1',stops:['#f9fbf3','#dbe7cf'],darkStops:['#eef4e5','#cfdcc2'],accent:'#2f5d3f',glow:.14,grain:.05,vignette:.16,shadow:.26},
 ocean:{label:'海蓝',base:'#0d2a45',darkBase:'#071726',stops:['#1a5580','#072038'],darkStops:['#0f3454','#030d18'],accent:'#a6d5f2',glow:.20,grain:.06,vignette:.36,shadow:.36},
 oceanLight:{label:'海蓝·浅',base:'#e9f1f9',darkBase:'#d5e3f1',stops:['#f7fbff','#d6e5f3'],darkStops:['#edf4fb','#c9d9e9'],accent:'#1f4a76',glow:.14,grain:.05,vignette:.16,shadow:.26},
 clay:{label:'岩红',base:'#3d1210',darkBase:'#220907',stops:['#96402b','#3f170e'],darkStops:['#4a1710','#180605'],accent:'#f2c791',glow:.22,grain:.07,vignette:.30,shadow:.38},
 clayLight:{label:'岩红·浅',base:'#f8ece4',darkBase:'#ecd8cd',stops:['#fdf6f0','#ebd8ce'],darkStops:['#f8ece4','#e0c8bc'],accent:'#8c3a26',glow:.13,grain:.05,vignette:.16,shadow:.26},
 sand:{label:'沙金',base:'#3a2c14',darkBase:'#20170b',stops:['#7a5f2a','#2c2011'],darkStops:['#4a3818','#140e06'],accent:'#edd8a5',glow:.22,grain:.07,vignette:.36,shadow:.38}
};
const themeKeys=Object.keys(THEMES);
function palette(key){return THEMES[key]||THEMES.dark;}
/* Background must differ from the table paper, otherwise the margins look like part of the table. */
function background(theme,paper){const p=palette(theme);return luminance(paper)<.5?p.darkBase:p.base;}
function layout(svg,options={}){
 const tag=typeof svg==='string'&&svg.match(/^\s*<svg\b[^>]*>/);
 const width=Number(tag&&tag[0].match(/\bwidth="([\d.]+)"/)?.[1]);
 const height=Number(tag&&tag[0].match(/\bheight="([\d.]+)"/)?.[1]);
 if(!(width>0&&height>0))failCopy('wall.errMissing');
 const device=DEVICES[options.device]||DEVICES['iphone-61'];
 const w=Math.round(options.device==='custom'?number(options.width,device.width,640,4096,'wall.labelWidth'):device.width);
 const h=Math.round(options.device==='custom'?number(options.height,device.height,960,4096,'wall.labelHeight'):device.height);
 const top=number(options.top,27,0,70,'wall.labelTop');
 const bottom=number(options.bottom,9,0,50,'wall.labelBottom');
 const anchor=options.anchor==='center'?'center':'top';
 if(top+bottom>85)failCopy('wall.errPadding');
 const rotation=options.rotation===0?0:90;
 const band={left:w*.02,right:w*.98,top:h*top/100,bottom:h*(1-bottom/100)};
 const rotatedWidth=rotation?height:width,rotatedHeight=rotation?width:height;
 const scale=Math.min((band.right-band.left)/rotatedWidth,(band.bottom-band.top)/rotatedHeight);
 const image={width:rotatedWidth*scale,height:rotatedHeight*scale};
 image.x=(w-image.width)/2;
 image.y=anchor==='center'?(band.top+band.bottom-image.height)/2:band.top;
 const theme=themeKeys.includes(options.theme)?options.theme:'dark',paper=paperOf(svg),shade=luminance(paper)<.5;
 const p=palette(theme);
 const spec={...p,stops:shade?p.darkStops:p.stops,labelKey:`wall.theme.${theme}`};
 return {width:w,height:h,source:{width,height},band,image,rotation,scale,anchor,theme,paper,palette:spec,background:background(theme,paper)};
}
function render(svg,options={}){
 const l=layout(svg,options),i=l.image,t=i18n.forLang(options.lang);
 // The source export already touches its bounds. Retain its full viewBox:
 // removing any further margin would cut metadata or the outer table border.
 const transform=`translate(${i.x} ${i.y}) scale(${l.scale}) translate(${l.rotation?l.source.height:0} 0) rotate(${l.rotation})`;
 const p=l.palette,id=l.theme.replace(/[^a-z]/gi,'');
 // Filter and gradient ids are theme-scoped so several previews can share one document.
 const defs=`<defs><linearGradient id="wbg-${id}" x1="0" y1="0" x2="0.72" y2="1"><stop offset="0" stop-color="${p.stops[0]}"/><stop offset="1" stop-color="${p.stops[1]}"/></linearGradient><radialGradient id="wglow-${id}" cx="0.5" cy="-0.05" r="0.92"><stop offset="0" stop-color="${p.accent}" stop-opacity="${p.glow}"/><stop offset="1" stop-color="${p.accent}" stop-opacity="0"/></radialGradient><radialGradient id="wvig-${id}" cx="0.5" cy="0.42" r="0.82"><stop offset="0.4" stop-color="#000000" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="${p.vignette}"/></radialGradient><filter id="wgrain-${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.78" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><filter id="wlift-${id}" x="-18%" y="-12%" width="136%" height="130%"><feDropShadow dx="0" dy="${(l.width*.011).toFixed(1)}" stdDeviation="${(l.width*.019).toFixed(1)}" flood-color="#000000" flood-opacity="${p.shadow}"/></filter></defs>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.width}" height="${l.height}" viewBox="0 0 ${l.width} ${l.height}"><title>${t('wall.title')}</title>${defs}<rect width="${l.width}" height="${l.height}" fill="${l.background}"/><rect width="${l.width}" height="${l.height}" fill="url(#wbg-${id})"/><rect width="${l.width}" height="${l.height}" fill="url(#wglow-${id})"/><rect width="${l.width}" height="${l.height}" filter="url(#wgrain-${id})" opacity="${p.grain}"/><rect width="${l.width}" height="${l.height}" fill="url(#wvig-${id})"/><g filter="url(#wlift-${id})" transform="${transform}">${svg.trim()}</g></svg>`;
}
function maskOverlay(l,lang){
 const w=l.width,h=l.height,light=luminance(l.background)>.5,ink=light?'#2b2721':'#ffffff',soft=light?'#2b272159':'#999999a6';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" aria-hidden="true"><g fill="${ink}" text-anchor="middle" font-family="sans-serif"><text x="${w/2}" y="${h*.11}" font-size="${w*.035}">${escText(i18n.t('wall.maskDate',null,lang))}</text><text x="${w/2}" y="${h*.25}" font-size="${w*.25}">09:24</text></g><g fill="${soft}"><circle cx="${w*.17}" cy="${h*.945}" r="${w*.06}"/><circle cx="${w*.83}" cy="${h*.945}" r="${w*.06}"/><rect x="${w*.35}" y="${h*.975}" width="${w*.3}" height="${h*.004}" rx="5"/></g></svg>`;
}
function escText(value){return String(value).replace(/[&<>]/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
root.TrailWallpaper={DEVICES,THEMES,layout,render,maskOverlay,luminance,paperOf,background,palette};
if(typeof module!=='undefined')module.exports=root.TrailWallpaper;
})(globalThis);
