// Current logos/food across old references, edited sources, public archives and marketing.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { createModel } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const art = require('../website-renderer.js');
const single = require('../website-export.js');
const collection = require('../website-collection.js');
const marketing = require('../marketing-pack.js');
const { renderAll, loadSites } = require('../scripts/render-site.cjs');
const { packageSite } = require('../scripts/package-site.cjs');
const root = path.resolve(__dirname, '..');
const model = createModel(require('../site-data.json'));
const catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(p => catalog.create(p.id))];
const read = file => new Uint8Array(fs.readFileSync(path.join(root, file)));
const text = (pack, name) => new TextDecoder().decode(pack.files.find(f => f.name === name).bytes);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
async function run() {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-restaurant-art-'));
  const original = JSON.stringify(records), sites = loadSites();
  const options = { sites, sourceState: 'draft', generatedAt: '2026-10-16T23:00:00.000Z' };
  const assets = Object.fromEntries(collection.prepare(model, records, options).paths.map(file => [file, read(file)]));
  const logos = new Set(), dishes = new Set();
  for (const [i, record] of records.entries()) {
    const data = record.reference, logo = art.logoAsset(data), expected = art.RESTAURANT_ART[sites[i].id];
    logos.add(logo); assert.equal(logo, expected.logo);
    if (i) assert.ok(data.featured.every(f => f.image.endsWith('.svg')), 'Legacy records need no migration.');
    assert.equal(art.foodArt(data, 'dish-without-an-image'), null);
    const borrowedId = records[(i + 1) % 4].reference.featured[0].id;
    assert.equal(art.foodArt(data, borrowedId), null, 'Never borrow another restaurant’s dish.');
    const files = [logo, ...data.featured.map(f => art.featuredArt(data, f).asset)];
    assert.equal(art.attractionArt(data, 'pizzeria').asset, expected.attractions?.pizzeria.asset || art.foodArt(data, data.featured[0].id).asset);
    assert.equal(art.attractionArt(data, 'hollow').asset, expected.attractions?.hollow.asset || (data.attractions.hollow.image.endsWith('.svg') ? data.attractions.hollow.image : data.attractions.hollow.image + '.webp'));
    for (const file of files) {
      const bytes = Buffer.from(read('assets/' + file));
      assert.equal(bytes.toString('ascii', 0, 4), 'RIFF'); assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
      assert.ok(bytes.length < 500000); if (file !== logo) dishes.add(file);
    }
    const edited = structuredClone(record); edited.content.venueName = 'Edited & Still Haunted ' + i;
    edited.content.menu[0].name = 'A renamed supper ' + i; edited.content.menu[0].price = '33.50';
    for (const sourceState of ['draft', 'named']) {
      const pack = await single.createWebsite(model, edited, { ...options, sourceState }, assets);
      const html = text(pack, 'index.html');
      assert.ok(html.includes('Edited &amp; Still Haunted ' + i)); assert.ok(html.includes('A renamed supper ' + i));
      for (const file of files) {
        assert.ok(html.includes('src="assets/' + file + '"'));
        assert.equal(sha(pack.files.find(f => f.name === 'assets/' + file).bytes), sha(read('assets/' + file)));
      }
      assert.ok(html.includes('type="image/webp"')); assert.ok(html.includes('AI-created concept food imagery'));
      fs.writeFileSync(path.join(output, sites[i].id + '-' + sourceState + '.zip'), single.zip(pack.files));
    }
    await assert.rejects(single.createWebsite(model, record, options, { ...assets, ['assets/' + logo]: undefined }), /missing, empty/);
    const paths = marketing.assetsFor(record), mAssets = Object.fromEntries(Object.entries(paths).map(([k, f]) => [k, read(f)]));
    assert.equal(paths.logo, 'assets/' + logo);
    for (const sourceState of ['draft', 'named']) {
      const pack = await marketing.createPack(model, edited, { sourceState }, mAssets);
      for (const name of ['landing.html', 'menu-insert.html', 'poster.html']) {
        const html = text(pack, name);
        assert.ok(html.includes(Buffer.from(mAssets.logo).toString('base64')));
        assert.ok(!/src="assets\//.test(html), 'Individual marketing HTML embeds its art.');
      }
      for (const feature of data.featured) {
        const encoded = Buffer.from(mAssets['food-' + feature.id]).toString('base64');
        assert.ok(text(pack, 'landing.html').includes(encoded)); assert.ok(text(pack, 'menu-insert.html').includes(encoded));
      }
      assert.deepEqual(model.parseBackup(text(pack, 'campaign.json')).entries[0].draft, edited);
    }
    await assert.rejects(marketing.createPack(model, record, { sourceState: 'draft' }, { ...mAssets, logo: undefined }), /logo asset is unavailable/);
    const missing = data.featured[0].id;
    await assert.rejects(marketing.createPack(model, record, { sourceState: 'draft' }, { ...mAssets, ['food-' + missing]: undefined }), /asset is unavailable/);
  }
  assert.equal(logos.size, 4); assert.equal(dishes.size, 9);
  const pack = await collection.createCollection(model, records, options, assets);
  for (const file of [...logos, ...dishes]) assert.equal(pack.files.filter(f => f.name === 'assets/' + file).length, 1);
  fs.writeFileSync(path.join(output, 'collection.zip'), collection.zip(pack.files));
  const independent = spawnSync('python3', [path.join(__dirname, 'helpers/website-archive.py'), output], { encoding: 'utf8', timeout: 15000 });
  assert.equal(independent.status, 0, independent.stderr);
  const imageCheck = spawnSync('python3', ['-c', "from PIL import Image;import sys;from pathlib import Path\nfor name in sys.argv[1:]:\n im=Image.open(Path('assets')/name);assert im.format=='WEBP';im.load()\n if '-logo.' in name: assert im.mode=='RGBA' and im.getchannel('A').getextrema()==(0,255)\n else: assert im.size==(1536,1024)\n", ...logos, ...dishes], { cwd: root, encoding: 'utf8', timeout: 10000 });
  assert.equal(imageCheck.status, 0, imageCheck.stderr);
  packageSite(path.join(output, 'static-site'));
  for (const file of [...logos, ...dishes]) assert.deepEqual(fs.readFileSync(path.join(output, 'static-site/assets', file)), Buffer.from(read('assets/' + file)));
  for (const page of renderAll()) assert.equal(page.html, fs.readFileSync(path.join(root, page.filename), 'utf8'));
  assert.equal(JSON.stringify(records), original, 'References/drafts stay unchanged.');
  console.log('Restaurant art checks passed: four transparent WebP logos, nine distinct dish images, legacy saves, property/dish matching, edited draft/named sources, embedded marketing art, missing-asset rejection, static packaging and independent closure/hashes for nine website ZIPs.');
  console.log('Artifacts: ' + output);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
