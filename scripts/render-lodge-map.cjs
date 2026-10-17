// Rasterize the exact source SVG through the same browser renderer as the visitor site.
// This is an explicit artwork build command, not part of normal page generation.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');
const { chromium } = require('../tests/helpers/browser.cjs');
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 960, height: 960 }, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(path.join(__dirname, '../assets/boobies-lodge-map.svg')).href);
    const png = await page.locator('svg').screenshot();
    const destination = path.join(__dirname, '../assets/lodge-grounds-map.webp');
    const result = spawnSync(process.env.PYTHON || 'python3', ['-c', 'from PIL import Image;import sys;Image.open(sys.stdin.buffer).convert("RGB").save(sys.argv[1],"WEBP",lossless=True,method=6)', destination], { input: png, timeout: 10000 });
    if (result.status !== 0) throw new Error(result.stderr?.toString() || 'Map conversion failed.');
    if (!fs.existsSync(destination)) throw new Error('Map output is missing.');
    console.log('Rendered the original six-location SVG as a lossless WebP; SVG source preserved.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
