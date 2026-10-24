const fs = require('fs');
const path = require('path');
const { AsyncLocalStorage } = require('async_hooks');
const { createHash, randomUUID } = require('crypto');
const { fetch: rawFetch } = require('undici');

// Next can load the same module in separate route chunks. Transactions must
// share one async context with backend instances reused across those routes.
const contextKey=Symbol.for('hotel-ganesh-himal.storage-context-v1');
const context = globalThis[contextKey] || (globalThis[contextKey]=new AsyncLocalStorage());
const files = new Set(['feedback.json','subscribers.json','reservations.json','site-content.json']);
const STATE_KEY = 'state-v1';
let testFactory;

function isCloud(environment = process.env) {
  if (environment.HOTEL_STORAGE_DRIVER === 'local') return false;
  return environment.HOTEL_STORAGE_DRIVER === 'netlify' || environment.NETLIFY === 'true' || Boolean(environment.NETLIFY_BLOBS_CONTEXT || environment.AWS_LAMBDA_FUNCTION_NAME);
}
function unavailable() { return Object.assign(new Error('Cloud storage is unavailable. Check the Netlify Blobs connection and retry.'), { status:503 }); }
function storeName(kind, environment = process.env) {
  const preview = environment.CONTEXT && environment.CONTEXT !== 'production' && environment.CONTEXT !== 'dev';
  const scope = preview ? `-preview-${createHash('sha256').update(environment.BRANCH || environment.DEPLOY_ID || environment.CONTEXT).digest('hex').slice(0,16)}` : '';
  return `hotel-${kind}${scope}`;
}
async function blobStore(kind) {
  if (testFactory) return testFactory(kind);
  try {
    const { getStore } = await import('@netlify/blobs');
    let writeFailure=null;
    const options = { name:storeName(kind), consistency:'strong', fetch:async(url,init)=>{
      // Next patches global fetch with response deduplication/caching. Blobs
      // needs raw responses (including cancellable 404 bodies) and fresh state.
      const response=await rawFetch(url,init);
      if(init?.method?.toLowerCase()==='put')writeFailure=[200,412].includes(response.status)?null:unavailable();
      return response;
    } };
    if (process.env.NETLIFY_SITE_ID && process.env.NETLIFY_AUTH_TOKEN) {
      options.siteID=process.env.NETLIFY_SITE_ID; options.token=process.env.NETLIFY_AUTH_TOKEN;
    }
    const store=getStore(options);
    // The SDK reports conditional-write outcomes; also reject non-success HTTP
    // outcomes explicitly so a denied/failed write can never be acknowledged.
    for(const method of ['set','setJSON']){
      const original=store[method].bind(store);
      store[method]=async(...args)=>{writeFailure=null;const result=await original(...args);if(writeFailure)throw writeFailure;return result;};
    }
    return store;
  } catch { throw unavailable(); }
}
function active() { const value=context.getStore(); if(!value) throw unavailable(); return value; }
function readJSON(name, directory, fallback) {
  if (!files.has(name)) throw new Error('Unknown private storage key.');
  if (isCloud()) return structuredClone(active().state.files[name] ?? fallback);
  const filename=path.join(/* turbopackIgnore: true */ directory,name);
  return fs.existsSync(/* turbopackIgnore: true */ filename) ? JSON.parse(fs.readFileSync(/* turbopackIgnore: true */ filename,'utf8')) : structuredClone(fallback);
}
function writeJSON(name, directory, value) {
  if (!files.has(name)) throw new Error('Unknown private storage key.');
  if (isCloud()) {
    const current=active(); if(!current.write) throw new Error('Write attempted in a read-only storage transaction.');
    current.state.files[name]=structuredClone(value); current.dirty=true; return;
  }
  fs.mkdirSync(directory,{recursive:true});
  const filename=path.join(/* turbopackIgnore: true */ directory,name),temporary=`${filename}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');fs.renameSync(temporary,filename);
}
async function run(callback, { write=false, attempts=8 } = {}) {
  if (!isCloud()) return callback();
  if (context.getStore()) {
    if(write&&!active().write)throw new Error('Cannot nest a write transaction inside a read transaction.');
    return callback();
  }
  const store=await blobStore('private');
  for(let attempt=0;attempt<attempts;attempt++){
    let snapshot;
    try { snapshot=await store.getWithMetadata(STATE_KEY,{type:'json',consistency:'strong'}); } catch { throw unavailable(); }
    if(snapshot&&!snapshot.etag)throw unavailable();
    const state=snapshot?.data || {formatVersion:1,files:{},limits:{}};
    if(state.formatVersion!==1||!state.files||typeof state.files!=='object')throw unavailable();
    const transaction={state:structuredClone(state),write,dirty:false};
    const result=await context.run(transaction,callback);
    if(!transaction.dirty)return result;
    let saved;
    try { saved=await store.setJSON(STATE_KEY,transaction.state,snapshot?{onlyIfMatch:snapshot.etag}:{onlyIfNew:true}); } catch { throw unavailable(); }
    if(saved.modified)return result;
    await new Promise(resolve=>setTimeout(resolve,Math.min(10*(attempt+1),70)));
  }
  throw Object.assign(new Error('Another request updated the data. Please retry.'),{status:409});
}
function read(callback) { return run(callback); }
function write(callback) { return run(callback,{write:true}); }
async function rateLimited(request, operation, maximum, windowMs=900000) {
  if(!isCloud())return false;
  const ip=request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
  const key=createHash('sha256').update(`${operation}:${ip}:${process.env.ADMIN_SESSION_SECRET || 'hotel'}`).digest('hex');
  return write(()=>{
    const current=active(),now=Date.now(); current.state.limits ||= {};
    for(const [id,record]of Object.entries(current.state.limits))if(now-record.started>=windowMs)delete current.state.limits[id];
    const record=current.state.limits[key] || {started:now,count:0};record.count++;current.state.limits[key]=record;current.dirty=true;
    return record.count>maximum;
  });
}
module.exports={isCloud,readJSON,writeJSON,read,write,run,rateLimited,blobStore,storeName,STATE_KEY,
  setStoreFactoryForTests(factory){if(process.env.NODE_ENV==='production')throw new Error('Test storage is disabled in production.');testFactory=factory;}};
