// Focused creator collection selection, connected offline sites and planner isolation.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { createModel, KEY } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const model = createModel(require('../site-data.json'));
const catalog = createCatalog(model, require('../property-data.json'));
const records = [model.newCampaign(), ...catalog.list.map(property => catalog.create(property.id))];
const entries = records.map((record, index) => {
  record.name = `PRIVATE_WORK_${index}`; record.brief.audience = 'PRIVATE_BRIEF'; record.copy.headline = `Named haunt ${index}`;
  const entry = model.entryFor(record); entry.saved = index === 2 ? null : structuredClone(record);
  entry.draft.copy.headline = `Draft haunt ${index}`; entry.draft.content.menu[0].price = '43.50';
  return entry;
});
const annex = model.duplicate(entries[3].draft); annex.content.venueName = 'BooBies Lodge Annex'; annex.copy.headline = 'Draft annex';
const annexEntry = model.entryFor(annex); annexEntry.saved = structuredClone(annex); annexEntry.saved.copy.headline = 'Named annex'; entries.push(annexEntry);
const workspace = { version: 1, activeId: entries[0].draft.id, entries };
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-collection-browser-'));
const errors = [], external = [], failedFiles = []; let browser, server, hostedServer;
async function context(options = {}) {
  const session = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', ...options });
  session.setDefaultTimeout(6000); session.setDefaultNavigationTimeout(10000);
  session.on('page', page => { page.on('pageerror', error => errors.push(error.message)); page.on('requestfailed', request => { if (request.url().startsWith('file:')) failedFiles.push(request.url()); }); });
  await session.route('**/*', route => {
    const url = route.request().url();
    if (/^https?:/.test(url) && ![server?.origin,hostedServer?.origin].some(origin => origin && url.startsWith(origin + '/'))) { external.push(url); return route.abort(); }
    return route.continue();
  });
  return session;
}
async function loaded(page) { await page.locator('html.creator-ready').waitFor(); await page.locator('[data-collection-property]').first().waitFor(); }
async function choose(page) { await page.selectOption('[data-collection-property=boobies-lodge]', annex.id); }
async function download(page, filename) {
  const pending = page.waitForEvent('download'); await page.locator('#download-collection').click();
  const file = await pending.catch(async error => { throw new Error(`${error.message} Export status: ${await page.locator('#collection-status').innerText()}`); }); assert.ok(file.suggestedFilename().startsWith('bone-appetit-collection-')); await file.saveAs(filename);
}
function extract(zip, directory) {
  const result = spawnSync('python3', ['-c','import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',zip,directory], { encoding: 'utf8', timeout: 10000 });
  assert.equal(result.status, 0, result.stderr); return JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
}
async function enhanced(page) { await page.locator('html.enhanced').waitFor(); }
async function run() {
  server = await startServer(); browser = await chromium.launch({ headless: true });
  const creatorContext = await context();
  await creatorContext.addInitScript(({ raw,key }) => { if (location.protocol === 'http:' && !localStorage.getItem(key)) { localStorage.setItem(key,raw); localStorage.setItem('bone-appetit-visit-v1','owner visit sentinel'); } }, { raw: model.serialize(workspace),key:KEY });
  const creator = await creatorContext.newPage(); await creator.goto(server.origin + '/creator.html'); await loaded(creator);
  assert.ok(await creator.locator('#download-collection').isDisabled());
  assert.equal(await creator.locator('[data-collection-property=boobies-lodge]').inputValue(), '');
  await choose(creator); assert.ok(await creator.locator('#download-collection').isEnabled());
  await creator.selectOption('#collection-source','named');
  assert.ok(await creator.locator('#download-collection').isDisabled()); assert.ok((await creator.locator('#collection-status').innerText()).includes('Save a named version'));
  await creator.locator(`[data-campaign-id="${entries[2].draft.id}"]`).click(); await creator.locator('#creator-form [type=submit]').click();
  assert.ok(await creator.locator('#download-collection').isEnabled());
  const savedBefore = await creator.evaluate(key => JSON.parse(localStorage.getItem(key)),KEY);
  await download(creator,path.join(output,'named.zip')); const named = extract(path.join(output,'named.zip'),path.join(output,'named'));
  const expectedNamed = ['Named haunt 0','Named haunt 1','Draft haunt 2','Named annex'];
  named.properties.forEach((property,index) => assert.ok(fs.readFileSync(path.join(output,'named',property.href),'utf8').includes(expectedNamed[index])));
  await creator.selectOption('#collection-source','draft'); await download(creator,path.join(output,'draft.zip'));
  const manifest = extract(path.join(output,'draft.zip'),path.join(output,'draft'));
  const savedAfter = await creator.evaluate(key => JSON.parse(localStorage.getItem(key)),KEY);
  assert.deepEqual(savedAfter.entries.map(entry => entry.saved), savedBefore.entries.map(entry => entry.saved));
  assert.deepEqual(savedAfter.entries.map(entry => entry.draft), savedBefore.entries.map(entry => entry.draft));
  assert.equal(await creator.evaluate(() => localStorage.getItem('bone-appetit-visit-v1')), 'owner visit sentinel');
  await creator.locator('#collection-export').screenshot({ path: path.join(output,'creator-collection.png') });
  const checked = spawnSync('python3',[path.join(__dirname,'helpers/website-archive.py'),output],{encoding:'utf8',timeout:15000});assert.equal(checked.status,0,checked.stderr);
  const offline = await context({ offline:true }), page = await offline.newPage();
  await page.goto(pathToFileURL(path.join(output,'draft','index.html')).href);
  for (const [index,property] of manifest.properties.entries()) {
    if (index) await page.locator(`#property-switcher [data-property-link="${property.propertyId}"]`).click();
    await enhanced(page);
    assert.ok(new URL(page.url()).pathname.endsWith(property.href));
    assert.equal(await page.locator('#property-switcher [aria-current]').getAttribute('data-property-link'),property.propertyId);
    assert.equal(await page.locator('#hero-title').textContent(), index === 3 ? 'Draft annex' : `Draft haunt ${index}`);
    assert.deepEqual(await page.locator('#property-switcher a').allTextContents(),manifest.properties.map(property => property.name));
    await page.evaluate(async () => { for (const image of document.images) image.loading='eager'; await Promise.all([...document.images].map(image => image.decode())); await Promise.all([...document.fonts].map(face => face.load())); });
    await page.locator('[data-open-menu]').first().click(); assert.ok((await page.locator('#full-menu-items').innerText()).includes('$43.50'));
    await page.locator('#menu-dialog [data-close]').click();
    await page.locator('[data-attraction=pizzeria]').first().click(); await page.locator('#attraction-dialog [data-close]').click();
    await page.locator('[data-open-planner]').first().click(); await page.selectOption('#visit-guests',String(index+3));
    await page.locator('#planner-form [type=submit]').click(); await page.locator('#planner-dialog [data-close]').click();
    if (index===3) assert.equal(await page.locator('#visit-children').getAttribute('type'),'hidden');
    await page.setViewportSize({width:375,height:900});assert.ok(await page.evaluate(() => document.documentElement.scrollWidth<=innerWidth));
    if (index===3) {await page.evaluate(() => window.scrollTo(0,0));await page.screenshot({path:path.join(output,'collection-lodge-phone.png')});}
    await page.setViewportSize({width:1440,height:1000});
  }
  await page.locator(`.property-switcher-footer [data-property-link=bone-appetit]`).click();await enhanced(page);
  await page.locator('[data-open-planner]').first().click();assert.equal(await page.locator('#visit-guests').inputValue(),'3');
  await page.selectOption('#visit-guests','4');await page.locator('#planner-dialog [data-close]').click();
  page.once('dialog',dialog=>dialog.dismiss());await page.locator('#property-switcher [data-property-link=rest-in-pizza]').click();
  assert.ok(new URL(page.url()).pathname.endsWith('index.html'));
  const noJS = await context({offline:true,javaScriptEnabled:false}), fallback = await noJS.newPage();
  for (const [index,property] of manifest.properties.entries()) {
    if (!index) await fallback.goto(pathToFileURL(path.join(output,'draft','index.html')).href);
    else await fallback.locator(`.property-switcher-footer [data-property-link="${property.propertyId}"]`).click();
    assert.ok(await fallback.locator('#full-menu').isVisible());assert.equal(await fallback.locator('#full-menu [data-menu-id]').count(),index?18:24);
  }
  hostedServer = await startServer(output);const hosted = await context(), online = await hosted.newPage();
  await online.goto(hostedServer.origin+'/draft/index.html');
  for (const [index,property] of manifest.properties.entries()) {
    if(index)await online.locator(`#property-switcher [data-property-link="${property.propertyId}"]`).click();await enhanced(online);
    await online.locator('[data-open-planner]').first().click();await online.selectOption('#visit-guests',String(index+4));await online.locator('#planner-form [type=submit]').click();await online.locator('#planner-dialog [data-close]').click();
  }
  assert.equal(await online.evaluate(()=>Object.keys(localStorage).length),4);
  await online.locator('.property-switcher-footer [data-property-link=bone-appetit]').click();await enhanced(online);await online.locator('[data-open-planner]').first().click();assert.equal(await online.locator('#visit-guests').inputValue(),'4');
  await creator.fill('#menu-price','bad');await creator.locator('#download-collection').click();assert.ok((await creator.locator('#collection-status').innerText()).includes('Menu price'));await creator.fill('#menu-price','43.50');
  await creator.waitForFunction(() => /Draft recovered|Named version saved/.test(document.querySelector('#draft-state').textContent));
  const recovery = await creator.evaluate(key=>localStorage.getItem(key),KEY);
  const missing = JSON.parse(recovery);missing.entries=missing.entries.filter(entry=>entry.draft.reference.branding);missing.activeId=missing.entries[0].draft.id;
  await creator.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:KEY,raw:JSON.stringify(missing)});await creator.reload();await loaded(creator);
  assert.ok(await creator.locator('[data-collection-property=bone-appetit]').isDisabled());assert.ok(await creator.locator('#download-collection').isDisabled());
  await creator.evaluate(({key,raw})=>localStorage.setItem(key,raw),{key:KEY,raw:recovery});await creator.reload();await loaded(creator);await choose(creator);
  await creator.route('**/assets/fonts/dm-sans-600.ttf',route=>route.abort());await creator.locator('#download-collection').click();
  await creator.waitForFunction(()=>document.querySelector('#collection-status').textContent.startsWith('Could not export collection:'));await creator.unroute('**/assets/fonts/dm-sans-600.ttf');await download(creator,path.join(output,'retry.zip'));
  await creator.reload();await loaded(creator);await choose(creator);
  let release,started,finished,seen=false;const gate=new Promise(resolve=>release=resolve),requested=new Promise(resolve=>started=resolve),completed=new Promise(resolve=>finished=resolve);
  await creator.route('**/assets/boobies-lodge.svg',async route=>{seen=true;started();await gate;try{await route.continue();}finally{finished();}});
  const downloads=[];creator.on('download',file=>downloads.push(file.suggestedFilename()));let timeout;
  try{await creator.locator('#download-collection').click();await Promise.race([requested,new Promise((_,reject)=>timeout=setTimeout(()=>reject(new Error('Expected delayed collection resource.')),6000))]);await creator.fill('[data-copy=headline]','After collection edit');}
  finally{clearTimeout(timeout);release();if(seen)await completed;await creator.unroute('**/assets/boobies-lodge.svg');}
  await download(creator,path.join(output,'after-edit.zip'));assert.equal(downloads.length,1);
  extract(path.join(output,'after-edit.zip'),path.join(output,'after-edit'));assert.ok(fs.readFileSync(path.join(output,'after-edit','grave-expectations.html'),'utf8').includes('After collection edit'));
  await creator.route('**/website-collection.js',route=>route.abort());await creator.reload();await creator.locator('html.creator-ready').waitFor();await creator.waitForFunction(()=>!document.querySelector('#download-website').disabled);
  assert.ok(await creator.locator('#download-collection').isDisabled());assert.ok((await creator.locator('#collection-status').innerText()).includes('script is unavailable'));
  await creator.unroute('**/website-collection.js');await creator.reload();await loaded(creator);await choose(creator);
  await creator.setViewportSize({width:375,height:900});assert.ok(await creator.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(failedFiles,[]);
  console.log(`Collection browser pass passed: explicit duplicate/missing/named selection, linked draft/named ZIPs, four offline designs, menus/details/art/fonts, top/footer switching, independent file/hosted plans, no-JS fallback, unsaved-switch guard, narrow layouts, validation, resource retry, stale-build cancellation and script recovery.\nChromium ${browser.version()} · no page errors, external requests or failed file resources · artifacts: ${output}`);
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await server.stop();if(hostedServer)await hostedServer.stop();});
