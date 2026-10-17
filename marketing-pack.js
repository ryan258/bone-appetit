/* Snapshot-based marketing copy, offline documents and ZIPs. No DOM or packages. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./planner.js'), require('./website-renderer.js'));
  else root.BoneMarketing = factory(root.BonePlanner, root.BoneWebsite);
})(typeof globalThis === 'object' ? globalThis : this, function(plannerAPI, website) {
  'use strict';
  const ASSETS = Object.freeze({
    serif: 'assets/fonts/fraunces-700.ttf',
    sans: 'assets/fonts/dm-sans-400.ttf',
    label: 'assets/fonts/barlow-condensed-700.ttf',
    hero: 'assets/haunted-roadhouse.webp',
    logo: 'assets/bone-appetit-logo.webp',
    'food-witchs-cauldron': 'assets/bone-witchs-cauldron-food.webp',
    'food-headless-horseman': 'assets/bone-headless-horseman-food.webp',
    'food-poltergeist-pepperoni': 'assets/bone-poltergeist-pepperoni-food.webp',
    serifLicense: 'assets/fonts/OFL-Fraunces.txt',
    sansLicense: 'assets/fonts/OFL-DM-Sans.txt',
    labelLicense: 'assets/fonts/OFL-Barlow-Condensed.txt'
  });
  const TITLES = Object.freeze({ landing: 'Landing copy', 'menu-insert': 'Menu insert', 'social-copy': 'Social copy', 'email-draft': 'Email draft', poster: 'Poster', 'review-summary': 'Review summary' });
  const assetsFor = record => ({
    ...Object.fromEntries(Object.entries(ASSETS).filter(([key]) => !key.startsWith('food-'))),
    hero: 'assets/' + website.heroAsset(record.reference), logo: 'assets/' + website.logoAsset(record.reference),
    ...Object.fromEntries(Object.entries(website.RESTAURANT_ART[record.reference.branding?.propertyId || 'bone-appetit'].food).map(([id, art]) => ['food-' + id, 'assets/' + art.asset]))
  });
  const FICTION = 'Fictional restaurant campaign. Concept dates, prices and facilities; no booking, purchase or subscription is offered.';
  const encode = text => new TextEncoder().encode(text);
  const escape = text => String(text).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const fail = message => { throw new TypeError(message); };
  function base64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  }
  const dataURL = (bytes, mime) => `data:${mime};base64,${base64(bytes)}`;
  const digest = async value => [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', typeof value === 'string' ? encode(value) : value))].map(byte => byte.toString(16).padStart(2, '0')).join('');

  function prepare(model, record, options = {}) {
    if (!['draft', 'named'].includes(options.sourceState)) fail('Choose the current draft or a named version as the pack source.');
    const source = structuredClone(record);
    const data = model.materialize(source), planner = plannerAPI.createPlanner(data);
    // Poster copy needs an honest size boundary. Never silently truncate a brief.
    for (const [label, value, max] of [
      ['Offer in the brief', source.brief.offer, 240], ['Headline', source.copy.headline, 100],
      ['Venue name', data.name, 80], ['Action label', source.copy.actionLabel, 60]
    ]) {
      if (!value.trim() || value.length > max) fail(`${label} needs 1–${max} characters for the printed pack. Edit it in the campaign, then build again.`);
    }
    const allItems = Object.entries(data.menu).flatMap(([category, items]) => items.map(item => ({ ...item, category })));
    const menuIds = options.menuIds || source.reference.featured.slice(0, 3).map(item => item.id);
    if (!Array.isArray(menuIds) || menuIds.length < 1 || menuIds.length > 4 || new Set(menuIds).size !== menuIds.length) fail('Choose one to four different menu items for the insert.');
    const items = menuIds.map(id => allItems.find(item => item.id === id) || fail('A selected menu item is unavailable in this source.'));
    const attractionId = options.attractionId || 'hollow';
    if (!Object.hasOwn(data.attractions, attractionId)) fail('Choose an attraction available in this source.');
    const attraction = data.attractions[attractionId];
    const generatedAt = options.generatedAt || new Date().toISOString();
    if (typeof generatedAt !== 'string' || !Number.isFinite(Date.parse(generatedAt)) || new Date(generatedAt).toISOString() !== generatedAt) fail('Pack generation date must be an ISO timestamp.');
    const brief = source.brief;
    const reviewDate = planner.todayValue(new Date(generatedAt));
    const campaignDates = brief.startsOn || brief.endsOn ? `${brief.startsOn || 'Start not supplied'} → ${brief.endsOn || 'End not supplied'}` : 'Campaign dates not supplied';
    const facts = {
      venue: data.name, headline: source.copy.headline, introduction: source.copy.introduction,
      offer: brief.offer, action: source.copy.actionLabel, cta: brief.callToAction.trim() || source.copy.actionLabel,
      campaignDates, season: planner.seasonRange(), hours: planner.hoursLabel(), closing: planner.closingLabel(),
      timezone: data.season.timezone, address: `${data.address.street}, ${data.address.district} (fictional address)`,
      attractionTitle: attraction.title, attractionCopy: planner.copy(attraction.description),
      attractionFacts: planner.attractionFacts(attractionId).map(([key, value]) => `${key}: ${value}`).join(' · '),
      items: items.map(item => ({ ...item, priceLabel: planner.money(item.price), categoryLabel: data.menuCategories[item.category] }))
    };
    const issues = [];
    for (const key of ['audience', 'objective', 'occasion', 'callToAction', 'tone', 'channels', 'boundaries', 'startsOn', 'endsOn']) {
      if (!brief[key].trim()) issues.push(`Brief ${key}: not supplied${key === 'callToAction' ? '; the action label is used instead' : ''}.`);
    }
    if ([brief.startsOn, brief.endsOn].some(date => date && (date < data.season.start || date > data.season.end))) issues.push('Campaign dates extend outside the fixed venue season. Confirm the intended promotion window.');
    if (reviewDate > data.season.end) issues.push('The fixed venue season is in the past. These assets describe an archived concept.');
    if (brief.endsOn && reviewDate > brief.endsOn) issues.push('The campaign end date is in the past. Confirm whether this is an archive or a new brief is needed.');
    issues.push('Human review required: confirm that the offer, dates, wording, and intended audience agree. Free-text claims are not fact-checked.');
    issues.push('Confirm ingredients, dietary tags, prices, artwork relevance, access and sensory claims against the edited copy. Reference tags and artwork do not change when copy is edited.');
    issues.push('Supply an approved destination URL, sender, recipient list, consent and unsubscribe details in your publishing tool before any real use. No destination or email addresses have been invented.');
    issues.push('Check channel lengths, line breaks, contrast and print pagination before use. Social drafts are editorial copy, not platform-specific ads.');
    return { source, sourceState: options.sourceState, generatedAt, menuIds: [...menuIds], attractionId, data, facts, issues };
  }

  function emailMessage(subject, body) {
    // RFC 2047 encoded words: fold between UTF-8 code points, not bytes.
    const chunks = []; let chunk = '';
    for (const character of subject.replace(/[\r\n\t]+/g, ' ')) {
      if (encode(chunk + character).length > 42) { chunks.push(chunk); chunk = ''; }
      chunk += character;
    }
    if (chunk) chunks.push(chunk);
    const header = chunks.map(part => `=?UTF-8?B?${base64(encode(part))}?=`).join('\r\n ');
    const payload = base64(encode(body.replace(/\r?\n/g, '\r\n'))).match(/.{1,76}/g)?.join('\r\n') || '';
    return `Subject: ${header}\r\nX-Unsent: 1\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${payload}\r\n`;
  }

  function styles(assets) {
    return `@font-face{font-family:Fraunces;src:url('${dataURL(assets.serif, 'font/ttf')}')}@font-face{font-family:DM;src:url('${dataURL(assets.sans, 'font/ttf')}')}@font-face{font-family:Barlow;src:url('${dataURL(assets.label, 'font/ttf')}')}
* {
  box-sizing:border-box;
}
html {
  color-scheme:light;
}
body {
  margin:0;
  background:#181c17;
  color:#181c17;
  font:16px/1.65 DM,Arial,sans-serif;
}
main {
  max-width:900px;
  margin:32px auto;
  background:#e8dfc7;
  padding:40px;
  overflow-wrap:anywhere;
}
h1,h2,h3 {
  font-family:Fraunces,Georgia,serif;
  line-height:1.15;
}
h1 {
  font-size:44px;
  white-space:pre-line;
  margin:16px 0 24px;
}
h2 {
  font-size:27px;
  margin:28px 0 14px;
}
h3 {
  font-size:21px;
  margin:0 0 12px;
}
p {
  white-space:pre-line;
  margin:12px 0;
}
a {
  color:inherit;
  text-underline-offset:4px;
}
a:focus-visible {
  outline:3px solid #803c21;
  outline-offset:4px;
}
.eyebrow,.brand,.tag {
  font-family:Barlow,'Arial Narrow',sans-serif;
  letter-spacing:.08em;
}
.eyebrow {
  color:#753d26;
}
.brand {
  font-size:24px;
  display:flex;
  align-items:center;
  gap:16px;
  line-height:1.3;
}
.brand img {
  width:64px;
  height:64px;
  object-fit:contain;
  flex-shrink:0;
}
.menu-food {
  display:block;
  width:100%;
  height:200px;
  object-fit:cover;
  margin-bottom:16px;
}
.menu-insert .menu-food {
  float:right;
  width:110px;
  height:74px;
  margin:0 0 10px 16px;
}
.card::after {
  content:'';
  display:table;
  clear:both;
}
.hero {
  width:100%;
  height:260px;
  object-fit:cover;
  border-radius:3px;
}
.action {
  display:inline-block;
  padding:12px 20px;
  background:#181c17;
  color:#f2e9cf;
  font-weight:bold;
  border-radius:3px;
}
.offer {
  font-size:20px;
}
.facts,.notice {
  border-block:1px solid #949681;
  padding:16px 0;
  margin:24px 0;
  font-size:14px;
}
.fiction {
  font:14px/1.5 DM,Arial,sans-serif;
  border-top:1px solid #949681;
  padding-top:16px;
  margin-top:28px;
}
.card {
  padding:20px 0;
  border-top:1px solid #949681;
  break-inside:avoid;
}
.item-title {
  display:flex;
  justify-content:space-between;
  gap:20px;
  align-items:baseline;
}
.price {
  white-space:nowrap;
  font-weight:bold;
}
.tag {
  font-size:14px;
}
.copy {
  white-space:pre-wrap;
}
.meta {
  font-size:14px;
}
li {
  margin-bottom:10px;
}
.poster {
  max-width:7.7in;
  min-height:10in;
  padding:30px;
  border:10px double #181c17;
}
.poster h1 {
  font-size:52px;
  line-height:1.08;
}
.poster .hero {
  height:2.2in;
}
.poster .facts {
  margin:18px 0;
}
.poster .fiction {
  font-size:12px;
}
.menu-insert {
  max-width:7.7in;
}
.menu-insert h1 {
  font-size:36px;
}
.menu-insert .card {
  padding:14px 0;
}
.menu-insert .offer {
  font-size:17px;
}
.menu-insert .facts {
  margin:16px 0;
  padding:10px 0;
}
.menu-insert .fiction {
  font-size:12px;
}
.menu-insert h3 {
  font-size:20px;
}
.menu-insert .card p {
  margin:6px 0;
}
@media(max-width:600px) {
  main {
    margin:0;
    padding:24px;
  }
  h1 {
    font-size:34px;
  }
  .poster {
    padding:20px;
    border-width:6px;
  }
  .poster h1 {
    font-size:40px;
  }
  .hero {
    height:200px;
  }
  .item-title {
    flex-wrap:wrap;
    gap:6px;
  }
  .poster .hero {
    height:180px;
  }
}
@page {
  size:letter;
  margin:.4in;
}
@media print {
  body {
    background:white;
  }
  main {
    margin:0;
    max-width:none;
    padding:0;
    background:white;
  }
  .poster {
    width:100%;
    min-height:0;
    padding:20px;
  }
  .poster h1 {
    font-size:38pt;
  }
  .poster .hero {
    height:2in;
  }
  .poster .offer {
    font-size:14pt;
  }
  .poster .facts {
    font-size:10pt;
  }
  .poster .fiction {
    font-size:9pt;
  }
  .action {
    background:white;
    color:#181c17;
    border:1px solid #181c17;
  }
  .menu-insert {
    font-size:11pt;
    line-height:1.5;
  }
  .menu-insert h1 {
    font-size:26pt;
  }
  .menu-insert .brand {
    margin:4px 0 10px;
  }
  .menu-insert .brand img {
    width:48px;
    height:48px;
  }
  .menu-insert .card {
    padding:12px 0;
  }
  .menu-insert .meta {
    font-size:9pt;
    margin:6px 0;
  }
  .menu-insert .offer {
    font-size:12pt;
  }
  .menu-insert .facts {
    font-size:10pt;
  }
  .menu-insert .fiction {
    font-size:9pt;
  }
  h1,h2,h3 {
    break-after:avoid;
  }
  img {
    break-inside:avoid;
  }
  .facts,.fiction {
    break-inside:avoid;
  }
  a {
    color:inherit;
  }
  .hero {
    height:2in;
  }
}
`;
  }

  async function createPack(model, record, options, assets) {
    const pack = prepare(model, record, options), { source, facts: f, data } = pack;
    for (const key of Object.keys(assetsFor(source))) {
      if (!(assets?.[key] instanceof Uint8Array) || !assets[key].length || assets[key].length > 2 * 1024 * 1024) fail(`The bundled ${key} asset is unavailable or too large. Retry loading the pack.`);
    }
    const css = styles(assets), p = value => `<p>${escape(value)}</p>`;
    // Individual HTML downloads distribute embedded fonts too. Keep their full
    // licenses in a non-rendering comment as well as the ZIP's license files.
    const licenses = ['serifLicense', 'sansLicense', 'labelLicense'].map(key => `${ASSETS[key]}\n${new TextDecoder().decode(assets[key])}`).join('\n\n').replaceAll('--', '- -');
    const factsText = `Concept venue season: ${f.season}\n${f.hours} · ${f.timezone}\n${f.closing}\n${f.address}${data.disclosures.admission ? '\n' + data.disclosures.admission : ''}`;
    const factsHTML = `<div class="facts">${p(factsText)}</div>`;
    const fictionHTML = `<footer class="fiction">${escape(FICTION)}</footer>`;
    const hero = `<img class="hero" src="${dataURL(assets.hero, assetsFor(source).hero.endsWith('.svg') ? 'image/svg+xml' : 'image/webp')}" alt="${escape(website.heroAlt(data))}">`;
    const headline = `<h1>${escape(f.headline)}</h1>`;
    const offer = `<p class="offer">${escape(f.offer)}</p>`;
    const brand = `<p class="brand"><img src="${dataURL(assets.logo, 'image/webp')}" alt="" width="64" height="64"><span>${escape(f.venue)}</span></p>`;
    const doc = (key, body) => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><!-- Bundled font licenses\n${licenses}\n--><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>${escape(TITLES[key] || 'Marketing pack')} — ${escape(f.venue)}</title><style>${css}</style></head><body><main class="${escape(key)}">${body}${fictionHTML}</main></body></html>\n`;
    const menuText = f.items.map(item => `${item.name} — ${item.priceLabel} USD\n${item.categoryLabel}${item.tags.length ? ' · ' + item.tags.join(' · ') : ''}\n${item.description}`).join('\n\n');
    const menuHTML = f.items.map(item => {
      const art = website.foodArt(data, item.id);
      const image = art ? `<img class="menu-food" src="${dataURL(assets['food-' + item.id], 'image/webp')}" alt="${escape(art.alt)}" width="720" height="480">` : '';
      return `<article class="card">${image}<div class="item-title"><h3>${escape(item.name)}</h3><span class="price">${escape(item.priceLabel)} USD</span></div><p class="tag">${escape(item.categoryLabel)}${item.tags.length ? ' · ' + escape(item.tags.join(' · ')) : ''}</p>${p(item.description)}</article>`;
    }).join('') + '<p class="meta">AI-created concept food imagery. Illustrative plating; review against edited ingredients.</p>';
    const cta = p(f.cta) + `<p class="action">${escape(f.action)}</p>`;
    const landingText = `${f.venue}\n\n${f.headline}\n\n${f.introduction}\n\n${f.offer}\n\n${f.attractionTitle}\n${f.attractionCopy}\n${f.attractionFacts}\n\nFeatured menu\n${menuText}\n\n${data.disclosures.menu}\n\n${factsText}\n\n${data.disclosures.access}\n${data.disclosures.sensory}\n${data.disclosures.weather}\n\n${f.cta}\n${f.action}\n\n${FICTION}`;
    const menuCopy = `${f.venue}\n${f.headline}\n\n${f.offer}\n\n${menuText}\n\n${data.disclosures.menu}\n\n${factsText}\n\n${f.cta}\n${FICTION}`;
    const socialPosts = [
      `${f.venue}\n${f.headline}\n\n${f.introduction}\n\n${f.offer}\n${f.cta}\n\n${factsText}\n\n${FICTION}`,
      `${f.venue} — ${f.items[0].name}\n${f.items[0].description}\n${f.items[0].priceLabel} USD${f.items[0].tags.length ? ' · ' + f.items[0].tags.join(' · ') : ''}\n\n${f.offer}\n${f.cta}\n\n${factsText}\n\n${data.disclosures.menu}\n${FICTION}`,
      `${f.venue} — ${f.attractionTitle}\n${f.attractionCopy}\n${f.attractionFacts}\n\n${f.offer}\n${f.cta}\n\n${factsText}\n\n${data.disclosures.sensory}\n${data.disclosures.weather}\n${FICTION}`
    ];
    const socialLabels = ['Destination introduction', 'Featured menu item', 'Attraction spotlight'];
    const socialText = socialPosts.map((post, index) => `${socialLabels[index]} (${Array.from(post).length} characters)\n\n${post}`).join('\n\n———\n\n');
    const subject = `${f.venue}: ${f.headline.replace(/\s+/g, ' ').trim()}`;
    const emailBody = `${f.headline}\n\n${f.introduction}\n\n${f.offer}\n\nFrom the menu\n${menuText}\n\n${f.attractionTitle}\n${f.attractionCopy}\n\n${factsText}\n\n${f.cta}\n\n${data.disclosures.menu}\n${data.disclosures.sensory}\n${data.disclosures.weather}\n\n${FICTION}`;
    const emailText = `Subject: ${subject}\nPreheader: ${f.offer.replace(/\s+/g, ' ')}\n\n${emailBody}`;
    const posterText = `${f.venue}\n\n${f.headline}\n\n${f.offer}\n\n${factsText}\n\n${f.action}\n\n${FICTION}`;
    const sourceHash = await digest(JSON.stringify(source));
    const briefText = Object.entries(source.brief).map(([key, value]) => `${key}: ${value || 'Not supplied'}`).join('\n');
    const reviewText = `REVIEW REQUIRED — NOT APPROVED OR PUBLISHED\n\nCampaign: ${source.name}\nSource: ${pack.sourceState === 'named' ? 'Last named version' : 'Current draft'}\nCampaign ID: ${source.id}\nSource edited: ${source.updatedAt}\nGenerated: ${pack.generatedAt}\nSource SHA-256: ${sourceHash}\n\nBrief\n${briefText}\n\nCampaign window: ${f.campaignDates}\n${factsText}\n\nCommon offer\n${f.offer}\nCommon CTA\n${f.cta}\nAction label: ${f.action}\n\nSelected menu\n${menuText}\n\nAttraction spotlight\n${f.attractionTitle}\n${f.attractionCopy}\n${f.attractionFacts}\n\nStructural validation passed: campaign content, prices, fixed venue schedule and selected items. This does not verify free-text claims or grant approval.\n\nReview actions\n${pack.issues.map(item => '• ' + item).join('\n')}\n\nSocial character counts (Unicode code points, including disclosures): ${socialPosts.map(post => Array.from(post).length).join(', ')}.\n\nPrint: menu insert and poster use US Letter with 0.4-inch margins, no bleed. Browser print / Save as PDF is available through your print dialog. Long menu copy can flow to additional pages; inspect pagination.\nEmail: plain-text .eml draft with no sender or recipients. Import behavior depends on your mail editor; a .txt fallback is supplied. No email was sent.\n\nResume: import campaign.json into the creator workspace. It adds a copy of this exact source; other campaigns and any later draft are not included.\nIntegrity: manifest.json lists file sizes and SHA-256 hashes. It detects accidental changes; it is not an approval or signature.\nArt and fonts: existing bundled illustration and fonts; licenses are in licenses/. No remote assets or scripts are required.\n\n${FICTION}`;
    const files = [];
    const add = (name, content) => files.push({ name, bytes: encode(content) });
    add('landing.html', doc('landing', brand + hero + headline + p(f.introduction) + offer + cta + `<section id="campaign-details"><h2>${escape(f.attractionTitle)}</h2>${p(f.attractionCopy)}${p(f.attractionFacts)}</section><h2>From the menu</h2>${menuHTML}${p(data.disclosures.menu)}${factsHTML}${p(data.disclosures.access)}${p(data.disclosures.sensory)}${p(data.disclosures.weather)}`));
    add('landing.txt', landingText);
    add('menu-insert.html', doc('menu-insert', brand + headline + offer + menuHTML + p(data.disclosures.menu) + factsHTML + cta));
    add('menu-insert.txt', menuCopy);
    add('social-copy.html', doc('social-copy', brand + '<h1>Words for the feed.</h1>' + socialPosts.map((post, index) => `<article class="card"><h2>${socialLabels[index]}</h2><p class="meta">${Array.from(post).length} characters · editorial draft</p><div class="copy">${escape(post)}</div></article>`).join('')));
    add('social-copy.txt', socialText);
    add('email-draft.html', doc('email-draft', brand + '<h1>An invitation, pending.</h1>' + p(`Subject: ${subject}`) + p(`Preheader: ${f.offer}`) + '<p class="notice">Draft only. Add approved sender, recipients, destination and unsubscribe details in your mail editor.</p>' + `<div class="copy">${escape(emailBody)}</div>`));
    add('email-draft.txt', emailText);
    add('email-draft.eml', emailMessage(subject, emailBody));
    add('poster.html', doc('poster', brand + hero + headline + offer + factsHTML + `<p class="action">${escape(f.action)}</p>`));
    add('poster.txt', posterText);
    add('review-summary.html', doc('review-summary', brand + '<h1>The ledger of loose ends.</h1>' + `<div class="copy">${escape(reviewText)}</div>`));
    add('review-summary.txt', reviewText);
    const entry = model.entryFor(structuredClone(source));
    if (pack.sourceState === 'named') entry.saved = structuredClone(source);
    add('campaign.json', model.backup({ version: 1, activeId: source.id, entries: [entry] }));
    add('index.html', doc('index', brand + '<p class="eyebrow">DEPARTMENT OF PUBLIC APPEARANCES</p><h1>A campaign, properly packed.</h1>' + p(source.name) + p(`Source: ${pack.sourceState} · ${pack.generatedAt}`) + '<p>Start with the review summary. These are editable fictional drafts, awaiting human review. Open an HTML file to read or print; use its text companion to edit copy. Nothing has been published.</p><ul>' + Object.entries(TITLES).map(([key, title]) => `<li><a href="${key}.html">${title}</a> · <a href="${key}.txt">Plain text</a>${key === 'email-draft' ? ' · <a href="email-draft.eml">Email draft (.eml)</a>' : ''}</li>`).join('') + '</ul><p><a href="campaign.json">Source campaign backup</a> · <a href="manifest.json">Integrity manifest</a></p><p>The source backup can be imported into the creator workspace. Fonts and artwork are embedded in each HTML file, so individual pieces work offline. The menu and poster use Letter print styles; review pagination in your print dialog.</p>'));
    for (const key of ['serifLicense', 'sansLicense', 'labelLicense']) files.push({ name: 'licenses/' + ASSETS[key].split('/').pop(), bytes: assets[key] });
    const manifest = {
      format: 'bone-appetit-marketing-pack', version: 1, generatedAt: pack.generatedAt,
      campaign: { id: source.id, name: source.name, sourceState: pack.sourceState, updatedAt: source.updatedAt, sha256: sourceHash, ...(data.branding ? { propertyId: data.branding.propertyId } : {}) },
      selection: { menuIds: pack.menuIds, attractionId: pack.attractionId },
      reviewStatus: 'human-review-required', issues: pack.issues,
      files: await Promise.all(files.map(async file => ({ name: file.name, bytes: file.bytes.length, sha256: await digest(file.bytes) })))
    };
    add('manifest.json', JSON.stringify(manifest, null, 2));
    return { files, manifest, title: source.name, sourceState: pack.sourceState };
  }

  const crcTable = Array.from({ length: 256 }, (_, index) => {
    let value = index;
    for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    return value >>> 0;
  });
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
  }
  function zip(files) {
    if (!Array.isArray(files) || !files.length || files.length > 256) fail('A pack needs 1–256 files.');
    const parts = [], central = [], names = new Set(); let offset = 0, centralSize = 0;
    function header(size, signature) { const bytes = new Uint8Array(size); const view = new DataView(bytes.buffer); view.setUint32(0, signature, true); return { bytes, view }; }
    for (const file of files) {
      if (!/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.[a-zA-Z0-9]+$/.test(file.name) || names.has(file.name)) fail('Pack filenames must be safe, unique relative paths.');
      if (!(file.bytes instanceof Uint8Array) || file.bytes.length > 16 * 1024 * 1024) fail('A pack file is invalid or larger than 16 MiB.');
      names.add(file.name);
      const name = encode(file.name), crc = crc32(file.bytes), size = file.bytes.length;
      if (name.length > 65535) fail('A ZIP filename is too long.');
      const local = header(30, 0x04034b50), dir = header(46, 0x02014b50);
      local.view.setUint16(4, 20, true); local.view.setUint16(6, 0x800, true);
      local.view.setUint16(12, 33, true); // Deterministic ZIP timestamp: 1980-01-01.
      local.view.setUint32(14, crc, true); local.view.setUint32(18, size, true); local.view.setUint32(22, size, true); local.view.setUint16(26, name.length, true);
      dir.view.setUint16(4, 20, true); dir.view.setUint16(6, 20, true); dir.view.setUint16(8, 0x800, true); dir.view.setUint16(14, 33, true);
      dir.view.setUint32(16, crc, true); dir.view.setUint32(20, size, true); dir.view.setUint32(24, size, true); dir.view.setUint16(28, name.length, true); dir.view.setUint32(42, offset, true);
      parts.push(local.bytes, name, file.bytes); central.push(dir.bytes, name);
      offset += 30 + name.length + size; centralSize += 46 + name.length;
      if (offset + centralSize > 64 * 1024 * 1024) fail('The pack exceeds the 64 MiB download limit.');
    }
    const end = header(22, 0x06054b50);
    end.view.setUint16(8, files.length, true); end.view.setUint16(10, files.length, true); end.view.setUint32(12, centralSize, true); end.view.setUint32(16, offset, true);
    const result = new Uint8Array(offset + centralSize + 22); let position = 0;
    for (const part of [...parts, ...central, end.bytes]) { result.set(part, position); position += part.length; }
    return result;
  }
  return { ASSETS, assetsFor, TITLES, FICTION, prepare, createPack, zip, crc32, emailMessage };
});
