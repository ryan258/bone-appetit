// Dependency preflight only: requiring this file never launches a browser.
const fs = require('node:fs');
const path = require('node:path');
const expected = require('../../package.json').devDependencies.playwright;
let chromium;
try {
  const installed = require('playwright/package.json').version;
  if (installed !== expected) throw new Error(`Expected Playwright ${expected}; found ${installed}.`);
  ({ chromium } = require('playwright'));
  if (!fs.existsSync(chromium.executablePath())) throw new Error('The pinned Chromium browser is not installed.');
} catch (error) {
  console.error(`Browser checks are not ready: ${error.message}\nFrom ${path.resolve(__dirname, '../..')}, run npm ci, then npm run browser:install. No browser was launched.`);
  process.exit(1);
}
if (require.main === module) console.log(`Playwright ${expected} and its pinned Chromium are available. No browser was launched.`);
module.exports = { chromium };
