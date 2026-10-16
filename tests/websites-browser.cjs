// One focused four-property visitor pass with isolated storage and a local server.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { renderAll, loadSites } = require('../scripts/render-site.cjs');
const { createPlanner } = require('../planner.js');
const pages = renderAll(), sites = loadSites();
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-websites-browser-'));
const errors = [], external = [], downloads = [];
let browser, server;
async function context(options = {}) {
  const session = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 }, ...options });
  session.setDefaultTimeout(6000); session.setDefaultNavigationTimeout(10000);
  session.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await session.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && !url.startsWith(server.origin + '/')) { external.push(url); return route.abort(); }
    return route.continue();
  });
  return session;
}
async function enhanced(page) { await page.waitForFunction(() => document.documentElement.classList.contains('enhanced')); }
async function planner(page) {
  await page.locator('[data-open-planner]').first().click();
  await page.locator('#planner-dialog').waitFor({ state: 'visible' });
}
async function download(page, selector, target) {
  const pending = page.waitForEvent('download'); await page.locator(selector).click();
  const file = await pending; await file.saveAs(target); return file.suggestedFilename();
}
async function run() {
  server = await startServer(); browser = await chromium.launch({ headless: process.env.BONE_BROWSER_VISIBLE !== '1' });
  const session = await context();
  await session.addInitScript(() => { if (location.protocol === 'http:' && !localStorage.getItem('bone-appetit-creator-v1')) localStorage.setItem('bone-appetit-creator-v1', 'creator sentinel'); });
  const page = await session.newPage();
  const expectedPlans = new Map();
  for (const [index, entry] of pages.entries()) {
    const data = entry.data, p = createPlanner(data), site = sites[index];
    if (index === 0) await page.goto(server.origin + '/' + entry.filename);
    else await Promise.all([page.waitForURL('**/' + entry.filename), page.locator(`#property-switcher [data-property-link="${site.id}"]`).click()]);
    await enhanced(page);
    assert.equal(await page.title(), site.copy.PAGE_TITLE);
    assert.equal(await page.locator('#property-switcher [aria-current=page]').getAttribute('data-property-link'), site.id);
    assert.equal(await page.locator('.hero-actions a').first().getAttribute('href'), site.copy.HERO_ACTION_TARGET);
    await page.locator('.hero-actions a').first().click();
    assert.equal(new URL(page.url()).hash, site.copy.HERO_ACTION_TARGET);
    assert.equal(await page.locator('#full-menu [data-menu-id]').count(), data.branding ? 18 : 24);
    assert.equal(await page.locator('#story .story-copy > p:not(.eyebrow)').count(), site.copy.STORY_PARAGRAPHS.length + 2);
    assert.equal(await page.locator('.oddity-card').count(), 6);
    assert.equal(await page.locator('.grounds-key > li').count(), 6);
    assert.equal(await page.locator('.faq-list details').count(), data.faqs.length);
    await page.evaluate(async () => {
      for (const image of document.images) image.loading = 'eager';
      await document.fonts.ready;
      await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
    });
    assert.ok(await page.evaluate(() => [...document.images].every(image => image.complete && image.naturalWidth > 0)), `${site.id}: all images load.`);
    for (const [category, items] of Object.entries(data.menu)) {
      await page.locator('[data-open-menu]').first().click();
      await page.locator(`[data-filter="${category}"]`).click();
      assert.deepEqual(await page.locator('#full-menu-items strong').allTextContents(), items.map(item => p.money(item.price)));
      assert.ok(new URL(page.url()).pathname.endsWith(entry.filename));
      if (category === 'drinks') {
        await page.reload(); await enhanced(page);
        assert.equal(await page.locator('#menu-dialog').isVisible(), true);
        assert.equal(await page.locator('#full-menu-items article').count(), items.length);
      }
      await page.keyboard.press('Escape');
    }
    for (const [key, attraction] of Object.entries(data.attractions)) {
      await page.locator(`[data-attraction="${key}"]`).first().click();
      assert.equal(await page.locator('#attraction-title').textContent(), attraction.title);
      assert.ok((await page.locator('#attraction-description').textContent()).includes(p.copy(attraction.description)));
      const asset = attraction.image.endsWith('.svg') ? attraction.image : attraction.image + '.webp';
      assert.ok((await page.locator('#attraction-image').getAttribute('src')).endsWith(asset));
      await page.keyboard.press('Escape');
    }
    await planner(page);
    await page.selectOption('#visit-guests', String(index + 3));
    if (!data.admission) await page.selectOption('#visit-children', '1');
    else {
      assert.equal(await page.locator('#visit-children').getAttribute('type'), 'hidden');
      assert.ok(!(await page.locator('#planner-form').innerText()).includes('Under age'));
    }
    await page.locator('#planner-form [type=submit]').click();
    const plan = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), p.rules.storageKey);
    expectedPlans.set(p.rules.storageKey, plan);
    assert.equal(plan.guests, index + 3); assert.equal(plan.children, data.admission ? 0 : 1);
    const textTarget = path.join(output, site.id + '-visit.txt');
    assert.ok((await download(page, '#download-plan', textTarget)).startsWith(site.id));
    assert.ok(fs.readFileSync(textTarget, 'utf8').includes(data.name.toUpperCase()), `${site.id}: text itinerary retains its uppercase restaurant heading.`);
    const htmlTarget = path.join(output, site.id + '-field-notes.html');
    assert.ok((await download(page, '#download-field-notes', htmlTarget)).startsWith(site.id));
    downloads.push({ filename: htmlTarget, data });
    if (data.admission) assert.ok(fs.readFileSync(htmlTarget, 'utf8').includes('21+ only'));
    await page.keyboard.press('Escape');
    for (const width of [375, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${site.id}: ${width}px page reflow.`);
      await page.locator('[data-attraction=hollow]').first().click();
      assert.ok(await page.locator('#attraction-dialog').evaluate(node => node.scrollWidth <= node.clientWidth));
      await page.keyboard.press('Escape');
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(output, site.id + '-desktop.png') });
    if (data.branding) {
      await page.locator('#menu').screenshot({ path: path.join(output, site.id + '-menu.png') });
      await page.locator('#story').screenshot({ path: path.join(output, site.id + '-story.png') });
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.setViewportSize({ width: 375, height: 1000 });
    await page.screenshot({ path: path.join(output, site.id + '-narrow.png') });
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  for (const [key, value] of expectedPlans) assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), value, 'Saved plans remain independent.');
  assert.equal(await page.evaluate(() => localStorage.getItem('bone-appetit-creator-v1')), 'creator sentinel');
  await page.reload(); await enhanced(page); await planner(page);
  assert.equal(await page.locator('#visit-guests').inputValue(), '6');
  await page.selectOption('#visit-guests', '7'); await page.keyboard.press('Escape');
  const dialogPending = page.waitForEvent('dialog');
  const clickPending = page.locator('#property-switcher [data-property-link=rest-in-pizza]').click();
  const warning = await dialogPending; assert.match(warning.message(), /unsaved itinerary/); await warning.dismiss(); await clickPending;
  assert.ok(new URL(page.url()).pathname.endsWith('boobies-lodge.html'));
  await planner(page); await page.locator('#restore-plan').click();
  assert.equal(await page.locator('#visit-guests').inputValue(), '6');
  await page.locator('#reset-plan').click();
  assert.equal(await page.evaluate(() => localStorage.getItem('bone-property-boobies-lodge-visit-v1')), null);
  await page.locator('#undo-reset').click();
  assert.equal(await page.locator('#visit-guests').inputValue(), '6');
  await page.keyboard.press('Escape');
  await page.locator('#property-switcher [data-property-link=rest-in-pizza]').click(); await enhanced(page);
  await page.goBack(); await enhanced(page); assert.ok(new URL(page.url()).pathname.endsWith('boobies-lodge.html'));
  await page.goForward(); await enhanced(page); assert.ok(new URL(page.url()).pathname.endsWith('rest-in-pizza.html'));
  await planner(page); assert.equal(await page.locator('#visit-guests').inputValue(), '4'); await page.keyboard.press('Escape');
  await session.close();

  const fallback = await context({ javaScriptEnabled: false, viewport: { width: 375, height: 1000 } });
  const plain = await fallback.newPage();
  for (const entry of pages) {
    await plain.goto(server.origin + '/' + entry.filename);
    assert.equal(await plain.locator('html').getAttribute('class'), null);
    assert.equal(await plain.locator('#full-menu [data-menu-id]').count(), entry.data.branding ? 18 : 24);
    assert.equal(await plain.locator('[data-open-planner]').first().isVisible(), false);
    assert.equal(await plain.locator('#main-nav').isVisible(), true);
    await plain.locator('[data-open-menu]').first().click(); assert.equal(await plain.locator('#full-menu').isVisible(), true);
    await plain.locator('[data-attraction=oddities]').first().click(); assert.equal(await plain.locator('#details-oddities').isVisible(), true);
    assert.ok(await plain.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const next = sites.find(site => site.href !== entry.filename);
    await plain.locator(`#property-switcher [data-property-link="${next.id}"]`).click();
    assert.ok(new URL(plain.url()).pathname.endsWith(next.href));
  }
  await fallback.close();
  for (const script of ['app.js','planner.js','content.js']) {
    const blocked = await context({ viewport: { width: 375, height: 1000 } });
    await blocked.route('**/' + script, route => route.abort());
    const plain = await blocked.newPage(); await plain.goto(server.origin + '/grave-expectations.html#full-menu');
    assert.equal(await plain.locator('#full-menu').isVisible(), true);
    assert.equal(await plain.locator('#full-menu [data-menu-id]').count(), 18);
    await blocked.close();
  }
  const offline = await context({ offline: true, javaScriptEnabled: false });
  const note = await offline.newPage();
  for (const { filename, data } of downloads) {
    await note.goto(pathToFileURL(filename).href);
    assert.ok((await note.locator('body').innerText()).includes(data.name));
    assert.equal(await note.locator('.field-note-map-key li').count(), 6);
    assert.ok((await note.locator('.field-note-access').innerText()).includes(data.disclosures.weather));
  }
  await offline.close();
  assert.deepEqual(errors, []); assert.deepEqual(external, []);
  console.log('Website browser pass passed: four full restaurants, native switcher, all menu prices, details/maps, direct links/reloads, separate saves, restore/reset/undo, unsaved-switch guard, Back/Forward, downloads/offline notes, narrow layouts and no-JavaScript/script fallbacks.');
  console.log(`Chromium ${browser.version()} · no page errors or external requests · artifacts: ${output}`);
}
run().catch(error => { console.error(error.stack); process.exitCode = 1; }).finally(async () => { await browser?.close(); await server?.stop(); });
