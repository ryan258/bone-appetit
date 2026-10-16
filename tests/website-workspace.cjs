// Reproducible checks for shared rendering, editable copy, and v1 portability.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { createModel } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const copy = require('../website-copy.js');
const shared = require('../website-renderer.js');
const { render, loadSites, renderAll } = require('../scripts/render-site.cjs');
const model = createModel(require('../site-data.json'));
const catalog = createCatalog(model, require('../property-data.json'));
const sites = loadSites(), template = fs.readFileSync('index.template.html', 'utf8');
const originals = [model.newCampaign(), ...catalog.list.map(site => catalog.create(site.id))];
for (const page of renderAll()) assert.equal(shared.render(page.data, template, {
  sites, mapSVG: fs.readFileSync(`assets/${page.data.map.image}`, 'utf8'), noteCSS: fs.readFileSync('field-notes.css', 'utf8')
}), page.html, 'Browser and Node use identical rendering.');
for (const original of originals) {
  const record = structuredClone(original), before = JSON.stringify(original);
  record.content.venueName = 'Edited & haunted'; record.copy.headline = 'Still *strange*\nStill hungry';
  record.copy.introduction = 'New hero copy.'; record.copy.actionLabel = 'Inspect the haunt';
  record.website = { STORY_HEADING: 'Our *new* story', STORY_PARAGRAPHS: ['A new beginning.', '</p><script>evil()</script>'], GLANCE_ITEMS: ['One','Two','Three','Four'] };
  record.content.menu[0].description = 'New featured description.';
  record.content.menu[0].price = '31.50';
  record.content.attractions.pizzeria.description = 'New attraction opens {{NIGHT_TIME}}.';
  const data = model.materialize(record), html = render(data, template, { sites: copy.resolve(record, sites) });
  assert.ok(html.includes('Edited &amp; haunted')); assert.ok(html.includes('Still <em>strange</em><br>Still hungry'));
  assert.ok(html.includes('Our <em>new</em> story')); assert.ok(html.includes('&lt;script&gt;evil()&lt;/script&gt;'));
  assert.ok(!html.includes('<script>evil()'));
  assert.equal(data.featured[0].description, 'New featured description.');
  assert.ok(!data.attractions.pizzeria.card.copy.includes('{{'));
  assert.equal(JSON.stringify(original), before);
  const workspace = { version: 1, activeId: record.id, entries: [model.entryFor(record)] };
  workspace.entries[0].saved = structuredClone(record);
  workspace.entries[0].view.websiteField = 'STORY_PARAGRAPHS';
  workspace.entries[0].view.websiteOpen = true;
  const restored = model.parseBackup(model.backup(workspace));
  assert.deepEqual(restored.entries[0].draft.website, record.website);
  assert.equal(restored.entries[0].view.websiteField, 'STORY_PARAGRAPHS');
  const badView = structuredClone(restored); badView.entries[0].view.websiteField = 'bad';
  assert.throws(() => model.serialize(badView), /unsupported website field/);
  assert.deepEqual(model.duplicate(record).website, record.website);
  const imported = model.mergeImport(model.emptyWorkspace(), restored);
  assert.deepEqual(imported.entries[0].saved.website, record.website);
  assert.notEqual(imported.activeId, record.id);
  // Drafts can recover incomplete page copy; named saves and previews must validate.
  record.website.STORY_HEADING = ''; model.validateDraft(record);
  assert.throws(() => model.materialize(record), /Story heading/);
  record.website.STORY_HEADING = 'Restored'; record.website.GLANCE_ITEMS = ['Only one'];
  model.validateDraft(record); assert.throws(() => model.materialize(record), /four non-empty lines/);
  record.website = { HERO_ACTION_TARGET: 'javascript:evil()' };
  assert.throws(() => model.validateDraft(record), /unsupported field/);
  record.website = { STORY_HEADING: 'x'.repeat(10001) };
  assert.throws(() => model.validateDraft(record), /10,000/);
  // Existing backups retain their exact shape and do not need a migration.
  const legacy = { version: 1, activeId: original.id, entries: [model.entryFor(original)] };
  assert.deepEqual(model.parseBackup(model.backup(legacy)), legacy);
}
console.log('Website workspace checks passed: identical shared renderer, all four properties, coherent hero/menu/cards/story, escaped copy, validation, legacy v1 saves, duplication and backup/import.');

const renamed = model.newCampaign(); renamed.content.venueName += ' Test';
const renameHTML = render(model.materialize(renamed), template, { sites: copy.resolve(renamed, sites) });
assert.ok(!renameHTML.includes('Test Test'));
