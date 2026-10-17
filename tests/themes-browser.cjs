// One focused visual/theme pass, including legacy creator previews and offline exports.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require('./helpers/browser.cjs');
const { startServer } = require('./helpers/server.cjs');
const { createModel,KEY } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const { loadSites } = require('../scripts/render-site.cjs');
const { heroAsset } = require('../website-renderer.js');
const model=createModel(require('../site-data.json')),catalog=createCatalog(model,require('../property-data.json'));
const records=[model.newCampaign(),...catalog.list.map(property=>catalog.create(property.id))],sites=loadSites();
const workspace={version:1,activeId:records[0].id,entries:records.map(record=>({...model.entryFor(record),saved:structuredClone(record)}))};
const output=fs.mkdtempSync(path.join(os.tmpdir(),'bone-themes-browser-'));
const errors=[],external=[],failed=[];let browser,server;
async function session(options={}) {
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',...options});
  context.setDefaultTimeout(7000);context.setDefaultNavigationTimeout(10000);
  context.on('page',page=>{page.on('pageerror',error=>errors.push(error.message));page.on('requestfailed',request=>failed.push(request.url()));});
  await context.route('**/*',route=>{const url=route.request().url();if(/^https?:/.test(url)&&!url.startsWith(server.origin+'/')){external.push(url);return route.abort();}return route.continue();});
  return context;
}
async function art(page) {await page.evaluate(async()=>{for(const image of document.images)image.loading='eager';await Promise.all([...document.images].map(image=>image.decode()));await document.fonts.ready;});}
async function fingerprint(page) {return page.locator('body').evaluate(body=>{const css=getComputedStyle(body),h=getComputedStyle(document.querySelector('.hero h1'));return {ink:css.getPropertyValue('--ink').trim(),orange:css.getPropertyValue('--orange').trim(),font:h.fontFamily,hero:getComputedStyle(document.querySelector('.hero')).display};});}
async function contrast(page) {
  return page.evaluate(()=>{
    const rgb=value=>[...value.matchAll(/[\d.]+/g)].map(match=>Number(match[0]));
    const luminance=values=>values.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);
    const selectors=['.pizza-badge','.menu-tags span','.season-bar','.hero-footnote','.hero-caption','.hero-description','.pizza-card p','.food-note','.visitor-card dd','.visitor-card dt','.visitor-card dd span','.concept-notice','.access-note p','.last-call h2','.last-call p:not(.eyebrow)','.grounds-key p','.oddity-illustration > span'];
    return selectors.flatMap(selector=>{
      const el=document.querySelector(selector);if(!el)return[];const css=getComputedStyle(el);let parent=el,bg;
      while(parent){bg=rgb(getComputedStyle(parent).backgroundColor);if(bg.length===3||bg[3]>0.99)break;parent=parent.parentElement;}
      if(!parent)return[];const fg=rgb(css.color),a=luminance(fg),b=luminance(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
      const large=parseFloat(css.fontSize)>=24||(parseFloat(css.fontSize)>=18.66&&Number(css.fontWeight)>=700);
      return ratio<(large?3:4.5)?[{selector,ratio:ratio.toFixed(2),color:css.color,background:getComputedStyle(parent).backgroundColor}]:[];
    });
  });
}
async function download(page,selector,name) {const pending=page.waitForEvent('download');await page.locator(selector).click();const file=await pending.catch(async error=>{throw new Error(error.message+' '+await page.locator('#collection-status').innerText());});await file.saveAs(path.join(output,name));}
function extract(name,folder) {const result=spawnSync('python3',['-c','import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',path.join(output,name),path.join(output,folder)],{encoding:'utf8',timeout:10000});assert.equal(result.status,0,result.stderr);}
async function run() {
  server=await startServer();browser=await chromium.launch({headless:true});const context=await session(),page=await context.newPage();const styles=new Map();
  for(const [index,site] of sites.entries()) {
    await page.goto(server.origin+'/'+site.href);await page.locator('html.enhanced').waitFor();await art(page);
    assert.ok((await page.locator('body').getAttribute('class')).includes('theme-'+site.id));
    assert.ok((await page.locator('.hero-image').getAttribute('src')).endsWith(heroAsset(records[index].reference)));
    styles.set(site.id,await fingerprint(page));
    assert.deepEqual(await contrast(page),[],site.id+' themed text contrast');
    for(const width of [1440,768,375]) {
      await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),site.id+' '+width+' reflow');
      await page.evaluate(()=>window.scrollTo(0,0));if(width!==768)await page.screenshot({path:path.join(output,site.id+'-'+width+'.png')});
      if(width===375){await page.locator('.nav-toggle').click();assert.equal(await page.locator('.nav-toggle').getAttribute('aria-expanded'),'true');await page.locator('#main-nav a').first().click();}
    }
    await page.setViewportSize({width:1440,height:1000});
    for(const section of ['#menu','#story','#visit','#access'])await page.locator(section).screenshot({path:path.join(output,site.id+'-'+section.slice(1)+'.png')});
    await page.locator('[data-open-menu]').first().click();for(const category of Object.keys(records[index].reference.menu)){await page.locator(`[data-filter="${category}"]`).click();assert.equal(await page.locator('#full-menu-items article').count(),records[index].reference.menu[category].length);}await page.keyboard.press('Escape');
    await page.locator('[data-attraction=pizzeria]').first().click();await page.keyboard.press('Escape');await page.locator('[data-open-planner]').first().click();await page.selectOption('#visit-guests','4');await page.locator('#planner-form [type=submit]').click();await page.keyboard.press('Escape');
  }
  assert.equal(new Set([...styles.values()].map(style=>style.ink+'|'+style.orange+'|'+style.font+'|'+style.hero)).size,4);
  await context.addInitScript(({raw,key})=>{if(location.protocol==='http:'&&!localStorage.getItem(key))localStorage.setItem(key,raw);},{raw:model.serialize(workspace),key:KEY});
  await page.goto(server.origin+'/creator.html');await page.locator('html.creator-ready').waitFor();await page.waitForFunction(()=>!document.querySelector('#preview-website').disabled);
  for(const [index,record] of records.entries()) {
    await page.locator(`[data-campaign-id="${record.id}"]`).click();await page.locator('#preview-website').click();await page.waitForFunction(()=>document.querySelector('#website-status').textContent.startsWith('Full website ready.'));
    assert.ok((await page.locator('.creator-preview-image').getAttribute('src')).endsWith(heroAsset(record.reference)));
    const frame=await(await page.locator('#website-preview').elementHandle()).contentFrame();assert.deepEqual(await fingerprint(frame),styles.get(sites[index].id));
  }
  await page.locator('#build-pack').click();await page.locator('#pack-results').waitFor();await page.selectOption('#pack-piece','poster');
  const poster=page.frameLocator('#pack-preview');assert.ok((await poster.locator('img.hero').getAttribute('src')).startsWith('data:image/webp;base64,'));await poster.locator('img.hero').evaluate(image=>image.decode());
  await download(page,'#download-collection','collection.zip');extract('collection.zip','collection');
  const offline=await session({offline:true}),local=await offline.newPage();
  await local.goto(pathToFileURL(path.join(output,'collection/index.html')).href);
  for(const [index,site] of sites.entries()) {
    if(index)await local.locator(`#property-switcher [data-property-link="${site.id}"]`).click();await local.locator('html.enhanced').waitFor();await art(local);assert.deepEqual(await fingerprint(local),styles.get(site.id));assert.deepEqual(await contrast(local),[]);
  }
  await page.locator(`[data-campaign-id="${records[1].id}"]`).click();await download(page,'#download-website','pizza.zip');extract('pizza.zip','pizza');await local.goto(pathToFileURL(path.join(output,'pizza/index.html')).href);await local.locator('html.enhanced').waitFor();await art(local);assert.deepEqual(await fingerprint(local),styles.get('rest-in-pizza'));
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(failed,[]);
  console.log(`Theme browser pass passed: four distinct live designs at 1440/768/375px, loaded art/fonts, representative text contrast, menu/details/planner, legacy creator previews, WebP marketing poster and matching offline collection/individual exports.\nChromium ${browser.version()} · no page errors, external requests or failed resources · artifacts: ${output}`);
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();if(server)await server.stop();});
