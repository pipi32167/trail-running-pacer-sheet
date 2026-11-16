'use strict';
importScripts('./i18n.js?v=frontend-v29','./pace-time.js?v=frontend-v29','./pace-svg.js?v=frontend-v29','./pace-engine.js?v=frontend-v29');
self.onmessage = ({data}) => {
  try { self.postMessage({result:TrailPace.process(data.body,data.generate)}); }
  catch (error) {self.postMessage({error:{message:error.message,code:error.code||'invalid_input',params:error.params??null,details:error.details??null}});}
};
