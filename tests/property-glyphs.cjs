// Property isolation and offline symbol resolution through every renderer path.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const glyphs = require('../property-glyphs.js');
const { renderAll, loadSites } = require('../scripts/render-site.cjs');
const { createModel } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const single = require('../website-export.js');
const collection = require('../website-collection.js');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const pageRoles = ['season', 'dining', 'night', 'signature', 'garden', 'day', 'welcome'];
const roles = [...pageRoles, 'menu', 'bites', 'dessert', 'drinks', 'vegetarian', 'spicy', 'alcohol', 'zeroProof',
  'trail', 'collection', 'story', 'ghost', 'key', 'postcard', 'badge', 'souvenir', 'raven',
  'location', 'clock', 'calendar', 'ticket', 'parking', 'accessibility', 'restroom', 'weather', 'map', 'phone', 'email', 'camera',
  'plan', 'save', 'download', 'print', 'share', 'info', 'close', 'arrow', 'oven', 'grill', 'coffee', 'music'];
const placedRoles = ['season', 'dining', 'night', 'signature', 'garden', 'day', 'accessibility',
  'menu', 'bites', 'dessert', 'drinks', 'trail', 'collection', 'ghost', 'key', 'postcard', 'badge', 'souvenir', 'raven',
  'calendar', 'clock', 'ticket', 'location', 'plan', 'save', 'download', 'print', 'map'];
const pages = renderAll(), bodies = new Set(), ids = new Set();
function checkPage(html, propertyId) {
  const symbols = [...html.matchAll(/<symbol id="([^"]+)" viewBox="0 0 24 24">([\s\S]*?)<\/symbol>/g)];
  assert.equal(symbols.length, 48, 'Every property embeds its complete library.');
  const expected = Object.values(glyphs.LIBRARIES[propertyId]);
  assert.deepEqual(symbols.map(match => match[1]), expected.map(glyph => glyph.id));
  assert.deepEqual(symbols.map(match => match[2]), expected.map(glyph => glyph.body));
  assert.ok(html.includes(`data-glyph-library="${propertyId}"`));
  assert.ok(!html.includes('#icon-'), 'No generic symbols survive.');
  const used = [...html.matchAll(/<use href="#([^"]+)"\s*\/?\s*>/g)].map(match => match[1]);
  assert.equal(used.length, 39, 'Restrained placements cover the page, categories, experiences, objects, visitor facts and primary actions.');
  assert.deepEqual([...new Set(used)].sort(), placedRoles.map(role => glyphs.LIBRARIES[propertyId][role].id).sort(), 'Each placement uses the correct property drawing.');
  for (const fragment of html.split('class="menu-tags"').slice(1)) {
    assert.ok(!fragment.split('</div>')[0].includes('<svg'), 'Menu tag rows remain text-first.');
  }
  assert.ok(used.every(id => expected.some(glyph => glyph.id === id)), 'All references resolve locally.');
  for (const match of html.matchAll(/<svg class="icon"([^>]*)>/g)) {
    assert.match(match[1], /aria-hidden="true"/);
    assert.match(match[1], /focusable="false"/);
  }
}
async function run() {
  const context = vm.createContext({ structuredClone, Intl });
  const scripts = ['content.js', 'planner.js', 'field-notes.js', 'property-glyphs.js', 'website-renderer.js'];
  for (const file of scripts) vm.runInContext(read(file), context, { filename: file });
  const creator = read('creator.html');
  assert.ok(creator.includes('src="property-glyphs.js"'));
  assert.ok(creator.indexOf('src="property-glyphs.js"') < creator.indexOf('src="website-renderer.js"'));
  assert.ok(require('../scripts/package-site.cjs').REQUIRED_FILES.includes('property-glyphs.js'));
  for (const page of pages) {
    const id = page.data.branding?.propertyId || 'bone-appetit';
    const library = glyphs.library(page.data);
    assert.deepEqual(Object.keys(library), roles);
    const manifest = JSON.parse(read(`assets/glyphs/${id}/manifest.json`));
    assert.equal(manifest.propertyId, id);
    assert.equal(manifest.count, 48);
    assert.deepEqual(manifest.groups.map(group => group.roles.length), [7, 8, 9, 12, 8, 4]);
    assert.deepEqual(manifest.groups.flatMap(group => group.roles), roles);
    assert.deepEqual(manifest.glyphs.map(glyph => glyph.role), roles);
    const createHash = require('node:crypto').createHash;
    for (const entry of manifest.glyphs) {
      assert.ok(!entry.file.includes('/'), 'Each isolated library uses local sibling files.');
      assert.equal(entry.sha256, createHash('sha256').update(read(`assets/glyphs/${id}/${entry.file}`)).digest('hex'));
    }
    for (const category of Object.keys(page.data.menuCategories)) {
      const role = { pizzas: 'dining', bites: 'bites', sweets: 'dessert', drinks: 'drinks' }[category];
      assert.ok(library[role], `Menu category ${category} has coverage.`);
    }
    assert.equal(page.data.oddities.length, 6);
    for (const role of ['ghost', 'key', 'postcard', 'badge', 'souvenir', 'raven']) assert.ok(library[role]);
    const folder = path.join(root, 'assets/glyphs', id);
    const catalog = read(`assets/glyphs/${id}/index.html`);
    assert.equal((catalog.match(/Download SVG<\/a>/g) || []).length, 48);
    for (const match of catalog.matchAll(/<(?:a|img)\b[^>]*\b(?:href|src)="([^"#][^"]*)"/g)) {
      assert.ok(!match[1].includes('..') && !match[1].includes(':'), 'Property catalogs are portable and local.');
      assert.ok(fs.existsSync(path.join(folder, match[1])));
    }
    for (const glyph of Object.values(library)) {
      assert.ok(!ids.has(glyph.id)); ids.add(glyph.id);
      assert.ok(!bodies.has(glyph.body), 'Every drawing is unique across all properties.'); bodies.add(glyph.body);
      const svg = read(`assets/glyphs/${id}/${glyph.name}.svg`);
      assert.equal(svg, glyphs.svg(glyph) + '\n');
      assert.match(svg, /viewBox="0 0 24 24"/);
      assert.ok(!/<(?:script|image|foreignObject)\b|\bon\w+=|https?:\/\/(?!www.w3.org\/2000\/svg)/i.test(svg));
    }
    assert.equal(read(`assets/glyphs/${id}/sprite.svg`), glyphs.sprite(page.data) + '\n');
    checkPage(page.html, id);
    assert.equal(page.html, read(page.filename));
    const preview = context.BoneWebsite.render(page.data, read('index.template.html'), {
      sites: loadSites(), mapSVG: read('assets/' + page.data.map.image), noteCSS: read('field-notes.css')
    });
    assert.equal(preview, page.html, 'Browser global code and Node rendering agree.');
  }
  assert.equal(ids.size, 192); assert.equal(bodies.size, 192);
  assert.equal(glyphs.library({}), glyphs.LIBRARIES['bone-appetit'], 'Old Bone saves retain their property library.');
  assert.throws(() => glyphs.library({ branding: { propertyId: 'unknown' } }), /registered glyph library/);
  assert.throws(() => glyphs.library({ branding: { propertyId: 'toString' } }), /registered glyph library/);
  const model = createModel(require('../site-data.json'));
  const catalog = createCatalog(model, require('../property-data.json'));
  const records = [model.newCampaign(), ...catalog.list.map(item => catalog.create(item.id))];
  // Mutable names never select another property's library; identity comes from IDs.
  for (const record of records) record.content.venueName = 'Same edited venue';
  const before = JSON.stringify(records), sites = loadSites();
  const options = { sites, sourceState: 'draft', generatedAt: '2026-10-17T17:00:00.000Z' };
  const paths = collection.prepare(model, records, options).paths;
  const assets = Object.fromEntries(paths.map(file => [file, new Uint8Array(fs.readFileSync(path.join(root, file)))]));
  for (const record of records) {
    const pack = await single.createWebsite(model, record, options, assets);
    checkPage(new TextDecoder().decode(pack.files.find(file => file.name === 'index.html').bytes), record.reference.branding?.propertyId || 'bone-appetit');
  }
  const pack = await collection.createCollection(model, records, options, assets);
  for (const page of pages) checkPage(new TextDecoder().decode(pack.files.find(file => file.name === page.filename).bytes), page.data.branding?.propertyId || 'bone-appetit');
  assert.equal(JSON.stringify(records), before, 'Rendering and export preserve campaign content.');
  console.log('Glyph checks passed: 192 unique drawings, 48 roles per property, six coverage groups, checked manifests, portable catalogs, local references, browser-global/Node rendering, legacy identity, individual and collection exports.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
