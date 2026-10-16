// Complete website closure, escaping, public-only source and independent ZIP checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { createModel } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const api = require('../website-export.js');
const { loadSites, renderAll } = require('../scripts/render-site.cjs');
const model = createModel(require('../site-data.json'));
const catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(property => catalog.create(property.id))];
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-website-export-unit-'));
const decoder = new TextDecoder(), sites = loadSites();
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
async function run() {
  const keys = new Set();
  for (const [index, record] of records.entries()) {
    record.name = 'PRIVATE_CAMPAIGN_NAME'; record.brief.audience = 'PRIVATE_BRIEF_AUDIENCE';
    record.copy.headline = `Export haunt ${index}`;
    record.content.venueName += ' Export'; record.content.menu[0].name = `Export meal ${index}`;
    record.content.menu[0].price = '37.50'; record.content.menu[0].description = 'Freshly exhumed, politely plated.';
    record.website = { STORY_PARAGRAPHS: ['The deed came with a ghost.', '</p><script>window.evil=true</script>'], STORY_HEADING: 'A *portable* haunting' };
    const before = JSON.stringify(record), options = { sites, sourceState: 'draft', generatedAt: '2026-10-16T23:00:00.000Z' };
    const prepared = api.prepare(model, record, options);
    const assets = Object.fromEntries(prepared.paths.map(file => [file, new Uint8Array(fs.readFileSync(path.resolve(__dirname, '..', file)))]));
    const pack = await api.createWebsite(model, record, options, assets);
    assert.equal(JSON.stringify(record), before);
    const text = name => decoder.decode(pack.files.find(file => file.name === name).bytes);
    const html = text('index.html'), publicContent = JSON.parse(text('website-content.json'));
    assert.ok(html.includes(record.copy.headline)); assert.ok(html.includes(record.content.menu[0].name));
    assert.ok(html.includes('$37.50')); assert.ok(html.includes('A <em>portable</em> haunting'));
    assert.ok(html.includes('&lt;script&gt;window.evil=true&lt;/script&gt;'));
    assert.ok(!html.includes('<script>window.evil'));
    assert.ok(!html.includes('href="creator.html"')); assert.ok(!html.includes('data-creator-preview'));
    assert.equal((html.match(/data-property-link=/g) || []).length, 2);
    assert.equal((html.match(/href="index.html" data-property-link=/g) || []).length, 2);
    assert.ok(!html.includes('Four fictional restaurants'));
    assert.equal(Object.values(publicContent.data.menu).flat().length, index ? 18 : 24);
    assert.ok(!keys.has(publicContent.data.planner.storageKey)); keys.add(publicContent.data.planner.storageKey);
    assert.notEqual(publicContent.data.planner.storageKey, record.reference.planner.storageKey);
    for (const file of pack.files) assert.ok(!decoder.decode(file.bytes).includes('PRIVATE_'), `${file.name} must omit working brief/name.`);
    assert.ok(!pack.files.some(file => /campaign|creator|template/.test(file.name)));
    for (const expected of pack.manifest.files) {
      const file = pack.files.find(file => file.name === expected.name);
      assert.equal(file.bytes.length, expected.bytes); assert.equal(digest(file.bytes), expected.sha256);
    }
    for (const file of pack.files.filter(file => /\.(css|js|ttf|svg|webp|txt)$/.test(file.name) && file.name !== 'README.txt')) {
      assert.deepEqual(file.bytes, new Uint8Array(fs.readFileSync(path.resolve(__dirname, '..', file.name))), 'Styles/runtime/art are bundled without rewriting.');
    }
    const named = await api.createWebsite(model, record, { ...options, sourceState: 'named' }, assets);
    assert.equal(named.manifest.publicContentSha256, pack.manifest.publicContentSha256);
    assert.equal(named.manifest.plannerStorageKey, pack.manifest.plannerStorageKey);
    const edited = structuredClone(record); edited.website.STORY_HEADING = 'Another haunting';
    const changed = await api.createWebsite(model, edited, options, assets);
    assert.notEqual(changed.manifest.plannerStorageKey, pack.manifest.plannerStorageKey);
    const mutable = structuredClone(record), pending = api.createWebsite(model, mutable, options, assets);
    mutable.copy.headline = 'Later edit';
    assert.ok(decoder.decode((await pending).files.find(file => file.name === 'index.html').bytes).includes(`Export haunt ${index}`));
    await assert.rejects(api.createWebsite(model, record, { ...options, sourceState: 'other' }, assets), /Choose the current draft/);
    await assert.rejects(api.createWebsite(model, record, { ...options, generatedAt: 'bad' }, assets), /ISO timestamp/);
    await assert.rejects(api.createWebsite(model, record, options, { ...assets, 'app.js': new Uint8Array() }), /missing, empty/);
    await assert.rejects(api.createWebsite(model, record, options, { ...assets, 'assets/fonts/OFL-Fraunces.txt': undefined }), /missing, empty/);
    const invalid = structuredClone(record); invalid.content.menu[0].price = 'bad';
    assert.throws(() => api.prepare(model, invalid, options), /Menu price/);
    const destination = path.join(output, pack.filename); fs.writeFileSync(destination, api.zip(pack.files));
  }
  const python = spawnSync('python3', [path.join(__dirname, 'helpers/website-archive.py'), output], { encoding: 'utf8', timeout: 15000 });
  assert.equal(python.status, 0, python.stderr); process.stdout.write(python.stdout);
  // The export mode does not change normal generated pages.
  for (const page of renderAll()) assert.equal(fs.readFileSync(path.resolve(__dirname, '..', page.filename), 'utf8'), page.html);
  console.log(`Website export checks passed: all four properties, edited public content, full resources/licenses, original design/runtime bytes, planner isolation, frozen sources, validation and no creator/brief leakage.\nArtifacts: ${output}`);
}
if (require.main === module) run().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = { records, model, sites };
