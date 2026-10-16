// Four full static restaurants, validated build preservation and isolated planner rules.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { render, renderAll, loadSites } = require('../scripts/render-site.cjs');
const { createPlanner } = require('../planner.js');
const fieldNotes = require('../field-notes.js');
const root = path.resolve(__dirname, '..');
const pages = renderAll(), sites = loadSites();
assert.equal(pages.length, 4);
const keys = new Set(); let combinations = 0;
for (const page of pages) {
  assert.equal(fs.readFileSync(path.join(root, page.filename), 'utf8'), page.html);
  const data = page.data, p = createPlanner(data);
  assert.ok(!keys.has(p.rules.storageKey)); keys.add(p.rules.storageKey);
  assert.ok(page.html.includes(data.name));
  const markup = page.html.replace(/<script id="site-data"[^>]*>[\s\S]*?<\/script>/, '');
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(markup), 'Rendered copy has no template slots; data snapshots retain supported runtime tokens.');
  for (const id of ['hero-title','haunts','menu','story','oddities','grounds','visit','access','menu-dialog','attraction-dialog','planner-dialog','download-field-notes']) assert.ok(page.html.includes(`id="${id}"`), `${page.filename}: complete ${id} section.`);
  assert.equal((page.html.match(/data-property-link=/g) || []).length, 8);
  assert.equal((page.html.match(/aria-current="page"/g) || []).length, 2);
  for (const site of sites) assert.ok(page.html.includes(`href="${site.href}" data-property-link="${site.id}"`));
  const menu = Object.values(data.menu).flat();
  assert.equal(menu.length, data.branding ? 18 : 24);
  for (const item of menu) assert.ok(page.html.includes(`data-menu-id="${item.id}"`));
  const baseline = p.defaultPlan(new Date('2026-10-16T12:00:00Z'));
  for (const date of p.allowedDates) for (const time of p.allowedTimes) for (let bits = 0; bits < 8; bits++) {
    const plan = { ...baseline, date, time, pizza: !!(bits & 1), trail: !!(bits & 2), oddities: !!(bits & 4) };
    assert.ok(p.validPlan(plan));
    const last = p.schedule(plan).at(-1);
    assert.ok(last && last.length === 0); combinations++;
  }
  const card = fieldNotes.card(data, baseline);
  if (data.branding) {
    assert.ok(!page.html.includes('src="assets/haunted-roadhouse.webp"'));
    assert.ok(!page.html.includes('src="assets/hero-haunted-pizza.webp"'));
    assert.ok(!card.includes('Trail estimate'));
    assert.ok(!p.itineraryText(baseline).includes('Stay for a slice'));
    assert.ok(!p.stopHint('trail').includes('per guest age'));
    assert.ok(p.schedule(baseline)[1].title === data.planner.stops.pizza.scheduleTitle);
    assert.ok(page.html.includes('Food and drinks priced separately'));
    assert.ok(card.includes(data.disclosures.admission));
  }
  if (data.admission) {
    assert.ok(page.html.includes('type="hidden" name="children" id="visit-children" value="0"'));
    assert.ok(!page.html.includes('<label>Under age'));
    assert.ok(!page.html.includes('Under 21s wander free'));
    assert.ok(!p.validPlan({ ...baseline, children: 1 }));
  }
}
assert.equal(combinations, 3200);
const hostile = structuredClone(sites);
hostile[1].copy.STORY_PARAGRAPHS = ['</p><script>alert(1)</script>'];
hostile[1].copy.HERO_HEADLINE = '<img src=x onerror=alert(1)>\n*Still text*';
const escaped = render(pages[1].data, undefined, { sites: hostile });
assert.ok(escaped.includes('&lt;script&gt;'));
assert.ok(!escaped.includes('<script>alert(1)'));
assert.ok(escaped.includes('&lt;img src=x onerror=alert(1)&gt;'));

const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-websites-unit-'));
try {
  fs.mkdirSync(path.join(temporary, 'scripts')); fs.mkdirSync(path.join(temporary, 'assets'));
  for (const file of ['scripts/render-site.cjs','website-renderer.js','index.template.html','site-data.json','property-data.json','visitor-sites.json','content.js','planner.js','field-notes.js','field-notes.css']) fs.copyFileSync(path.join(root, file), path.join(temporary, file));
  for (const asset of fs.readdirSync(path.join(root, 'assets')).filter(asset => /\.(svg|webp)$/.test(asset))) fs.copyFileSync(path.join(root, 'assets', asset), path.join(temporary, 'assets', asset));
  const script = path.join(temporary, 'scripts/render-site.cjs');
  assert.equal(spawnSync(process.execPath, [script]).status, 0);
  assert.equal(spawnSync(process.execPath, [script, '--check']).status, 0);
  const expected = pages.map(page => fs.readFileSync(path.join(temporary, page.filename), 'utf8'));
  for (const [file, mutate] of [
    ['property-data.json', source => { source.properties[1].reference.menu.pizzas[0].price = -1; }],
    ['visitor-sites.json', source => { source.sites[2].href = '../outside.html'; }],
    ['visitor-sites.json', source => { delete source.sites[1].copy.COLLECTION_HEADING; }]
    ,['visitor-sites.json', source => { source.sites[1].copy.HERO_ACTION_TARGET = 'javascript:alert(1)'; }]
  ]) {
    const target = path.join(temporary, file), original = fs.readFileSync(target, 'utf8'), source = JSON.parse(original);
    mutate(source); fs.writeFileSync(target, JSON.stringify(source));
    assert.equal(spawnSync(process.execPath, [script]).status, 1);
    for (const [index, page] of pages.entries()) assert.equal(fs.readFileSync(path.join(temporary, page.filename), 'utf8'), expected[index], 'Invalid source leaves every restaurant page intact.');
    fs.writeFileSync(target, original);
  }
  fs.writeFileSync(path.join(temporary, pages[2].filename), 'stale property');
  assert.equal(spawnSync(process.execPath, [script, '--check']).status, 1);
  assert.equal(fs.readFileSync(path.join(temporary, pages[2].filename), 'utf8'), 'stale property');
} finally { fs.rmSync(temporary, { recursive: true, force: true }); }
console.log('Website checks passed: four complete generated restaurants, shareable routes, 78 menu items, four storage keys, 3,200 schedules, adult admission, escaped copy, drift checking and failed-build preservation.');
