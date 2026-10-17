// One focused, isolated browser pass. No visible window unless explicitly requested.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { createModel, KEY } = require('../creator-model.js');
const api = require('../marketing-pack.js');
const model = createModel(require('../site-data.json'));
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-marketing-browser-'));
let browser, server;
const errors = [], external = [];
async function context(options = {}) {
  const session = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 }, ...options });
  session.setDefaultTimeout(5000); session.setDefaultNavigationTimeout(10000);
  session.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await session.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && !url.startsWith(server.origin + '/')) { external.push(url); return route.abort(); }
    return route.continue();
  });
  return session;
}
async function ready(page) {
  await page.goto(server.origin + '/creator.html');
  await page.waitForFunction(() => document.documentElement.classList.contains('creator-ready'));
  await page.locator('#start-example').click();
}
async function build(page) {
  await page.locator('#build-pack').click();
  await page.locator('#pack-results').waitFor({ state: 'visible' });
  await page.frameLocator('#pack-preview').locator('main').waitFor();
}
async function download(page, selector, name) {
  const pending = page.waitForEvent('download'); await page.locator(selector).click();
  const file = await pending, target = path.join(output, name); await file.saveAs(target); return target;
}
async function run() {
  server = await startServer();
  browser = await chromium.launch({ headless: process.env.BONE_BROWSER_VISIBLE !== '1' });
  const session = await context(), page = await session.newPage();
  await ready(page);
  await page.locator('[data-brief=offer]').fill('A proper supper. The portrait has approved your appetite.');
  await page.locator('#creator-form [type=submit]').click();
  await page.locator('#menu-price').fill('27.50');
  await page.waitForFunction(() => /Draft recovered/.test(document.querySelector('#draft-state').textContent));
  await build(page);
  const zipPath = await download(page, '#download-pack', 'draft-pack.zip');
  const extracted = path.join(output, 'draft-pack');
  const extraction = spawnSync(process.env.PYTHON || 'python3', ['-c', 'import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;z.extractall(sys.argv[2])', zipPath, extracted], { encoding: 'utf8' });
  assert.equal(extraction.status, 0, extraction.stderr);
  const read = name => fs.readFileSync(path.join(extracted, name), 'utf8');
  const manifest = JSON.parse(read('manifest.json'));
  assert.equal(manifest.campaign.sourceState, 'draft');
  for (const file of manifest.files) {
    const bytes = fs.readFileSync(path.join(extracted, file.name));
    assert.equal(bytes.length, file.bytes);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256);
  }
  assert.match(read('menu-insert.txt'), /\$27.50 USD/);
  const snapshot = model.parseBackup(read('campaign.json'));
  assert.equal(snapshot.entries[0].draft.content.menu[0].price, '27.50');
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  assert.equal(stored.entries[0].saved.content.menu[0].price, '24');
  assert.equal(stored.entries[0].draft.content.menu[0].price, '27.50');
  const stateBeforeExport = JSON.stringify(stored);
  for (const [key, title] of Object.entries(api.TITLES)) {
    await page.selectOption('#pack-piece', key);
    await page.frameLocator('#pack-preview').locator('main.' + key).waitFor();
    const text = await page.frameLocator('#pack-preview').locator('body').innerText();
    assert.ok(text.includes(api.FICTION), title);
    assert.ok(text.includes('The portrait has approved your appetite.'), title);
  }
  await page.selectOption('#pack-piece', 'menu-insert');
  await page.frameLocator('#pack-preview').locator('main.menu-insert').waitFor();
  assert.equal(fs.readFileSync(await download(page, '#download-pack-html', 'menu-single.html'), 'utf8'), read('menu-insert.html'));
  assert.equal(fs.readFileSync(await download(page, '#download-pack-text', 'menu-single.txt'), 'utf8'), read('menu-insert.txt'));
  // Exercise the print action without opening a dialog or generating a PDF.
  await page.frameLocator('#pack-preview').locator('body').evaluate(() => { window.print = () => { document.body.dataset.printRequested = 'yes'; }; });
  await page.locator('#print-pack-piece').click();
  await page.frameLocator('#pack-preview').locator('body[data-print-requested=yes]').waitFor();
  assert.equal(JSON.stringify(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)), stateBeforeExport);
  await page.selectOption('#pack-source', 'named');
  assert.equal(await page.locator('#pack-results').isVisible(), false);
  await build(page);
  await page.selectOption('#pack-piece', 'menu-insert');
  await page.frameLocator('#pack-preview').locator('main.menu-insert').waitFor();
  const namedText = await page.frameLocator('#pack-preview').locator('body').innerText();
  assert.ok(namedText.includes('$24 USD')); assert.ok(!namedText.includes('$27.50'));
  await page.locator('#pack-source').focus();
  await page.setViewportSize({ width: 375, height: 900 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('#marketing-pack').screenshot({ path: path.join(output, 'workspace-narrow.png') });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator('#marketing-pack').screenshot({ path: path.join(output, 'workspace-desktop.png') });
  await page.selectOption('#pack-source', 'draft');
  await page.locator('#menu-price').fill('invalid');
  await page.locator('#build-pack').click();
  assert.match(await page.locator('#pack-status').textContent(), /Menu price/);
  assert.equal(await page.locator('#pack-results').isVisible(), false);
  await page.locator('#menu-price').fill('27.50');
  await page.locator('[data-brief=offer]').fill('x'.repeat(241));
  await page.locator('#build-pack').click();
  assert.match(await page.locator('#pack-status').textContent(), /1–240/);
  await session.close();

  const offline = await context({ offline: true, javaScriptEnabled: false, viewport: { width: 740, height: 979 } });
  const sheet = await offline.newPage();
  for (const key of ['index', ...Object.keys(api.TITLES)]) {
    await sheet.goto(pathToFileURL(path.join(extracted, key + '.html')).href);
    await sheet.evaluate(() => document.fonts.ready);
    assert.ok((await sheet.locator('body').innerText()).includes(api.FICTION));
    assert.ok(await sheet.evaluate(() => [...document.images].every(image => image.complete && image.naturalWidth > 0)));
    assert.ok(await sheet.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.equal(await sheet.locator('script').count(), 0);
    if (['poster', 'menu-insert'].includes(key)) {
      await sheet.emulateMedia({ media: 'print' });
      const height = await sheet.locator('main').evaluate(element => element.getBoundingClientRect().height);
      await sheet.screenshot({ path: path.join(output, key + '-print.png'), fullPage: true });
      assert.ok(height <= 979, `${key} default Letter sample fits the 979px printable height; got ${height}.`);
      await sheet.emulateMedia({ media: 'screen' });
    }
  }
  await sheet.goto(pathToFileURL(path.join(extracted, 'index.html')).href);
  await sheet.getByRole('link', { name: 'Poster', exact: true }).click();
  assert.match(sheet.url(), /poster.html$/);
  // Retain and verify an unedited example pack as well as the changed-price fixture.
  const exampleRecord = model.newCampaign();
  const assets = Object.fromEntries(Object.entries(api.assetsFor(exampleRecord)).map(([key, file]) => [key, new Uint8Array(fs.readFileSync(path.resolve(__dirname, '..', file)))]));
  const examplePack = await api.createPack(model, exampleRecord, { sourceState: 'draft' }, assets);
  const exampleDirectory = path.join(output, 'example-pack');
  for (const file of examplePack.files) {
    const target = path.join(exampleDirectory, file.name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, file.bytes);
  }
  fs.writeFileSync(path.join(output, 'example-marketing-pack.zip'), api.zip(examplePack.files));
  for (const key of ['poster', 'menu-insert']) {
    await sheet.goto(pathToFileURL(path.join(exampleDirectory, key + '.html')).href);
    await sheet.evaluate(() => document.fonts.ready);
    await sheet.emulateMedia({ media: 'print' });
    const height = await sheet.locator('main').evaluate(element => element.getBoundingClientRect().height);
    await sheet.screenshot({ path: path.join(output, 'example-' + key + '-print.png'), fullPage: true });
    assert.ok(height <= 979, `Unedited ${key} fits the Letter printable area; got ${height}.`);
  }
  await offline.close();

  const recovery = await context(), retry = await recovery.newPage();
  let failAsset = true, holdAsset = false, releaseAsset, sawAsset;
  let seen = new Promise(resolve => { sawAsset = resolve; });
  await recovery.route('**/assets/haunted-roadhouse.webp', async route => {
    if (route.request().resourceType() !== 'fetch') return route.continue();
    if (failAsset) return route.fulfill({ status: 503, body: 'Test asset failure' });
    if (holdAsset) { sawAsset(); await new Promise(resolve => { releaseAsset = resolve; }); }
    return route.continue();
  });
  await ready(retry);
  await retry.locator('#build-pack').click();
  await retry.waitForFunction(() => /Could not load/.test(document.querySelector('#pack-status').textContent));
  assert.equal(await retry.locator('#pack-results').isVisible(), false);
  failAsset = false; holdAsset = true;
  await retry.locator('#build-pack').click();
  await seen;
  await retry.locator('[data-brief=offer]').fill('A new offer while assets are loading.');
  holdAsset = false; releaseAsset();
  await retry.waitForLoadState('networkidle');
  assert.equal(await retry.locator('#pack-results').isVisible(), false, 'An edited source cannot receive an earlier async pack.');
  await build(retry);
  assert.ok((await retry.frameLocator('#pack-preview').locator('body').innerText()).includes('A new offer while assets are loading.'));
  await recovery.close();
  const missing = await context();
  await missing.route('**/marketing-pack.js', route => route.abort());
  const missingPage = await missing.newPage(); await ready(missingPage);
  await missingPage.locator('#build-pack').click();
  assert.match(await missingPage.locator('#pack-status').textContent(), /script is unavailable/);
  assert.ok(await missingPage.locator('#campaign-name').isVisible(), 'Campaign editing survives a missing pack script.');
  await missing.close();
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log('Marketing browser pass passed: draft/named source, all previews/downloads, print action, unchanged saves, offline HTML, Letter layouts, narrow reflow, validation, asset retry, async invalidation and script recovery.');
  console.log(`Chromium ${browser.version()} · no page errors or external requests · artifacts: ${output}`);
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); await server?.stop(); });
