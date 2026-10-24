const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs');
const storage=require('../lib/storage');
const {createBackend}=require('../lib/backend');
const {createSiteAdmin}=require('../lib/site-admin');
const {createReservationStore}=require('../lib/reservations');
const {createMailTransport}=require('../lib/mail-transport');
const media=require('../lib/media');
const site=require('../pages');

function fixture(t){
  const previous=process.env.HOTEL_STORAGE_DRIVER;process.env.HOTEL_STORAGE_DRIVER='netlify';
  const values=new Map();let revision=0;
  const factory=kind=>({
    async getWithMetadata(key,{type}={}){await new Promise(resolve=>setImmediate(resolve));const item=values.get(`${kind}:${key}`);if(!item)return null;return {etag:item.etag,data:type==='arrayBuffer'?Uint8Array.from(item.data).buffer:structuredClone(item.data),metadata:item.metadata};},
    async setJSON(key,value,options={}){const id=`${kind}:${key}`,current=values.get(id);if(options.onlyIfNew&&current||options.onlyIfMatch&&current?.etag!==options.onlyIfMatch)return {modified:false};const etag=`"${++revision}"`;values.set(id,{data:structuredClone(value),etag});return {modified:true,etag};},
    async set(key,value,options={}){const id=`${kind}:${key}`;if(options.onlyIfNew&&values.has(id))return {modified:false};const etag=`"${++revision}"`;values.set(id,{data:Uint8Array.from(value),etag,metadata:options.metadata});return {modified:true,etag};},
    async list(){return {blobs:[...values.keys()].filter(key=>key.startsWith(`${kind}:`)).map(key=>({key:key.slice(kind.length+1)}))};}
  });
  storage.setStoreFactoryForTests(factory);
  t.after(()=>{storage.setStoreFactoryForTests(undefined);if(previous===undefined)delete process.env.HOTEL_STORAGE_DRIVER;else process.env.HOTEL_STORAGE_DRIVER=previous;});
  return {values,factory};
}
function request(email='guest@example.com'){return new Request('https://hotel.example/api/feedback',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'Cloud guest',email,topic:'Hotel stay',rating:5,message:'A genuinely welcoming mountain hotel.',publishReview:true})});}

test('read-only startup and public rendering do not create or write private files',async t=>{
  fixture(t);const mkdir=fs.mkdirSync,write=fs.writeFileSync,rename=fs.renameSync;
  const deny=()=>{throw Object.assign(new Error('read-only filesystem'),{code:'EROFS'});};fs.mkdirSync=fs.writeFileSync=fs.renameSync=deny;
  t.after(()=>{fs.mkdirSync=mkdir;fs.writeFileSync=write;fs.renameSync=rename;});
  const backend=createBackend({dataDir:'/var/task/data',smtp:{}});t.after(()=>backend.close());backend.initialize();
  const home=await storage.read(()=>site.renderPage('/'));const contact=await storage.read(()=>site.renderPage('/contact'));
  assert.ok(home.includes('Hotel Ganesh Himal'));assert.ok(contact.includes('id="stay-enquiry-form"'));assert.ok(!contact.includes('id="reservation-requests"'));
  await storage.write(()=>backend.submitFeedback(request()));assert.equal((await storage.read(()=>backend.getAdminReviews())).length,1);
});
test('concurrent writes retry against fresh state without losing feedback or subscriber data',async t=>{
  const {values}=fixture(t);const backend=createBackend({smtp:{}});t.after(()=>backend.close());
  const responses=await Promise.all(Array.from({length:6},(_,index)=>storage.write(()=>backend.submitFeedback(request(`guest${index}@example.com`)))));
  assert.ok(responses.every(response=>response.status===202));assert.equal((await storage.read(()=>backend.getAdminReviews())).length,6);
  await Promise.all(Array.from({length:5},()=>storage.write(()=>backend.subscribe(new Request('https://hotel.example/api/subscribers',{method:'POST',body:JSON.stringify({email:'same@example.com'})})))));
  assert.equal((await storage.read(()=>backend.getAdminSubscribers())).length,1);assert.ok(values.has(`private:${storage.STATE_KEY}`));
});
test('published reviews and site edits persist across instances and remain private where required',async t=>{
  fixture(t);const a=createBackend({smtp:{}});t.after(()=>a.close());const response=await storage.write(()=>a.submitFeedback(request()));const id=(await response.json()).reference;
  assert.equal((await storage.read(()=>a.getPublicReviews())).totalCount,0);await storage.write(()=>a.updateAdminReview(id,{action:'publish'}));
  const b=createBackend({smtp:{}});t.after(()=>b.close());const reviews=await storage.read(()=>b.getPublicReviews());assert.equal(reviews.totalCount,1);assert.ok(!JSON.stringify(reviews).includes('guest@example.com'));
  const manager=createSiteAdmin();const draft=await storage.read(()=>manager.snapshot());draft.hotelData.rooms[0].price='$28 USD';await storage.write(()=>manager.save(draft));assert.equal((await storage.read(()=>createSiteAdmin().read())).hotelData.rooms[0].price,'$28 USD');await assert.rejects(storage.write(()=>manager.save(draft)),error=>error.status===409);
});
test('cloud media uses an isolated namespace and blocks arbitrary private-state keys',async t=>{
  fixture(t);const bytes=Buffer.from([255,216,255,...Array(20).fill(0)]),photo=await media.saveImage(bytes);const file=photo.url.split('/').pop();assert.deepEqual((await media.readImage(file)).body,bytes);assert.equal(await media.readImage(storage.STATE_KEY),null);assert.equal(await media.readImage('../state-v1'),null);assert.ok((await media.listImages()).includes(photo.url));
});
test('email leases prevent concurrent workers from sending the same notification twice',async t=>{
  fixture(t);let sends=0;const transport={sendMail:async()=>{sends++;await new Promise(resolve=>setTimeout(resolve,10));return {messageId:'provider-test'};}};
  const a=createBackend({smtp:{FEEDBACK_TO:'owner@example.com'},transport}),b=createBackend({smtp:{FEEDBACK_TO:'owner@example.com'},transport});t.after(()=>{a.close();b.close();});await storage.write(()=>a.submitFeedback(request()));await Promise.all([a.deliverFeedback(),b.deliverFeedback()]);assert.equal(sends,1);assert.equal((await storage.read(()=>a.getAdminReviews()))[0].delivery,'sent');
});
test('atomic reservation confirmations preserve configured capacity across competing workers',async t=>{
  fixture(t);const store=createReservationStore();const config=await storage.read(()=>store.adminSnapshot());await storage.write(()=>store.saveAvailability({version:config.version,enabled:true,rooms:{'super-deluxe':{enabled:true,inventory:1,blockedDates:[]}}}));
  const datePolicy=require('../public/stay-enquiry');const start=datePolicy.nextDay(datePolicy.todayInNepal()),end=datePolicy.nextDay(start);const payload={name:'Concurrent guest',email:'one@example.com',roomId:'super-deluxe',checkIn:start,checkOut:end,guests:2,roomsNeeded:1};
  await storage.write(()=>store.create(payload));await storage.write(()=>store.create({...payload,email:'two@example.com'}));const records=(await storage.read(()=>store.adminSnapshot())).bookings;
  const results=await Promise.allSettled(records.map(record=>storage.write(()=>store.update(record.id,{revision:record.revision,status:'confirmed'}))));assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal((await storage.read(()=>store.adminSnapshot())).bookings.filter(record=>record.status==='confirmed').length,1);
});
test('unavailable cloud storage fails without acknowledging a private write or falling back to disk',async t=>{
  fixture(t);storage.setStoreFactoryForTests(()=>({getWithMetadata:async()=>{throw new Error('provider unavailable');}}));await assert.rejects(storage.write(()=>storage.writeJSON('feedback.json','/var/task/data',[])),error=>error.status===503);
});
test('preview store names are isolated while production names remain stable across deploys',()=>{
  assert.equal(storage.storeName('private',{CONTEXT:'production',DEPLOY_ID:'first'}),storage.storeName('private',{CONTEXT:'production',DEPLOY_ID:'second'}));assert.notEqual(storage.storeName('private',{CONTEXT:'production'}),storage.storeName('private',{CONTEXT:'deploy-preview',BRANCH:'test'}));
});
test('separate Next route module instances share transactions with cached backend instances',async t=>{
  const {factory}=fixture(t),backend=createBackend({smtp:{}});t.after(()=>backend.close());const filename=require.resolve('../lib/storage'),original=require.cache[filename];delete require.cache[filename];const routeStorage=require('../lib/storage');routeStorage.setStoreFactoryForTests(factory);t.after(()=>{routeStorage.setStoreFactoryForTests(undefined);require.cache[filename]=original;});
  const response=await routeStorage.write(()=>backend.submitFeedback(request()));assert.equal(response.status,202);assert.equal((await routeStorage.read(()=>backend.getAdminReviews())).length,1);
});
test('Resend uses server-only authorization and idempotency, and provider failures do not mark emails sent',async()=>{
  let captured;const transport=createMailTransport({RESEND_API_KEY:'test-only-key',EMAIL_FROM:'sender@example.com',FEEDBACK_TO:'owner@example.com'},async(url,options)=>{captured={url,options};return Response.json({id:'accepted-id'});});
  const result=await transport.sendMail({to:'owner@example.com',subject:'Request',text:'Private details',replyTo:{address:'guest@example.com'},idempotencyKey:'stable-id'});assert.equal(result.messageId,'accepted-id');assert.equal(captured.options.headers['Idempotency-Key'],'stable-id');assert.equal(JSON.parse(captured.options.body).reply_to,'guest@example.com');
  const failing=createMailTransport({RESEND_API_KEY:'test-only-key',EMAIL_FROM:'sender@example.com',FEEDBACK_TO:'owner@example.com'},async()=>Response.json({message:'Provider rejected'},{status:429}));await assert.rejects(failing.sendMail({to:'owner@example.com',subject:'x',text:'x'}),error=>error.code==='EMAIL_RATE_LIMIT');
});
test('Resend rejection diagnostics preserve the reason without logging credentials or addresses',async()=>{
  const transport=createMailTransport({RESEND_API_KEY:'test-only-key',EMAIL_FROM:'sender@example.com',FEEDBACK_TO:'owner@example.com'},async()=>Response.json({name:'validation_error',message:'Invalid sender sender@example.com\ncredential test-only-key'},{status:422}));
  await assert.rejects(transport.sendMail({to:'owner@example.com',subject:'Test',text:'Test'}),error=>{
    assert.equal(error.code,'EMAIL_REJECTED');assert.equal(error.responseCode,422);
    assert.match(error.providerError,/validation_error: Invalid sender/);
    assert.doesNotMatch(error.providerError,/sender@example\.com|test-only-key|[\r\n]/);
    return true;
  });
});
