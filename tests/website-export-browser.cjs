// One focused export pass: creator ZIP downloads, extracted file/HTTP sites and recovery.
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
const model = createModel(require('../site-data.json'));
const catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(property => catalog.create(property.id))];
const entries = records.map((record, index) => {
  record.name = `PRIVATE_CAMPAIGN_${index}`; record.brief.audience = `PRIVATE_BRIEF_${index}`;
  record.copy.headline = `Named haunt ${index}`; record.website = { STORY_HEADING: `An *exported* story ${index}` };
  record.content.menu[0].price = '33.50';
  const saved = structuredClone(record), draft = structuredClone(record);
  draft.copy.headline = `Draft haunt ${index}`; draft.content.menu[0].price = '39.50';
  return { ...model.entryFor(draft), saved };
});
const workspace = { version: 1, activeId: entries[0].draft.id, entries };
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-website-export-browser-'));
const errors = [], external = [], resourceFailures = []; let browser, creatorServer, exportedServer;
async function session(options = {}) {
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 }, ...options });
  context.setDefaultTimeout(6000); context.setDefaultNavigationTimeout(10000);
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && ![creatorServer?.origin, exportedServer?.origin].some(origin => origin && url.startsWith(origin + '/'))) { external.push(url); return route.abort(); }
    return route.continue();
  });
  return context;
}
async function creatorReady(page) {
  await page.locator('html.creator-ready').waitFor(); await page.waitForFunction(() => !document.querySelector('#download-website').disabled);
}
async function download(page, selector, target) {
  const pending = page.waitForEvent('download'); await page.locator(selector).click();
  const file = await pending; await file.saveAs(target); assert.equal(await file.failure(), null); return file;
}
function extract(zip, directory) {
  const result = spawnSync('python3', ['-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', zip, directory], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  return manifest;
}
async function enhanced(page) { await page.locator('html.enhanced').waitFor(); }
async function loadArt(page) {
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    await Promise.all([...document.images].map(image => image.decode()));
    await Promise.all([...document.fonts].map(face => face.load())); await document.fonts.ready;
  });
  assert.ok(await page.evaluate(() => [...document.fonts].every(face => face.status === 'loaded')));
}
async function run() {
  creatorServer = await startServer(); browser = await chromium.launch({ headless: true });
  const creatorContext = await session();
  await creatorContext.addInitScript(({ raw, key, originalKeys }) => {
    if (location.protocol !== 'http:' || localStorage.getItem(key)) return;
    localStorage.setItem(key, raw); originalKeys.forEach(key => localStorage.setItem(key, 'original plan sentinel'));
  }, { raw: model.serialize(workspace), key: KEY, originalKeys: records.map(record => record.reference.planner.storageKey) });
  const creator = await creatorContext.newPage(); await creator.goto(creatorServer.origin + '/creator.html'); await creatorReady(creator);
  const originalStorage = await creator.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  const packages = [];
  for (const [index, entry] of entries.entries()) {
    await creator.locator(`[data-campaign-id="${entry.draft.id}"]`).click();
    for (const state of ['named','draft']) {
      await creator.selectOption('#website-source', state);
      const zip = path.join(output, `${index}-${state}.zip`);
      const file = await download(creator, '#download-website', zip);
      assert.ok(file.suggestedFilename().includes(`-website-${state}-`));
      const directory = path.join(output, `${index}-${state}`), manifest = extract(zip, directory);
      assert.equal(manifest.sourceState, state);
      const content = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
      assert.ok(content.includes(`${state === 'named' ? 'Named' : 'Draft'} haunt ${index}`));
      assert.ok(content.includes(state === 'named' ? '$33.50' : '$39.50'));
      assert.ok(content.includes(`An <em>exported</em> story ${index}`));
      assert.ok(!content.includes('data-creator-preview'));
      packages.push({ index, state, zip, directory, manifest });
    }
  }
  const after = await creator.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  const savedWorkspace = JSON.parse(after[KEY]);
  assert.deepEqual(savedWorkspace.entries.map(entry => entry.saved), workspace.entries.map(entry => entry.saved));
  assert.deepEqual(savedWorkspace.entries.map(entry => entry.draft), workspace.entries.map(entry => entry.draft));
  for (const [key, value] of Object.entries(originalStorage)) if (key !== KEY) assert.equal(after[key], value);
  const check = spawnSync('python3', [path.join(__dirname, 'helpers/website-archive.py'), output], { encoding: 'utf8', timeout: 15000 });
  assert.equal(check.status, 0, check.stderr);
  const offline = await session({ offline: true });
  const filePage = await offline.newPage();
  filePage.on('requestfailed', request => { if (request.url().startsWith('file:')) resourceFailures.push(request.url()); });
  for (const pack of packages.filter(pack => pack.state === 'draft')) {
    const entry = entries[pack.index];
    await filePage.goto(pathToFileURL(path.join(pack.directory, 'index.html')).href); await enhanced(filePage); await loadArt(filePage);
    assert.equal(await filePage.locator('#hero-title').innerText(), `Draft haunt ${pack.index}`);
    assert.equal(await filePage.locator('[data-property-link]').count(), 2);
    assert.equal(await filePage.locator('a[href="creator.html"]').count(), 0);
    await filePage.locator('[data-open-menu]').first().click();
    for (const category of Object.keys(entry.draft.reference.menu)) {
      await filePage.locator(`[data-filter="${category}"]`).click();
      assert.equal(await filePage.locator('#full-menu-items article').count(), entry.draft.reference.menu[category].length);
    }
    assert.equal(new URL(filePage.url()).hash, '#full-menu-drinks');
    await filePage.reload(); await enhanced(filePage);
    assert.ok(await filePage.locator('#menu-dialog').isVisible()); await filePage.locator('#menu-dialog [data-close]').click();
    for (const key of Object.keys(entry.draft.reference.attractions)) {
      await filePage.locator(`[data-attraction="${key}"]`).first().click();
      assert.equal(await filePage.locator('#attraction-title').textContent(), entry.draft.content.attractions[key].title);
      await filePage.locator('#attraction-dialog [data-close]').click();
    }
    await filePage.locator('[data-open-planner]').first().click();
    await filePage.selectOption('#visit-guests', '7'); await filePage.locator('#planner-form [type=submit]').click();
    assert.ok((await filePage.locator('#plan-status').innerText()).includes('saved in this browser'));
    const itinerary = path.join(output, `${pack.index}-itinerary.txt`), fieldNotes = path.join(output, `${pack.index}-field-notes.html`);
    await download(filePage, '#download-plan', itinerary); await download(filePage, '#download-field-notes', fieldNotes);
    assert.ok(fs.readFileSync(itinerary, 'utf8').includes('7 '));
    assert.ok(fs.readFileSync(fieldNotes, 'utf8').includes('<svg'));
    await filePage.reload(); await enhanced(filePage); await filePage.locator('[data-open-planner]').first().click();
    assert.equal(await filePage.locator('#visit-guests').inputValue(), '7');
    await filePage.locator('#planner-dialog [data-close]').click();
    await filePage.setViewportSize({ width: 375, height: 900 });
    assert.ok(await filePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await filePage.evaluate(() => window.scrollTo(0, 0));
    if (pack.index === 3) await filePage.screenshot({ path: path.join(output, 'offline-lodge-phone.png') });
    await filePage.setViewportSize({ width: 1440, height: 1000 });
    if (pack.index === 2) { await filePage.evaluate(() => window.scrollTo(0, 0)); await filePage.screenshot({ path: path.join(output, 'offline-steakhouse-desktop.png') }); }
  }
  assert.deepEqual(resourceFailures, []);
  const fallbackContext = await session({ offline: true, javaScriptEnabled: false });
  const fallback = await fallbackContext.newPage();
  for (const pack of packages.filter(pack => pack.state === 'draft')) {
    await fallback.goto(pathToFileURL(path.join(pack.directory, 'index.html')).href);
    assert.ok(await fallback.locator('#full-menu').isVisible());
    assert.equal(await fallback.locator('#full-menu [data-menu-id]').count(), pack.index ? 18 : 24);
    assert.equal(await fallback.locator('.static-attraction').count(), 3);
  }
  // All exported sites can share a static host without sharing saved-plan keys.
  exportedServer = await startServer(output);
  const hosted = await session(); const hostedPage = await hosted.newPage();
  for (const pack of packages.filter(pack => pack.state === 'draft')) {
    await hostedPage.goto(`${exportedServer.origin}/${pack.index}-draft/index.html`); await enhanced(hostedPage);
    await hostedPage.locator('[data-open-planner]').first().click(); await hostedPage.selectOption('#visit-guests', String(pack.index + 3));
    await hostedPage.locator('#planner-form [type=submit]').click();
    assert.equal(await hostedPage.evaluate(key => JSON.parse(localStorage.getItem(key)).guests, pack.manifest.plannerStorageKey), pack.index + 3);
  }
  assert.equal(await hostedPage.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('bone-website-')).length), 4);
  await hostedPage.goto(`${exportedServer.origin}/0-draft/index.html`); await enhanced(hostedPage);
  await hostedPage.locator('[data-open-planner]').first().click(); assert.equal(await hostedPage.locator('#visit-guests').inputValue(), '3');
  // Validation and resource failure/retry leave the campaign intact.
  await creator.fill('#menu-price', 'bad'); await creator.locator('#download-website').click();
  assert.ok((await creator.locator('#website-export-status').innerText()).includes('Menu price'));
  await creator.fill('#menu-price', '39.50');
  await creator.reload(); await creatorReady(creator);
  await creator.route('**/assets/fonts/dm-sans-600.ttf', route => route.abort());
  await creator.locator('#download-website').click();
  await creator.waitForFunction(() => document.querySelector('#website-export-status').textContent.startsWith('Could not export website:'));
  await creator.unroute('**/assets/fonts/dm-sans-600.ttf');
  await download(creator, '#download-website', path.join(output, 'retry.zip'));
  // Delayed download must be discarded after the source changes.
  await creator.reload(); await creatorReady(creator);
  let release, requested, finished;
  const gate = new Promise(resolve => { release = resolve; }), started = new Promise(resolve => { requested = resolve; }), completed = new Promise(resolve => { finished = resolve; });
  await creator.route('**/app.js', async route => { requested(); await gate; try { await route.continue(); } finally { finished(); } });
  const observedDownloads = []; creator.on('download', file => observedDownloads.push(file.suggestedFilename()));
  let timeout;
  try {
    await creator.locator('#download-website').click();
    await Promise.race([started, new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Expected delayed app resource request.')), 6000); })]);
    await creator.fill('[data-copy=headline]', 'Edited while downloading');
  } finally {
    clearTimeout(timeout); release(); await completed; await creator.unroute('**/app.js');
  }
  await download(creator, '#download-website', path.join(output, 'current-after-edit.zip'));
  assert.equal(observedDownloads.length, 1, 'The stale build must never start a download.');
  const current = path.join(output, 'current-after-edit'); extract(path.join(output, 'current-after-edit.zip'), current);
  assert.ok(fs.readFileSync(path.join(current, 'index.html'), 'utf8').includes('Edited while downloading'));
  await creator.route('**/website-export.js', route => route.abort()); await creator.reload();
  await creator.locator('html.creator-ready').waitFor();
  await creator.waitForFunction(() => !document.querySelector('#preview-website').disabled);
  assert.ok(await creator.locator('#download-website').isDisabled());
  assert.ok((await creator.locator('#website-export-status').innerText()).includes('script is unavailable'));
  assert.equal(await creator.locator('[data-copy=headline]').inputValue(), 'Edited while downloading');
  await creator.unroute('**/website-export.js'); await creator.reload(); await creatorReady(creator);
  await creator.setViewportSize({ width: 375, height: 900 }); assert.ok(await creator.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log(`Website export browser pass passed: eight draft/named downloads, all four extracted offline websites, fonts/art, menus/details/deep links, planner save/reload and itinerary exports, no-JS fallbacks, static hosting with independent plans, source consistency, validation, retry, stale-download prevention and script recovery.\nChromium ${browser.version()} · no page errors or external requests · artifacts: ${output}`);
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close(); if (creatorServer) await creatorServer.stop(); if (exportedServer) await exportedServer.stop();
});
