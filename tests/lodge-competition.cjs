// A lodge-only annual edition remains portable across old campaigns and exports.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os'), vm = require('node:vm');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const website = require('../website-renderer.js');
const { createModel } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const { renderAll, loadSites } = require('../scripts/render-site.cjs');
const single = require('../website-export.js'), collection = require('../website-collection.js');
const root = path.resolve(__dirname, '..');
const read = file => new Uint8Array(fs.readFileSync(path.join(root, file)));
const text = file => fs.readFileSync(path.join(root, file), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const model = createModel(require('../site-data.json')), catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(p => catalog.create(p.id))];
const sites = loadSites(), options = { sites, sourceState: 'draft', generatedAt: '2026-10-17T18:00:00.000Z' };
const output = process.env.COMPETITION_SOURCE_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'bone-miss-lodge-'));
fs.mkdirSync(output, { recursive: true });
async function run() {
  const before = JSON.stringify(records), edition = website.LODGE_COMPETITION;
  assert.equal(edition.year, 2026); assert.equal(edition.date, '2026-10-10');
  assert.equal(edition.contestants.length, 6);
  assert.equal(new Set(edition.contestants.map(p => p.id)).size, 6);
  assert.equal(new Set(edition.contestants.map(p => p.state)).size, 6);
  assert.ok(edition.contestants.every(p => Number.isInteger(p.age) && p.age >= 21));
  assert.deepEqual(edition.contestants.filter(p => p.place).map(p => p.place), [1, 2, 3]);
  const lodge = records[3], art = website.competitionAssets(lodge.reference);
  assert.equal(art.length, 7); assert.equal(new Set(art).size, 7);
  assert.deepEqual(website.SWIMWEAR_ART, {}, 'Unavailable images must not be presented as delivered.');
  assert.equal(lodge.reference.branding.hero, 'boobies-lodge.svg', 'Legacy save reference remains in use.');
  for (const record of records.slice(0, 3)) assert.deepEqual(website.competitionAssets(record.reference), []);
  const assets = Object.fromEntries(collection.prepare(model, records, options).paths.map(file => [file, read(file)]));
  const pages = renderAll();
  for (const [index, page] of pages.entries()) {
    assert.equal(page.html, text(page.filename));
    if (index !== 3) { assert.ok(!page.html.includes('id="miss-lodge"')); assert.ok(!page.html.includes('lodge-miss-usa-2026-')); continue; }
    assert.ok(page.html.includes('href="#miss-lodge"'));
    assert.equal((page.html.match(/class="miss-contestant"/g) || []).length, 6);
    assert.equal((page.html.match(/class="miss-profile"/g) || []).length, 6);
    assert.equal((page.html.match(/class="miss-swimwear-card"/g) || []).length, 6);
    assert.equal((page.html.match(/class="miss-photo-pending"/g) || []).length, 6);
    assert.ok(!page.html.includes('-swimwear.webp'));
    assert.ok(page.html.includes('id="miss-lodge-swimwear"'));
    assert.ok(page.html.includes('Fictional 2026 U.S. edition'));
    assert.ok(page.html.includes('U.S. final complete'));
    assert.ok(page.html.includes('There is no live voting, entry submission, or ticket sale.'));
    for (const person of edition.contestants) {
      assert.ok(page.html.includes(`id="contestant-${person.id}"`));
      assert.ok(page.html.includes(`href="#contestant-${person.id}"`));
      assert.ok(page.html.includes(person.name)); assert.ok(page.html.includes(person.award));
    }
    const browser = vm.createContext({ structuredClone, Intl });
    for (const file of ['content.js', 'planner.js', 'field-notes.js', 'property-glyphs.js', 'website-renderer.js']) vm.runInContext(text(file), browser, { filename: file });
    const browserHtml = browser.BoneWebsite.render(page.data, text('index.template.html'), { sites, mapSVG: text('assets/' + page.data.map.image), noteCSS: text('field-notes.css') });
    assert.equal(browserHtml, page.html, 'Browser-global and Node renderer agree.');
  }
  for (const sourceState of ['draft', 'named']) {
    const renamed = structuredClone(lodge); renamed.content.venueName = 'The <Lodge> after dark';
    const pack = await single.createWebsite(model, renamed, { ...options, sourceState }, assets);
    const html = new TextDecoder().decode(pack.files.find(f => f.name === 'index.html').bytes);
    assert.ok(html.includes('The &lt;Lodge&gt; after dark')); assert.ok(html.includes('id="miss-lodge"'));
    for (const asset of art) {
      assert.ok(html.includes('assets/' + asset));
      assert.equal(hash(pack.files.find(f => f.name === 'assets/' + asset).bytes), hash(read('assets/' + asset)));
    }
    fs.writeFileSync(path.join(output, 'lodge-' + sourceState + '.zip'), single.zip(pack.files));
  }
  for (const asset of art) await assert.rejects(single.createWebsite(model, lodge, options, { ...assets, ['assets/' + asset]: undefined }), /missing, empty/);
  const pack = await collection.createCollection(model, records, options, assets);
  for (const asset of art) assert.equal(pack.files.filter(f => f.name === 'assets/' + asset).length, 1);
  for (const site of sites) {
    const html = new TextDecoder().decode(pack.files.find(f => f.name === site.href).bytes);
    assert.equal(html.includes('id="miss-lodge"'), site.id === 'boobies-lodge');
  }
  fs.writeFileSync(path.join(output, 'collection.zip'), collection.zip(pack.files));
  const integrity = spawnSync('python3', [path.join(__dirname, 'helpers/website-archive.py'), output], { encoding: 'utf8', timeout: 15000 });
  assert.equal(integrity.status, 0, integrity.stderr);
  const images = spawnSync('python3', ['-c', 'from PIL import Image;from pathlib import Path;import sys\nfor file in sys.argv[1:]:\n p=Path("assets")/file;im=Image.open(p);im.load();assert im.format=="WEBP";assert p.stat().st_size<650000;assert im.size==((1280,853) if "crown-stage" in file else (768,1152))\n', ...art], { cwd: root, encoding: 'utf8', timeout: 10000 });
  assert.equal(images.status, 0, images.stderr);
  assert.equal(JSON.stringify(records), before);
  console.log('Miss Lodge source checks passed: six fictional adult profiles, six explicit pending bikini-photo panels, champion/runners-up/awards, seven WebPs, lodge-only scope, Node/browser parity, legacy draft/named sources, seven missing-art rejections and three independent export ZIP checks. Artifacts: ' + output);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
