// One focused browser launch for property glyph placement, previews and exports.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { createModel, KEY } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const website = require('../website-renderer.js');
const glyphs = require('../property-glyphs.js');
const root = path.resolve(__dirname, '..');
const output = process.env.GLYPH_REVIEW_OUTPUT || fs.mkdtempSync('/tmp/bone-glyph-integration-');
fs.mkdirSync(output, { recursive: true });
const model = createModel(require('../site-data.json'));
const catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(item => catalog.create(item.id))];
const workspace = { version: 1, activeId: records[0].id, entries: records.map(record => ({ ...model.entryFor(record), saved: structuredClone(record) })) };
const errors = [], external = [], failed = [], results = [];
let browser, server, diagnosticPage;
const collectionOnly = process.argv.includes('--collection-only');
async function context(options = {}) {
  const session = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  session.setDefaultTimeout(10000);
  session.setDefaultNavigationTimeout(10000);
  session.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push({ url: request.url(), failure: request.failure()?.errorText }));
  });
  await session.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && !url.startsWith(server.origin + '/')) { external.push(url); return route.abort(); }
    return route.continue();
  });
  return session;
}
async function check(page, id) {
  assert.equal(await page.locator('[data-glyph-library]').getAttribute('data-glyph-library'), id);
  assert.equal(await page.locator('[data-glyph-library] symbol').count(), 48);
  const issues = await page.locator('svg.icon use').evaluateAll((uses, propertyId) => uses.flatMap(use => {
    const href = use.getAttribute('href'), svg = use.ownerSVGElement;
    const symbol = document.getElementById(href.slice(1));
    const problem = !href.startsWith('#' + propertyId + '-') || !symbol || svg.getAttribute('aria-hidden') !== 'true' || svg.getAttribute('focusable') !== 'false';
    const visible = svg.getClientRects().length && getComputedStyle(svg).visibility !== 'hidden';
    const bounds = visible ? svg.getBBox() : null;
    return problem || (bounds && (!bounds.width || !bounds.height)) ? [href] : [];
  }), id);
  assert.deepEqual(issues, [], 'Every glyph resolves to its own property and draws in the browser.');
  assert.equal(await page.locator('svg.icon use').count(), 39);
  assert.deepEqual(await page.locator('[data-filter] [data-glyph-role]').evaluateAll(nodes => nodes.map(node => node.dataset.glyphRole)), ['dining', 'bites', 'dessert', 'drinks']);
  assert.deepEqual(await page.locator('.haunt-card [data-glyph-role]').evaluateAll(nodes => nodes.map(node => node.dataset.glyphRole)), ['dining', 'trail', 'collection']);
  assert.deepEqual(await page.locator('.oddity-material [data-glyph-role]').evaluateAll(nodes => nodes.map(node => node.dataset.glyphRole)), ['ghost', 'key', 'postcard', 'badge', 'souvenir', 'raven']);
  assert.deepEqual(await page.locator('.visitor-card dt [data-glyph-role]').evaluateAll(nodes => nodes.map(node => node.dataset.glyphRole)), ['calendar', 'clock', 'ticket', 'location']);
  assert.equal(await page.locator('.menu-tags svg').count(), 0);
}
async function layout(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page fits viewport.');
  const overflow = await page.locator('.glyph-label, .glyph-action, .visitor-card, .menu-filters, .planner-actions, dialog[open]').evaluateAll(nodes => nodes.filter(node => node.getClientRects().length && node.scrollWidth > node.clientWidth + 2).map(node => ({ tag: node.tagName, class: node.className, text: node.textContent.slice(0, 70) })));
  assert.deepEqual(overflow, [], 'Glyph labels and controls fit without clipping.');
}
async function menus(page, data) {
  await page.locator('[data-open-menu]').first().click();
  for (const [category, items] of Object.entries(data.menu)) {
    const button = page.locator(`[data-filter="${category}"]`);
    assert.equal((await button.innerText()).trim(), data.menuCategories[category]);
    await button.click();
    assert.equal(await button.getAttribute('aria-pressed'), 'true');
    assert.deepEqual(await page.locator('#full-menu-items .menu-tags').allTextContents(), items.filter(item => item.tags.length).map(item => item.tags.join('')));
    await layout(page);
  }
  await page.locator('#menu-dialog [data-close]').click();
}
async function extract(file, directory) {
  const result = spawnSync('python3', ['-c', 'import zipfile,sys;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;z.extractall(sys.argv[2])', file, directory], { encoding: 'utf8', timeout: 15000 });
  assert.equal(result.status, 0, result.stderr);
}
async function run() {
  server = await startServer();
  browser = await chromium.launch({ headless: true });
  console.log(collectionOnly ? 'Focused retry: collection UI download and its four offline pages only.' : 'Focused glyph review: one Chromium launch; four properties, layouts, previews and offline exports.');
  const live = await context(), page = await live.newPage();
  for (const record of collectionOnly ? [] : records) {
    const data = record.reference, id = data.branding?.propertyId || 'bone-appetit';
    await page.goto(server.origin + '/' + website.ROUTES[id]);
    await page.locator('html.enhanced').waitFor();
    await check(page, id);
    for (const width of [1440, 768, 375, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(() => document.fonts.ready);
      await layout(page); await menus(page, data);
      await page.locator('[data-open-planner]').first().click();
      assert.deepEqual(await page.locator('.planner-actions [data-glyph-role]').evaluateAll(nodes => nodes.map(node => node.dataset.glyphRole)), ['save', 'download', 'print', 'map']);
      await layout(page);
      await page.locator('#planner-form [type=submit]').click();
      await page.locator('#planner-dialog [data-close]').click();
      if (width === 1440) {
        for (const selector of ['.haunt-grid', '.oddities-grid']) await page.locator(selector).screenshot({ path: path.join(output, `${id}-${selector.slice(1)}.png`) });
      }
      if (width === 375) {
        await page.locator('.visitor-card').screenshot({ path: path.join(output, `${id}-visitor-phone.png`) });
        await page.locator('[data-open-menu]').first().click();
        await page.locator('[data-filter=drinks]').click();
        await page.locator('#menu-dialog').screenshot({ path: path.join(output, `${id}-menu-phone.png`) });
        await page.locator('#menu-dialog [data-close]').click();
      }
    }
    await page.emulateMedia({ media: 'print' });
    assert.ok(await page.locator('.property-glyph').evaluateAll(nodes => nodes.every(node => getComputedStyle(node).display === 'none')));
    await page.emulateMedia({ media: 'screen' });
    const plainContext = await context({ javaScriptEnabled: false, viewport: { width: 375, height: 1000 } });
    const plain = await plainContext.newPage(); await plain.goto(server.origin + '/' + website.ROUTES[id]);
    assert.ok(await plain.locator('#full-menu').isVisible());
    assert.equal(await plain.locator('#full-menu h3 .property-glyph').count(), 4);
    await layout(plain); await check(plain, id); await plainContext.close();
    results.push({ propertyId: id, liveWidths: [1440, 768, 375, 320], noJavaScript: true, printGlyphsHidden: true });
    console.log(`Live and no-JavaScript glyph checks passed: ${id}.`);
  }
  await live.close();
  const creatorContext = await context(), creator = await creatorContext.newPage();
  diagnosticPage = creator;
  await creatorContext.addInitScript(({ key, raw }) => { if (location.protocol === 'http:' && !localStorage.getItem(key)) localStorage.setItem(key, raw); }, { key: KEY, raw: model.serialize(workspace) });
  await creator.goto(server.origin + '/creator.html'); await creator.locator('html.creator-ready').waitFor();
  await creator.waitForFunction(() => !document.querySelector('#preview-website').disabled);
  const savedBefore = await creator.evaluate(key => localStorage.getItem(key), KEY);
  const offlineContext = await context({ offline: true }), offline = await offlineContext.newPage();
  for (const record of collectionOnly ? [] : records) {
    const data = record.reference, id = data.branding?.propertyId || 'bone-appetit';
    await creator.locator(`[data-campaign-id="${record.id}"]`).click();
    for (const source of ['draft', 'named']) {
      await creator.selectOption('#website-source', source); await creator.locator('#preview-website').click();
      await creator.waitForFunction(() => document.querySelector('#website-status').textContent.startsWith('Full website ready.'));
      const frame = await (await creator.locator('#website-preview').elementHandle()).contentFrame();
      await frame.locator('html.enhanced').waitFor(); await check(frame, id);
      for (const size of ['desktop', 'mobile']) {
        await creator.selectOption('#website-size', size);
        await frame.evaluate(() => document.fonts.ready);
        await layout(frame);
      }
      await menus(frame, data);
    }
    const waiting = creator.waitForEvent('download', { timeout: 20000 }); await creator.locator('#download-website').click();
    const downloaded = await waiting, zip = path.join(output, id + '.zip'), dir = path.join(output, id + '-offline');
    await downloaded.saveAs(zip); await extract(zip, dir);
    await offline.goto(pathToFileURL(path.join(dir, 'index.html')).href); await offline.locator('html.enhanced').waitFor();
    await check(offline, id); await offline.setViewportSize({ width: 375, height: 1000 }); await layout(offline); await menus(offline, data);
    console.log(`Draft/named preview and offline website glyph checks passed: ${id}.`);
  }
  for (const record of records) await creator.selectOption(`[data-collection-property="${record.reference.branding?.propertyId || 'bone-appetit'}"]`, record.id);
  const waiting = creator.waitForEvent('download', { timeout: 20000 }); await creator.locator('#download-collection').click();
  const downloaded = await waiting.catch(async error => { throw new Error(`${error.message}\nCollection status: ${await creator.locator('#collection-status').innerText()}`); }), zip = path.join(output, 'collection.zip'), dir = path.join(output, 'collection-offline');
  await downloaded.saveAs(zip); await extract(zip, dir);
  for (const record of records) {
    const id = record.reference.branding?.propertyId || 'bone-appetit';
    await offline.goto(pathToFileURL(path.join(dir, website.ROUTES[id])).href); await offline.locator('html.enhanced').waitFor();
    await check(offline, id); await layout(offline);
  }
  const savedAfter = await creator.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  const savedBeforeObject = JSON.parse(savedBefore);
  assert.deepEqual(savedAfter.entries.map(entry => entry.draft), savedBeforeObject.entries.map(entry => entry.draft));
  assert.deepEqual(savedAfter.entries.map(entry => entry.saved), savedBeforeObject.entries.map(entry => entry.saved));
  await offlineContext.close(); await creatorContext.close();
  assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(failed, []);
  fs.writeFileSync(path.join(output, collectionOnly ? 'collection-browser-results.json' : 'browser-results.json'), JSON.stringify({ chromium: browser.version(), scope: collectionOnly ? 'collection retry only' : 'complete focused review', properties: results, errors, external, failed }, null, 2) + '\n');
  console.log(`Glyph integration browser checks passed. Screenshots and exports: ${output}`);
}
run().catch(async error => {
  console.error(error);
  fs.writeFileSync(path.join(output, 'browser-failure.json'), JSON.stringify({ message: error.message, results, errors, external, failed,
    collectionStatus: diagnosticPage && !diagnosticPage.isClosed() ? await diagnosticPage.locator('#collection-status').innerText().catch(() => '') : '' }, null, 2) + '\n');
  process.exitCode = 1;
}).finally(async () => { if (browser) await browser.close(); if (server) await server.stop(); });
