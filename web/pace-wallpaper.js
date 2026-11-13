'use strict';
/* Fit the existing export into a phone canvas without changing its contents. */
(function(root){
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
 if(value===''||!Number.isFinite(n)||n<min||n>max)throw new Error(`${label}应在 ${min} 至 ${max} 之间。`);
 return n;
}
function luminance(hex){const [r,g,b]=[1,3,5].map((i)=>parseInt(hex.slice(i,i+2),16)/255);return .2126*r+.7152*g+.0722*b;}
function paperOf(svg){const m=/height="100%" fill="(#[0-9a-fA-F]{6})"/.exec(svg);return m?m[1]:'#ffffff';}
/* Background must differ from the table paper, otherwise the margins look like part of the table. */
function background(theme,paper){const darkTable=luminance(paper)<.5;if(theme==='light')return darkTable?'#efe9dc':'#fbf7ef';return darkTable?'#080706':'#14120f';}
function layout(svg,options={}){
 const tag=typeof svg==='string'&&svg.match(/^\s*<svg\b[^>]*>/);
 const width=Number(tag&&tag[0].match(/\bwidth="([\d.]+)"/)?.[1]);
 const height=Number(tag&&tag[0].match(/\bheight="([\d.]+)"/)?.[1]);
 if(!(width>0&&height>0))throw new Error('缺少原版配速表图片，重新生成后再导出。');
 const device=DEVICES[options.device]||DEVICES['iphone-61'];
 const w=Math.round(options.device==='custom'?number(options.width,device.width,640,4096,'宽度'):device.width);
 const h=Math.round(options.device==='custom'?number(options.height,device.height,960,4096,'高度'):device.height);
 const top=number(options.top,27,0,70,'顶部留白');
 const bottom=number(options.bottom,9,0,50,'底部留白');
 const anchor=options.anchor==='center'?'center':'top';
 if(top+bottom>85)throw new Error('上下留白合计不能超过 85%。');
 const rotation=options.rotation===0?0:90;
 const band={left:w*.02,right:w*.98,top:h*top/100,bottom:h*(1-bottom/100)};
 const rotatedWidth=rotation?height:width,rotatedHeight=rotation?width:height;
 const scale=Math.min((band.right-band.left)/rotatedWidth,(band.bottom-band.top)/rotatedHeight);
 const image={width:rotatedWidth*scale,height:rotatedHeight*scale};
 image.x=(w-image.width)/2;
 image.y=anchor==='center'?(band.top+band.bottom-image.height)/2:band.top;
 const theme=options.theme==='light'?'light':'dark',paper=paperOf(svg);
 return {width:w,height:h,source:{width,height},band,image,rotation,scale,anchor,theme,paper,background:background(theme,paper)};
}
function render(svg,options={}){
 const l=layout(svg,options),i=l.image;
 // The source export already touches its bounds. Retain its full viewBox:
 // removing any further margin would cut metadata or the outer table border.
 const transform=`translate(${i.x} ${i.y}) scale(${l.scale}) translate(${l.rotation?l.source.height:0} 0) rotate(${l.rotation})`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${l.width}" height="${l.height}" viewBox="0 0 ${l.width} ${l.height}"><title>原版配速表 · 手机壁纸</title><rect width="${l.width}" height="${l.height}" fill="${l.background}"/><g transform="${transform}">${svg.trim()}</g></svg>`;
}
function maskOverlay(l){
 const w=l.width,h=l.height,light=luminance(l.background)>.5,ink=light?'#2b2721':'#ffffff',soft=light?'#2b272159':'#999999a6';
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" aria-hidden="true"><g fill="${ink}" text-anchor="middle" font-family="sans-serif"><text x="${w/2}" y="${h*.11}" font-size="${w*.035}">11月13日 星期五</text><text x="${w/2}" y="${h*.25}" font-size="${w*.25}">09:24</text></g><g fill="${soft}"><circle cx="${w*.17}" cy="${h*.945}" r="${w*.06}"/><circle cx="${w*.83}" cy="${h*.945}" r="${w*.06}"/><rect x="${w*.35}" y="${h*.975}" width="${w*.3}" height="${h*.004}" rx="5"/></g></svg>`;
}
root.TrailWallpaper={DEVICES,layout,render,maskOverlay,luminance,paperOf,background};
if(typeof module!=='undefined')module.exports=root.TrailWallpaper;
})(globalThis);
