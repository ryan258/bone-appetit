// Focused final-review regressions: keyboard, reflow, scrolling exits and exports.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn, execFileSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { chromium } = require('./helpers/browser.cjs');
const data = require('../site-data.json');
const root = path.resolve(__dirname, '..');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-final-'));
let browser;
const server = spawn('python3', ['-B', '-u', '-c',
  "from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer;s=ThreadingHTTPServer(('127.0.0.1',0),SimpleHTTPRequestHandler);print(s.server_port,flush=True);s.serve_forever()"],
  { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });

async function run() {
  const port = await new Promise((resolve, reject) => {
    server.stdout.once('data', chunk => resolve(Number(String(chunk).trim())));
    server.once('error', reject);
    server.once('exit', code => reject(new Error('Preview exited: ' + code)));
  });
  const origin = `http://127.0.0.1:${port}`;
  browser = await chromium.launch();
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 320, height: 700 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.skip-link').evaluate(e => e === document.activeElement), true);
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#main').evaluate(e => e === document.activeElement), true);
  await page.keyboard.press('Tab');
  assert.equal(await page.locator('.hero-actions a').first().evaluate(e => e === document.activeElement), true);
  const contracts = await page.evaluate(() => {
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    return {
      duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
      missingAnchors: [...document.querySelectorAll('a[href^="#"]')]
        .map(e => e.getAttribute('href').slice(1)).filter(id => id && !document.getElementById(id))
    };
  });
  assert.deepEqual(contracts, { duplicates: [], missingAnchors: [] });

  for (const width of [320, 375, 768, 1024, 1440]) {
    for (const height of [700, 320]) {
      await page.setViewportSize({ width, height });
      for (const selector of ['[data-attraction=hollow]', '[data-open-menu]', '[data-open-planner]']) {
        const trigger = page.locator(selector).first();
        await trigger.click();
        const dialog = page.locator('dialog[open]');
        await dialog.evaluate(e => { e.scrollTop = e.scrollHeight; });
        assert.equal(await dialog.evaluate(e => e.scrollWidth - e.clientWidth), 0);
        assert.equal(await dialog.locator('[data-close]').evaluate(e => {
          const r = e.getBoundingClientRect(), d = e.closest('dialog').getBoundingClientRect();
          return r.top >= d.top && r.bottom <= d.bottom;
        }), true, `Exit must remain visible at ${width}×${height}`);
        // Clicking must succeed without the browser scrolling back to find the exit.
        const scroll = await dialog.evaluate(e => e.scrollTop);
        await dialog.locator('[data-close]').click();
        assert.equal(await page.locator('dialog[open]').count(), 0);
        assert.equal(await trigger.evaluate(e => e === document.activeElement), true);
        assert.ok(scroll > 0 || width >= 1024);
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    }
  }

  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 700 });
    await page.goto(origin);
    await page.evaluate(async () => { await document.fonts.ready; });
    // Deterministic text-only enlargement: capture original sizes before changing ancestors.
    await page.evaluate(() => {
      const sizes = [...document.querySelectorAll('body, body *')].map(e => [e, parseFloat(getComputedStyle(e).fontSize)]);
      sizes.forEach(([e, size]) => { e.style.fontSize = `${size * 2}px`; });
    });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `200% text at ${width}`);
    assert.deepEqual(await page.locator('main h1, main h2, main h3, .pizza-card').evaluateAll(elements =>
      elements.filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.left < -1 || r.right > innerWidth + 1); }).map(e => e.textContent.trim())), []);
    for (const selector of ['[data-open-menu]', '[data-open-planner]']) {
      await page.locator(selector).first().click();
      assert.equal(await page.locator('dialog[open]').evaluate(e => e.scrollWidth - e.clientWidth), 0, `${selector}: 200% text at ${width}`);
      await page.locator('dialog[open]').evaluate(e => { e.scrollTop = e.scrollHeight; });
      assert.equal(await page.locator('dialog[open] [data-close]').evaluate(e => e.getBoundingClientRect().top > 0), true);
      if (width === 320 && selector === '[data-open-menu]') await page.screenshot({ path: path.join(output, 'menu-text-200.png') });
      await page.keyboard.press('Escape');
    }
  }

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin);
  await page.locator('[data-open-menu]').first().click();
  for (const [key, items] of Object.entries(data.menu)) {
    await page.locator(`[data-filter=${key}]`).click();
    assert.equal(await page.locator('#menu-result-status').textContent(), `${items.length} items in ${data.menuCategories[key]}.`);
    assert.deepEqual(await page.locator('#full-menu-items strong').allTextContents(), items.map(item => `$${item.price}`));
  }
  // Native modal tab order stays inside the open menu in both directions.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press(i < 6 ? 'Tab' : 'Shift+Tab');
    // Chromium may focus browser chrome between cycles, reported as body in a page.
    assert.equal(await page.evaluate(() => document.activeElement === document.body || !!document.activeElement.closest('dialog[open]')), true);
  }
  await page.keyboard.press('Escape');
  for (const link of await page.locator('[data-map-location]').all()) {
    await link.click();
    await page.keyboard.press('Escape');
    assert.equal(await link.evaluate(e => e === document.activeElement), true);
  }
  await page.locator('#saved-plan-button').click();
  await page.selectOption('#visit-guests', '8');
  await page.selectOption('#visit-children', '4');
  await page.selectOption('#visit-time', '19:00');
  assert.equal(await page.locator('#plan-estimate').textContent(), '$96');
  assert.match(await page.locator('#plan-timeline').textContent(), /Inspect the family inventory/);
  const download = page.waitForEvent('download');
  await page.locator('#download-field-notes').click();
  const exported = path.join(output, (await download).suggestedFilename());
  await (await download).saveAs(exported);
  await page.pdf({ path: path.join(output, 'planner.pdf'), format: 'Letter', margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' } });
  await page.keyboard.press('Escape');
  await page.evaluate(async () => {
    document.querySelectorAll('img').forEach(e => { e.loading = 'eager'; });
    await Promise.all([...document.images].map(e => e.decode().catch(() => {})));
    scrollTo(0, 0);
    document.activeElement.blur();
  });
  await page.screenshot({ path: path.join(output, 'desktop.png'), fullPage: true });
  for (const section of ['grounds', 'oddities']) await page.locator(`#${section}`).screenshot({ path: path.join(output, `${section}.png`) });

  const offline = await browser.newContext({ offline: true, viewport: { width: 320, height: 700 } });
  const notes = await offline.newPage();
  const requests = [];
  notes.on('request', request => { if (/^https?:/.test(request.url())) requests.push(request.url()); });
  await notes.goto(pathToFileURL(exported).href);
  for (const key of ['estimate', 'access', 'sensory', 'weather']) assert.ok((await notes.locator('.field-note-paper').textContent()).includes(data.disclosures[key]));
  assert.equal(await notes.locator('#plan-estimate').textContent(), '$96');
  assert.equal(await notes.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  assert.deepEqual(requests, []);
  await notes.pdf({ path: path.join(output, 'offline.pdf'), format: 'Letter', margin: { top: '16mm', bottom: '16mm', left: '16mm', right: '16mm' } });
  await offline.close();

  const noJS = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 700 } });
  const fallback = await noJS.newPage();
  await fallback.goto(origin);
  assert.equal(await fallback.locator('#full-menu [data-menu-id]').count(), 24);
  assert.equal(await fallback.locator('.oddity-card').count(), 6);
  await fallback.locator('[data-map-location="3"]').click();
  assert.match(fallback.url(), /#details-hollow$/);
  assert.equal(await fallback.locator('#details-hollow').isVisible(), true);
  await fallback.pdf({ path: path.join(output, 'no-js-guide.pdf'), format: 'Letter' });
  // Content-stream order avoids interleaving neighboring print columns.
  const printed = execFileSync('pdftotext', ['-raw', path.join(output, 'no-js-guide.pdf'), '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  assert.ok(printed.includes('What about access and sensory needs?'));
  assert.ok(printed.includes('These are design intentions for a fictional venue, not verified facilities.'));
  for (const item of data.oddities) assert.ok(printed.includes(item.record.replace(/\s+/g, ' ')), `Printed counter record: ${item.id}`);
  assert.equal(await fallback.locator('.oddity-record[open]').count(), 0);
  await noJS.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: ['skip-link focus and internal anchors', 'scrolling exits and focus return at five widths and short/tall heights', '200% text reflow', 'menu counts/prices and modal keyboard containment', 'map dialogs', 'maximum-party offline export with shared disclosures', 'no-JavaScript menu/map and complete printed records', 'no page errors'], output }, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  server.kill();
});
