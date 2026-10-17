// Complete Bone Appétit and Grave Expectations art, including legacy campaign sources.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const art = require('../website-renderer.js');
const { createModel } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const single = require('../website-export.js'), collection = require('../website-collection.js'), marketing = require('../marketing-pack.js');
const { renderAll, loadSites } = require('../scripts/render-site.cjs');
const root = path.resolve(__dirname, '..');
const model = createModel(require('../site-data.json')), catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(p => catalog.create(p.id))];
const read = file => new Uint8Array(fs.readFileSync(path.join(root, file)));
const text = (pack, file) => new TextDecoder().decode(pack.files.find(f => f.name === file).bytes);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function run() {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-remaining-art-'));
  const options = { sites: loadSites(), sourceState: 'draft', generatedAt: '2026-10-16T23:00:00.000Z' };
  const before = JSON.stringify(records), assets = Object.fromEntries(collection.prepare(model, records, options).paths.map(file => [file, read(file)]));
  assert.equal(records[0].reference.branding, undefined, 'Bone uses the original campaign schema.');
  for (const [index, count, assetCount] of [[0, 24, 39], [2, 18, 33]]) {
    const record = records[index], data = record.reference, id = data.branding?.propertyId || 'bone-appetit';
    const registry = art.RESTAURANT_ART[id], items = Object.values(data.menu).flat();
    assert.equal(items.length, count); assert.deepEqual(Object.keys(registry.food).sort(), items.map(i => i.id).sort());
    assert.equal(new Set(items.map(i => art.foodArt(data, i.id).asset)).size, count);
    assert.deepEqual(Object.keys(registry.oddities).sort(), data.oddities.map(i => i.id).sort());
    assert.equal(new Set(data.oddities.map(i => art.oddityArt(data, i).asset)).size, 6);
    assert.equal(new Set(Object.keys(data.attractions).map(key => art.attractionArt(data, key).asset)).size, 3);
    const propertyAssets = [...new Set([art.heroAsset(data), ...art.artAssets(data)])]; assert.equal(propertyAssets.length, assetCount);
    for (const asset of propertyAssets) {
      const bytes = Buffer.from(read('assets/' + asset));
      assert.ok(asset.endsWith('.webp')); assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.ok(bytes.length < 650000, asset + ' stays portable');
    }
    const decode = spawnSync('python3', ['-c', 'from PIL import Image;from pathlib import Path;import sys\nfor name in sys.argv[1:]:\n im=Image.open(Path("assets")/name);im.load();assert im.format=="WEBP"\n if name=="bone-grounds-map.webp":\n  assert im.size==(760,560);assert im.getpixel((300,480))!=im.getpixel((300,460));assert im.getpixel((570,376))!=im.getpixel((570,360))\n if name=="grave-grounds-map.webp":\n  assert im.size==(960,960);assert im.getpixel((100,300))!=im.getpixel((120,300));assert im.getpixel((400,135))!=im.getpixel((400,150))\n', ...propertyAssets], { cwd: root, encoding: 'utf8', timeout: 10000 });
    assert.equal(decode.status, 0, decode.stderr);
    for (const sourceState of ['draft', 'named']) {
      const edited = structuredClone(record); edited.content.venueName = id + ' <edited>'; edited.content.menu.at(-1).name = 'An edited final drink'; edited.content.menu.at(-1).price = '18.50';
      const pack = await single.createWebsite(model, edited, { ...options, sourceState }, assets), html = text(pack, 'index.html');
      assert.ok(html.includes(id + ' &lt;edited&gt;')); assert.ok(html.includes('An edited final drink')); assert.ok(html.includes('$18.50'));
      assert.equal((html.match(/class="full-menu-photo"/g) || []).length, count);
      assert.ok(!/<img[^>]+src="assets\/[^"\n]+\.svg"/.test(html), 'Visible image elements use WebP.');
      for (const asset of propertyAssets) {
        assert.ok(html.includes('assets/' + asset), asset + ' appears on the rendered website');
        assert.equal(sha(pack.files.find(f => f.name === 'assets/' + asset).bytes), sha(read('assets/' + asset)));
      }
      assert.ok(html.includes('<svg xmlns="http://www.w3.org/2000/svg"'), 'Original map remains in the field-note template.');
      assert.ok(pack.files.some(f => f.name === 'assets/' + data.map.image), 'Original SVG source remains portable.');
      fs.writeFileSync(path.join(output, id + '-' + sourceState + '.zip'), single.zip(pack.files));
    }
    for (const asset of [registry.story.asset, registry.map, registry.attractions.pizzeria.asset, Object.values(registry.oddities)[0].asset, Object.values(registry.food).at(-1).asset]) {
      await assert.rejects(single.createWebsite(model, record, options, { ...assets, ['assets/' + asset]: undefined }), /missing, empty/);
    }
    const mAssets = Object.fromEntries(Object.entries(marketing.assetsFor(record)).map(([key, file]) => [key, read(file)]));
    assert.equal(Object.keys(mAssets).filter(key => key.startsWith('food-')).length, count);
    for (const selected of Object.values(data.menu)) {
      const pack = await marketing.createPack(model, record, { sourceState: 'draft', menuIds: selected.slice(0, 4).map(i => i.id) }, mAssets);
      for (const item of selected.slice(0, 4)) for (const file of ['landing.html', 'menu-insert.html']) assert.ok(text(pack, file).includes(Buffer.from(mAssets['food-' + item.id]).toString('base64')));
    }
  }
  const pack = await collection.createCollection(model, records, options, assets);
  assert.ok(pack.files.length > 100 && pack.files.length <= 256);
  for (const record of records) for (const asset of art.artAssets(record.reference)) assert.equal(pack.files.filter(f => f.name === 'assets/' + asset).length, 1);
  fs.writeFileSync(path.join(output, 'collection.zip'), collection.zip(pack.files));
  const integrity = spawnSync('python3', [path.join(__dirname, 'helpers/website-archive.py'), output], { encoding: 'utf8', timeout: 15000 });
  assert.equal(integrity.status, 0, integrity.stderr);
  for (const page of renderAll()) assert.equal(page.html, fs.readFileSync(path.join(root, page.filename), 'utf8'));
  assert.equal(JSON.stringify(records), before, 'Original campaigns and references remain unchanged.');
  console.log('Remaining restaurant art checks passed: 42 menu images, six experiences, 12 objects, two story exteriors/maps, responsive backgrounds and 72 WebPs, legacy sources, missing-resource rejection, marketing embedding and five independent website ZIP integrity/resource checks.');
  console.log('Artifacts: ' + output);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
