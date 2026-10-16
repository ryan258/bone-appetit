// Focused static-fallback and rendering checks. Requires Playwright + Chromium.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');
const { chromium } = require('./helpers/browser.cjs');
const data = require('../site-data.json');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-maintenance-'));
let browser;
const server = spawn('python3', ['-B', '-u', '-c',
  "from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer;s=ThreadingHTTPServer(('127.0.0.1',0),SimpleHTTPRequestHandler);print(s.server_port,flush=True);s.serve_forever()"],
  { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });

async function check() {
  const port = await new Promise((resolve, reject) => {
    server.stdout.once('data', data => resolve(Number(String(data).trim())));
    server.once('error', reject);
    server.once('exit', code => reject(new Error('Preview exited: ' + code)));
  });
  const origin = `http://127.0.0.1:${port}`;
  browser = await chromium.launch({ headless: true });
  const passed = [];
  for (const failure of ['no-javascript', 'app.js', 'planner.js', 'content.js']) {
    const context = await browser.newContext({ javaScriptEnabled: failure !== 'no-javascript', reducedMotion: 'reduce', viewport: { width: 320, height: 900 } });
    if (failure !== 'no-javascript') await context.route(`**/${failure}`, route => route.abort());
    const page = await context.newPage();
    await page.goto(origin);
    assert.equal(await page.locator('html').getAttribute('class'), null);
    assert.equal(await page.locator('#main-nav').isVisible(), true);
    assert.equal(await page.locator('.nav-toggle').isVisible(), false);
    assert.equal(await page.locator('[data-open-planner]').first().isVisible(), false);
    assert.equal(await page.locator('.planner-fallback').isVisible(), true);
    assert.equal(await page.locator('#full-menu [data-menu-id]').count(), 24);
    for (const [category, items] of Object.entries(data.menu)) {
      assert.equal(await page.locator(`#full-menu-${category} [data-menu-id]`).count(), items.length);
      for (const item of items) {
        assert.equal(await page.locator(`#full-menu [data-menu-id="${item.id}"] strong`).textContent(), `$${item.price}`);
      }
    }
    await page.locator('[data-open-menu]').first().click();
    assert.match(page.url(), /#full-menu$/);
    assert.equal(await page.locator('#full-menu').isVisible(), true);
    assert.match(await page.locator('#full-menu .menu-disclaimer').textContent(), /fictional menu is not an allergy assurance/);
    for (const [key, attraction] of Object.entries(data.attractions)) {
      await page.locator(`[data-attraction=${key}]`).first().click();
      assert.match(page.url(), new RegExp(`#details-${key}$`));
      assert.equal(await page.locator(`#details-${key}`).isVisible(), true);
      assert.ok((await page.locator(`#details-${key}`).textContent()).includes(attraction.access));
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
    if (failure === 'no-javascript') await page.screenshot({ path: path.join(output, 'static-mobile.png') });
    await context.close();
    passed.push(failure + ': full menu, access details, navigation and ordinary links remain usable');
  }

  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  assert.equal(await page.locator('html').evaluate(e => e.classList.contains('enhanced')), true);
  assert.equal(await page.locator('#full-menu').isVisible(), false);
  for (const [category, items] of Object.entries(data.menu)) {
    await page.locator('[data-open-menu]').first().click();
    await page.locator(`[data-filter=${category}]`).click();
    assert.equal(await page.locator('#full-menu-items article').count(), items.length);
    assert.deepEqual(await page.locator('#full-menu-items strong').allTextContents(), items.map(item => `$${item.price}`));
    await page.keyboard.press('Escape');
  }
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const selector of ['[data-open-menu]', '[data-attraction=hollow]', '[data-open-planner]']) {
      await page.locator(selector).first().click();
      assert.equal(await page.locator('dialog[open]').evaluate(dialog => dialog.scrollWidth - dialog.clientWidth), 0);
      await page.keyboard.press('Escape');
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 0);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(async () => {
    for (const image of document.images) image.loading = 'eager';
    await document.fonts.ready;
    document.activeElement.blur();
    window.scrollTo(0, 0);
    await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
  });
  await page.screenshot({ path: path.join(output, 'enhanced-desktop.png'), fullPage: true });
  assert.deepEqual(errors, []);
  passed.push('enhanced menu and dialogs preserve all prices and fit 320, 768 and 1440 pixels');
  await context.close();
  console.log(JSON.stringify({ passed, output }, null, 2));
}

check().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  await new Promise(resolve => { server.once('exit', resolve); server.kill('SIGINT'); });
});
