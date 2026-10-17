// Focused material-background pass: live sites, old creator saves, portable sites.
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { createModel, KEY } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const { backgroundAsset } = require('../website-renderer.js');
const { loadSites } = require('../scripts/render-site.cjs');
const model = createModel(require('../site-data.json')), catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(p => catalog.create(p.id))], sites = loadSites();
const before = JSON.stringify(records);
const output = process.env.BACKGROUND_OUTPUT || fs.mkdtempSync(path.join(os.tmpdir(), 'bone-backgrounds-'));
fs.mkdirSync(output, { recursive: true });
const errors = [], external = [], failed = [], results = [];
let browser, server;
async function context(options = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  ctx.setDefaultTimeout(10000);
  ctx.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('requestfailed', request => failed.push(request.url()));
    page.on('response', response => { if (response.status() >= 400) failed.push(response.url() + ': ' + response.status()); });
  });
  await ctx.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && !url.startsWith(server.origin + '/')) { external.push(url); return route.abort(); }
    return route.continue();
  });
  return ctx;
}
async function checkBackground(page, asset) {
  const result = await page.evaluate(async asset => {
    const mobile = innerWidth <= 720;
    if (mobile) asset = asset.replace('.webp', '-mobile.webp');
    const image = new Image(); image.src = 'assets/' + asset; await image.decode();
    const css = element => getComputedStyle(element);
    const body = css(document.body), visit = css(document.querySelector('#visit'));
    return { asset, mobile, body: body.backgroundImage, visit: visit.backgroundImage,
      menu: getComputedStyle(document.querySelector('#menu'), '::before').backgroundImage,
      width: image.naturalWidth, height: image.naturalHeight,
      overflow: document.documentElement.scrollWidth > innerWidth,
      bodyWash: body.getPropertyValue('--house-wash').trim(),
      samples: ['#haunts .section-intro p', '.story-copy p', '.story-copy .eyebrow', '#visit .section-intro p', '#visit .section-intro h2', '.last-call h2', '.last-call p:not(.eyebrow)'].map(selector => {
        const el = document.querySelector(selector), style = css(el);
        const surface = selector.startsWith('#visit') ? visit : selector.startsWith('.last-call') ? css(document.querySelector('.last-call')) : body;
        return { selector, color: style.color, size: style.fontSize, weight: style.fontWeight, background: surface.backgroundImage };
      }) };
  }, asset);
  for (const key of ['body', 'visit', 'menu']) assert.ok(result[key].includes(result.asset), key + ' uses ' + result.asset);
  assert.deepEqual([result.width, result.height], result.mobile ? [768, 512] : [1280, 853]);
  assert.equal(result.overflow, false, asset + ' reflow');
  return result;
}
async function download(page, selector, filename) {
  const pending = page.waitForEvent('download', { timeout: 30000 }); await page.locator(selector).click();
  await (await pending).saveAs(path.join(output, filename));
  const folder = path.join(output, filename.replace('.zip', ''));
  const extracted = spawnSync('python3', ['-c', 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])', path.join(output, filename), folder], { encoding: 'utf8', timeout: 10000 });
  assert.equal(extracted.status, 0, extracted.stderr);
  return folder;
}
async function run() {
  server = await startServer(); browser = await chromium.launch({ headless: true });
  const ctx = await context(), page = await ctx.newPage();
  for (const [index, site] of sites.entries()) {
    await page.goto(server.origin + '/' + site.href); await page.locator('html.enhanced').waitFor();
    for (const width of [1440, 375]) {
      await page.setViewportSize({ width, height: 1000 });
      const details = await checkBackground(page, backgroundAsset(records[index].reference));
      await page.evaluate(async () => {
        for (const i of document.images) i.loading = 'eager';
        await Promise.all([...document.images].map(i => i.complete ? Promise.resolve() : new Promise(r => {
          i.addEventListener('load', r, { once: true });
          i.addEventListener('error', r, { once: true });
        })));
        const missing = await Promise.all([...document.images].filter(i => i.getAttribute('src')).map(async i => {
          try { await i.decode(); return null; }
          catch { return i.getAttribute('src'); }
        }));
        const failed = missing.filter(Boolean);
        if (failed.length) throw new Error('Image decode errors: ' + JSON.stringify(failed));
        await document.fonts.ready;
      });
      for (const section of ['#haunts', '#menu', '#story', '#visit', '.last-call']) {
        await page.locator(section).screenshot({ path: path.join(output, site.id + '-' + width + '-' + section.replace(/^[#.]/, '') + '.png') });
      }
      results.push({ property: site.id, width, ...details });
    }
    await page.emulateMedia({ media: 'print' });
    assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
    assert.equal(await page.locator('#visit').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
    await page.emulateMedia({ media: 'screen', forcedColors: 'active' });
    assert.equal(await page.locator('body').evaluate(el => getComputedStyle(el).backgroundImage), 'none');
    await page.emulateMedia({ forcedColors: 'none' });
    await page.locator('[data-open-menu]').first().click(); await page.keyboard.press('Escape');
    await page.locator('[data-open-planner]').first().click(); await page.keyboard.press('Escape');
  }
  const workspace = { version: 1, activeId: records[0].id, entries: records.map(record => ({ ...model.entryFor(record), saved: structuredClone(record) })) };
  await ctx.addInitScript(({ key, raw }) => { if (location.protocol === 'http:' && !localStorage.getItem(key)) localStorage.setItem(key, raw); }, { key: KEY, raw: model.serialize(workspace) });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(server.origin + '/creator.html'); await page.locator('html.creator-ready').waitFor();
  await page.waitForFunction(() => !document.querySelector('#preview-website').disabled);
  const offline = await context({ offline: true }), local = await offline.newPage();
  for (const [index, record] of records.entries()) {
    await page.locator(`[data-campaign-id="${record.id}"]`).click();
    for (const source of ['draft', 'named']) {
      await page.selectOption('#website-source', source);
      await page.waitForFunction(() => !document.querySelector('#preview-website').disabled);
      await page.locator('#preview-website').click();
      await page.waitForFunction(() => document.querySelector('#website-status').textContent.startsWith('Full website ready.'));
      const frame = await (await page.locator('#website-preview').elementHandle()).contentFrame();
      await checkBackground(frame, backgroundAsset(record.reference));
    }
    const folder = await download(page, '#download-website', sites[index].id + '.zip');
    const materialFiles = fs.readdirSync(path.join(folder, 'assets')).filter(file => /-background(?:-mobile)?\.webp$/.test(file));
    assert.deepEqual(materialFiles.sort(), [backgroundAsset(record.reference), backgroundAsset(record.reference, true)].sort(), 'Individual website contains only its own responsive materials.');
    await local.goto(pathToFileURL(path.join(folder, 'index.html')).href); await local.locator('html.enhanced').waitFor();
    await checkBackground(local, backgroundAsset(record.reference));
  }
  const folder = await download(page, '#download-collection', 'collection.zip');
  for (const [index, site] of sites.entries()) {
    await local.goto(pathToFileURL(path.join(folder, site.href)).href); await local.locator('html.enhanced').waitFor();
    await checkBackground(local, backgroundAsset(records[index].reference));
  }
  const integrity = spawnSync('python3', [path.join(__dirname, 'helpers/website-archive.py'), output], { encoding: 'utf8', timeout: 15000 });
  assert.equal(integrity.status, 0, integrity.stderr);
  assert.equal(JSON.stringify(records), before);
  assert.deepEqual(errors, []); assert.deepEqual(external, []); assert.deepEqual(failed, []);
  fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify({ chromium: browser.version(), results, errors, external, failed, exports: 5, creatorPreviews: 8 }, null, 2));
  console.log('Background pass passed: four sites at 1440/375, decoded materials, print/forced-colors, menus/planners, eight draft/named legacy previews, four offline individual sites, linked collection and five ZIP integrity checks. Artifacts: ' + output);
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) await server.stop(); });
