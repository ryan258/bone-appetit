// Four selected edits become a complete, linked and public-only collection.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { createModel } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const api = require('../website-collection.js');
const single = require('../website-export.js');
const { loadSites, renderAll } = require('../scripts/render-site.cjs');
const { packageSite } = require('../scripts/package-site.cjs');
const model = createModel(require('../site-data.json'));
const catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(property => catalog.create(property.id))];
const sites = loadSites(), decoder = new TextDecoder();
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-collection-unit-'));
async function run() {
  records.forEach((record, index) => {
    record.name = 'PRIVATE_CAMPAIGN'; record.brief.audience = 'PRIVATE_BRIEF';
    record.content.venueName += ' Edited'; record.copy.headline = `Collection haunt ${index}`;
    record.content.menu[0].name = `Collection meal ${index}`; record.content.menu[0].price = '41.50';
    record.website = { STORY_HEADING: `An *edited* story ${index}`, STORY_PARAGRAPHS: ['An original deed.', '</p><script>evil()</script>'] };
  });
  const options = { sites, sourceState: 'draft', generatedAt: '2026-10-16T23:00:00.000Z' };
  const prepared = api.prepare(model, [...records].reverse(), options);
  const assets = Object.fromEntries(prepared.paths.map(file => [file, new Uint8Array(fs.readFileSync(path.join(__dirname, '..', file)))]));
  const before = JSON.stringify(records), pack = await api.createCollection(model, [...records].reverse(), options, assets);
  assert.equal(JSON.stringify(records), before);
  assert.equal(pack.manifest.properties.length, 4);
  assert.equal(new Set(pack.files.map(file => file.name)).size, pack.files.length);
  assert.equal(pack.files.filter(file => file.name === 'styles.css').length, 1);
  assert.equal(pack.files.filter(file => file.name.endsWith('.ttf')).length, 4);
  assert.equal(pack.files.filter(file => file.name.endsWith('.html')).length, 4);
  assert.ok(pack.files.length <= 256);
  const keys = new Set();
  for (const [index, property] of pack.manifest.properties.entries()) {
    const text = decoder.decode(pack.files.find(file => file.name === property.href).bytes);
    assert.equal(property.propertyId, sites[index].id);
    assert.ok(text.includes(`Collection haunt ${index}`)); assert.ok(text.includes(`Collection meal ${index}`));
    assert.ok(text.includes('$41.50')); assert.ok(text.includes(`An <em>edited</em> story ${index}`));
    assert.ok(text.includes('&lt;script&gt;evil()&lt;/script&gt;')); assert.ok(!text.includes('<script>evil()'));
    assert.equal((text.match(/data-property-link=/g) || []).length, 8);
    assert.equal((text.match(/aria-current="page"/g) || []).length, 2);
    for (const site of sites) assert.ok(text.includes(`href="${site.href}" data-property-link="${site.id}"`));
    for (const record of records) assert.ok(text.includes(record.content.venueName));
    assert.ok(!text.includes('href="creator.html"')); assert.ok(!text.includes('rel="preload"'));
    assert.ok(!keys.has(property.plannerStorageKey)); keys.add(property.plannerStorageKey);
    const individual = await single.createWebsite(model, records[index], options, assets);
    assert.equal(property.plannerStorageKey, individual.manifest.plannerStorageKey);
    const content = JSON.parse(decoder.decode(pack.files.find(file => file.name === `content/${property.propertyId}.json`).bytes));
    assert.equal(content.data.planner.storageKey, property.plannerStorageKey);
    if (index === 3) { assert.equal(content.data.admission.minimumAge, 21); assert.equal(content.data.planner.children.max, 0); }
  }
  for (const file of pack.files) assert.ok(!decoder.decode(file.bytes).includes('PRIVATE_'), file.name);
  for (const entry of pack.manifest.files) {
    const file = pack.files.find(file => file.name === entry.name);
    assert.equal(entry.bytes, file.bytes.length); assert.equal(entry.sha256, createHash('sha256').update(file.bytes).digest('hex'));
  }
  assert.throws(() => api.prepare(model, records.slice(1), options), /four restaurant/);
  assert.throws(() => api.prepare(model, [records[0],records[1],records[2],records[2]], options), /different properties/);
  const invalid = structuredClone(records); invalid[3].content.menu[0].price = 'bad';
  assert.throws(() => api.prepare(model, invalid, options), /Menu price/);
  await assert.rejects(api.createCollection(model, records, options, { ...assets, 'boobies-lodge.svg': undefined, 'assets/boobies-lodge.svg': undefined }), /resource missing/);
  const mutable = structuredClone(records), mutableOptions = structuredClone(options), pending = api.createCollection(model, mutable, mutableOptions, assets);
  mutable[0].copy.headline = 'Later edit'; mutableOptions.sourceState = 'named';
  assert.equal((await pending).manifest.sourceState, 'draft');
  const named = await api.createCollection(model, records, { ...options, sourceState: 'named' }, assets);
  assert.deepEqual(named.manifest.properties.map(property => property.plannerStorageKey), pack.manifest.properties.map(property => property.plannerStorageKey));
  for (const [name, result] of [['draft',pack],['named',named]]) fs.writeFileSync(path.join(output, name + '.zip'), api.zip(result.files));
  const checked = spawnSync('python3', [path.join(__dirname,'helpers/website-archive.py'), output], { encoding: 'utf8', timeout: 15000 });
  assert.equal(checked.status, 0, checked.stderr);
  for (const page of renderAll()) assert.equal(page.html, fs.readFileSync(path.join(__dirname, '..', page.filename), 'utf8'));
  packageSite(path.join(output, 'static-site'));
  for (const file of ['website-collection.js','collection-workspace.js']) assert.ok(fs.existsSync(path.join(output,'static-site',file)));
  console.log(`Collection checks passed: four linked edited pages, deduplicated resources, standalone parity, adult admission, private-data exclusion, immutable sources, validation, independent integrity/resource checks and static packaging.\nArtifacts: ${output}`);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
