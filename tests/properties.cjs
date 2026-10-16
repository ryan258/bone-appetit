// Three distinct properties, v1 recovery, coherent export facts and bundled art.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createModel } = require('../creator-model.js');
const { createCatalog, ART, IDS } = require('../property-catalog.js');
const { createPlanner } = require('../planner.js');
const marketing = require('../marketing-pack.js');
const example = require('../site-data.json'), definitions = require('../property-data.json');
const before = JSON.stringify({ example, definitions });
let count = 0;
const model = createModel(example, { newId: () => `property-${++count}`, now: () => '2026-10-16T20:00:00.000Z' });
async function run() {
  const catalog = createCatalog(model, definitions);
  assert.deepEqual(catalog.list.map(item => item.id), IDS);
  const workspace = model.emptyWorkspace();
  const allMenuIds = new Set();
  for (const property of catalog.list) {
    const record = catalog.create(property.id), second = catalog.create(property.id);
    const data = model.materialize(record), planner = createPlanner(data);
    assert.equal(record.content.menu.length, 18);
    assert.ok(planner.closingLabel().includes(data.attractions.hollow.title));
    assert.ok(!planner.closingLabel().includes('Trail until'));
    assert.equal(record.reference.branding.propertyId, property.id);
    assert.notEqual(record.id, second.id);
    second.content.menu[0].name = 'Separate experiment';
    assert.notEqual(record.content.menu[0].name, second.content.menu[0].name);
    for (const item of record.content.menu) { assert.ok(!allMenuIds.has(item.id), 'Menu IDs are distinct across properties.'); allMenuIds.add(item.id); }
    for (const asset of [record.reference.branding.hero, record.reference.map.image]) assert.ok(ART.includes(asset));
    for (const art of ART) {
      const svg = fs.readFileSync(path.resolve(__dirname, '../assets', art), 'utf8');
      assert.ok(svg.includes('<title') && svg.includes('<desc'));
      assert.ok(!/<script|<foreignObject|(?:href|src)=["']https?:/i.test(svg));
    }
    assert.ok(!JSON.stringify(record).includes('Wicked Lane'));
    assert.ok(!JSON.stringify(record).includes('Bone Appétit'));
    const assets = Object.fromEntries(Object.entries(marketing.assetsFor(record)).map(([key, file]) => [key, new Uint8Array(fs.readFileSync(path.resolve(__dirname, '..', file)))]));
    const pack = await marketing.createPack(model, record, { sourceState: 'draft', generatedAt: model.now() }, assets);
    assert.equal(pack.manifest.campaign.propertyId, property.id);
    const read = name => new TextDecoder().decode(pack.files.find(file => file.name === name).bytes);
    for (const key of Object.keys(marketing.TITLES)) {
      const text = read(key + '.txt');
      assert.ok(text.includes(data.name));
      assert.ok(text.includes(record.brief.offer));
      assert.ok(text.includes(data.disclosures.admission), 'Admission wording travels with each piece.');
      for (const other of catalog.list.filter(p => p.id !== property.id)) assert.ok(!text.includes(other.name), 'No cross-property copy leakage.');
    }
    assert.ok(read('poster.html').includes('data:image/svg+xml;base64,'));
    const restored = model.parseBackup(read('campaign.json'));
    assert.deepEqual(restored.entries[0].draft, record);
    assert.ok(planner.attractionFacts('hollow').find(([label]) => label === 'PRICE')[1].includes('Free'));
    if (property.id === 'boobies-lodge') {
      assert.equal(data.admission.minimumAge, 21);
      assert.equal(data.planner.children.max, 0);
      assert.match(planner.partyLabel(planner.defaultPlan()), /age 21\+/);
      assert.ok(!planner.itineraryText(planner.defaultPlan()).includes('join the trail free'));
      assert.ok(read('email-draft.txt').includes('21+ only'));
    }
    if (property.id === 'grave-expectations') assert.ok(!read('landing.txt').includes('Pizzas from'));
    const entry = model.entryFor(record); entry.saved = structuredClone(record); workspace.entries.push(entry);
  }
  workspace.activeId = workspace.entries[0].draft.id;
  assert.deepEqual(model.parseBackup(model.backup(workspace)), workspace);
  const merged = model.mergeImport(workspace, workspace);
  assert.equal(merged.entries.length, 6);
  assert.deepEqual(merged.entries.slice(0, 3), workspace.entries);
  assert.throws(() => catalog.create('missing'), /unavailable/);
  const duplicateIds = structuredClone(definitions); duplicateIds.properties[1].id = duplicateIds.properties[0].id;
  assert.throws(() => createCatalog(model, duplicateIds), /duplicates/);
  const unbundled = catalog.create(IDS[0]); unbundled.reference.branding.hero = 'unapproved.svg';
  assert.throws(() => model.materialize(unbundled), /outside this bundled/);
  const underage = catalog.create('boobies-lodge'); underage.reference.planner.children.max = 1;
  assert.throws(() => model.materialize(underage), /minimum admission age/);
  assert.equal(JSON.stringify({ example, definitions }), before, 'Templates and the original example remain untouched.');
  console.log('Property checks passed: three independent Halloween concepts, 54 menu items, coherent copy/age rules/art, six-piece packs, v1 saves/backups/import, and unchanged Bone Appétit.');
}
run().catch(error => { console.error(error.message); process.exitCode = 1; });
