// Theme identity and current-edition art across legacy campaign snapshots and exports.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createModel } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const website = require('../website-renderer.js');
const { renderAll, loadSites } = require('../scripts/render-site.cjs');
const single = require('../website-export.js');
const collection = require('../website-collection.js');
const marketing = require('../marketing-pack.js');
const model = createModel(require('../site-data.json'));
const catalog = createCatalog(model, require('../property-data.json'));
async function run() {
  const records = [model.newCampaign(), ...catalog.list.map(property => catalog.create(property.id))];
  const before = JSON.stringify(records), sites = loadSites();
  const options = { sites, sourceState: 'draft', generatedAt: '2026-10-16T23:00:00.000Z' };
  const prepared = collection.prepare(model, records, options);
  const assets = Object.fromEntries(prepared.paths.map(file => [file, new Uint8Array(fs.readFileSync(path.join(__dirname,'..',file)))]));
  const pack = await collection.createCollection(model, records, options, assets);
  const decode = name => new TextDecoder().decode(pack.files.find(file => file.name === name).bytes);
  for (const [index, record] of records.entries()) {
    const id = sites[index].id, art = website.heroAsset(record.reference);
    assert.ok(decode(sites[index].href).includes(`theme-${id}`));
    assert.ok(decode(sites[index].href).includes(`src="assets/${art}"`));
    assert.ok(pack.files.some(file => file.name === 'assets/' + art));
    assert.ok(decode('properties.css').includes(`.theme-${id}`));
    const individual = await single.createWebsite(model, record, options, assets);
    assert.ok(new TextDecoder().decode(individual.files.find(file => file.name === 'index.html').bytes).includes(`src="assets/${art}"`));
    const marketingAssets = Object.fromEntries(Object.entries(marketing.assetsFor(record)).map(([key,file]) => [key,new Uint8Array(fs.readFileSync(path.join(__dirname,'..',file)))]));
    const pieces = await marketing.createPack(model,record,{sourceState:'draft'},marketingAssets);
    const poster = new TextDecoder().decode(pieces.files.find(file => file.name === 'poster.html').bytes);
    assert.ok(poster.includes('data:image/webp;base64,'));
    if (index) {
      assert.ok(record.reference.branding.hero.endsWith('.svg'), 'Legacy reference remains unchanged and supported.');
      assert.equal(art, id + '-theme.webp');
      const bytes = fs.readFileSync(path.join(__dirname,'../assets',art));
      assert.equal(bytes.toString('ascii',0,4),'RIFF'); assert.equal(bytes.toString('ascii',8,12),'WEBP');
      assert.ok(bytes.length < 600000, 'Bound hero images for portable exports.');
    }
  }
  assert.equal(JSON.stringify(records),before);
  for (const page of renderAll()) assert.equal(page.html,fs.readFileSync(path.join(__dirname,'..',page.filename),'utf8'));
  console.log('Theme checks passed: four identities, three real WebP assets, unchanged legacy campaign references, coherent live/individual/collection/marketing art and generated pages.');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
