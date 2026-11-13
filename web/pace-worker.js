'use strict';
importScripts('./pace-time.js?v=frontend-v8','./pace-svg.js?v=frontend-v8','./pace-engine.js?v=frontend-v8');
self.onmessage = ({data}) => {
  try { self.postMessage({result:TrailPace.process(data.body,data.generate)}); }
  catch (error) {self.postMessage({error:{message:error.message,code:error.code||'invalid_input',details:error.details??null}});}
};
