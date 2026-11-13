'use strict';
const CACHE = 'trail-pacer-static-v24';
const FILES = ['./','./index.html','./style.css?v=frontend-v24','./pace-time.js?v=frontend-v24','./app.js?v=frontend-v24','./pace-worker.js?v=frontend-v24','./pace-engine.js?v=frontend-v24','./pace-svg.js?v=frontend-v24','./pace-wallpaper.js?v=frontend-v24','./favicon.svg','./favicon-32.png','./favicon-16.png','./apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('trail-pacer-static-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.origin!==self.location.origin)return;
  const allowed=FILES.map(p=>new URL(p,self.registration.scope).pathname);
  if(!allowed.includes(url.pathname))return;
  event.respondWith(caches.open(CACHE).then(async cache=>{
    const cached=await cache.match(event.request,{ignoreSearch:event.request.mode==='navigate'});
    if(event.request.mode==='navigate') {
      try {const response=await fetch(event.request);if(response.ok){await cache.put(new URL('./',self.registration.scope),response.clone());return response;}if(cached)return cached;return response;}
      catch(error){if(cached)return cached;throw error;}
    }
    if(cached)return cached;
    return fetch(event.request);
  }));
});
