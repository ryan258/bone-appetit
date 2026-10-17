// Focused property acceptance: one browser, isolated storage, local requests only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { createModel, KEY } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const marketing = require('../marketing-pack.js');
const { exportProperties } = require('../scripts/export-properties.cjs');
const model = createModel(require('../site-data.json'));
const catalog = createCatalog(model, require('../property-data.json'));
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-properties-browser-'));
const errors = [], external = [];
let browser, server;
async function context(options = {}) {
  const session = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 }, ...options });
  session.setDefaultTimeout(6000); session.setDefaultNavigationTimeout(10000);
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
  await page.locator('[data-start-property]').nth(2).waitFor();
}
async function stored(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY); }
async function run() {
  server = await startServer(); browser = await chromium.launch({ headless: process.env.BONE_BROWSER_VISIBLE !== '1' });
  const session = await context(), page = await session.newPage(); await ready(page);
  assert.ok(await page.locator('.property-card > img').evaluateAll(images => images.every(image => Math.abs(image.getBoundingClientRect().height - image.getBoundingClientRect().width * 2 / 3) < 1)), 'Starter scene art keeps its compact 3:2 proportions.');
  assert.ok(await page.locator('.property-card .property-logo').evaluateAll(images => images.length === 3 && images.every(image => image.width === image.height)), 'Custom starter emblems keep square proportions.');
  await page.locator('#start-example').click();
  await page.locator('#creator-form [type=submit]').click();
  const original = (await stored(page)).entries[0];
  await page.locator('#start-property-collection').click();
  let workspace = await stored(page);
  assert.equal(workspace.entries.length, 4);
  assert.deepEqual(workspace.entries[0], original, 'Adding properties keeps the existing campaign unchanged.');
  const propertyEntries = workspace.entries.slice(1);
  for (const [index, property] of catalog.list.entries()) {
    const entry = propertyEntries[index];
    await page.locator(`[data-campaign-id="${entry.draft.id}"]`).click();
    assert.equal(await page.locator('#editor-title').textContent(), entry.draft.name);
    assert.equal(await page.locator('#menu-item-picker option').count(), 18);
    assert.ok((await page.locator('.creator-preview-image').getAttribute('src')).endsWith(require('../website-renderer.js').heroAsset({ branding: { propertyId: property.id } })));
    await page.locator('#creator-form [type=submit]').click();
    await page.selectOption('#pack-source', 'named');
    await page.locator('#build-pack').click();
    await page.waitForFunction(() => !document.querySelector('#pack-results').hidden || /Could not build/.test(document.querySelector('#pack-status').textContent));
    assert.ok(await page.locator('#pack-results').isVisible(), `${property.id}: ${await page.locator('#pack-status').textContent()}`);
    for (const key of Object.keys(marketing.TITLES)) {
      await page.selectOption('#pack-piece', key);
      await page.frameLocator('#pack-preview').locator('main.' + key).waitFor();
      const text = await page.frameLocator('#pack-preview').locator('body').innerText();
      assert.ok(text.includes(property.name));
      if (property.id === 'boobies-lodge') assert.ok(text.includes('21+ only'));
    }
    await page.selectOption('#pack-piece', 'poster');
    await page.frameLocator('#pack-preview').locator('main.poster').waitFor();
    const bytes = await page.frameLocator('#pack-preview').locator('img.hero').getAttribute('src');
    assert.ok(bytes.startsWith('data:image/webp;base64,'));
    assert.deepEqual(Buffer.from(bytes.split(',')[1], 'base64'), fs.readFileSync(path.resolve(__dirname, '../assets', require('../website-renderer.js').heroAsset({ branding: { propertyId: property.id } }))), 'Each pack uses the selected property art, even after switching properties.');
    const pending = page.waitForEvent('download'); await page.locator('#download-pack').click();
    const file = await pending;
    assert.equal(file.suggestedFilename(), property.id + '-marketing-pack.zip');
    await file.saveAs(path.join(output, file.suggestedFilename()));
  }
  await page.reload(); await page.waitForFunction(() => document.documentElement.classList.contains('creator-ready'));
  assert.match(await page.locator('#editor-title').textContent(), /BooBies/);
  assert.equal((await stored(page)).entries.length, 4);
  await page.locator('#duplicate-campaign').click();
  await page.locator('#campaign-name').fill('BooBies · overtime experiment');
  await page.locator('#creator-form [type=submit]').click();
  workspace = await stored(page);
  assert.equal(workspace.entries.length, 5);
  assert.equal(workspace.entries[3].draft.name, propertyEntries[2].draft.name);
  const backupFile = path.join(output, 'workspace.json');
  const pending = page.waitForEvent('download'); await page.locator('#backup-workspace').click(); await (await pending).saveAs(backupFile);
  const rescue = await context(), imported = await rescue.newPage(); await ready(imported);
  await imported.locator('#import-backup').setInputFiles(backupFile);
  await imported.waitForFunction(() => /Imported 5/.test(document.querySelector('#workspace-status').textContent));
  const recovered = await stored(imported);
  assert.equal(recovered.entries.length, 5);
  assert.notEqual(recovered.activeId, workspace.activeId);
  assert.deepEqual(recovered.entries[1].draft.reference, workspace.entries[1].draft.reference);
  await imported.setViewportSize({ width: 375, height: 900 });
  assert.ok(await imported.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await imported.locator('#property-starters-title').scrollIntoViewIfNeeded();
  await imported.screenshot({ path: path.join(output, 'properties-narrow.png') });
  await imported.setViewportSize({ width: 1440, height: 900 });
  await imported.locator('#property-starters-title').scrollIntoViewIfNeeded();
  await imported.screenshot({ path: path.join(output, 'properties-desktop.png') });
  await rescue.close(); await session.close();

  const examples = path.join(output, 'examples'); await exportProperties(examples);
  const offline = await context({ offline: true, javaScriptEnabled: false, viewport: { width: 740, height: 979 } });
  const sheet = await offline.newPage();
  for (const property of catalog.list) {
    const zip = path.join(examples, property.id + '-marketing-pack.zip');
    const result = spawnSync(process.env.PYTHON || 'python3', ['-c', 'import sys,zipfile;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None', zip], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    for (const key of ['index', ...Object.keys(marketing.TITLES)]) {
      await sheet.goto(pathToFileURL(path.join(examples, property.id, key + '.html')).href);
      await sheet.evaluate(() => document.fonts.ready);
      assert.ok((await sheet.locator('body').innerText()).includes(property.name));
      assert.ok(await sheet.evaluate(() => [...document.images].every(img => img.complete && img.naturalWidth > 0)));
      assert.ok(await sheet.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (['menu-insert', 'poster'].includes(key)) {
        await sheet.emulateMedia({ media: 'print' });
        const height = await sheet.locator('main').evaluate(node => node.getBoundingClientRect().height);
        await sheet.screenshot({ path: path.join(output, property.id + '-' + key + '.png'), fullPage: true });
        assert.ok(height <= 979, `${property.id} ${key} sample exceeds the Letter printable area: ${height}px.`);
        await sheet.emulateMedia({ media: 'screen' });
      }
    }
  }
  await offline.close();
  const failure = await context(); let blocked = true;
  await failure.route('**/property-data.json', route => blocked ? route.fulfill({ status: 503, body: 'Test catalog failure' }) : route.continue());
  const retry = await failure.newPage(); await retry.goto(server.origin + '/creator.html');
  await retry.locator('#retry-properties').waitFor({ state: 'visible' });
  await retry.locator('#start-example').click();
  assert.equal((await stored(retry)).entries.length, 1);
  blocked = false; await retry.locator('#retry-properties').click();
  await retry.locator('[data-start-property]').nth(2).waitFor();
  assert.equal((await stored(retry)).entries.length, 1);
  await retry.locator('[data-start-property=rest-in-pizza]').click();
  assert.equal((await stored(retry)).entries.length, 2);
  await failure.close();
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log('Property browser pass passed: one-click collection, distinct menus/art, six-piece packs, named saves/resume, duplication, backup/import, offline files, Letter samples, responsive cards and catalog retry.');
  console.log(`Chromium ${browser.version()} · no page errors or external requests · artifacts: ${output}`);
}
run().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => { await browser?.close(); await server?.stop(); });
