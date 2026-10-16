// One focused browser pass for increment one; no external services or saved user data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const data = require('../site-data.json');
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-editing-sharing-'));
let browser, server;

async function run() {
  server = await startServer();
  browser = await chromium.launch({ headless: process.env.BONE_BROWSER_VISIBLE !== '1' });
  const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 375, height: 800 } });
  context.setDefaultTimeout(5000);
  const external = [], errors = [];
  await context.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && !url.startsWith(server.origin + '/')) {
      external.push(url);
      return route.abort();
    }
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const hashIs = hash => page.waitForFunction(value => location.hash === value, hash);
  const menuIs = async category => {
    await page.waitForFunction(() => document.querySelector('#menu-dialog').open);
    assert.deepEqual(await page.locator('#full-menu-items strong').allTextContents(), data.menu[category].map(item => `$${item.price}`));
    assert.equal(await page.locator(`[data-filter="${category}"]`).getAttribute('aria-pressed'), 'true');
  };
  for (const hash of ['#full-menu', ...Object.keys(data.menu).map(key => `#full-menu-${key}`)]) {
    await page.goto(server.origin + '/' + hash);
    const category = hash === '#full-menu' ? 'pizzas' : hash.slice('#full-menu-'.length);
    await menuIs(category);
    await page.reload();
    await menuIs(category);
    await page.keyboard.press('Escape');
    await hashIs('#menu');
    assert.equal(await page.locator('dialog[open]').count(), 0);
  }
  for (const [key, attraction] of Object.entries(data.attractions)) {
    await page.goto(server.origin + '/#details-' + key);
    assert.equal(await page.locator('#attraction-title').textContent(), attraction.title);
    await page.reload();
    assert.equal(await page.locator('#attraction-dialog').evaluate(e => e.open), true);
    await page.locator('#attraction-dialog [data-close]').click();
    await hashIs('#haunts');
  }

  // Existing anchors remain meaningful through Back, Forward, and category changes.
  await page.goto(server.origin + '/#grounds');
  const mapLink = page.locator('[data-map-location="3"]');
  await mapLink.click();
  await hashIs('#details-hollow');
  await page.goBack();
  await hashIs('#grounds');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.goForward();
  await hashIs('#details-hollow');
  await page.waitForFunction(() => document.querySelector('#attraction-dialog').open);
  await page.keyboard.press('Escape');
  await hashIs('#grounds');
  assert.equal(await mapLink.evaluate(e => e === document.activeElement), true);

  await page.goto(server.origin + '/#menu');
  await page.locator('[data-open-menu]').first().click();
  await hashIs('#full-menu');
  await page.locator('[data-filter=drinks]').click();
  await hashIs('#full-menu-drinks');
  await page.goBack();
  await hashIs('#menu');
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.goForward();
  await hashIs('#full-menu-drinks');
  await menuIs('drinks');
  await page.locator('#menu-dialog [data-close]').click();
  await hashIs('#menu');
  assert.equal(await page.locator('[data-open-menu]').first().evaluate(e => e === document.activeElement), true);

  // Modified clicks keep their normal new-tab behavior and a shareable href.
  await page.goto(server.origin + '/#grounds');
  assert.equal(await mapLink.getAttribute('href'), '#details-hollow');
  assert.equal(await mapLink.evaluate(link => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, button: 0 });
    let intercepted;
    // Inspect the app's decision, then suppress the browser's native new-tab
    // action so this regression does not open a second browser surface.
    document.addEventListener('click', e => {
      intercepted = e.defaultPrevented;
      e.preventDefault();
    }, { once: true });
    link.dispatchEvent(event);
    return !intercepted && !document.querySelector('dialog[open]') && location.hash === '#grounds';
  }), true);

  // Each history entry retains its own return anchor, even after visiting another
  // detail. A single global return anchor would incorrectly return to #menu here.
  await mapLink.click();
  await page.evaluate(() => { location.hash = '#menu'; });
  await page.waitForFunction(() => !document.querySelector('dialog[open]'));
  await page.locator('[data-open-menu]').first().click();
  await page.goBack();
  await hashIs('#menu');
  await page.goBack();
  await hashIs('#details-hollow');
  await page.waitForFunction(() => document.querySelector('#attraction-dialog').open);
  await page.keyboard.press('Escape');
  await hashIs('#grounds');

  await page.goto(server.origin + '/#details-hollow');
  await page.locator('#attraction-plan').click();
  assert.equal(await page.locator('#planner-dialog').evaluate(e => e.open), true);
  assert.equal(await page.locator('#visit-time').inputValue(), '15:00');
  assert.ok(!page.url().includes('#details-'));
  await page.selectOption('#visit-guests', '8');
  await page.selectOption('#visit-children', '4');
  await page.selectOption('#visit-time', '19:00');
  assert.equal(await page.locator('#plan-estimate').textContent(), '$96');
  await page.locator('#planner-form [type=submit]').click();
  await page.reload();
  await page.locator('#saved-plan-button').click();
  assert.equal(await page.locator('#visit-time').inputValue(), '19:00');
  assert.match(await page.locator('#plan-save-state').textContent(), /Saved in this browser/);
  await page.selectOption('#visit-time', '16:00');
  await page.locator('#reset-plan').click();
  await page.locator('#undo-reset').click();
  assert.equal(await page.locator('#visit-time').inputValue(), '16:00');
  await page.locator('#restore-plan').click();
  assert.equal(await page.locator('#visit-time').inputValue(), '19:00');

  // Invalid selections cannot leave an exportable stale summary.
  await page.evaluate(() => {
    const select = document.querySelector('#visit-time');
    select.value = '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  assert.equal(await page.locator('.plan-preview').isVisible(), false);
  assert.equal(await page.locator('#download-plan').isDisabled(), true);
  assert.match(await page.locator('#plan-status').textContent(), /itinerary is hidden/);
  await page.selectOption('#visit-time', '19:00');
  assert.equal(await page.locator('.plan-preview').isVisible(), true);
  assert.equal(await page.locator('#download-plan').isDisabled(), false);
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    assert.equal(await page.locator('#planner-dialog').evaluate(e => e.scrollWidth - e.clientWidth), 0);
    await page.screenshot({ path: path.join(output, `planner-${width}.png`) });
  }

  // Script failures and invalid embedded data retain ordinary share targets.
  for (const failure of ['no-javascript', 'content.js', 'planner.js', 'app.js', 'invalid-content']) {
    const fallback = await browser.newContext({ javaScriptEnabled: failure !== 'no-javascript', reducedMotion: 'reduce', viewport: { width: 375, height: 800 } });
    fallback.setDefaultTimeout(5000);
    if (failure.endsWith('.js')) await fallback.route(`**/${failure}`, route => route.abort());
    if (failure === 'invalid-content') await fallback.route(server.origin + '/**', async route => {
      if (route.request().resourceType() !== 'document') return route.continue();
      const response = await route.fetch();
      const html = (await response.text()).replace('"minutes": 60', '"minutes": -60');
      await route.fulfill({ response, body: html });
    });
    const plain = await fallback.newPage();
    plain.on('pageerror', error => errors.push(error.message));
    await plain.goto(server.origin + '/#full-menu-drinks');
    assert.equal(await plain.locator('#full-menu-drinks').isVisible(), true);
    assert.equal(await plain.locator('[data-open-planner]').first().isVisible(), false);
    assert.equal(await plain.locator('#main-nav').isVisible(), true);
    await plain.locator('[data-map-location="3"]').click();
    assert.ok(plain.url().endsWith('#details-hollow'));
    assert.equal(await plain.locator('#details-hollow').isVisible(), true);
    await fallback.close();
  }
  const unavailable = await browser.newContext();
  unavailable.setDefaultTimeout(5000);
  await unavailable.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  const blocked = await unavailable.newPage();
  await blocked.goto(server.origin + '/#full-menu-drinks');
  assert.equal(await blocked.locator('#menu-dialog').evaluate(e => e.open), true);
  await blocked.keyboard.press('Escape');
  await blocked.locator('#saved-plan-button').click();
  assert.match(await blocked.locator('#plan-save-state').textContent(), /saving is unavailable/);
  await unavailable.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log(JSON.stringify({ passed: ['direct links and reloads', 'Back and Forward', 'category URLs and focus return', 'attraction-to-planner transition', 'save/reload/reset/undo/restore', 'invalid selection recovery', 'mobile and desktop planner reflow', 'no-JavaScript and blocked-script links', 'invalid content fallback', 'blocked storage', 'no page errors or external requests'], output }, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) await server.stop();
});
