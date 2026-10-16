/* Shared, DOM-free planner rules for the browser, page generator and checks. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./content.js'));
  else root.BonePlanner = factory(root.BoneContent);
})(typeof globalThis === 'object' ? globalThis : this, function(contentAPI) {
  'use strict';

  function createPlanner(data) {
    contentAPI.validateContent(data);
    const { season, hours, planner: rules } = data;
    const year = Number(season.start.slice(0, 4));
    if (Number(season.end.slice(0, 4)) !== year) throw new Error('The concept season must fit within one calendar year.');
    const stopKeys = Object.keys(rules.stops);
    const planKeys = ['version', 'date', 'time', 'guests', 'children', ...stopKeys];
    const allowedTimes = rules.arrivals.map(arrival => arrival.value);
    const allowedDates = [];
    for (let date = new Date(`${season.start}T12:00:00Z`);
      date <= new Date(`${season.end}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + 1)) {
      if (season.weekdays.includes(date.getUTCDay())) allowedDates.push(date.toISOString().slice(0, 10));
    }
    if (!allowedDates.length) throw new Error('The concept season needs at least one open date.');

    const money = amount => {
      if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) {
        throw new TypeError('Prices and estimates must be non-negative numbers.');
      }
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(amount) ? 0 : 2, maximumFractionDigits: 2 }).format(amount);
    };
    const minutes = value => Number(value.split(':')[0]) * 60 + Number(value.split(':')[1]);
    const clockTime = minute => {
      const hour = Math.floor(minute / 60);
      return `${hour % 12 || 12}:${String(minute % 60).padStart(2, '0')} ${hour >= 12 ? 'pm' : 'am'}`;
    };
    const shortTime = value => clockTime(minutes(value)).replace(':00', '');
    const timeRange = (start, end) => {
      const samePeriod = (minutes(start) < 720) === (minutes(end) < 720);
      return `${samePeriod ? shortTime(start).replace(/ (am|pm)$/, '') : shortTime(start)}–${shortTime(end)}`;
    };
    const copy = text => text.replaceAll('{{DAY_RANGE}}', timeRange(hours.open, hours.night))
      .replaceAll('{{NIGHT_TIME}}', shortTime(hours.night))
      .replaceAll('{{FREE_UNDER_AGE}}', rules.freeUnderAge);
    const moodForTime = time => minutes(time) < minutes(hours.night) ? 'day' : 'night';
    const moodArrival = mood => mood === 'night' ? hours.night : hours.open;
    const moodTime = mood => `${timeRange(moodArrival(mood), mood === 'day' ? hours.night : hours.close).toUpperCase()} / ${data.moods[mood].timeDetail}`;
    const dateLabel = value => new Intl.DateTimeFormat('en-US', {
      weekday: 'short', month: 'long', day: 'numeric', timeZone: 'UTC'
    }).format(new Date(`${value}T12:00:00Z`));
    const fullDateLabel = value => `${dateLabel(value)}, ${value.slice(0, 4)}`;
    const seasonRange = () => {
      const label = value => new Intl.DateTimeFormat('en-US', {
        month: 'long', day: 'numeric', timeZone: 'UTC'
      }).format(new Date(`${value}T12:00:00Z`));
      return `${label(season.start)} – ${label(season.end)}, ${year}`;
    };
    const openDaysLabel = () => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const first = season.weekdays.find(day => !season.weekdays.includes((day + 6) % 7));
      if (first !== undefined) {
        let count = 1;
        while (count < 7 && season.weekdays.includes((first + count) % 7)) count++;
        if (count === season.weekdays.length) return count === 1 ? days[first] : `${days[first]}–${days[(first + count - 1) % 7]}`;
      }
      return season.weekdays.map(day => days[day]).join(', ');
    };
    const hoursLabel = () => `${openDaysLabel()} · ${timeRange(hours.open, hours.close)}`;
    const closingLabel = () => `Kitchen until ${shortTime(hours.kitchenClose)} · ${data.branding ? data.attractions.hollow.title : 'Trail'} until ${shortTime(hours.trailClose)}`;
    const todayValue = (now = new Date()) => {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: season.timezone, year: 'numeric', month: '2-digit', day: '2-digit'
      }).formatToParts(now);
      const part = name => parts.find(value => value.type === name).value;
      return `${part('year')}-${part('month')}-${part('day')}`;
    };
    const defaultDate = now => allowedDates.find(date => date >= todayValue(now)) || allowedDates[0];
    const seasonNote = (now = new Date()) => todayValue(now) > season.end
      ? `Archived ${year} concept season: these dates are in the past. You can still explore and save a fictional itinerary; no booking is made.`
      : `Fixed ${year} concept season: all dates, hours, and prices are fictional. Past dates remain available for exploring the concept; no booking is made.`;
    const defaultPlan = now => ({
      version: rules.version, date: defaultDate(now), time: hours.open,
      guests: rules.guests.default, children: rules.children.default,
      ...Object.fromEntries(stopKeys.map(key => [key, true]))
    });
    const validPlan = plan => plan !== null && typeof plan === 'object' && !Array.isArray(plan)
      && plan.version === rules.version && allowedDates.includes(plan.date) && allowedTimes.includes(plan.time)
      && Number.isInteger(plan.guests) && plan.guests >= rules.guests.min && plan.guests <= rules.guests.max
      && Number.isInteger(plan.children) && plan.children >= rules.children.min && plan.children <= rules.children.max
      && stopKeys.every(key => typeof plan[key] === 'boolean');
    const trailEstimate = plan => plan.trail ? plan.guests * rules.trailPrice : 0;
    const partyLabel = plan => `${plan.guests} ${plan.guests === 1 ? 'guest' : 'guests'} age ${data.admission?.minimumAge || rules.freeUnderAge}+${plan.children ? ` · ${plan.children} under ${rules.freeUnderAge}` : ''}`;
    const fieldNote = plan => data.fieldNotes.houseNotes[
      plan.pizza ? 'pizza' : plan.trail ? 'trail' : plan.oddities ? 'oddities' : 'grounds'
    ];
    const stopHint = key => `About ${rules.stops[key].minutes} minutes · ${data.branding ? rules.stops[key].detail : key === 'trail'
      ? `${money(rules.trailPrice)} per guest age ${rules.freeUnderAge}+`
      : key === 'oddities' ? 'Free to browse' : rules.stops[key].detail}`;
    const attractionFacts = key => {
      const attraction = data.attractions[key];
      const standardPizzas = data.menu.pizzas.filter(item => !item.tags.includes('KIDS'));
      const price = attraction.priceLabel || (attraction.stop === 'pizza' ? `${data.menuCategories.pizzas} from ${money(Math.min(...standardPizzas.map(item => item.price)))}`
        : attraction.stop === 'trail' ? `${money(rules.trailPrice)} · Under ${rules.freeUnderAge}s free` : 'Free to browse');
      return [['ALLOW', `About ${rules.stops[attraction.stop].minutes} minutes`], ['PRICE', price], ['SETTING', attraction.setting]];
    };
    function schedule(plan) {
      if (!validPlan(plan)) throw new TypeError('Cannot schedule an invalid plan.');
      let minute = minutes(plan.time);
      const stops = [{ ...rules.arrival, length: rules.arrivalMinutes, closes: hours.close }];
      const order = !data.branding && moodForTime(plan.time) === 'day' ? [...stopKeys.filter(key => key === 'trail'), ...stopKeys.filter(key => key !== 'trail')] : stopKeys;
      order.forEach(key => {
        if (!plan[key]) return;
        const stop = rules.stops[key];
        stops.push({ title: stop.scheduleTitle, length: stop.minutes, closes: key === 'pizza' ? hours.kitchenClose : key === 'trail' ? hours.trailClose : hours.close,
          detail: `${stop.location || stop.title} · ${stop.detail}` });
      });
      stops.push({ title: rules.departureTitle, length: 0, detail: `Or stay a little longer. The grounds close at ${shortTime(hours.close)}.` });
      return stops.map(({ closes = hours.close, ...stop }) => {
        if (minute + stop.length > minutes(closes)) {
          throw new RangeError(`The ${shortTime(plan.time)} arrival cannot finish ${stop.title} by ${shortTime(closes)}. Choose an earlier arrival or shorten the visit.`);
        }
        const item = { ...stop, time: clockTime(minute) };
        minute += stop.length;
        return item;
      });
    }
    // Every advertised arrival must support the full visit. With positive durations,
    // omitting a stop can only finish each remaining stop earlier.
    rules.arrivals.forEach((arrival, index) => {
      try { schedule({ ...defaultPlan(new Date(`${season.start}T12:00:00Z`)), time: arrival.value }); }
      catch (error) { throw new RangeError(`site-data.json: planner.arrivals[${index}].value: ${error.message}`); }
    });
    function itineraryText(plan) {
      return [
        `${data.name.toUpperCase()} — YOUR FIELD NOTES`, '',
        'Fictional destination. This itinerary is not a booking or ticket.', '',
        fullDateLabel(plan.date), partyLabel(plan), '',
        ...schedule(plan).map(stop => `${stop.time} — ${stop.title}\n${stop.detail}`), '',
        `${data.branding ? 'Activities estimate' : 'Trail estimate'}: ${money(trailEstimate(plan))}`,
        `${data.disclosures.estimate}${data.admission ? ' ' + (data.disclosures.admission || `Admission is ${data.admission.minimumAge}+.`) : ` Children under ${rules.freeUnderAge} join the trail free.`}`, '',
        `HOUSE NOTE: ${fieldNote(plan)}`, '',
        `${data.address.street}, ${data.address.district} (fictional address)`,
        `Concept season: ${seasonRange()} · ${hoursLabel()}`, closingLabel(), '',
        data.disclosures.access, data.disclosures.sensory, data.disclosures.weather, '',
        data.branding ? 'Take breaks. Skip a stop. Make the evening your own.' : 'Take breaks. Skip a stop. Stay for a slice.'
      ].join('\n');
    }
    return {
      copy, year, rules, stopKeys, planKeys, allowedDates, allowedTimes, money, minutes, clockTime, shortTime,
      timeRange, moodForTime, moodArrival, moodTime, dateLabel, fullDateLabel, seasonRange,
      openDaysLabel, hoursLabel, closingLabel, todayValue, defaultDate, defaultPlan, seasonNote,
      validPlan, trailEstimate, partyLabel, fieldNote, stopHint, attractionFacts, schedule, itineraryText
    };
  }
  return { createPlanner };
});
