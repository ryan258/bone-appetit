// Fully stocked lodge: exact menu/collection coverage and portable resource closure.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const art = require('../website-renderer.js');
const { createModel } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const single = require('../website-export.js'), collection = require('../website-collection.js'), marketing = require('../marketing-pack.js');
const { renderAll, loadSites } = require('../scripts/render-site.cjs');
const model = createModel(require('../site-data.json')), catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(p => catalog.create(p.id))], record = records[3], data = record.reference;
const read = file => new Uint8Array(fs.readFileSync(path.join(__dirname, '..', file)));
const text = (pack, file) => new TextDecoder().decode(pack.files.find(f => f.name === file).bytes);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function run() {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-lodge-art-'));
  const sites = loadSites(), options = { sites, sourceState: 'draft', generatedAt: '2026-10-16T23:00:00.000Z' };
  const before = JSON.stringify(records), registry = art.RESTAURANT_ART['boobies-lodge'];
  const items = Object.values(data.menu).flat();
  assert.equal(items.length, 18); assert.deepEqual(Object.keys(registry.food).sort(), items.map(i => i.id).sort());
  assert.equal(new Set(items.map(i => art.foodArt(data, i.id).asset)).size, 18);
  assert.deepEqual(Object.keys(registry.oddities).sort(), data.oddities.map(i => i.id).sort());
  assert.equal(new Set(data.oddities.map(i => art.oddityArt(data, i).asset)).size, 6);
  for (const key of Object.keys(data.attractions)) assert.ok(art.attractionArt(data, key).asset.endsWith('.webp'));
  const paths = collection.prepare(model, records, options).paths;
  const assets = Object.fromEntries(paths.map(file => [file, read(file)]));
  const lodgeAssets = [...new Set([art.heroAsset(data), ...art.artAssets(data)])]; assert.equal(lodgeAssets.length, 40);
  for (const asset of lodgeAssets) {
    const bytes = Buffer.from(read('assets/' + asset));
    assert.ok(asset.endsWith('.webp')); assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(bytes.length < 650000, asset + ' portable image size');
  }
  const imageCheck = spawnSync('python3', ['-c', 'from PIL import Image;from pathlib import Path;import sys\nfor name in sys.argv[1:]:\n im=Image.open(Path("assets")/name);im.load();assert im.format=="WEBP"\n if name=="lodge-grounds-map.webp":\n  assert im.size==(960,960);assert im.getpixel((100,300))!=im.getpixel((120,300));assert im.getpixel((400,135))!=im.getpixel((400,150))\n', ...lodgeAssets], { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 10000 });
  assert.equal(imageCheck.status, 0, imageCheck.stderr);
  for (const sourceState of ['draft', 'named']) {
    const edited = structuredClone(record); edited.content.venueName = 'Lodge <after hours>'; edited.content.menu[2].name = 'Edited Witch Burger'; edited.content.menu[2].price = '21.50';
    const pack = await single.createWebsite(model, edited, { ...options, sourceState }, assets), html = text(pack, 'index.html');
    assert.ok(html.includes('Lodge &lt;after hours&gt;')); assert.ok(html.includes('Edited Witch Burger')); assert.ok(html.includes('$21.50'));
    assert.equal((html.match(/class="full-menu-photo"/g) || []).length, 18);
    for (const asset of lodgeAssets) {
      assert.ok(html.includes('assets/' + asset), asset + ' is used by the rendered site');
      assert.equal(sha(pack.files.find(f => f.name === 'assets/' + asset).bytes), sha(read('assets/' + asset)));
    }
    assert.ok(html.includes('name="children" id="visit-children" value="0"'));
    assert.ok(html.includes('21+ only in this fictional lodge concept'));
    assert.ok(html.includes('<svg xmlns="http://www.w3.org/2000/svg"'), 'Original vector map remains in the printable field-note template.');
    fs.writeFileSync(path.join(output, sourceState + '.zip'), single.zip(pack.files));
  }
  for (const missing of ['lodge-main-event-scene.webp', 'lodge-designated-monster-food.webp', 'lodge-raven-accounts-object.webp', 'lodge-exterior-story.webp', 'lodge-grounds-map.webp']) {
    await assert.rejects(single.createWebsite(model, record, options, { ...assets, ['assets/' + missing]: undefined }), /missing, empty/);
  }
  const pack = await collection.createCollection(model, records, options, assets);
  for (const asset of lodgeAssets) assert.equal(pack.files.filter(f => f.name === 'assets/' + asset).length, 1);
  fs.writeFileSync(path.join(output, 'collection.zip'), collection.zip(pack.files));
  const integrity = spawnSync('python3', [path.join(__dirname, 'helpers/website-archive.py'), output], { encoding: 'utf8', timeout: 15000 });
  assert.equal(integrity.status, 0, integrity.stderr);
  const mAssets = Object.fromEntries(Object.entries(marketing.assetsFor(record)).map(([key, file]) => [key, read(file)]));
  assert.equal(Object.keys(mAssets).filter(k => k.startsWith('food-')).length, 18);
  for (const [category, selected] of Object.entries(data.menu)) {
    const pieces = await marketing.createPack(model, record, { sourceState: 'draft', menuIds: selected.slice(0,4).map(i => i.id) }, mAssets);
    for (const item of selected.slice(0,4)) for (const file of ['landing.html', 'menu-insert.html']) {
      assert.ok(text(pieces, file).includes(Buffer.from(mAssets['food-' + item.id]).toString('base64')), category + ': matching embedded dish art');
    }
  }
  for (const page of renderAll()) assert.equal(page.html, fs.readFileSync(path.join(__dirname, '..', page.filename), 'utf8'));
  assert.equal(JSON.stringify(records), before, 'No save/reference mutation.');
  console.log('Lodge artwork checks passed: 18 menu images, three experience scenes, six collection objects, separate story exterior, map route pixels, responsive backgrounds, competition and 40 WebP assets, unchanged legacy sources/admission, missing-asset rejection, four marketing selections and independent draft/named/collection ZIP closure.');
  console.log('Artifacts: ' + output);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
