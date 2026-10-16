// Focused creative-content and offline field-note contract checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../site-data.json');
const { createPlanner } = require('../planner.js');
const fieldNotes = require('../field-notes.js');
const { render } = require('../scripts/render-site.cjs');
const root = path.resolve(__dirname, '..');
const assets = {
  css: fs.readFileSync(path.join(root, 'field-notes.css'), 'utf8'),
  mapSVG: fs.readFileSync(path.join(root, 'assets', data.map.image), 'utf8')
};
assert.equal(data.oddities.length, 6);
assert.equal(new Set(data.oddities.map(item => item.id)).size, 6);
assert.deepEqual(data.map.locations.map(point => point.number), [1, 2, 3, 4, 5, 6]);
for (const item of data.oddities) {
  assert.ok(fs.existsSync(path.join(root, 'assets', item.image)));
  assert.ok(item.alt && item.origin && item.record);
}
for (const point of data.map.locations.filter(point => point.attraction)) {
  assert.ok(data.attractions[point.attraction]);
  assert.equal(data.attractions[point.attraction].stop, point.stop);
}
const p = createPlanner(data);
const plan = { ...p.defaultPlan(new Date('2026-10-13T12:00:00Z')), guests: 8, children: 4, time: '19:00' };
const html = fieldNotes.document(data, plan, assets);
assert.ok(html.includes('$96') && html.includes('8 guests age 5+ · 4 under 5'));
assert.ok(html.includes('one extra place setting') && html.includes('party count stays exactly as entered'));
assert.ok(html.includes('not a booking or ticket') && html.includes('not real directions or verified facilities'));
for (const key of ['estimate', 'access', 'sensory', 'weather']) {
  assert.ok(html.includes(data.disclosures[key]), `Field notes retain ${key} disclosure`);
  assert.ok(p.itineraryText(plan).includes(data.disclosures[key]), `Text itinerary retains ${key} disclosure`);
}
assert.ok(html.includes('<svg') && !html.includes('src="assets/'));
assert.ok(!/https?:\/\//.test(html.replaceAll('http://www.w3.org/2000/svg', '')));
assert.ok(!/@font-face|url\(/.test(assets.css));
const included = p.schedule(plan).map(stop => stop.title);
assert.ok(included.every(title => html.includes(title)));
for (const patch of [{ pizza: false, trail: true }, { pizza: false, trail: false, oddities: true }, { pizza: false, trail: false, oddities: false }]) {
  const changed = { ...plan, ...patch };
  assert.ok(fieldNotes.card(data, changed).includes(p.fieldNote(changed)));
}
assert.throws(() => fieldNotes.document(data, { ...plan, guests: 99 }, assets), TypeError);
const unsafe = structuredClone(data);
unsafe.name = '</title><img src=x onerror=alert(1)>';
assert.ok(fieldNotes.document(unsafe, plan, assets).includes('&lt;/title&gt;'));
assert.ok(!fieldNotes.document(unsafe, plan, assets).includes('</title><img'));
const page = render(data);
assert.ok(page.includes('id="oddities"') && page.includes('id="grounds"'));
assert.ok(page.includes('id="download-field-notes"'));
console.log('Six-object collection, map links, fictional boundaries, unchanged estimates, and self-contained field notes passed.');
