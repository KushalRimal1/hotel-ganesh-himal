(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.HotelStayEnquiry = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  const DAY = 86400000;
  function todayInNepal(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
    const value = type => parts.find(part => part.type === type).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  }
  function dateValue(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
    const parsed = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value ? parsed : NaN;
  }
  function nextDay(value) {
    const date = dateValue(value);
    return Number.isFinite(date) ? new Date(date + DAY).toISOString().slice(0, 10) : '';
  }
  function error(message, field) { return Object.assign(new Error(message), { field }); }
  function prepare(values, hotel, rooms, topic = 'Rooms & rates', now = new Date()) {
    const checkIn = values.checkIn || '', checkOut = values.checkOut || '';
    const guests = Number(values.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > 100) throw error('Please choose between 1 and 100 guests.', 'guests');
    if (Boolean(checkIn) !== Boolean(checkOut)) throw error('Please choose both arrival and departure dates, or leave both blank.', checkIn ? 'checkOut' : 'checkIn');
    let nights = null;
    if (checkIn) {
      const start = dateValue(checkIn), end = dateValue(checkOut);
      if (!Number.isFinite(start)) throw error('Please choose a valid arrival date.', 'checkIn');
      if (!Number.isFinite(end)) throw error('Please choose a valid departure date.', 'checkOut');
      if (checkIn < todayInNepal(now)) throw error('Your arrival date cannot be in the past in Nepal.', 'checkIn');
      if (end <= start) throw error('Departure must be after your arrival date.', 'checkOut');
      nights = Math.round((end - start) / DAY);
    }
    const room = values.room ? rooms.find(room => room.id === values.room) : null;
    if (values.room && !room) throw error('Please choose a current room option.', 'room');
    const notes = String(values.notes || '').trim();
    if (notes.length > 500) throw error('Please keep your additional details within 500 characters.', 'notes');
    const format = value => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(dateValue(value)));
    const lines = [
      `Namaste! I would like to enquire about ${topic.toLowerCase()} at ${hotel.name}.`, '',
      ...(nights !== null ? [`Arrival: ${format(checkIn)}`, `Departure: ${format(checkOut)}`, `Length of stay: ${nights} ${nights === 1 ? 'night' : 'nights'}`] : ['Dates: Not decided yet']),
      `Guests: ${guests}`, `Preferred room: ${room ? room.name : 'Please suggest a suitable room'}`,
      ...(room ? [`Listed room rate: ${room.price} (please confirm the rate and what it includes)`] : []),
      ...(notes ? ['', `Additional details: ${notes}`] : []), '',
      'Please confirm availability, the final price, and any arrival arrangements. Thank you!'
    ];
    return {
      message: lines.join('\n'), nights,
      summary: `${nights !== null ? `${nights} ${nights === 1 ? 'night' : 'nights'}` : 'Flexible dates'} · ${guests} ${guests === 1 ? 'guest' : 'guests'} · ${room ? room.name : 'Room advice welcome'}`
    };
  }
  return { todayInNepal, nextDay, prepare };
});
