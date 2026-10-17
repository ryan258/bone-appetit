// One focused visual/interaction pass for the annual U.S. competition.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { createModel, KEY } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const { LODGE_COMPETITION, competitionAssets } = require('../website-renderer.js');
const { loadSites } = require('../scripts/render-site.cjs');
const model = createModel(require('../site-data.json')), catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(p => catalog.create(p.id))], sites = loadSites();
const output = process.env.COMPETITION_BROWSER_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'bone-miss-lodge-browser-'));
fs.mkdirSync(output, { recursive: true });
const errors = [], external = [], failed = [], cancelled = [], contrastResults = [];
let browser, server;
async function session(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  ctx.setDefaultTimeout(10000);
  ctx.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => {
      const entry = { url: request.url(), reason: request.failure()?.errorText };
      // Navigation/closure can cancel offscreen lazy images outside the feature.
      if (entry.reason === 'net::ERR_ABORTED') cancelled.push(entry);
      else failed.push(entry);
    });
    page.on('response', response => { if (response.status() >= 400) failed.push(response.url() + ': ' + response.status()); });
  });
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && !url.startsWith(server.origin + '/')) { external.push(url); return route.abort(); }
    return route.continue();
  });
  return ctx;
}
async function gallery(page) {
  assert.equal(await page.locator('.miss-contestant').count(), 6);
  assert.equal(await page.locator('.miss-swimwear-card').count(), 6);
  assert.equal(await page.locator('.miss-photo-pending').count(), 6);
  assert.equal(await page.locator('.miss-results tbody tr').count(), 6);
  await page.locator('#miss-lodge').evaluate(async section => {
    for (const image of section.querySelectorAll('img')) image.loading = 'eager';
    await Promise.all([...section.querySelectorAll('img')].map(image => image.decode()));
    await document.fonts.ready;
  });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal page overflow.');
}
async function contrast(page) {
  return page.evaluate(() => {
    const rgb = value => [...value.matchAll(/[\d.]+/g)].map(m => Number(m[0]));
    const luminance = values => values.slice(0, 3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
    const selectors = ['.miss-kicker', '.miss-lodge-teaser strong', '.miss-fiction', '.miss-champion .miss-location', '.miss-photo-label', '.miss-award', '.miss-contestant-copy > p:last-of-type', '.miss-profile summary', '.miss-round-note', '.miss-swimwear-card figcaption > span', '.miss-results caption', '.miss-results tbody th', '.miss-results td span', '.miss-annual-note > p'];
    return selectors.map(selector => {
      const el = document.querySelector(selector), css = getComputedStyle(el); let parent = el, bg;
      while (parent) { bg = rgb(getComputedStyle(parent).backgroundColor); if (bg.length === 3 || bg[3] > .99) break; parent = parent.parentElement; }
      const a = luminance(rgb(css.color)), b = luminance(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      const large = parseFloat(css.fontSize) >= 24 || (parseFloat(css.fontSize) >= 18.66 && Number(css.fontWeight) >= 700);
      return { selector, ratio: Number(ratio.toFixed(2)), threshold: large ? 3 : 4.5 };
    });
  });
}
async function download(page, selector, name) {
  const pending = page.waitForEvent('download', { timeout: 30000 }); await page.locator(selector).click();
  await (await pending.catch(async error => { throw new Error(error.message + '\nExport status: ' + await page.locator('#website-export-status, #collection-status').allTextContents()); })).saveAs(path.join(output, name));
  if (!name.endsWith('.zip')) return;
  const folder = path.join(output, name.replace('.zip', ''));
  const extraction = spawnSync('python3', ['-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', path.join(output, name), folder], { encoding: 'utf8', timeout: 15000 });
  assert.equal(extraction.status, 0, extraction.stderr); return folder;
}
async function run() {
  server = await startServer(); browser = await chromium.launch({ headless: true });
  const ctx = await session(), page = await ctx.newPage();
  await page.goto(server.origin + '/boobies-lodge.html'); await page.locator('html.enhanced').waitFor();
  for (const width of [1440, 768, 375, 320]) {
    await page.setViewportSize({ width, height: 1000 }); await gallery(page);
    const samples = await contrast(page); assert.ok(samples.every(s => s.ratio >= s.threshold), JSON.stringify(samples.filter(s => s.ratio < s.threshold)));
    contrastResults.push({ width, samples });
    for (const person of LODGE_COMPETITION.contestants) {
      const profile = page.locator('#contestant-' + person.id + ' details');
      await profile.locator('summary').focus(); await page.keyboard.press('Enter');
      assert.equal(await profile.getAttribute('open'), '');
      await page.keyboard.press('Enter'); assert.equal(await profile.getAttribute('open'), null);
    }
    if (width === 1440 || width === 375) {
      for (const [selector, label] of [['.miss-lodge-teaser', 'promotion'], ['.miss-lodge-hero', 'feature'], ['.miss-champion', 'champion'], ['.miss-contestant-grid', 'portraits'], ['.miss-swimwear-grid', 'swimwear'], ['.miss-results', 'results']]) {
        await page.locator(selector).screenshot({ path: path.join(output, width + '-' + label + '.png'), style: '.site-header, .skip-link { visibility: hidden !important; }' });
      }
    }
  }
  await page.locator('.miss-lodge-teaser a').click(); assert.equal(new URL(page.url()).hash, '#miss-lodge');
  await page.locator('.miss-actions a[href="#miss-lodge-swimwear"]').click(); assert.equal(new URL(page.url()).hash, '#miss-lodge-swimwear');
  await page.locator('.miss-results tbody tr:first-child td a').click(); assert.equal(new URL(page.url()).hash, '#contestant-claire-bennett');
  await page.locator('#contestant-claire-bennett summary').click();
  await download(page, '#contestant-claire-bennett a[download]', 'claire-studio.webp');
  assert.equal(await page.locator('.miss-swimwear-card a[download]').count(), 0);
  await page.emulateMedia({ media: 'print' }); assert.equal(await page.locator('.miss-lodge-stage').isVisible(), false);
  await page.emulateMedia({ media: 'screen', forcedColors: 'active' }); assert.equal(await page.locator('.miss-lodge-stage').isVisible(), false);
  await page.emulateMedia({ forcedColors: 'none' });
  const plain = await session({ javaScriptEnabled: false, viewport: { width: 375, height: 1000 } }), nojs = await plain.newPage();
  await nojs.goto(server.origin + '/boobies-lodge.html#miss-lodge'); await gallery(nojs);
  await nojs.locator('#contestant-lena-park summary').click(); assert.equal(await nojs.locator('#contestant-lena-park details').getAttribute('open'), '');
  for (const site of sites.filter(s => s.id !== 'boobies-lodge')) {
    await page.goto(server.origin + '/' + site.href); assert.equal(await page.locator('#miss-lodge').count(), 0);
  }
  const workspace = { version: 1, activeId: records[3].id, entries: records.map(record => ({ ...model.entryFor(record), saved: structuredClone(record) })) };
  await ctx.addInitScript(({ key, raw }) => { if (location.protocol === 'http:' && !localStorage.getItem(key)) localStorage.setItem(key, raw); }, { key: KEY, raw: model.serialize(workspace) });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(server.origin + '/creator.html'); await page.locator('html.creator-ready').waitFor();
  const offline = await session({ offline: true }), local = await offline.newPage();
  for (const source of ['draft', 'named']) {
    await page.selectOption('#website-source', source); await page.locator('#preview-website').click();
    await page.waitForFunction(() => document.querySelector('#website-status').textContent.startsWith('Full website ready.'));
    const frame = await (await page.locator('#website-preview').elementHandle()).contentFrame(); await gallery(frame);
    const folder = await download(page, '#download-website', 'lodge-' + source + '.zip');
    for (const asset of competitionAssets(records[3].reference)) assert.ok(fs.existsSync(path.join(folder, 'assets', asset)));
    await local.goto(pathToFileURL(path.join(folder, 'index.html')).href); await local.locator('html.enhanced').waitFor(); await gallery(local);
  }
  // Exercise the larger collection download in its own browser session, after
  // the preview and individual-download session has completed.
  await ctx.close();
  const collectionContext = await session();
  await collectionContext.addInitScript(({ key, raw }) => { if (location.protocol === 'http:' && !localStorage.getItem(key)) localStorage.setItem(key, raw); }, { key: KEY, raw: model.serialize(workspace) });
  const collectionPage = await collectionContext.newPage();
  await collectionPage.goto(server.origin + '/creator.html');
  await collectionPage.waitForFunction(() => !document.querySelector('#download-collection').disabled);
  const folder = await download(collectionPage, '#download-collection', 'collection.zip');
  await local.goto(pathToFileURL(path.join(folder, 'boobies-lodge.html')).href); await local.locator('html.enhanced').waitFor(); await gallery(local);
  await local.locator('#contestant-brooke-callahan summary').click(); assert.equal(await local.locator('#contestant-brooke-callahan details').getAttribute('open'), '');
  const integrity = spawnSync('python3', [path.join(__dirname, 'helpers/website-archive.py'), output], { encoding: 'utf8', timeout: 15000 }); assert.equal(integrity.status, 0, integrity.stderr);
  assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(failed, []);
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ chromium: browser.version(), widths: [1440, 768, 375, 320], contestants: 6, pendingSwimwearPhotos: 6, assets: 7, creatorPreviews: 2, exports: 3, contrastResults, errors, external, failed, cancelled }, null, 2));
  console.log('Miss Lodge browser pass passed: four widths, six keyboard profiles, six pending bikini-photo panels, portrait download, results links, sampled contrast, no-JS, print/forced colors, lodge-only scope, two legacy creator previews, offline draft/named/collection sites and three ZIP checks. Artifacts: ' + output);
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) await server.stop(); });
