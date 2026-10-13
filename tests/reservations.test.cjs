const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('fs'),os=require('os'),path=require('path');
const {createReservationStore}=require('../lib/reservations');
const {createBackend,getBackend}=require('../lib/backend');
const {createCalendar}=require('../lib/reservation-calendar');
const {createSiteAdmin}=require('../lib/site-admin');
const datePolicy=require('../public/stay-enquiry');
const site={hotelData:JSON.parse(fs.readFileSync(path.join(__dirname,'../data/hotel.json'),'utf8'))};
const clock=()=>new Date('2026-10-13T12:00:00Z');
const guest={name:'Trekking Guest',email:'guest@example.com',phone:'+977 9800000000',roomId:'super-deluxe',checkIn:'2026-10-20',checkOut:'2026-10-23',guests:2,roomsNeeded:1,notes:'Morning arrival'};
function fixture(t){const dataDir=fs.mkdtempSync(path.join(os.tmpdir(),'hotel-reservation-'));t.after(()=>fs.rmSync(dataDir,{recursive:true,force:true}));return {dataDir,store:createReservationStore({dataDir,site:()=>site,clock,environment:{FEEDBACK_TO:'owner@example.com'}})};}
function configure(store,room={enabled:true,inventory:1,blockedDates:[]},enabled=true){const snapshot=store.adminSnapshot();return store.saveAvailability({version:snapshot.version,enabled,rooms:{'super-deluxe':room}});}
function saved(store,reference){return store.adminSnapshot().bookings.find(record=>record.reference===reference);}
test('requests persist, repeated submissions reuse their reference, and status lookup keeps private fields private',t=>{
  const {store,dataDir}=fixture(t);const booking=store.create(guest);
  assert.match(booking.reference,/^GH-[A-F0-9]{20}$/);assert.equal(booking.status,'pending');
  assert.equal(store.create(guest).reference,booking.reference);assert.equal(store.adminSnapshot().bookings.length,1);
  assert.equal(store.pendingNotifications().length,2);
  const record=saved(store,booking.reference);store.update(record.id,{revision:record.revision,adminNotes:'Private hotel information',guestMessage:'We are checking your request.'});
  const fresh=createReservationStore({dataDir,site:()=>site,clock});const result=fresh.lookup(booking.reference,guest.email.toUpperCase());
  assert.equal(result.guestMessage,'We are checking your request.');assert.ok(!JSON.stringify(result).includes('Private hotel information'));assert.ok(!('email'in result));assert.ok(!('adminNotes'in result));
  assert.throws(()=>fresh.lookup(booking.reference,'wrong@example.com'),error=>error.status===404);
});
test('confirmation enforces nightly inventory and cancellation frees capacity; stale updates are rejected',t=>{
  const {store}=fixture(t);configure(store);
  const first=store.create(guest),second=store.create({...guest,email:'second@example.com'});
  const a=saved(store,first.reference),b=saved(store,second.reference);
  store.update(a.id,{revision:a.revision,status:'confirmed',agreedPrice:'$50 USD, rate basis agreed directly'});
  assert.throws(()=>store.update(b.id,{revision:b.revision,status:'confirmed'}),error=>error.status===409);
  assert.equal(store.availability(guest.checkIn,guest.checkOut).rooms.find(room=>room.id===guest.roomId).accepting,false);
  assert.throws(()=>store.update(a.id,{revision:1,status:'cancelled'}),error=>error.status===409);
  const confirmed=saved(store,first.reference);assert.throws(()=>store.remove(confirmed.id,confirmed.revision),error=>error.status===409);
  store.update(confirmed.id,{revision:confirmed.revision,status:'cancelled'});
  assert.equal(store.update(b.id,{revision:b.revision,status:'confirmed'}).status,'confirmed');
});
test('departure is exclusive and adjacent stays can share configured inventory',t=>{
  const {store}=fixture(t);configure(store);
  const a=store.create(guest),b=store.create({...guest,email:'next@example.com',checkIn:guest.checkOut,checkOut:'2026-10-25'});
  for(const booking of [a,b]){const record=saved(store,booking.reference);store.update(record.id,{revision:record.revision,status:'confirmed'});}
  assert.equal(store.adminSnapshot().bookings.filter(booking=>booking.status==='confirmed').length,2);
});
test('closed nights and pauses are enforced without inventing availability or cancelling confirmed stays',t=>{
  const {store}=fixture(t);
  assert.ok(store.availability().rooms.find(room=>room.id===guest.roomId).message.includes('confirmed by the hotel'));
  configure(store,{enabled:true,inventory:0,blockedDates:['2026-10-21']});assert.throws(()=>store.create(guest),error=>error.status===409);
  configure(store);const booking=store.create(guest);const record=saved(store,booking.reference);store.update(record.id,{revision:record.revision,status:'confirmed'});
  assert.throws(()=>configure(store,{enabled:true,inventory:1,blockedDates:['2026-10-21']}),error=>error.status===409);
  configure(store,{enabled:false,inventory:1,blockedDates:[]},false);
  assert.equal(store.lookup(booking.reference,guest.email).status,'confirmed');assert.throws(()=>store.create({...guest,email:'new@example.com'}),error=>error.status===503);
  const manual=store.create({...guest,email:'offline@example.com',checkIn:'2026-10-25',checkOut:'2026-10-26'},true);assert.equal(manual.status,'pending');
});
test('invalid requests and stale configuration saves cannot corrupt stored data',t=>{
  const {store}=fixture(t);
  for(const changes of [{name:'Name\nInjected'},{email:'bad'},{checkIn:'2026-10-12'},{checkOut:guest.checkIn},{checkIn:'2026-02-30'},{guests:0},{roomsNeeded:31},{roomId:'deleted-room'},{website:'spam'}])assert.throws(()=>store.create({...guest,...changes}));
  assert.equal(store.adminSnapshot().bookings.length,0);
  const old=store.adminSnapshot();configure(store);assert.throws(()=>store.saveAvailability({version:old.version,enabled:false,rooms:{}}),error=>error.status===409);
  assert.throws(()=>configure(store,{enabled:true,inventory:1,blockedDates:['2026-02-30']}),error=>error.status===400);
});
test('reservation notifications survive failed delivery and are retried once, alongside the feedback queue',async t=>{
  const {store,dataDir}=fixture(t);store.create(guest);let fail=true;const deliveries=[];
  const backend=createBackend({dataDir,smtp:{SMTP_FROM:'hotel@example.com'},transport:{sendMail:async message=>{if(fail)throw new Error('mail unavailable');deliveries.push(message);}}});t.after(()=>backend.close());
  await backend.deliverFeedback();assert.equal(store.pendingNotifications().length,2);
  fail=false;await backend.deliverFeedback();assert.equal(store.pendingNotifications().length,0);assert.equal(deliveries.length,2);assert.ok(deliveries.some(message=>message.to==='guest@example.com'));assert.ok(deliveries.some(message=>message.to==='owner@example.com'));
  await backend.deliverFeedback();assert.equal(deliveries.length,2);
});
test('calendar exports are confirmed-only, escape content, and cancelled records can be deleted privately',t=>{
  const {store}=fixture(t);const booking=store.create(guest);assert.throws(()=>createCalendar(booking,site.hotelData.hotel));
  const record=saved(store,booking.reference);store.update(record.id,{revision:record.revision,status:'confirmed',adminNotes:'Do not publish me',agreedPrice:'Quoted terms; confirmed'});
  const confirmed=store.lookup(booking.reference,guest.email);const ics=createCalendar(confirmed,site.hotelData.hotel,clock());assert.ok(ics.includes('DTSTART;VALUE=DATE:20261020'));assert.ok(ics.includes('DTEND;VALUE=DATE:20261023'));assert.ok(ics.includes('STATUS:CONFIRMED'));assert.ok(!ics.includes('Do not publish me'));assert.ok(ics.includes('terms\\;'));
  for(const line of ics.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
  const a=saved(store,booking.reference);store.update(a.id,{revision:a.revision,status:'cancelled'});const b=saved(store,booking.reference);store.remove(b.id,b.revision);assert.equal(store.adminSnapshot().bookings.length,0);assert.equal(store.pendingNotifications().length,0);assert.throws(()=>store.lookup(booking.reference,guest.email),error=>error.status===404);
});
test('room categories with future confirmed reservations cannot be removed from website content',t=>{
  const {dataDir}=fixture(t);const manager=createSiteAdmin({dataDir});const store=createReservationStore({dataDir,site:()=>manager.read(),environment:{}});
  const start=datePolicy.nextDay(datePolicy.todayInNepal()),end=datePolicy.nextDay(start);const booking=store.create({...guest,checkIn:start,checkOut:end});const record=saved(store,booking.reference);store.update(record.id,{revision:record.revision,status:'confirmed'});
  const content=manager.snapshot();content.hotelData.rooms=content.hotelData.rooms.filter(room=>room.id!==guest.roomId);
  assert.throws(()=>manager.save(content),error=>error.status===409);
  const confirmed=saved(store,booking.reference);store.update(confirmed.id,{revision:confirmed.revision,status:'cancelled'});assert.ok(manager.save(content));
});
test('a rejected guest recipient does not block Gmail owner alerts or other guests, including legacy queued notifications',async t=>{
  const {store,dataDir}=fixture(t);const first=store.create(guest),second=store.create({...guest,email:'valid-guest@example.com'});
  const filename=path.join(dataDir,'reservations.json');const legacy=JSON.parse(fs.readFileSync(filename,'utf8'));legacy.notifications.forEach(item=>delete item.kind);fs.writeFileSync(filename,JSON.stringify(legacy));
  let rejectGuest=true;const attempts=[];const backend=createBackend({dataDir,smtp:{SMTP_FROM:'sender@example.com',FEEDBACK_TO:'current-owner@example.com'},transport:{sendMail:async message=>{attempts.push(message.to);if(rejectGuest&&message.to===guest.email)throw Object.assign(new Error('Provider response should not be exposed'),{code:'EENVELOPE',responseCode:550,command:'RCPT TO'});return {accepted:[message.to],messageId:'test-message-id'};}}});t.after(()=>backend.close());
  await backend.deliverFeedback();assert.equal(attempts[0],'current-owner@example.com');assert.equal(attempts.filter(to=>to==='current-owner@example.com').length,2);assert.ok(attempts.includes('valid-guest@example.com'));
  assert.equal(store.pendingNotifications().length,1);assert.equal(store.lookup(first.reference,guest.email).emailDelivery,'failed');assert.equal(store.lookup(second.reference,'valid-guest@example.com').emailDelivery,'accepted');
  const error=store.adminSnapshot().emailErrors[0];assert.equal(error.code,'EENVELOPE');assert.equal(error.responseCode,550);assert.ok(!error.message.includes('Provider response should not be exposed'));
  rejectGuest=false;await backend.deliverFeedback();assert.equal(store.pendingNotifications().length,0);assert.equal(store.adminSnapshot().emailErrors.length,0);assert.equal(store.lookup(first.reference,guest.email).emailDelivery,'accepted');
});
test('hot reload replaces a legacy mail worker and changed SMTP settings rebuild the cached transport',t=>{
  const {dataDir}=fixture(t);const instanceKey=Symbol.for('hotel-ganesh-himal.backend'),configKey=Symbol.for('hotel-ganesh-himal.backend-configuration');const previousInstance=globalThis[instanceKey],previousConfiguration=globalThis[configKey];
  const keys=['HOTEL_DATA_DIR','SMTP_HOST','FEEDBACK_TO'];const previousEnvironment=Object.fromEntries(keys.map(key=>[key,process.env[key]]));let legacyClosed=false;
  process.env.HOTEL_DATA_DIR=dataDir;process.env.SMTP_HOST='';process.env.FEEDBACK_TO='first@example.com';globalThis[instanceKey]={close(){legacyClosed=true;}};delete globalThis[configKey];
  t.after(()=>{globalThis[instanceKey]?.close?.();if(previousInstance===undefined)delete globalThis[instanceKey];else globalThis[instanceKey]=previousInstance;if(previousConfiguration===undefined)delete globalThis[configKey];else globalThis[configKey]=previousConfiguration;for(const key of keys){if(previousEnvironment[key]===undefined)delete process.env[key];else process.env[key]=previousEnvironment[key];}});
  const current=getBackend();assert.equal(legacyClosed,true);assert.equal(typeof current.deliverFeedback,'function');assert.equal(getBackend(),current);process.env.FEEDBACK_TO='changed@example.com';assert.notEqual(getBackend(),current);
});
