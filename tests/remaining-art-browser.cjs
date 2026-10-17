// One focused headless pass for the two newly stocked properties.
const assert = require('node:assert/strict');
const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { createModel, KEY } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const art = require('../website-renderer.js');
const model = createModel(require('../site-data.json')), catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(p => catalog.create(p.id))];
const entries = records.map(r => ({ ...model.entryFor(r), saved: structuredClone(r) }));
for (const index of [0, 2]) { entries[index].draft.content.venueName += ' After Hours'; entries[index].draft.content.menu[0].price = '33.50'; }
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-remaining-art-browser-'));
let server, browser; const errors = [], external = [], failed = [];
async function context(options = {}) {
  const c = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  c.setDefaultTimeout(10000); c.setDefaultNavigationTimeout(10000);
  c.on('page', p => { p.on('pageerror', e => errors.push(e.message)); p.on('requestfailed', r => failed.push(r.url())); });
  await c.route('**/*', route => { const url = route.request().url(); if (/^https?:/.test(url) && !url.startsWith(server.origin + '/')) { external.push(url); return route.abort(); } return route.continue(); });
  return c;
}
async function images(p) {
  const missing = await p.evaluate(async () => {
    for (const i of document.images) i.loading = 'eager';
    const results = await Promise.all([...document.images].filter(i => i.getAttribute('src')).map(async i => { try { await i.decode(); return null; } catch { return { id: i.id, src: i.getAttribute('src'), currentSrc: i.currentSrc, complete: i.complete, width: i.naturalWidth }; } }));
    await document.fonts.ready; return results.filter(Boolean);
  });
  assert.deepEqual(missing, [], 'All source images decode: ' + JSON.stringify(missing));
}
async function checkArt(p, data) {
  await images(p);
  assert.equal(await p.locator('#full-menu .full-menu-photo').count(), Object.values(data.menu).flat().length);
  assert.ok((await p.locator('#story img').getAttribute('src')).endsWith(art.storyArt(data).asset));
  assert.ok((await p.locator('.grounds-figure img').getAttribute('src')).endsWith(art.mapAsset(data)));
  assert.ok(await p.locator('img').evaluateAll(imgs => imgs.every(i => i.getAttribute('src').endsWith('.webp'))), 'All visitor image elements use WebP.');
  for (const item of data.oddities) assert.ok((await p.locator('#oddity-' + item.id + ' img').getAttribute('src')).endsWith(art.oddityArt(data, item).asset));
  assert.ok(await p.locator('.oddity-illustration > span').evaluateAll(labels => labels.every(label => {
    const css = getComputedStyle(label), channels = color => [...color.matchAll(/[\d.]+/g)].map(m => Number(m[0]));
    const light = rgb => rgb.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const bg = channels(css.backgroundColor), a = light(channels(css.color)), b = light(bg);
    return (bg.length === 3 || bg[3] === 1) && (Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5;
  })), 'Collection labels keep an opaque high-contrast background.');
  for (const key of Object.keys(data.attractions)) {
    const card = p.locator('.haunt-card').filter({ has: p.locator('[data-attraction=' + key + ']') });
    assert.ok((await card.locator('img').getAttribute('src')).endsWith(art.attractionArt(data, key).asset));
    await card.locator('[data-attraction]').click();
    assert.ok((await p.locator('#attraction-image').getAttribute('src')).endsWith(art.attractionArt(data, key).asset));
    await p.locator('#attraction-image').evaluate(i => i.decode()); await p.locator('#attraction-dialog [data-close]').click();
  }
}
async function menu(p, data, price) {
  await p.locator('[data-open-menu]').first().click();
  for (const [category, items] of Object.entries(data.menu)) {
    await p.locator('[data-filter=' + category + ']').click();
    assert.deepEqual(await p.locator('#full-menu-items img').evaluateAll(imgs => imgs.map(i => i.getAttribute('src'))), items.map(i => 'assets/' + art.foodArt(data, i.id).asset));
    await p.locator('#full-menu-items').evaluate(async el => Promise.all([...el.querySelectorAll('img')].map(i => i.decode())));
    if (category === 'pizzas') assert.equal(await p.locator('#full-menu-items strong').first().textContent(), price);
    assert.deepEqual(await p.locator('#full-menu-items .full-menu-item').evaluateAll(els => els.map(el => [...el.querySelectorAll('.menu-tags span')].map(tag => tag.textContent))), items.map(i => i.tags));
    assert.ok(await p.locator('#menu-dialog').evaluate(el => el.scrollWidth <= el.clientWidth + 1));
  }
  await p.locator('#menu-dialog [data-close]').click();
}
async function download(p, selector, filename) {
  const pending = p.waitForEvent('download', { timeout: 20000 }); await p.locator(selector).click(); const d = await pending; await d.saveAs(path.join(output, filename));
}
function extract(file, folder) {
  const r = spawnSync('python3', ['-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', path.join(output, file), path.join(output, folder)], { encoding: 'utf8', timeout: 10000 }); assert.equal(r.status, 0, r.stderr);
}
async function property(index) {
  const record = records[index], data = record.reference, id = data.branding?.propertyId || 'bone-appetit', href = art.ROUTES[id];
  const c = await context(), p = await c.newPage();
  await p.goto(server.origin + '/' + href); await p.locator('html.enhanced').waitFor(); await checkArt(p, data);
  for (const width of [1440, 768, 375, 320]) {
    await p.setViewportSize({ width, height: 1000 }); assert.ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), id + ' ' + width + ' reflow'); await menu(p, data, '$' + data.menu.pizzas[0].price);
    if (width === 1440 || width === 375) {
      for (const section of ['haunts', 'menu', 'story', 'oddities', 'grounds']) await p.locator('#' + section).screenshot({ path: path.join(output, id + '-' + section + '-' + width + '.png'), style: '.site-header { position: static !important; } .skip-link { visibility: hidden !important; }' });
      await p.locator('[data-open-menu]').first().click(); await p.locator('[data-filter=drinks]').click(); await p.locator('#menu-dialog').screenshot({ path: path.join(output, id + '-drinks-' + width + '.png') }); await p.locator('#menu-dialog [data-close]').click();
    }
  }
  const plainContext = await context({ javaScriptEnabled: false }), plain = await plainContext.newPage();
  await plain.goto(server.origin + '/' + href); await images(plain); assert.equal(await plain.locator('#full-menu .full-menu-photo').count(), record.content.menu.length); assert.equal(await plain.locator('#full-menu').isVisible(), true); await plainContext.close();
  await p.setViewportSize({ width: 1440, height: 1000 });
  await c.addInitScript(({ key, raw }) => { if (location.protocol === 'http:' && !localStorage.getItem(key)) localStorage.setItem(key, raw); }, { key: KEY, raw: model.serialize({ version: 1, activeId: record.id, entries }) });
  await p.goto(server.origin + '/creator.html'); await p.locator('html.creator-ready').waitFor(); await p.waitForFunction(() => !document.querySelector('#preview-website').disabled);
  const before = await p.evaluate(key => localStorage.getItem(key), KEY);
  for (const item of Object.values(data.menu).flat()) {
    await p.selectOption('#menu-item-picker', item.id); assert.equal(await p.locator('#preview-food').isVisible(), true);
    assert.ok((await p.locator('#preview-food-image').getAttribute('src')).endsWith(art.foodArt(data, item.id).asset)); await p.locator('#preview-food-image').evaluate(i => i.decode());
  }
  const section = p.locator('.creator-section').filter({ has: p.locator('#attraction-picker') });
  if (await section.getAttribute('open') === null) await section.locator('summary').click();
  for (const key of Object.keys(data.attractions)) {
    await p.selectOption('#attraction-picker', key); assert.equal(await p.locator('#preview-experience-image').isVisible(), true);
    assert.ok((await p.locator('#preview-experience-image').getAttribute('src')).endsWith(art.attractionArt(data, key).asset)); await p.locator('#preview-experience-image').evaluate(i => i.decode());
  }
  await p.locator('#preview-experience-image').screenshot({ path: path.join(output, id + '-creator-experience.png') });
  for (const source of ['draft', 'named']) {
    await p.selectOption('#website-source', source); await p.locator('#preview-website').click(); await p.waitForFunction(() => document.querySelector('#website-status').textContent.startsWith('Full website ready.'));
    const frame = await (await p.locator('#website-preview').elementHandle()).contentFrame(); await checkArt(frame, data); await menu(frame, data, source === 'draft' ? '$33.50' : '$' + data.menu.pizzas[0].price);
    assert.ok((await frame.locator('.brand-type').textContent()).startsWith(source === 'draft' ? entries[index].draft.content.venueName : record.content.venueName));
    await download(p, '#download-website', id + '-' + source + '.zip'); extract(id + '-' + source + '.zip', id + '-' + source);
  }
  const other = index === 0 ? 2 : 0;
  await p.locator('[data-campaign-id="' + records[other].id + '"]').click();
  assert.equal(await p.locator('#preview-experience-image').isVisible(), true);
  assert.ok((await p.locator('#preview-experience-image').getAttribute('src')).endsWith(art.attractionArt(records[other].reference, await p.locator('#attraction-picker').inputValue()).asset));
  await p.locator('[data-campaign-id="' + record.id + '"]').click();
  const selection = index === 0 ? ['cemetery-margherita', 'pumpkin-arancini', 'black-candle-cheesecake', 'wicked-orchard-cider'] : ['the-heir-apparent-strip', 'estate-tartare', 'creme-brulee-bequest', 'bloodline-fizz'];
  await p.locator('.pack-selection summary').click();
  for (const input of await p.locator('[data-pack-menu]').all()) await input.setChecked(selection.includes(await input.getAttribute('value')));
  await p.locator('#build-pack').click(); await p.locator('#pack-results').waitFor(); await p.selectOption('#pack-piece', 'menu-insert');
  const packFrame = await (await p.locator('#pack-preview').elementHandle()).contentFrame(); await packFrame.locator('main.menu-insert').waitFor(); await images(packFrame);
  assert.equal(await packFrame.locator('img.menu-food').count(), 4); assert.ok((await packFrame.locator('img.menu-food').last().getAttribute('alt')).includes('Zero-proof'));
  await download(p, '#download-pack', id + '-marketing.zip'); extract(id + '-marketing.zip', id + '-marketing');
  if (index === 2) { await download(p, '#download-collection', 'collection.zip'); extract('collection.zip', 'collection'); }
  await p.waitForTimeout(550); const sources = raw => JSON.parse(raw).entries.map(e => ({ draft: e.draft, saved: e.saved })); assert.deepEqual(sources(await p.evaluate(key => localStorage.getItem(key), KEY)), sources(before));
  const offline = await context({ offline: true }), local = await offline.newPage();
  for (const source of ['draft', 'named']) { await local.goto(pathToFileURL(path.join(output, id + '-' + source, 'index.html')).href); await local.locator('html.enhanced').waitFor(); await checkArt(local, data); await menu(local, data, source === 'draft' ? '$33.50' : '$' + data.menu.pizzas[0].price); }
  await local.goto(pathToFileURL(path.join(output, id + '-marketing/menu-insert.html')).href); await images(local); assert.equal(await local.locator('img.menu-food').count(), 4);
  await offline.close(); await c.close();
}
async function run() {
  server = await startServer(); browser = await chromium.launch({ headless: true });
  await property(0); await property(2);
  const c = await context({ offline: true }), p = await c.newPage();
  await p.goto(pathToFileURL(path.join(output, 'collection/index.html')).href);
  for (const index of [2, 0]) {
    const data = records[index].reference, id = data.branding?.propertyId || 'bone-appetit';
    await p.locator('#property-switcher [data-property-link="' + id + '"]').click(); await p.locator('html.enhanced').waitFor(); await checkArt(p, data); await menu(p, data, '$33.50');
  }
  await c.close();
  const archives = [path.join(output, 'collection.zip'), ...[0, 2].flatMap(index => ['draft', 'named'].map(source => path.join(output, (records[index].reference.branding?.propertyId || 'bone-appetit') + '-' + source + '.zip')))];
  const integrity = spawnSync('python3', [path.join(__dirname, 'helpers/website-archive.py'), ...archives], { encoding: 'utf8', timeout: 15000 }); assert.equal(integrity.status, 0, integrity.stderr);
  assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(failed, []);
  console.log('Remaining artwork browser pass passed: 42 menu images/tags, six scenes/dialogs, 12 object portraits, story/maps, 320/375/768/1440 layouts, no-JS, legacy Bone creator fallback, all food/experience selections, draft/named sources, marketing packs, unchanged campaigns, offline linked sites and five independent UI ZIP integrity checks.');
  console.log('Chromium ' + browser.version() + ' · no page errors, external requests or failed resources · artifacts: ' + output);
}
run().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) await server.stop(); });
