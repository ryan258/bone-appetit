// One focused headless creator-to-restaurant acceptance pass.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { createModel, KEY } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const { createPlanner } = require('../planner.js');
const model = createModel(require('../site-data.json'));
const catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(site => catalog.create(site.id))];
const workspace = { version: 1, activeId: records[0].id, entries: records.map(record => ({ ...model.entryFor(record), saved: structuredClone(record) })) };
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-website-workspace-'));
const errors = [], external = []; let browser, server;
async function boot() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  context.setDefaultTimeout(6000); context.setDefaultNavigationTimeout(10000);
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && !url.startsWith(server.origin + '/')) { external.push(url); return route.abort(); }
    return route.continue();
  });
  await context.addInitScript(({ raw, key, records }) => {
    if (location.protocol !== 'http:' || localStorage.getItem(key)) return;
    localStorage.setItem(key, raw);
    records.forEach(([key, value]) => localStorage.setItem(key, value));
  }, { raw: model.serialize(workspace), key: KEY, records: records.map(record => [record.reference.planner.storageKey, JSON.stringify(createPlanner(record.reference).defaultPlan())]) });
  const page = await context.newPage(); await page.goto(server.origin + '/creator.html');
  await page.locator('html.creator-ready').waitFor(); await page.waitForFunction(() => !document.querySelector('#website-field').disabled);
  return { context, page };
}
async function ready(page) {
  await page.locator('#preview-website').click();
  await page.waitForFunction(() => document.querySelector('#website-status').textContent.startsWith('Full website ready.'));
  return page.frameLocator('#website-preview');
}
async function editPage(page, key, text) {
  await page.locator('.website-copy-fields').evaluate(node => { node.open = true; });
  await page.selectOption('#website-field', key); await page.fill('#website-copy-edit', text);
}
async function run() {
  server = await startServer(); browser = await chromium.launch({ headless: true });
  const { context, page } = await boot();
  const visitorBefore = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key !== 'bone-appetit-creator-v1')));
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    await page.locator(`[data-campaign-id="${record.id}"]`).click();
    await page.fill('[data-field="venueName"]', `${record.content.venueName} Test`);
    await page.fill('[data-copy="headline"]', `Named haunt ${index}`);
    await page.fill('[data-copy="introduction"]', `A fresh welcome ${index}.`);
    await page.fill('#menu-description', `Fresh menu description ${index}.`);
    await page.fill('#menu-price', '31.50');
    await page.locator('.creator-section').nth(3).evaluate(node => { node.open = true; });
    await page.fill('#attraction-name', `Fresh attraction ${index}`);
    await page.fill('#attraction-description-edit', `Fresh attraction description ${index}.`);
    await editPage(page, 'STORY_HEADING', `A *fresh* story ${index}`);
    await editPage(page, 'STORY_PARAGRAPHS', `First paragraph ${index}.\n\nSecond paragraph ${index}.`);
    await page.locator('#creator-form [type=submit]').click();
    await page.fill('[data-copy="headline"]', `Draft haunt ${index}`);
    await page.selectOption('#website-source', 'draft');
    let frame = await ready(page);
    assert.equal(await frame.locator('#hero-title').textContent(), `Draft haunt ${index}`);
    assert.ok((await frame.locator('#story').innerText()).includes(`A fresh story ${index}`));
    assert.ok((await frame.locator('#story').innerText()).includes(`Second paragraph ${index}.`));
    assert.ok((await frame.locator('.pizza-card').first().innerText()).includes(`Fresh menu description ${index}.`));
    assert.ok((await frame.locator('.haunt-card').first().innerText()).includes(`Fresh attraction description ${index}.`));
    await frame.locator('[data-open-menu]').first().click();
    assert.ok((await frame.locator('#full-menu-items').innerText()).includes('$31.50'));
    await frame.locator('#menu-dialog [data-close]').click();
    await frame.locator('[data-attraction=pizzeria]').first().click();
    assert.equal(await frame.locator('#attraction-title').textContent(), `Fresh attraction ${index}`);
    await frame.locator('#attraction-dialog [data-close]').click();
    await frame.locator('[data-open-planner]').first().click();
    await frame.locator('#visit-guests').selectOption('7');
    await frame.locator('#planner-form [type=submit]').click();
    assert.ok((await frame.locator('#plan-status').innerText()).includes('only in this preview'), await frame.locator('#plan-status').innerText());
    await frame.locator('#planner-dialog [data-close]').click();
    await frame.locator('[data-property-link]').last().click();
    assert.equal(await frame.locator('#hero-title').textContent(), `Draft haunt ${index}`);
    assert.ok(page.url().endsWith('/creator.html'));
    const child = await (await page.locator('#website-preview').elementHandle()).contentFrame();
    assert.ok(child);
    await child.evaluate(async () => {
      for (const image of document.images) image.loading = 'eager';
      await document.fonts.ready; await Promise.all([...document.images].map(image => image.decode()));
    });
    assert.ok(await child.evaluate(() => document.fonts.check('700 20px Fraunces')));
    await page.selectOption('#website-size', 'mobile');
    assert.ok(await child.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (index === 2) await page.screenshot({ path: path.join(output, 'creator-phone-preview.png'), fullPage: true });
    await page.selectOption('#website-size', 'desktop');
    await page.selectOption('#website-source', 'named');
    assert.equal(await page.locator('#website-results').isVisible(), false);
    frame = await ready(page);
    assert.equal(await frame.locator('#hero-title').textContent(), `Named haunt ${index}`);
    await frame.locator('[data-open-planner]').first().click();
    assert.notEqual(await frame.locator('#visit-guests').inputValue(), '7');
    await frame.locator('#planner-dialog [data-close]').click();
    if (index === 2) await page.locator('#website-workspace').screenshot({ path: path.join(output, 'creator-desktop-preview.png') });
  }
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([key]) => key !== 'bone-appetit-creator-v1'))), visitorBefore);
  await page.reload(); await page.locator('html.creator-ready').waitFor(); await page.waitForFunction(() => !document.querySelector('#website-field').disabled);
  assert.equal(await page.locator('[data-copy=headline]').inputValue(), 'Draft haunt 3');
  await page.locator('.creator-section').nth(1).evaluate(node => { node.open = true; });
  await page.selectOption('#website-field', 'STORY_PARAGRAPHS');
  assert.ok((await page.locator('#website-copy-edit').inputValue()).includes('Second paragraph 3.'));
  await editPage(page, 'STORY_HEADING', '');
  await page.selectOption('#website-source', 'draft'); await page.locator('#preview-website').click();
  assert.ok((await page.locator('#website-status').innerText()).includes('Story heading'));
  assert.equal(await page.locator('#website-results').isVisible(), false);
  await page.reload(); await page.locator('html.creator-ready').waitFor(); await page.waitForFunction(() => !document.querySelector('#website-field').disabled);
  assert.equal(await page.locator('#website-copy-edit').inputValue(), '');
  await page.locator('#website-reset-field').click();
  await page.fill('#menu-price', 'bad'); await page.locator('#preview-website').click();
  assert.ok((await page.locator('#website-status').innerText()).includes('Menu price'));
  await page.fill('#menu-price', '31.50');
  // In-flight render must not reappear after an edit invalidates its source.
  let release, started, finished, routeError;
  const gate = new Promise(resolve => { release = resolve; }), requested = new Promise(resolve => { started = resolve; }), completed = new Promise(resolve => { finished = resolve; });
  await page.route('**/assets/boobies-lodge-map.svg', async route => { started(); await gate; try { await route.continue(); } catch (error) { routeError = error; } finally { finished(); } });
  await page.locator('#preview-website').click(); await requested;
  await page.fill('[data-copy=headline]', 'After invalidation'); release();
  await completed;
  await page.unroute('**/assets/boobies-lodge-map.svg');
  assert.equal(routeError, undefined);
  assert.equal(await page.locator('#website-results').isVisible(), false);
  await ready(page);
  // Portable backup carries the page edits and current draft without JSON editing.
  const downloading = page.waitForEvent('download'); await page.locator('#backup-campaign').click();
  const download = await downloading, backup = path.join(output, 'website-campaign-backup.json'); await download.saveAs(backup);
  const imported = model.parseBackup(fs.readFileSync(backup, 'utf8')); assert.ok(imported.entries[0].draft.website.STORY_PARAGRAPHS);
  await page.locator('#import-backup').setInputFiles(backup);
  await page.waitForFunction(() => document.querySelector('#workspace-status').textContent.startsWith('Imported'));
  assert.equal(await page.locator('[data-copy=headline]').inputValue(), 'After invalidation');
  await page.locator('#duplicate-campaign').click();
  await page.locator('.creator-section').nth(1).evaluate(node => { node.open = true; });
  await page.locator('.website-copy-fields').evaluate(node => { node.open = true; });
  await page.selectOption('#website-field', 'STORY_PARAGRAPHS');
  assert.ok((await page.locator('#website-copy-edit').inputValue()).includes('Second paragraph 3.'));
  // A failed font fetch is retryable without losing the draft.
  await page.reload(); await page.locator('html.creator-ready').waitFor(); await page.waitForFunction(() => !document.querySelector('#website-field').disabled);
  await page.route('**/assets/fonts/dm-sans-400.ttf', route => route.abort());
  await page.locator('#preview-website').click();
  await page.waitForFunction(() => document.querySelector('#website-status').textContent.startsWith('Could not preview:'));
  await page.unroute('**/assets/fonts/dm-sans-400.ttf'); await ready(page);
  // Script failure exposes complete static content and retries without a reload.
  await page.route('**/app.js', route => route.abort());
  await page.locator('#preview-website').click();
  await page.waitForFunction(() => document.querySelector('#website-status').textContent.startsWith('The full static website'));
  assert.ok(await page.frameLocator('#website-preview').locator('#full-menu').isVisible());
  await page.unroute('**/app.js'); await ready(page);
  await page.setViewportSize({ width: 375, height: 900 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // Exercise the original public runtime with the preview mode absent.
  const visitor = await context.newPage(); await visitor.goto(server.origin + '/boobies-lodge.html');
  await visitor.locator('html.enhanced').waitFor(); await visitor.locator('[data-open-menu]').first().click();
  assert.equal(new URL(visitor.url()).hash, '#full-menu'); await visitor.locator('#menu-dialog [data-close]').click();
  await visitor.locator('[data-open-planner]').first().click(); await visitor.selectOption('#visit-guests', '6');
  await visitor.locator('#planner-form [type=submit]').click();
  assert.equal(await visitor.evaluate(key => JSON.parse(localStorage.getItem(key)).guests, records[3].reference.planner.storageKey), 6);
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log(`Website workspace browser pass passed: all four designs, live interactions, draft/named sources, page editing, isolated plans, resume, backup/import, duplication, validation, async invalidation, resource retry, script fallback and narrow reflow.\nChromium ${browser.version()} · no page errors or external requests · artifacts: ${output}`);
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) await server.stop(); });
