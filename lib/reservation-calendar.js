function escape(value) { return String(value || '').replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/;/g,'\\;').replace(/,/g,'\\,'); }
function fold(line) { const parts = []; let current = '', bytes = 0; for (const character of line) { const size = new TextEncoder().encode(character).length; if (bytes + size > 73) { parts.push(current); current = ' '; bytes = 1; } current += character; bytes += size; } parts.push(current); return parts.join('\r\n'); }
function createCalendar(booking, hotel, now = new Date()) {
  if (booking.status !== 'confirmed') throw new Error('Calendar downloads are available after hotel confirmation.');
  if (!/^GH-[A-F0-9]{20}$/.test(booking.reference) || !/^\d{4}-\d{2}-\d{2}$/.test(booking.checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(booking.checkOut)) throw new Error('Invalid reservation details.');
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Hotel Ganesh Himal//Confirmed stay//EN','CALSCALE:GREGORIAN','BEGIN:VEVENT',`UID:${booking.reference}@hotel-ganesh-himal`, `DTSTAMP:${now.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}Z/,'Z')}`,`DTSTART;VALUE=DATE:${booking.checkIn.replace(/-/g,'')}`,`DTEND;VALUE=DATE:${booking.checkOut.replace(/-/g,'')}`,`SUMMARY:${escape(`Stay at ${hotel.name}`)}`,`LOCATION:${escape(hotel.address)}`,`DESCRIPTION:${escape(`Confirmed reservation ${booking.reference}\n${booking.roomName}\n${booking.guests} guests · ${booking.roomsNeeded} rooms\n${booking.agreedPrice || 'Confirm pricing with the hotel'}\nContact: ${hotel.phone}`)}`,'STATUS:CONFIRMED','END:VEVENT','END:VCALENDAR'];
  return lines.map(fold).join('\r\n') + '\r\n';
}
module.exports = { createCalendar };
