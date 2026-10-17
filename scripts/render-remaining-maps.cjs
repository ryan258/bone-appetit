// Exact source map conversion; normal page builds use the saved WebP files.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require('../tests/helpers/browser.cjs');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const [source, destination, width, height] of [
      ['grounds-map.svg', 'bone-grounds-map.webp', 760, 560],
      ['grave-expectations-map.svg', 'grave-grounds-map.webp', 960, 960]
    ]) {
      const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
      await page.goto(pathToFileURL(path.join(__dirname, '../assets', source)).href);
      const png = await page.locator('svg').screenshot();
      const target = path.join(__dirname, '../assets', destination);
      const converted = spawnSync(process.env.PYTHON || 'python3', ['-c', 'from PIL import Image;import sys;Image.open(sys.stdin.buffer).convert("RGB").save(sys.argv[1],"WEBP",lossless=True,method=6)', target], { input: png, timeout: 10000 });
      if (converted.status !== 0 || !fs.existsSync(target)) throw new Error(converted.stderr?.toString() || 'Map conversion failed.');
      await page.close();
    }
    console.log('Rendered both original maps as lossless WebP; original SVGs preserved.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
