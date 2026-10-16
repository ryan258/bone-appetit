// Targeted map, counter-record, offline-download and field-note print checks.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('./helpers/browser.cjs');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-creative-'));
let browser;
const server = spawn('python3', ['-B', '-u', '-c',
  "from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer;s=ThreadingHTTPServer(('127.0.0.1',0),SimpleHTTPRequestHandler);print(s.server_port,flush=True);s.serve_forever()"],
  { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });

async function run() {
  const port = await new Promise((resolve, reject) => {
    server.stdout.once('data', data => resolve(Number(String(data).trim())));
    server.once('error', reject);
    server.once('exit', code => reject(new Error('Preview exited: ' + code)));
  });
  const origin = `http://127.0.0.1:${port}`;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  assert.equal(await page.locator('.oddity-card').count(), 6);
  for (const record of await page.locator('.oddity-record').all()) {
    await record.locator('summary').click();
    assert.equal(await record.evaluate(e => e.open), true);
    assert.match(await record.textContent(), /Fictional object and provenance/);
    await record.locator('summary').click();
  }
  assert.equal(await page.locator('.grounds-key > li').count(), 6);
  assert.match(await page.locator('.grounds-disclosure').textContent(), /not verified facilities or real directions/);
  for (const link of await page.locator('[data-map-location]').all()) {
    await link.click();
    assert.equal(await page.locator('#attraction-dialog').evaluate(e => e.open), true);
    await page.keyboard.press('Escape');
    assert.equal(await link.evaluate(e => e === document.activeElement), true);
  }
  await page.locator('#saved-plan-button').click();
  await page.selectOption('#visit-time', '19:00');
  await page.selectOption('#visit-guests', '8');
  await page.selectOption('#visit-children', '4');
  assert.equal(await page.locator('#plan-estimate').textContent(), '$96');
  assert.match(await page.locator('#plan-summary-party').textContent(), /8 guests age 5\+ · 4 under 5/);
  assert.match(await page.locator('#plan-house-note').textContent(), /party count stays exactly as entered/);
  const downloadEvent = page.waitForEvent('download');
  await page.locator('#download-field-notes').click();
  const download = await downloadEvent;
  assert.match(download.suggestedFilename(), /^bone-appetit-field-notes-.*\.html$/);
  const exported = path.join(output, download.suggestedFilename());
  await download.saveAs(exported);
  await page.pdf({ path: path.join(output, 'planner-field-notes.pdf'), format: 'Letter', margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' } });
  await page.locator('#planner-dialog [data-close]').click();
  // Keep sticky page chrome out of the individual section evidence images.
  await page.addStyleTag({ content: '.site-header,.skip-link {visibility:hidden!important}' });
  await page.locator('.oddities-section').screenshot({ path: path.join(output, 'counter-desktop.png') });
  await page.locator('.grounds-section').screenshot({ path: path.join(output, 'map-desktop.png') });
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
    await page.locator('#saved-plan-button').click();
    assert.equal(await page.locator('#planner-dialog').evaluate(e => e.scrollWidth - e.clientWidth), 0);
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.locator('.grounds-section').screenshot({ path: path.join(output, 'map-mobile.png') });
  const noJS = await browser.newContext({ javaScriptEnabled: false, reducedMotion: 'reduce', viewport: { width: 320, height: 900 } });
  const fallback = await noJS.newPage();
  await fallback.goto(origin);
  assert.equal(await fallback.locator('.oddity-card').count(), 6);
  await fallback.locator('.oddity-record summary').first().click();
  assert.equal(await fallback.locator('.oddity-record').first().evaluate(e => e.open), true);
  await fallback.locator('[data-map-location="3"]').click();
  assert.match(fallback.url(), /#details-hollow$/);
  assert.equal(await fallback.locator('#details-hollow').isVisible(), true);
  await noJS.close();

  const offline = await browser.newContext({ offline: true, viewport: { width: 1000, height: 1000 } });
  const notes = await offline.newPage();
  const external = [];
  notes.on('request', request => { if (/^https?:/.test(request.url())) external.push(request.url()); });
  await notes.goto(pathToFileURL(exported).href);
  assert.equal(await notes.locator('#plan-estimate').textContent(), '$96');
  assert.equal(await notes.locator('.field-note-reference svg').count(), 1);
  assert.equal(await notes.locator('.field-note-map-key li').count(), 6);
  assert.match(await notes.locator('.field-note-disclosure').textContent(), /not a booking or ticket/);
  await notes.screenshot({ path: path.join(output, 'field-notes-offline.png'), fullPage: true });
  await notes.pdf({ path: path.join(output, 'offline-field-notes.pdf'), format: 'Letter', margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' } });
  await notes.evaluate(() => { window.print = () => { window.printRequested = true; }; });
  await notes.locator('#print-field-notes').click();
  assert.equal(await notes.evaluate(() => window.printRequested), true);
  await notes.setViewportSize({ width: 320, height: 900 });
  assert.equal(await notes.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
  assert.deepEqual(external, []);
  await offline.close();

  const missingExport = await browser.newContext();
  await missingExport.route('**/field-notes.js', route => route.abort());
  const limited = await missingExport.newPage();
  await limited.goto(origin);
  await limited.locator('#saved-plan-button').click();
  assert.equal(await limited.locator('#download-field-notes').isVisible(), false);
  assert.equal(await limited.locator('#download-plan').isVisible(), true);
  await missingExport.close();
  assert.deepEqual(errors, []);
  await context.close();
  console.log(JSON.stringify({ passed: ['six records and six map locations', 'map dialogs and focus return', 'unchanged guest count and estimate', 'self-contained offline HTML and print action', 'mobile and desktop layouts', 'no-JavaScript records and map links', 'export-script failure preserves ordinary planner'], output }, null, 2));
}

run().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server.exitCode === null) await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGINT'); });
});
