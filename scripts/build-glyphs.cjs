// Build standalone property libraries from the same registry as the visitor sites.
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const glyphs = require('../property-glyphs.js');
const root = path.resolve(__dirname, '../assets/glyphs');
const names = { 'bone-appetit': 'Bone Appétit', 'rest-in-pizza': 'Rest in Pizza', 'grave-expectations': 'Grave Expectations', 'boobies-lodge': 'BooBies Lodge' };
const colors = { 'bone-appetit': '#42533b', 'rest-in-pizza': '#a02f24', 'grave-expectations': '#752b40', 'boobies-lodge': '#754021' };
const files = new Map();
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const hash = value => createHash('sha256').update(value).digest('hex');
const css = `body{margin:0;background:#fbf7ef;color:#292720;font:16px/1.5 system-ui,sans-serif}main{max-width:1200px;margin:auto;padding:32px 24px}h1{font-size:clamp(28px,5vw,44px);line-height:1.1}h2{color:var(--accent);margin-bottom:0}section{padding:18px 0 32px;border-top:1px solid #bdb5a9}nav{display:flex;flex-wrap:wrap;gap:12px 24px;margin:24px 0}ul{list-style:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(165px,1fr));gap:24px 16px}li{display:flex;align-items:flex-start;flex-direction:column;gap:8px}.glyph svg{width:40px;height:40px;color:var(--accent);margin:12px 0}small{color:#5e574e}a{color:inherit;text-underline-offset:3px}a:focus-visible{outline:3px solid var(--accent,#42533b);outline-offset:4px}code{overflow-wrap:anywhere}pre{white-space:pre-wrap;overflow-wrap:anywhere}.preview{display:block;max-width:100%;height:auto}.skip{position:absolute;left:-9999px}.skip:focus{position:static}`;
const document = (title, body, accent = '#42533b') => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><style>${css}</style></head><body style="--accent:${accent}"><a class="skip" href="#main">Skip to glyph library</a><main id="main">${body}</main></body></html>\n`;
const usage = `<section id="usage"><h2>Use a glyph</h2><p>Individual SVG files contain rounded strokes, a 24 × 24 viewBox and an accessible label. Use an empty alt attribute when placing a decorative glyph beside visible text. Inline symbols inherit the surrounding text color.</p><pre>&lt;svg viewBox="0 0 24 24" width="24" height="24" fill="none"
     stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
     stroke-linejoin="round" aria-hidden="true" focusable="false"&gt;
  &lt;use href="sprite.svg#PROPERTY-GLYPH-NAME"/&gt;
&lt;/svg&gt;</pre><p>External sprite references work on a static server. The restaurant sites embed the full property library to support offline file access. The visitor-information glyphs are design resources; their presence in this library does not assert any facility or service.</p></section>`;
const overviews = [];
for (const [id, library] of Object.entries(glyphs.LIBRARIES)) {
  const data = { branding: { propertyId: id } }, name = names[id], color = colors[id];
  const entries = [], sections = [], drawing = [];
  let y = 140;
  files.set(`${id}/sprite.svg`, glyphs.sprite(data) + '\n');
  for (const group of glyphs.GROUPS) {
    const cards = [];
    drawing.push(`<text x="32" y="${y - 20}" font-size="17" font-weight="700">${escape(group.label)} / ${group.roles.length}</text>`);
    for (const [index, role] of group.roles.entries()) {
      const glyph = library[role], content = glyphs.svg(glyph) + '\n';
      const x = 32 + (index % 8) * 146, cellY = y + Math.floor(index / 8) * 122;
      files.set(`${id}/${glyph.name}.svg`, content);
      entries.push({ role, group: group.id, id: glyph.id, name: glyph.name, label: glyph.label, file: `${glyph.name}.svg`, sha256: hash(content) });
      cards.push(`<li class="glyph">${glyphs.svg(glyph).replace(/role="img" aria-label="[^"]*"/, 'aria-hidden="true" focusable="false"')}<strong>${escape(glyph.label)}</strong><small>${role}</small><a href="${glyph.name}.svg" download>Download SVG</a></li>`);
      // Wrap labels at word boundaries so none cross into the adjacent cell.
      const words = glyph.label.split(' '), lines = [''];
      for (const word of words) {
        if (lines[lines.length - 1].length + word.length > 20) lines.push(word);
        else lines[lines.length - 1] += (lines[lines.length - 1] ? ' ' : '') + word;
      }
      drawing.push(`<g transform="translate(${x} ${cellY})" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g transform="scale(1.75)">${glyph.body}</g></g><text x="${x}" y="${cellY + 65}" font-size="12">${lines.map((line, lineIndex) => `<tspan x="${x}" dy="${lineIndex ? 15 : 0}">${escape(line)}</tspan>`).join('')}</text><text x="${x}" y="${cellY + 102}" font-size="10" fill="#5e574e">${role}</text>`);
    }
    sections.push(`<section id="${group.id}"><h2>${escape(group.label)} · ${group.roles.length}</h2><ul>${cards.join('')}</ul></section>`);
    y += Math.ceil(group.roles.length / 8) * 122 + 54;
  }
  const height = y + 10;
  const content = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${height}" viewBox="0 0 1200 ${height}" role="img" aria-label="${escape(name)} full 48 glyph library"><rect width="1200" height="${height}" fill="#fbf7ef"/><g font-family="Arial, sans-serif" fill="#292720"><text x="32" y="44" font-size="28" font-weight="700" fill="${color}">${escape(name)}</text><text x="32" y="78" font-size="15">48 ORIGINAL SVG GLYPHS / 24 × 24 GRID / SIX GROUPS</text>${drawing.join('')}</g></svg>\n`;
  files.set(`${id}/overview.svg`, content);
  files.set(`${id}/manifest.json`, JSON.stringify({ format: 'property-svg-glyph-library', version: 2, propertyId: id, name, count: entries.length, viewBox: '0 0 24 24', strokeWidth: 1.5, groups: glyphs.GROUPS, glyphs: entries }, null, 2) + '\n');
  files.set(`${id}/index.html`, document(`${name} · SVG glyph library`, `<h1>${escape(name)} glyph library</h1><p>48 property-specific drawings across six groups. Each glyph has its own property-prefixed symbol ID.</p><nav aria-label="Library downloads"><a href="sprite.svg" download>Symbol sprite</a><a href="overview.svg">Vector overview</a><a href="manifest.json" download>Coverage manifest</a></nav><nav aria-label="Glyph groups">${glyphs.GROUPS.map(group => `<a href="#${group.id}">${escape(group.label)}</a>`).join('')}</nav>${sections.join('')}${usage}`, color));
  overviews.push({ id, name, color, height, content });
}
// A full combined vector sheet, with independent property sheets for easier review.
let offset = 0;
const combined = [];
for (const overview of overviews) {
  combined.push(`<g transform="translate(0 ${offset})">${overview.content.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')}</g>`);
  offset += overview.height;
}
files.set('overview.svg', `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="${offset}" viewBox="0 0 1200 ${offset}" role="img" aria-label="All 192 property glyphs">${combined.join('')}</svg>\n`);
files.set('index.html', document('Four full restaurant SVG glyph libraries', `<h1>Four full glyph libraries.</h1><p>192 original drawings: 48 for each property. Every library covers the same six groups with its own drawings and symbol IDs.</p><nav aria-label="Choose a property">${overviews.map(item => `<a href="${item.id}/index.html">${escape(item.name)}</a>`).join('')}</nav>${overviews.map(item => `<section style="--accent:${item.color}"><h2>${escape(item.name)}</h2><p><a href="${item.id}/index.html">Browse all 48 glyphs</a> · <a href="${item.id}/sprite.svg" download>Symbol sprite</a> · <a href="${item.id}/manifest.json" download>Coverage manifest</a></p><a href="${item.id}/overview.svg"><img class="preview" src="${item.id}/overview.svg" width="1200" height="${item.height}" alt="Preview of all 48 ${escape(item.name)} glyphs" loading="lazy"></a></section>`).join('')}<section><h2>Maintain the libraries</h2><p>Source: <code>property-glyphs.js</code>. Run <code>npm run build:glyphs</code> to rebuild the reusable libraries or <code>npm run build</code> to rebuild the libraries and visitor pages. <code>npm run check:glyphs</code> checks role coverage, unique drawings, file drift and renderer/export integration.</p></section>`));
const stale = [];
for (const [name, content] of files) {
  const target = path.join(root, name);
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== content) stale.push(name);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}
// Unexpected stale SVGs are also drift; no silently orphaned glyphs in a library.
for (const id of Object.keys(glyphs.LIBRARIES)) {
  const dir = path.join(root, id);
  if (fs.existsSync(dir)) for (const name of fs.readdirSync(dir)) {
    if (/\.(svg|json|html)$/.test(name) && !files.has(`${id}/${name}`)) stale.push(`${id}/${name} (unexpected)`);
  }
}
if (stale.length) { console.error(`Glyph library drift: ${stale.join(', ')}.`); process.exitCode = 1; }
else console.log(`${process.argv.includes('--check') ? 'Checked' : 'Built'} four complete libraries: 192 individual SVGs, four sprites, four manifests, four property catalogs and vector overviews.`);
