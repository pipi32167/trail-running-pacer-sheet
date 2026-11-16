'use strict';
importScripts('./pace-time.js?v=frontend-v27','./pace-svg.js?v=frontend-v27','./pace-engine.js?v=frontend-v27');
self.onmessage = ({data}) => {
  try { self.postMessage({result:TrailPace.process(data.body,data.generate)}); }
  catch (error) {self.postMessage({error:{message:error.message,code:error.code||'invalid_input',details:error.details??null}});}
};
