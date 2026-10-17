// Packages the complete static site for GitHub Pages or static hosting.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const website = require('../website-renderer.js');

const REQUIRED_FILES = [
  'index.html',
  'rest-in-pizza.html',
  'grave-expectations.html',
  'boobies-lodge.html',
  'creator.html',
  'index.template.html',
  'styles.css',
  'properties.css',
  'field-notes.css',
  'creator.css',
  'app.js',
  'content.js',
  'planner.js',
  'field-notes.js',
  'creator.js',
  'creator-model.js',
  'property-catalog.js',
  'marketing-pack.js',
  'marketing-workspace.js',
  'website-copy.js',
  'website-renderer.js',
  'website-workspace.js',
  'website-export.js',
  'site-data.json',
  'property-data.json',
  'visitor-sites.json'
];

function packageSite(targetDir = '_site') {
  const outDir = path.isAbsolute(targetDir) ? targetDir : path.join(root, targetDir);

  // Validate that all required files exist before starting
  for (const file of REQUIRED_FILES) {
    const src = path.join(root, file);
    if (!fs.existsSync(src)) {
      throw new Error(`package-site: missing required file ${file}`);
    }
  }

  const assetsSrc = path.join(root, 'assets');
  if (!fs.existsSync(assetsSrc)) {
    throw new Error('package-site: missing assets directory');
  }

  // Create clean target directory
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }
  fs.mkdirSync(outDir, { recursive: true });

  // Copy root files
  for (const file of REQUIRED_FILES) {
    const src = path.join(root, file);
    const dest = path.join(outDir, file);
    fs.copyFileSync(src, dest);
  }

  // Copy assets recursively
  const assetsDest = path.join(outDir, 'assets');
  fs.cpSync(assetsSrc, assetsDest, { recursive: true });

  // Create .nojekyll for GitHub Pages
  fs.writeFileSync(path.join(outDir, '.nojekyll'), '');

  // Integrity check: verify that all referenced scripts and stylesheets exist in destination
  for (const htmlFile of ['index.html', 'rest-in-pizza.html', 'grave-expectations.html', 'boobies-lodge.html', 'creator.html']) {
    const content = fs.readFileSync(path.join(outDir, htmlFile), 'utf8');
    const scripts = [...content.matchAll(/<script\s+src="([^"]+)"/g)].map(m => m[1]);
    const links = [...content.matchAll(/<link\s+[^>]*href="([^"]+)"/g)].map(m => m[1]);

    for (const ref of [...scripts, ...links]) {
      if (ref.startsWith('http:') || ref.startsWith('https:') || ref.startsWith('#')) continue;
      const refPath = path.join(outDir, ref.split('?')[0]);
      if (!fs.existsSync(refPath)) {
        throw new Error(`package-site: ${htmlFile} references missing resource ${ref}`);
      }
    }
  }

  const assetCount = fs.readdirSync(assetsDest, { recursive: true }).length;
  console.log(`Packaged static site into ${path.relative(root, outDir) || targetDir} (${REQUIRED_FILES.length} files, ${assetCount} assets, .nojekyll present).`);
}

if (require.main === module) {
  const target = process.argv[2] || '_site';
  packageSite(target);
}

module.exports = { packageSite, REQUIRED_FILES };
