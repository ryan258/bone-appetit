// Focused planner and canonical-content checks; Node's standard library only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { createPlanner } = require('../planner.js');
const { render } = require('../scripts/render-site.cjs');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../site-data.json'), 'utf8'));
const p = createPlanner(data);
const plan = p.defaultPlan(new Date('2026-10-13T12:00:00Z'));

assert.equal(plan.date, '2026-10-15');
assert.equal(p.timeRange('11:00', '22:00'), '11 am–10 pm');
assert.throws(() => p.money('<img src=x>'), TypeError);
assert.equal(p.allowedDates.length, 20);
assert.ok(p.allowedDates.every(date => [0, 4, 5, 6].includes(new Date(date + 'T12:00:00Z').getUTCDay())));
assert.equal(p.defaultDate(new Date('2026-09-01T12:00:00Z')), '2026-10-01');
assert.match(p.seasonNote(new Date('2027-01-01T12:00:00Z')), /^Archived 2026/);
assert.equal(p.trailEstimate({ ...plan, guests: 8, children: 4 }), 96);
assert.equal(p.trailEstimate({ ...plan, trail: false }), 0);
assert.equal(p.schedule(plan)[1].title, 'Wander Pumpkin Hollow');
assert.equal(p.schedule({ ...plan, time: '19:00' })[1].title, 'Supper with the spirits');
assert.equal(p.schedule({ ...plan, time: '19:00' }).at(-1).time, '9:00 pm');
assert.equal(p.schedule({ ...plan, pizza: false, trail: false, oddities: false }).length, 2);
for (const bad of [null, [], {}, { ...plan, version: 2 }, { ...plan, date: '2026-10-05' },
  { ...plan, time: '21:00' }, { ...plan, guests: 0 }, { ...plan, guests: '2' },
  { ...plan, children: 5 }, { ...plan, trail: 'true' }]) {
  assert.equal(p.validPlan(bad), false);
  assert.throws(() => p.schedule(bad), TypeError);
}

// Changes must propagate into the static page, facts, limits, schedule and export.
const changed = structuredClone(data);
changed.planner.trailPrice = 17;
changed.planner.stops.pizza.minutes = 75;
changed.planner.guests.max = 9;
changed.menu.pizzas[0].price = 31;
changed.hours.night = '17:00';
changed.hours.close = '23:00';
changed.hours.kitchenClose = '22:00';
const updated = createPlanner(changed);
const html = render(changed);
assert.match(updated.itineraryText(plan), /Trail estimate: \$34/);
assert.match(updated.itineraryText(plan), /Kitchen until 10 pm/);
assert.match(updated.itineraryText(plan), /grounds close at 11 pm/);
assert.match(updated.stopHint('pizza'), /75 minutes/);
assert.ok(updated.copy(changed.attractions.hollow.description).includes('Before 5 pm'));
assert.ok(html.includes('After 5 pm') && html.includes('from 3–5 pm'));
assert.ok(updated.attractionFacts('hollow').some(([, text]) => text === '$17 · Under 5s free'));
assert.ok(updated.validPlan({ ...plan, guests: 9 }));
assert.ok(!p.validPlan({ ...plan, guests: 9 }));
assert.ok(html.includes('$17 per person') && html.includes('$17 per guest age 5+'));
assert.ok(html.includes('<span>$31</span>') && html.includes('<strong>$31</strong>'));
assert.ok(html.includes('75 minutes') && html.includes('9 people'));

const nextYear = structuredClone(data);
nextYear.season = { ...data.season, start: '2027-10-01', end: '2027-11-01' };
const next = createPlanner(nextYear);
assert.ok(next.allowedDates.every(date => date.startsWith('2027-')));
assert.match(next.itineraryText(next.defaultPlan(new Date('2027-10-13T12:00:00Z'))), /2027/);
assert.ok(render(nextYear).includes('Fictional 2027 concept season'));

const unsafe = structuredClone(data);
unsafe.menu.pizzas[0].name = '</script><img src=x onerror=alert(1)>';
const escaped = render(unsafe);
assert.ok(escaped.includes('&lt;/script&gt;&lt;img'));
assert.ok(escaped.includes('\\u003c/script>'));
assert.ok(!escaped.includes('</script><img'));
const ids = Object.values(data.menu).flat().map(item => item.id);
assert.equal(ids.length, 24);
assert.equal(new Set(ids).size, ids.length);
assert.equal(data.featured.length, 3);
assert.ok(data.featured.every(feature => ids.includes(feature.id)));

// Verify the read-only drift gate and failure preservation in a disposable copy.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-render-check-'));
try {
  fs.mkdirSync(path.join(temp, 'scripts'));
  fs.mkdirSync(path.join(temp, 'assets'));
  for (const asset of fs.readdirSync(path.join(__dirname, '../assets')).filter(file => /\.(svg|webp)$/.test(file))) {
    fs.copyFileSync(path.join(__dirname, '../assets', asset), path.join(temp, 'assets', asset));
  }
  for (const file of ['index.html', 'index.template.html', 'site-data.json', 'visitor-sites.json', 'property-data.json', 'content.js', 'planner.js', 'scripts/render-site.cjs','website-renderer.js','property-glyphs.js', 'field-notes.js', 'field-notes.css']) {
    fs.copyFileSync(path.join(__dirname, '..', file), path.join(temp, file));
  }
  const target = path.join(temp, 'index.html');
  const script = path.join(temp, 'scripts/render-site.cjs');
  fs.writeFileSync(target, 'deliberately stale');
  assert.equal(spawnSync(process.execPath, [script, '--check']).status, 1);
  assert.equal(fs.readFileSync(target, 'utf8'), 'deliberately stale');
  assert.equal(spawnSync(process.execPath, [script]).status, 0);
  assert.equal(spawnSync(process.execPath, [script, '--check']).status, 0);
  const before = fs.readFileSync(target, 'utf8');
  for (const [mutate, field] of [
    [d => { d.planner.stops.pizza.minutes = -60; }, 'planner.stops.pizza.minutes'],
    [d => { d.hours.trailClose = '20:00'; }, 'planner.arrivals'],
    [d => { d.map.image = 'missing-map.svg'; }, 'map.image']
  ]) {
    const invalid = structuredClone(data);
    mutate(invalid);
    fs.writeFileSync(path.join(temp, 'site-data.json'), JSON.stringify(invalid));
    const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
    assert.notEqual(result.status, 0);
    assert.ok(result.stderr.includes(field));
    assert.equal(fs.readFileSync(target, 'utf8'), before, 'Invalid edits preserve the delivery page.');
    assert.deepEqual(fs.readdirSync(temp).filter(name => name.endsWith('.tmp')), []);
  }
  fs.writeFileSync(path.join(temp, 'site-data.json'), JSON.stringify(data));
  fs.writeFileSync(target, 'deliberately stale');
  assert.equal(spawnSync(process.execPath, [script, '--validate']).status, 0);
  assert.equal(fs.readFileSync(target, 'utf8'), 'deliberately stale', 'Validation does not rewrite the page.');
  fs.writeFileSync(target, before);
  fs.writeFileSync(path.join(temp, 'site-data.json'), '{broken');
  assert.notEqual(spawnSync(process.execPath, [script]).status, 0);
  assert.equal(fs.readFileSync(target, 'utf8'), before);
} finally {
  fs.rmSync(temp, { recursive: true });
}
console.log('Planner boundaries, scheduling, shared-content propagation and HTML escaping passed.');
