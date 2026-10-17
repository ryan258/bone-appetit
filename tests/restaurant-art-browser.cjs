// One focused headless pass: logos, dish matching, creator sources, and offline artwork.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { createModel, KEY } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const art = require('../website-renderer.js');
const { loadSites } = require('../scripts/render-site.cjs');
const model = createModel(require('../site-data.json')), catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(p => catalog.create(p.id))], sites = loadSites();
const workspace = { version: 1, activeId: records[0].id, entries: records.map((record, i) => {
  const entry = model.entryFor(record); entry.saved = structuredClone(record);
  entry.draft.content.venueName = 'Edited haunt ' + i; entry.draft.content.menu[0].name = 'Edited signature dish ' + i;
  return entry;
}) };
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-restaurant-art-browser-'));
const errors = [], external = [], failed = [];
let browser, server;
async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  ctx.setDefaultTimeout(8000); ctx.setDefaultNavigationTimeout(10000);
  ctx.on('page', page => { page.on('pageerror', error => errors.push(error.message)); page.on('requestfailed', req => failed.push(req.url())); });
  await ctx.route('**/*', route => { const url = route.request().url(); if (/^https?:/.test(url) && !url.startsWith(server.origin + '/')) { external.push(url); return route.abort(); } return route.continue(); });
  return ctx;
}
async function images(page) {
  await page.evaluate(async () => { for (const img of document.images) img.loading = 'eager'; await Promise.all([...document.images].filter(img => img.hasAttribute('src')).map(img => img.decode())); await document.fonts.ready; });
}
async function website(page, record) {
  const data = record.reference;
  assert.ok((await page.locator('.brand .restaurant-logo').getAttribute('src')).endsWith(art.logoAsset(data)));
  assert.equal(await page.locator('.brand .restaurant-logo').getAttribute('alt'), '');
  assert.ok((await page.locator('.footer-logo').getAttribute('src')).endsWith(art.logoAsset(data)));
  assert.ok((await page.locator('link[rel=icon]').getAttribute('href')).endsWith(art.logoAsset(data)));
  for (const f of data.featured) {
    const expected = art.foodArt(data, f.id), image = page.locator(`[data-featured-id="${f.id}"] img`);
    assert.ok((await image.getAttribute('src')).endsWith(expected.asset)); assert.equal(await image.getAttribute('alt'), expected.alt);
  }
  await page.locator('[data-attraction=pizzeria]').first().click();
  assert.ok((await page.locator('#attraction-image').getAttribute('src')).endsWith(art.attractionArt(data, 'pizzeria').asset));
  await page.locator('#attraction-image').evaluate(img => img.decode()); await page.locator('#attraction-dialog [data-close]').click();
}
async function preview(page) {
  await page.locator('#preview-website').click(); await page.waitForFunction(() => document.querySelector('#website-status').textContent.startsWith('Full website ready.'));
  const frame = await (await page.locator('#website-preview').elementHandle()).contentFrame(); await images(frame); return frame;
}
async function download(page, selector, filename) {
  const pending = page.waitForEvent('download', { timeout: 15000 }); await page.locator(selector).click();
  const file = await pending; await file.saveAs(path.join(output, filename));
}
function extract(zip, folder) {
  const result = spawnSync('python3', ['-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', path.join(output, zip), path.join(output, folder)], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
}
async function run() {
  server = await startServer(); browser = await chromium.launch({ headless: true });
  const ctx = await context(), page = await ctx.newPage();
  for (const [i, site] of sites.entries()) {
    await page.goto(server.origin + '/' + site.href); await page.locator('html.enhanced').waitFor(); await images(page); await website(page, records[i]);
    for (const width of [1440, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), site.id + ' ' + width + ' reflow');
      const logo = await page.locator('.brand .restaurant-logo').boundingBox(); assert.ok(logo.width >= 50 && logo.height >= 50);
      const brand = await page.locator('.brand').boundingBox(); assert.ok(brand.x >= 0 && brand.x + brand.width <= width);
      if (width === 1440 || width === 375) {
        await page.locator('.site-header').screenshot({ path: path.join(output, site.id + '-header-' + width + '.png') });
        await page.locator('#menu').screenshot({ path: path.join(output, site.id + '-menu-' + width + '.png') });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('.footer-top').screenshot({ path: path.join(output, site.id + '-footer.png') });
  }
  await ctx.addInitScript(({ raw, key }) => { if (location.protocol === 'http:' && !localStorage.getItem(key)) localStorage.setItem(key, raw); }, { raw: model.serialize(workspace), key: KEY });
  await page.goto(server.origin + '/creator.html'); await page.locator('html.creator-ready').waitFor();
  await page.waitForFunction(() => !document.querySelector('#preview-website').disabled);
  const before = await page.evaluate(key => localStorage.getItem(key), KEY);
  for (const [i, record] of records.entries()) {
    await page.locator(`[data-campaign-id="${record.id}"]`).click();
    assert.ok((await page.locator('#preview-logo').getAttribute('src')).endsWith(art.logoAsset(record.reference)));
    for (const f of record.reference.featured) {
      await page.selectOption('#menu-item-picker', f.id); assert.equal(await page.locator('#preview-food').isVisible(), true);
      assert.ok((await page.locator('#preview-food-image').getAttribute('src')).endsWith(art.foodArt(record.reference, f.id).asset));
      await page.locator('#preview-food-image').evaluate(img => img.decode());
    }
    const other = record.content.menu.find(item => !art.foodArt(record.reference, item.id));
    if (other) {
      await page.selectOption('#menu-item-picker', other.id); assert.equal(await page.locator('#preview-food').isVisible(), false);
      assert.equal(await page.locator('#preview-food-image').getAttribute('src'), null, 'Unpictured dish does not retain stale image.');
    }
    await page.selectOption('#menu-item-picker', record.reference.featured[0].id);
    for (const source of ['draft', 'named']) {
      await page.selectOption('#website-source', source); const frame = await preview(page); await website(frame, record);
      assert.equal((await frame.locator('.brand-type').textContent()).startsWith(source === 'draft' ? 'Edited haunt ' + i : record.content.venueName), true);
    }
    await download(page, '#download-website', record.reference.branding?.propertyId + '-named.zip');
    // Marketing HTML embeds logos/selected dish art and remains printable.
    await page.selectOption('#pack-source', 'draft'); await page.locator('#build-pack').click(); await page.locator('#pack-results').waitFor();
    for (const piece of ['landing', 'menu-insert', 'poster']) {
      await page.selectOption('#pack-piece', piece);
      const frame = await (await page.locator('#pack-preview').elementHandle()).contentFrame();
      await frame.locator('main.' + piece).waitFor(); await images(frame);
      assert.equal(await frame.locator('.brand img').count(), 1);
      if (piece !== 'poster') assert.equal(await frame.locator('img.menu-food').count(), record.reference.featured.length);
    }
    await page.selectOption('#pack-piece', 'menu-insert');
    const printFrame = await (await page.locator('#pack-preview').elementHandle()).contentFrame(); await printFrame.locator('main.menu-insert').waitFor();
    await page.emulateMedia({ media: 'print' });
    const geometry = await printFrame.locator('main').evaluate(el => ({ width: el.scrollWidth, height: el.scrollHeight }));
    assert.ok(geometry.height <= 979, JSON.stringify({ site: sites[i].id, geometry })); await page.emulateMedia({ media: 'screen' });
    await download(page, '#download-pack', sites[i].id + '-marketing.zip'); extract(sites[i].id + '-marketing.zip', sites[i].id + '-marketing');
  }
  await download(page, '#download-collection', 'collection.zip'); extract('collection.zip', 'collection');
  // Editing position may change, but preview/export never changes any draft or named source.
  await page.waitForTimeout(550);
  const after = await page.evaluate(key => localStorage.getItem(key), KEY);
  const sources = raw => JSON.parse(raw).entries.map(e => ({ draft: e.draft, saved: e.saved })); assert.deepEqual(sources(after), sources(before));
  await page.locator('.creator-preview').screenshot({ path: path.join(output, 'creator-art-preview.png') });
  const offline = await context({ offline: true }), local = await offline.newPage();
  await local.goto(pathToFileURL(path.join(output, 'collection/index.html')).href);
  for (const [i, site] of sites.entries()) {
    if (i) await local.locator(`#property-switcher [data-property-link="${site.id}"]`).click();
    await local.locator('html.enhanced').waitFor(); await images(local); await website(local, records[i]);
    assert.ok((await local.locator('.brand-type').textContent()).startsWith('Edited haunt ' + i));
    const filename = records[i].reference.branding?.propertyId + '-named.zip'; extract(filename, site.id + '-single');
    const single = await offline.newPage(); await single.goto(pathToFileURL(path.join(output, site.id + '-single/index.html')).href);
    await single.locator('html.enhanced').waitFor(); await images(single); await website(single, records[i]); await single.close();
    const piece = await offline.newPage(); await piece.goto(pathToFileURL(path.join(output, site.id + '-marketing/menu-insert.html')).href); await images(piece);
    assert.equal(await piece.locator('img.menu-food').count(), records[i].reference.featured.length); await piece.close();
  }
  assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(failed, []);
  console.log('Restaurant artwork browser pass passed: four logos/favicons, nine dish images, 320/375/768/1440 reflow, matching detail art, legacy draft/named previews, stale-image clearing, embedded marketing/Letter layouts, unchanged sources, and offline individual/linked collection exports.');
  console.log('Chromium ' + browser.version() + ' · no page errors, external requests or failed resources · artifacts: ' + output);
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) await server.stop(); });
