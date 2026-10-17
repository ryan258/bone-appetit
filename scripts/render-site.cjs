// File adapter for the shared browser/Node restaurant renderer.
const fs = require('node:fs');
const path = require('node:path');
const website = require('../website-renderer.js');
const root = path.resolve(__dirname, '..');
const { ROUTES } = website;
function loadSites() {
  return website.validateSites(JSON.parse(fs.readFileSync(path.join(root, 'visitor-sites.json'), 'utf8')));
}
function render(data, template = fs.readFileSync(path.join(root, 'index.template.html'), 'utf8'), options = {}) {
  require('../planner.js').createPlanner(data);
  const imageFile = image => image.endsWith('.svg') ? image : image + '.webp';
  const assets = [...website.artAssets(data).map(asset => ['theme.art', asset]), ['theme.hero', website.heroAsset(data)], ['map.image', data.map.image],
    ...data.oddities.map((item, index) => [`oddities[${index}].image`, item.image]),
    ...data.featured.map((item, index) => [`featured[${index}].image`, imageFile(item.image)]),
    ...Object.entries(data.attractions).map(([key, item]) => [`attractions.${key}.image`, imageFile(item.image)]),
    ...(data.branding ? [['branding.hero', data.branding.hero]] : [])];
  for (const [field, asset] of assets) {
    if (!fs.existsSync(path.join(root, 'assets', asset))) throw new Error(`site-data.json: ${field}: missing local asset assets/${asset}.`);
  }
  return website.render(data, template, { sites: options.sites || loadSites(),
    mapSVG: fs.readFileSync(path.join(root, 'assets', data.map.image), 'utf8'),
    noteCSS: fs.readFileSync(path.join(root, 'field-notes.css'), 'utf8') });
}

function renderAll() {
  const sites = loadSites();
  const source = JSON.parse(fs.readFileSync(path.join(root, 'property-data.json'), 'utf8'));
  const canonical = JSON.parse(fs.readFileSync(path.join(root, 'site-data.json'), 'utf8'));
  if (source.version !== 1 || !Array.isArray(source.properties) || source.properties.length !== 3) throw new TypeError('property-data.json: expected three version 1 restaurant properties.');
  const properties = new Map();
  source.properties.forEach(property => {
    if (!Object.hasOwn(ROUTES, property.id) || property.id === 'bone-appetit' || properties.has(property.id) || property.reference?.branding?.propertyId !== property.id) throw new TypeError('property-data.json: property IDs and reference branding must match the three bundled sites.');
    properties.set(property.id, property.reference);
  });
  if (canonical.branding) throw new TypeError('site-data.json: the original Bone Appétit page must retain its original identity.');
  return sites.map(site => {
    const data = site.id === 'bone-appetit' ? canonical : properties.get(site.id);
    if (!data) throw new TypeError(`property-data.json: missing ${site.id}.`);
    return { filename: site.href, html: render(data, undefined, { sites }), data };
  });
}

if (require.main === module) {
  const temporary = [];
  try {
    // Render and validate every source before any delivery page can be replaced.
    const pages = renderAll();
    if (process.argv.includes('--validate')) console.log('All four restaurant profiles, content, schedules, assets and template are valid.');
    else if (process.argv.includes('--check')) {
      const stale = pages.filter(page => !fs.existsSync(path.join(root, page.filename)) || fs.readFileSync(path.join(root, page.filename), 'utf8') !== page.html);
      if (stale.length) {
        console.error(`${stale.map(page => page.filename).join(', ')} out of date. Run npm run build.`);
        process.exitCode = 1;
      } else console.log('All four generated restaurant pages match their sources and template.');
    } else {
      for (const page of pages) {
        const filename = path.join(root, `.${page.filename}.${process.pid}.tmp`);
        const fd = fs.openSync(filename, 'wx'); temporary.push(filename);
        try { fs.writeFileSync(fd, page.html); } finally { fs.closeSync(fd); }
      }
      pages.forEach((page, index) => fs.renameSync(temporary[index], path.join(root, page.filename)));
      console.log('Generated index.html and three restaurant websites.');
    }
  } catch (error) {
    console.error(error instanceof SyntaxError ? `Restaurant content: invalid JSON: ${error.message}` : error.message);
    process.exitCode = 1;
  } finally {
    for (const filename of temporary) if (fs.existsSync(filename)) fs.unlinkSync(filename);
  }
}
module.exports = { render, renderAll, loadSites };
