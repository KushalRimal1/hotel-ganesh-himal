const statusLabels = { pending: 'Awaiting hotel confirmation', confirmed: 'Confirmed by the hotel', declined: 'Not confirmed', cancelled: 'Cancelled' };

function createWhatsAppUrl(booking, hotel, email, phone = hotel.phone) {
  const number = String(phone || '').replace(/\D/g, '');
  if (!/^\d{7,15}$/.test(number)) return '';
  const message = [
    `Namaste ${hotel.name}! I am contacting you about my saved reservation request.`, '',
    `Reference: ${booking.reference}`,
    `Status: ${statusLabels[booking.status] || booking.status}`,
    `Guest: ${booking.name}`,
    `Email: ${email}`,
    ...(booking.guestPhone ? [`Phone / WhatsApp: ${booking.guestPhone}`] : []),
    `Room category: ${booking.roomName}`,
    `Arrival: ${booking.checkIn}`,
    `Departure: ${booking.checkOut}`,
    `Guests: ${booking.guests}`,
    `Rooms requested: ${booking.roomsNeeded}`,
    ...(booking.guestNotes ? ['', `Special requests: ${booking.guestNotes}`] : []),
    ...(booking.agreedPrice ? ['', `Agreed price / terms: ${booking.agreedPrice}`] : []), '',
    booking.status === 'pending' ? 'Please confirm availability, the final price, and our arrangements. Thank you!' : 'Please help me with any updates or arrangements for this request. Thank you!'
  ].join('\n');
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

module.exports = { createWhatsAppUrl };
