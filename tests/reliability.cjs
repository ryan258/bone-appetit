// Focused browser checks. Requires Node, Playwright and its Chromium browser.
// Starts only this project's preview and writes evidence to a temporary folder.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { chromium } = require('./helpers/browser.cjs');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-reliability-'));
const origin = 'http://127.0.0.1:4173';
const key = 'bone-appetit-visit-v1';
const passed = [];
let server, browser;

async function startServer() {
  server = spawn(process.env.PYTHON || 'python3', ['-B', '-u', '-c',
    'import preview; preview.webbrowser.open = lambda *args: None; raise SystemExit(preview.main())'],
    { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  server.stdout.on('data', d => { log += d; });
  server.stderr.on('data', d => { log += d; });
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 100));
    if (server.exitCode !== null) throw new Error('Preview could not start independently. Close an existing preview before this check. ' + log);
    if (log.includes('Bone Appétit is open')) return;
  }
  throw new Error('Preview startup timed out. ' + log);
}

async function stopServer() {
  if (!server || server.exitCode !== null) return;
  await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGINT'); });
}

async function run() {
  browser = await chromium.launch({ headless: true });
  await startServer();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin);
  const open = () => page.locator('#saved-plan-button').click();
  const save = () => page.locator('#planner-form button[type=submit]').click();
  const draftTime = () => page.locator('#visit-time').inputValue();
  const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
  await open();
  await page.selectOption('#visit-time', '16:00');
  await page.selectOption('#visit-guests', '4');
  await save();
  assert.equal(await page.locator('#plan-save-state').textContent(), 'Saved in this browser.');
  await stopServer();
  await startServer();
  await page.reload();
  await open();
  assert.equal(await draftTime(), '16:00');
  assert.equal(await page.locator('#plan-estimate').textContent(), '$48');
  passed.push('saved plan survives a preview restart at the same origin');

  await page.selectOption('#visit-time', '19:00');
  assert.match(await page.locator('#plan-save-state').textContent(), /Unsaved changes/);
  await page.locator('#planner-dialog [data-close]').click();
  await open();
  assert.equal(await draftTime(), '19:00');
  assert.equal((await stored()).time, '16:00');
  await page.locator('#restore-plan').click();
  assert.equal(await draftTime(), '16:00');
  assert.equal(await page.locator('[name=visit-mood][value=day]').isChecked(), true);
  passed.push('draft status and restore preserve the explicit saved plan');

  await page.selectOption('#visit-time', '19:00');
  await page.selectOption('#visit-children', '2');
  await page.locator('#reset-plan').click();
  assert.equal(await stored(), null);
  assert.equal(await draftTime(), '15:00');
  await page.locator('#reset-plan').click();
  await page.evaluate(() => {
    window.originalSet = Storage.prototype.setItem;
    Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
  });
  await page.locator('#undo-reset').click();
  assert.equal(await draftTime(), '19:00');
  assert.equal(await page.locator('#visit-children').inputValue(), '2');
  assert.equal(await stored(), null);
  assert.match(await page.locator('#plan-status').textContent(), /saved copy could not be restored/);
  assert.equal(await page.locator('#undo-reset').isVisible(), true);
  await page.evaluate(() => { Storage.prototype.setItem = window.originalSet; });
  await page.locator('#undo-reset').click();
  assert.equal((await stored()).time, '16:00');
  assert.equal(await draftTime(), '19:00');
  assert.equal(await page.locator('#undo-reset').isVisible(), false);
  assert.match(await page.locator('#plan-save-state').textContent(), /Unsaved changes/);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'reset-plan');
  await save();
  await page.locator('#reset-plan').click();
  await save();
  assert.equal(await page.locator('#undo-reset').isVisible(), false);
  passed.push('reset undo preserves separate draft and saved state, survives repeated reset, retries storage failure, and expires on save');

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#download-plan').click();
  const download = await downloadPromise;
  const textPath = path.join(output, download.suggestedFilename());
  await download.saveAs(textPath);
  assert.match(fs.readFileSync(textPath, 'utf8'), /Fictional destination\. This itinerary is not a booking or ticket/);
  passed.push('download still produces a readable itinerary with fictional disclosures');

  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const overflow = await page.evaluate(() => {
      const d = document.querySelector('#planner-dialog');
      return [document.documentElement.scrollWidth - document.documentElement.clientWidth, d.scrollWidth - d.clientWidth];
    });
    assert.deepEqual(overflow, [0, 0]);
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.locator('#planner-dialog').evaluate(e => { e.scrollTop = 0; });
  await page.screenshot({ path: path.join(output, 'planner-mobile.png') });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('#planner-dialog').evaluate(e => { e.scrollTop = 0; });
  await page.screenshot({ path: path.join(output, 'planner-desktop.png') });
  passed.push('larger essential text and planner controls fit 320, 768 and 1440 pixels');

  await page.evaluate(() => { window.print = () => { window.printRequested = true; }; });
  await page.locator('#print-plan').click();
  assert.equal(await page.evaluate(() => window.printRequested), true);
  await page.pdf({ path: path.join(output, 'itinerary.pdf'), format: 'Letter', margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' } });
  assert.equal(await page.locator('#planner-dialog').evaluate(e => e.open), true);
  await page.locator('#planner-dialog [data-close]').click();
  const detailsBefore = await page.locator('details').evaluateAll(es => es.map(e => e.open));
  await page.pdf({ path: path.join(output, 'homepage.pdf'), format: 'Letter', margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' } });
  assert.deepEqual(await page.locator('details').evaluateAll(es => es.map(e => e.open)), detailsBefore);
  await page.locator('[data-menu-category=drinks]').click();
  await page.pdf({ path: path.join(output, 'menu.pdf'), format: 'Letter', margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' } });
  passed.push('print action and real Chromium PDF generation work without changing FAQ state');

  for (const raw of ['{broken', JSON.stringify({ version: 1, date: '2099-01-01', time: '19:00', guests: -1 })]) {
    const malformed = await browser.newContext();
    await malformed.addInitScript(({ key, raw }) => localStorage.setItem(key, raw), { key, raw });
    const p = await malformed.newPage();
    await p.goto(origin);
    assert.match(await p.locator('#plan-save-state').textContent(), /Not saved yet/);
    await malformed.close();
  }
  passed.push('malformed and invalid saved plans do not disable the planner');

  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    const storage = window.localStorage;
    window.blockStorage = true;
    Object.defineProperty(window, 'localStorage', { get() {
      if (window.blockStorage) throw new DOMException('Blocked', 'SecurityError');
      return storage;
    } });
  });
  const p = await blocked.newPage();
  await p.goto(origin);
  await p.locator('#saved-plan-button').click();
  await p.selectOption('#visit-time', '19:00');
  await p.locator('#planner-form button[type=submit]').click();
  assert.match(await p.locator('#plan-save-state').textContent(), /saving is unavailable/);
  await p.locator('#reset-plan').click();
  await p.locator('#undo-reset').click();
  assert.equal(await p.locator('#visit-time').inputValue(), '19:00');
  assert.match(await p.locator('#plan-status').textContent(), /saved copy could not be restored/);
  await p.evaluate(() => { window.blockStorage = false; });
  await p.locator('#undo-reset').click();
  assert.equal(await p.locator('#undo-reset').isVisible(), false);
  await blocked.close();
  passed.push('blocked storage permits in-memory recovery and an honest retry');

  for (const [today, archived] of [['2026-09-01', false], ['2026-10-13', false], ['2026-11-02', true]]) {
    const dated = await browser.newContext();
    await dated.addInitScript(today => {
      const NativeDate = Date;
      window.Date = class extends NativeDate {
        constructor(...args) { super(...(args.length ? args : [today + 'T12:00:00Z'])); }
      };
    }, today);
    const p = await dated.newPage();
    await p.goto(origin);
    const note = await p.locator('#season-note').textContent();
    assert.equal(note.startsWith('Archived'), archived);
    assert.match(note, /2026 concept season/);
    await dated.close();
  }
  passed.push('before, during and after-season dates are explicitly fictional, with an archive notice after the season');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed, output }, null, 2));
}

run().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  await stopServer();
});
