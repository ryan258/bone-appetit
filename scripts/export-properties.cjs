// Produce portable examples without opening a browser or touching localStorage.
const fs = require('node:fs');
const path = require('node:path');
const { createModel } = require('../creator-model.js');
const { createCatalog } = require('../property-catalog.js');
const marketing = require('../marketing-pack.js');
async function exportProperties(directory) {
  const model = createModel(require('../site-data.json'));
  const catalog = createCatalog(model, require('../property-data.json'));
  const workspace = model.emptyWorkspace();
  fs.mkdirSync(directory, { recursive: true });
  for (const property of catalog.list) {
    const draft = catalog.create(property.id), entry = model.entryFor(draft);
    entry.saved = structuredClone(draft); workspace.entries.push(entry);
    const assets = Object.fromEntries(Object.entries(marketing.assetsFor(draft)).map(([key, file]) => [key, new Uint8Array(fs.readFileSync(path.resolve(__dirname, '..', file)))]));
    const pack = await marketing.createPack(model, draft, { sourceState: 'named' }, assets);
    const folder = path.join(directory, property.id);
    for (const file of pack.files) {
      const target = path.join(folder, file.name); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, file.bytes);
    }
    fs.writeFileSync(path.join(directory, property.id + '-marketing-pack.zip'), marketing.zip(pack.files));
  }
  workspace.activeId = workspace.entries[0].draft.id;
  fs.writeFileSync(path.join(directory, 'three-properties-backup.json'), model.backup(workspace));
  return { directory, workspace };
}
if (require.main === module) {
  const directory = process.argv[2];
  if (!directory) { console.error('Usage: node scripts/export-properties.cjs /absolute/output-directory'); process.exitCode = 1; }
  else if (!path.isAbsolute(directory)) { console.error('Choose an absolute output directory.'); process.exitCode = 1; }
  else if (fs.existsSync(directory)) { console.error('Choose a new output directory to keep existing exports.'); process.exitCode = 1; }
  else exportProperties(directory).then(result => console.log(`Three named property campaigns, backups and marketing packs written to ${result.directory}`)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { exportProperties };
