// Regressions for editing failures and schedule constraints; no browser needed.
const assert = require('node:assert/strict');
const { validateContent } = require('../content.js');
const { createPlanner } = require('../planner.js');
const { render } = require('../scripts/render-site.cjs');
const data = require('../site-data.json');

const cases = [
  [d => { d.season.start = '2026-02-30'; }, 'season.start'],
  [d => { d.season.end = '2026-09-01'; }, 'season.end'],
  [d => { d.season.end = '2027-01-01'; }, 'season.end'],
  [d => { d.season.timezone = 'Imaginary/Wicked-Lane'; }, 'season.timezone'],
  [d => { d.season.weekdays = [7]; }, 'season.weekdays[0]'],
  [d => { d.season.weekdays = [0, 0]; }, 'season.weekdays'],
  [d => { d.season.start = d.season.end = '2026-10-05'; }, 'season.weekdays'],
  [d => { d.hours.open = '25:00'; }, 'hours.open'],
  [d => { d.hours.close = '16:00'; }, 'hours'],
  [d => { d.hours.kitchenClose = '23:00'; }, 'hours.kitchenClose'],
  [d => { d.hours.night = '17:30'; }, 'hours.night'],
  [d => { d.planner.arrivals[1].value = '15:00'; }, 'planner.arrivals[1].value'],
  [d => { d.planner.arrivals.push({ value: '22:00', label: 'Closed' }); }, 'planner.arrivals[5].value'],
  [d => { d.planner.stops.pizza.minutes = -60; }, 'planner.stops.pizza.minutes'],
  [d => { d.planner.stops.trail.minutes = 0.5; }, 'planner.stops.trail.minutes'],
  [d => { d.planner.guests.default = 10; }, 'planner.guests.default'],
  [d => { d.planner.guests.max = 1000000; }, 'planner.guests.max'],
  [d => { d.planner.trailPrice = -1; }, 'planner.trailPrice'],
  [d => { d.menu.bites[1].id = d.menu.bites[0].id; }, 'menu.bites[1].id'],
  [d => { d.menu.bites[1].id = d.menu.pizzas[0].id; }, 'menu.bites[1].id'],
  [d => { d.menu.pizzas[0].price = 12.345; }, 'menu.pizzas[0].price'],
  [d => { d.menu.pizzas[0].price = Infinity; }, 'menu.pizzas[0].price'],
  [d => { d.menu.pizzas[0].tags = 'V'; }, 'menu.pizzas[0].tags'],
  [d => { d.menu.pizzas[0].description = ''; }, 'menu.pizzas[0].description'],
  [d => { delete d.menuCategories.drinks; }, 'menuCategories'],
  [d => { d.featured[0].id = 'missing-pizza'; }, 'featured[0].id'],
  [d => { d.featured[0].image = '../other'; }, 'featured[0].image'],
  [d => { d.attractions.hollow.stop = 'pizza'; }, 'attractions.hollow.stop'],
  [d => { delete d.moods.night; }, 'moods'],
  [d => { d.faqs[0].open = 'false'; }, 'faqs[0].open'],
  [d => { d.oddities.pop(); }, 'oddities'],
  [d => { d.map.locations[0].number = 2; }, 'map.locations[0].number'],
  [d => { d.map.locations[0].attraction = 'hollow'; }, 'map.locations[0].attraction'],
  [d => { d.map.locations[0].stop = 'trail'; }, 'map.locations[0].stop'],
  [d => { d.map.image = '../../secrets.svg'; }, 'map.image'],
  [d => { delete d.disclosures.access; }, 'disclosures.access'],
  [d => { d.faqs[0].answer += ' {{NIGHT_TIM}}'; }, 'faqs[0].answer'],
  [d => { d.moods.day.copy += ' {{NIGHT_TIME}}'; }, 'moods.day.copy'],
  [d => { d.attractions.hollow.description += ' {{NIGHT_TIME}'; }, 'attractions.hollow.description']
];
for (const [mutate, field] of cases) {
  const changed = structuredClone(data);
  mutate(changed);
  assert.throws(() => createPlanner(changed), error => error.message.includes(`site-data.json: ${field}:`), field);
}
assert.throws(() => validateContent(null), /site-data.json: root:/);
assert.throws(() => render({ ...data, map: { ...data.map, image: 'missing-map.svg' } }), /map.image: missing local asset/);

// Each closing constraint is enforced before any generated page can be written.
for (const [mutate, expected] of [
  [d => { d.hours.kitchenClose = '19:00'; }, /cannot finish Supper/],
  [d => { d.hours.trailClose = '20:00'; }, /cannot finish Wander/],
  [d => { d.planner.stops.oddities.minutes = 90; }, /cannot finish Inspect/],
  [d => { d.planner.arrivalMinutes = 500; }, /cannot finish Arrive/]
]) {
  const changed = structuredClone(data);
  mutate(changed);
  assert.throws(() => render(changed), error => /planner.arrivals\[\d+\].value/.test(error.message) && expected.test(error.message));
}
const p = createPlanner(data);
const base = p.defaultPlan(new Date('2026-10-16T17:00:00Z'));
let combinations = 0;
for (const date of p.allowedDates) for (const time of p.allowedTimes) for (let bits = 0; bits < 8; bits++) {
  const plan = { ...base, date, time, pizza: !!(bits & 1), trail: !!(bits & 2), oddities: !!(bits & 4) };
  assert.ok(p.validPlan(plan));
  const timeline = p.schedule(plan);
  let previous = p.minutes(time);
  for (const stop of timeline) {
    // Parse the public clock labels independently from the scheduler.
    const [, hour, minute, period] = stop.time.match(/^(\d+):(\d+) (am|pm)$/);
    const value = (Number(hour) % 12 + (period === 'pm' ? 12 : 0)) * 60 + Number(minute);
    assert.ok(value >= previous, 'Schedule must move forward.');
    const end = value + stop.length;
    assert.ok(end <= p.minutes(data.hours.close));
    if (stop.title === data.planner.stops.pizza.scheduleTitle) assert.ok(end <= p.minutes(data.hours.kitchenClose));
    if (stop.title === data.planner.stops.trail.scheduleTitle) assert.ok(end <= p.minutes(data.hours.trailClose));
    previous = value;
  }
  combinations++;
}
assert.equal(combinations, 800);
assert.equal(p.money(12.5), '$12.50');
assert.equal(p.money(0.1 + 0.2), '$0.30');
assert.equal(p.money(12), '$12');
const decimals = structuredClone(data);
decimals.menu.pizzas[0].price = 24.5;
assert.ok(render(decimals).includes('$24.50'));

// The runtime check also protects callers if a validated configuration is mutated.
const mutable = structuredClone(data);
const guarded = createPlanner(mutable);
mutable.planner.stops.pizza.minutes = 600;
assert.throws(() => guarded.schedule(base), RangeError);
console.log(`${cases.length} invalid-edit regressions, closing safeguards, currency formatting, and ${combinations} current schedules passed.`);
