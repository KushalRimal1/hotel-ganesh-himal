const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createWhatsAppUrl}=require('../lib/reservation-whatsapp');
const hotel={name:'Hotel Ganesh Himal',phone:'+977 9841425409'};
const booking={reference:'GH-0123456789ABCDEF0123',status:'pending',name:'Guest & family',roomName:'Super Deluxe Room',checkIn:'2026-10-22',checkOut:'2026-10-24',guests:4,roomsNeeded:2,guestPhone:'+977 9800000000',guestNotes:'Morning flight & vegetarian meals.',adminNotes:'PRIVATE HOTEL NOTE'};
test('WhatsApp message carries the saved request and contact details with safe URL encoding',()=>{
  const url=new URL(createWhatsAppUrl(booking,hotel,'guest@example.com'));assert.equal(url.origin,'https://wa.me');assert.equal(url.pathname,'/9779841425409');const text=url.searchParams.get('text');
  for(const value of [booking.reference,booking.name,booking.roomName,booking.checkIn,booking.checkOut,booking.guestPhone,booking.guestNotes,'guest@example.com','Guests: 4','Rooms requested: 2'])assert.ok(text.includes(value));assert.ok(text.includes('Awaiting hotel confirmation'));assert.ok(text.includes('Please confirm availability'));assert.ok(!text.includes(booking.adminNotes));
});
test('tracked confirmed requests use their status/terms and the selected hotel phone',()=>{
  const url=new URL(createWhatsAppUrl({...booking,status:'confirmed',agreedPrice:'USD $50; arrangements agreed'},hotel,'guest@example.com','+977 9851039770'));assert.equal(url.pathname,'/9779851039770');const text=url.searchParams.get('text');assert.ok(text.includes('Confirmed by the hotel'));assert.ok(text.includes('USD $50; arrangements agreed'));assert.ok(!text.includes('Please confirm availability'));
  assert.equal(createWhatsAppUrl(booking,hotel,'guest@example.com','not a phone'),'');
});
