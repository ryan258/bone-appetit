// Focused creator acceptance with isolated storage and a disposable local server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { createModel, KEY, MAX_BYTES } = require('../creator-model.js');
const model = createModel(require('../site-data.json'));
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-creator-'));
let browser, server;
const errors = [], external = [];
async function context(options = {}) {
  const instance = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 900 }, ...options });
  instance.setDefaultTimeout(5000);
  instance.setDefaultNavigationTimeout(10000);
  instance.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await instance.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && !url.startsWith(server.origin + '/')) { external.push(url); return route.abort(); }
    return route.continue();
  });
  return instance;
}
async function ready(page) {
  await page.goto(server.origin + '/creator.html');
  await page.waitForFunction(() => document.documentElement.classList.contains('creator-ready'));
}
async function stored(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY); }
async function draftRecovered(page) {
  await page.waitForFunction(() => /recovered|Named version saved/.test(document.querySelector('#draft-state').textContent));
}
async function download(page, selector, name) {
  const pending = page.waitForEvent('download');
  await page.locator(selector).click();
  const file = await pending;
  const target = path.join(output, name);
  await file.saveAs(target);
  return target;
}
async function run() {
  server = await startServer();
  browser = await chromium.launch({ headless: process.env.BONE_BROWSER_VISIBLE !== '1' });
  const session = await context();
  await session.addInitScript(() => { if (location.protocol === 'http:') localStorage.setItem('bone-appetit-visit-v1', 'visitor sentinel'); });
  const page = await session.newPage();
  await ready(page);
  assert.equal(await page.locator('#campaign-editor').isVisible(), false);
  await page.locator('#start-example').click();
  assert.equal(await page.locator('#campaign-name').evaluate(e => e === document.activeElement), true);
  await page.locator('#campaign-name').fill('Wicked Lane supper');
  await page.locator('[data-brief=objective]').fill('Invite people to explore a fictional supper.');
  await page.locator('[data-copy=headline]').fill('An extra place.\nA proper supper.');
  await page.locator('[data-field=venueName]').fill('Bone Appétit');
  await page.selectOption('#menu-item-picker', 'cemetery-margherita');
  await page.locator('#menu-name').fill('Cemetery Supper');
  await page.locator('#menu-price').fill('19.50');
  await page.locator('#menu-description').fill('Tomato, mozzarella, and a very orderly haunting.');
  await page.locator('.creator-section').nth(3).locator('summary').click();
  await page.selectOption('#attraction-picker', 'hollow');
  await page.locator('#attraction-name').fill('The lantern loop');
  await page.locator('#attraction-description-edit').fill('The pumpkins remain briefed after {{NIGHT_TIME}}.');
  await page.locator('#creator-form [type=submit]').click();
  assert.match(await page.locator('#workspace-status').textContent(), /Saved named version/);
  const saved = await stored(page);
  const firstId = saved.activeId;
  assert.equal(saved.entries[0].saved.content.menu.find(item => item.id === 'cemetery-margherita').price, '19.50');
  assert.equal(await page.locator('#preview-menu-price').textContent(), '$19.50');
  assert.equal(await page.locator('#preview-attraction-description').textContent(), 'The pumpkins remain briefed after 6 pm.');
  assert.equal(await page.evaluate(() => localStorage.getItem('bone-appetit-visit-v1')), 'visitor sentinel');

  // Incomplete edits survive reload without replacing the explicit named version.
  await page.locator('#menu-price').fill('');
  await draftRecovered(page);
  await page.reload();
  await page.waitForFunction(() => document.documentElement.classList.contains('creator-ready'));
  assert.equal(await page.locator('#menu-item-picker').inputValue(), 'cemetery-margherita');
  assert.equal(await page.locator('#attraction-picker').inputValue(), 'hollow');
  assert.equal(await page.locator('.creator-section').nth(3).evaluate(e => e.open), true);
  assert.equal(await page.locator('#menu-price').inputValue(), '');
  await page.locator('#creator-form [type=submit]').click();
  assert.match(await page.locator('#workspace-status').textContent(), /Could not save: Menu price/);
  assert.equal((await stored(page)).entries[0].saved.content.menu.find(item => item.id === 'cemetery-margherita').price, '19.50');
  await page.locator('#restore-named').click();
  assert.equal(await page.locator('#menu-price').inputValue(), '19.50');
  await page.locator('#undo-workspace').click();
  assert.equal(await page.locator('#menu-price').inputValue(), '');
  await page.locator('#menu-price').fill('20.50');
  await page.locator('#duplicate-campaign').click();
  const secondId = (await stored(page)).activeId;
  assert.notEqual(secondId, firstId);
  assert.equal(await page.locator('#menu-price').inputValue(), '20.50');
  await page.locator('#campaign-name').fill('Another supper');
  await page.locator('[data-copy=headline]').fill('<img src=x onerror="window.badImport=true">');
  assert.equal(await page.locator('#preview-headline img').count(), 0);
  assert.equal(await page.locator('#preview-headline').textContent(), '<img src=x onerror="window.badImport=true">');
  assert.equal(await page.evaluate(() => !!window.badImport), false);
  await page.locator('#creator-form [type=submit]').click();
  await page.locator(`[data-campaign-id="${firstId}"]`).click();
  assert.equal(await page.locator('[data-copy=headline]').inputValue(), 'An extra place.\nA proper supper.');
  assert.equal(await page.locator('#menu-price').inputValue(), '20.50');
  await page.locator('#creator-form [type=submit]').click();

  const backup = await download(page, '#backup-workspace', 'workspace.json');
  const singleBackup = await download(page, '#backup-campaign', 'campaign.json');
  assert.equal(model.parseBackup(fs.readFileSync(backup, 'utf8')).entries.length, 2);
  assert.equal(model.parseBackup(fs.readFileSync(singleBackup, 'utf8')).entries.length, 1);
  await page.locator('#import-backup').setInputFiles(backup);
  await page.waitForFunction(() => document.querySelectorAll('[data-campaign-id]').length === 4);
  assert.match(await page.locator('#workspace-status').textContent(), /Imported 2 campaign copies/);
  assert.deepEqual((await stored(page)).entries.slice(0, 2).map(entry => entry.draft.id), [firstId, secondId]);
  const beforeInvalid = await page.evaluate(key => localStorage.getItem(key), KEY);
  for (const [name, buffer] of [['invalid.json', Buffer.from('{broken')], ['future.json', Buffer.from(JSON.stringify({ format: 'bone-appetit-creator', version: 9 }))], ['oversized.json', Buffer.alloc(MAX_BYTES + 1, 'x')]]) {
    await page.locator('#import-backup').setInputFiles({ name, mimeType: 'application/json', buffer });
    await page.waitForFunction(() => document.querySelector('#workspace-status').textContent.startsWith('Import was not applied'));
    assert.equal(await page.evaluate(key => localStorage.getItem(key), KEY), beforeInvalid);
  }

  await page.locator('.creator-recovery > summary').click();
  await page.locator('#remove-campaign').click();
  assert.equal(await page.locator('[data-campaign-id]').count(), 3);
  await page.locator('#undo-workspace').click();
  assert.equal(await page.locator('[data-campaign-id]').count(), 4);
  await page.waitForFunction(() => !document.querySelector('#draft-state').textContent.includes('Recovering'));
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(async () => { await document.fonts.ready; scrollTo(0, 0); });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `Creator reflow at ${width}`);
    await page.screenshot({ path: path.join(output, `creator-${width}.png`) });
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.evaluate(() => {
    const sizes = [...document.querySelectorAll('body,body *')].map(e => [e, parseFloat(getComputedStyle(e).fontSize)]);
    sizes.forEach(([element, size]) => { element.style.fontSize = `${size * 2}px`; });
  });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, '200% text reflow');

  // An older tab keeps its draft in memory and cannot overwrite the newer copy.
  const older = await session.newPage();
  await ready(older);
  await page.locator('#campaign-name').fill('Newer tab copy');
  await draftRecovered(page);
  await older.waitForFunction(() => document.querySelector('#storage-status').textContent.includes('Another tab'));
  await older.locator('#campaign-name').fill('Older tab draft');
  await older.locator('#creator-form [type=submit]').click();
  assert.match(await older.locator('#storage-status').textContent(), /Another tab/);
  const conflictedBackup = await download(older, '#backup-workspace', 'conflicted-draft.json');
  assert.ok(model.parseBackup(fs.readFileSync(conflictedBackup, 'utf8')).entries.some(entry => entry.draft.name === 'Older tab draft'));
  assert.ok((await stored(page)).entries.some(entry => entry.draft.name === 'Newer tab copy'));
  await older.close();

  const blockedSession = await context();
  await blockedSession.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }); });
  const blocked = await blockedSession.newPage();
  await ready(blocked);
  await blocked.locator('#start-example').click();
  await blocked.locator('#campaign-name').fill('In-memory campaign');
  await blocked.locator('#creator-form [type=submit]').click();
  assert.match(await blocked.locator('#draft-state').textContent(), /in memory/);
  const rescued = await download(blocked, '#backup-workspace', 'blocked-storage-backup.json');
  assert.equal(model.parseBackup(fs.readFileSync(rescued, 'utf8')).entries[0].draft.name, 'In-memory campaign');
  const rescueSession = await context();
  const rescuePage = await rescueSession.newPage();
  await ready(rescuePage);
  await rescuePage.locator('#import-backup').setInputFiles(rescued);
  await rescuePage.waitForFunction(() => document.querySelector('#campaign-name').value === 'In-memory campaign');
  await rescuePage.locator('#creator-form [type=submit]').click();
  assert.match(await rescuePage.locator('#draft-state').textContent(), /Named version saved/);

  const damagedSession = await context();
  await damagedSession.addInitScript(key => { if (location.protocol === 'http:' && localStorage.getItem(key) === null) localStorage.setItem(key, '{damaged'); }, KEY);
  const damaged = await damagedSession.newPage();
  await ready(damaged);
  await damaged.locator('.creator-recovery > summary').click();
  assert.equal(await damaged.locator('#download-recovery').isVisible(), true);
  const recovery = await download(damaged, '#download-recovery', 'unreadable.json');
  assert.equal(fs.readFileSync(recovery, 'utf8'), '{damaged');
  await damaged.locator('#start-example').click();
  assert.equal(await damaged.evaluate(key => localStorage.getItem(key), KEY), '{damaged');
  damaged.once('dialog', dialog => dialog.accept());
  await damaged.locator('#replace-damaged').click();
  assert.equal((await stored(damaged)).entries.length, 1);

  const missingScript = await context();
  await missingScript.route('**/creator-model.js', route => route.abort());
  const retry = await missingScript.newPage();
  await retry.goto(server.origin + '/creator.html');
  assert.equal(await retry.locator('#retry-startup').isVisible(), true);
  await missingScript.unroute('**/creator-model.js');
  await retry.locator('#retry-startup').click();
  await retry.waitForFunction(() => document.documentElement.classList.contains('creator-ready'));

  const noJS = await context({ javaScriptEnabled: false });
  const plain = await noJS.newPage();
  await plain.goto(server.origin + '/creator.html');
  assert.equal(await plain.locator('noscript').isVisible(), true);
  assert.equal(await plain.locator('#start-example').isVisible(), false);
  await plain.goto(server.origin);
  assert.equal(await plain.locator('a[href="creator.html"]').count(), 1);
  assert.equal(await plain.locator('.oddity-card').count(), 6);
  assert.equal(await plain.locator('#full-menu [data-menu-id]').count(), 24);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(JSON.stringify({ passed: ['structured brief and essential content', 'named saves and untouched visitor storage', 'unfinished draft and editing-position resumption', 'duplication isolation', 'restore/remove undo', 'workspace and campaign backup round trips', 'non-destructive import and invalid-file rejection', 'literal rendering of untrusted copy', 'cross-tab conflict recovery', 'blocked storage backup rescue', 'damaged-data protection and replacement', '375/1440 and 200% text reflow', 'no-JavaScript visitor fallback', 'no page errors or external requests'], output }, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) await server.stop();
});
