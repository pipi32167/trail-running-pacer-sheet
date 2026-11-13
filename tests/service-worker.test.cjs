'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {join}=require('node:path');
const vm=require('node:vm');
function simulate(request,offline=false){
 const handlers={},scope='https://trail.test/';let response;
 const stored=new Map([[scope+'pace-worker.js?v=old',{source:'old-worker'}],[scope,{source:'offline-page'}]]);
 const cache={async match(req,options){const target=typeof req==='string'?req:req.url;if(!options.ignoreSearch)return stored.get(target);for(const [url,value]of stored)if(new URL(url).pathname===new URL(target).pathname)return value;},async put(){}};
 const context={URL,Promise,self:{location:{origin:'https://trail.test'},registration:{scope},addEventListener(name,handler){handlers[name]=handler;}},caches:{async open(){return cache;}},async fetch(){if(offline)throw new Error('offline');return {source:'network',ok:true,clone(){return this;}};}};
 vm.runInNewContext(readFileSync(join(__dirname,'../web/service-worker.js'),'utf8'),context);
 handlers.fetch({request:{method:'GET',...request},respondWith(p){response=p;}});
 return response;
}
test('new worker version must not reuse an older cached worker',async()=>{
 const response=await simulate({url:'https://trail.test/pace-worker.js?v=new',mode:'same-origin'});
 assert.equal(response.source,'network');
});
test('offline navigation can still reuse the cached page',async()=>{
 const response=await simulate({url:'https://trail.test/?fix=time-labels',mode:'navigate'},true);
 assert.equal(response.source,'offline-page');
});
