/* One renderer for generated visitor pages and creator website previews. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./planner.js'), require('./field-notes.js'));
  else root.BoneWebsite = factory(root.BonePlanner, root.BoneFieldNotes);
})(typeof globalThis === 'object' ? globalThis : this, function(plannerAPI, fieldNotes) {
'use strict';
const { createPlanner } = plannerAPI;
const ROUTES = Object.freeze({ 'bone-appetit': 'index.html', 'rest-in-pizza': 'rest-in-pizza.html', 'grave-expectations': 'grave-expectations.html', 'boobies-lodge': 'boobies-lodge.html' });
const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

function validateSites(registry) {
  if (registry.version !== 1 || !Array.isArray(registry.sites) || registry.sites.length !== 4) throw new TypeError('visitor-sites.json: expected the four version 1 restaurant profiles.');
  const ids = new Set();
  registry.sites.forEach(site => {
    if (!Object.hasOwn(ROUTES, site.id) || ids.has(site.id) || site.href !== ROUTES[site.id]) throw new TypeError('visitor-sites.json: restaurant IDs and page routes must match the four bundled properties.');
    ids.add(site.id);
    for (const key of ['name', 'shortName']) if (typeof site[key] !== 'string' || !site[key].trim()) throw new TypeError(`visitor-sites.json: ${site.id}.${key} is required.`);
    if (!site.copy || typeof site.copy !== 'object' || Array.isArray(site.copy)) throw new TypeError(`visitor-sites.json: ${site.id}.copy is required.`);
    for (const [key, value] of Object.entries(site.copy)) {
      const valid = text => typeof text === 'string' && !!text.trim() && text.length <= 10000;
      if (['GLANCE_ITEMS', 'STORY_PARAGRAPHS'].includes(key) ? !Array.isArray(value) || !value.length || !value.every(valid) : !valid(value)) throw new TypeError(`visitor-sites.json: ${site.id}.copy.${key} must contain non-empty copy.`);
    }
    for (const key of ['META_DESCRIPTION', 'PAGE_TITLE', 'STORY_PARAGRAPHS', 'GLANCE_ITEMS', 'COLLECTION_EYEBROW', 'COLLECTION_HEADING', 'COLLECTION_INTRO', 'MAP_EYEBROW', 'MAP_INTRO']) {
      if (!Object.hasOwn(site.copy, key)) throw new TypeError(`visitor-sites.json: ${site.id}.copy.${key} is required.`);
    }
    if (site.copy.GLANCE_ITEMS?.length !== 4) throw new TypeError(`visitor-sites.json: ${site.id} needs four at-a-glance facts.`);
    for (const key of ['HERO_ACTION_TARGET', 'HERO_SECONDARY_TARGET']) if (!['#menu', '#haunts', '#visit'].includes(site.copy[key])) throw new TypeError(`visitor-sites.json: ${site.id}.copy.${key} must target the menu, haunts or visit section.`);
  });
  return registry.sites;
}
const rich = value => escape(value).replace(/\*([^*]+)\*/g, '<em>$1</em>').replaceAll('\n', '<br>');
const imageFile = image => image.endsWith('.svg') ? image : image + '.webp';

function render(data, template, options = {}) {
  const p = createPlanner(data);
  const sites = options.sites;
  const site = sites.find(site => site.id === (data.branding?.propertyId || 'bone-appetit'));
  if (!site) throw new TypeError('This restaurant needs a registered visitor website profile.');
  const copy = site.copy;
  const copySlots = Object.fromEntries(Object.entries(copy).filter(([, value]) => typeof value === 'string').map(([key, value]) => [key, /HEADLINE|HEADING|SIGNOFF|ACCESS_NOTE/.test(key) ? rich(value) : escape(value)]));
  copySlots.META_DESCRIPTION = escape(copy.META_DESCRIPTION.replaceAll(site.name, data.name));
  copySlots.PAGE_TITLE = escape(copy.PAGE_TITLE.replaceAll(site.name, data.name));
  copySlots.STORY_PARAGRAPHS = copy.STORY_PARAGRAPHS.map(text => `<p>${escape(text)}</p>`).join('\n');
  copySlots.GLANCE_ITEMS = copy.GLANCE_ITEMS.map((text, index) => `<span><svg class="icon" aria-hidden="true"><use href="#icon-${['pumpkin', data.branding && site.id !== 'rest-in-pizza' ? 'star' : 'pizza', 'moon', 'star'][index]}"/></svg>${escape(text)}</span>`).join('\n');
  const navigation = options.standalone ? [{ ...site, href: 'index.html', shortName: data.name }] : sites;
  const switcher = footer => `<nav${footer ? '' : ' id="property-switcher"'} class="property-switcher${footer ? ' property-switcher-footer' : ''}" aria-label="${footer ? 'Restaurant properties in footer' : 'Explore restaurant properties'}"><span>CHOOSE YOUR HAUNT</span><ul>${navigation.map(property => `<li><a href="${escape(property.href)}" data-property-link="${escape(property.id)}"${property.id === site.id ? ' aria-current="page"' : ''}>${escape(property.shortName)}</a></li>`).join('')}</ul><p>${options.standalone ? 'Fictional restaurant · Your visit plan stays in this browser' : 'Four fictional restaurants · Each keeps its own saved visit plan'}</p></nav>`;
  const { rules } = p;
  const option = (value, text, selected = false) => `<option value="${escape(value)}"${selected ? ' selected' : ''}>${escape(text)}</option>`;
  const menuItem = (item, heading = 'h3') => `<article class="full-menu-item" data-menu-id="${escape(item.id)}">
  <div><${heading}>${escape(item.name)}</${heading}><strong>${p.money(item.price)}</strong></div>
  <p>${escape(item.description)}</p>
  ${item.tags.length ? `<div class="menu-tags">${item.tags.map(tag => `<span>${escape(tag)}</span>`).join(' ')}</div>` : ''}
</article>`;
  const facts = key => p.attractionFacts(key).map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('\n');
  if (!/^[a-z0-9-]+\.svg$/.test(data.map.image)) throw new Error('The map must name a local SVG asset.');
  const { mapSVG, noteCSS } = options;
  if (typeof template !== 'string' || typeof mapSVG !== 'string' || typeof noteCSS !== 'string') throw new TypeError('The website template, map and field-note styles are required.');
  const slots = {
    ...copySlots,
    BODY_ATTRIBUTES: data.branding ? ` class="property-site property-${escape(site.id)}"` : '',
    PROPERTY_SWITCHER: switcher(false),
    PROPERTY_SWITCHER_FOOTER: switcher(true),
    CREATOR_LINK: options.standalone ? '' : '<a href="creator.html">Creator workspace</a>',
    COLLECTION_NAV: data.branding ? 'The collection' : 'The counter',
    HERO_ASSET: `assets/${escape(data.branding?.hero || 'haunted-roadhouse.webp')}`,
    HERO_ALT: escape(data.branding?.heroAlt || 'A crooked Victorian pizzeria glowing with warm light, surrounded by jack-o’-lanterns and autumn woods.'),
    DINING_ASSET: `assets/${escape(imageFile(data.attractions.pizzeria.image))}`,
    YEAR: p.year,
    NAME: escape(data.name),
    SEASON_BAR: escape(p.seasonRange().replace(`, ${p.year}`, '').toUpperCase()),
    SITE_DATA: JSON.stringify(data, null, 2).replace(/</g, '\\u003c'),
    MENU_DISCLOSURE: escape(data.disclosures.menu),
    FIELD_NOTE_CARD: fieldNotes.card(data, p.defaultPlan(new Date(`${data.season.start}T12:00:00Z`))),
    FIELD_NOTE_ASSETS: `<template id="field-map-art">${mapSVG}</template>\n<template id="field-note-styles"><style>${noteCSS}</style></template>`,
    ODDITIES_COLLECTION: `<section class="oddities-section section-pad wrap" id="oddities" aria-labelledby="oddities-title">
  <div class="section-intro">
    <div><p class="eyebrow accent">${escape(copy.COLLECTION_EYEBROW)}</p><h2 id="oddities-title">${rich(copy.COLLECTION_HEADING)}</h2></div>
    <p>${escape(copy.COLLECTION_INTRO)}</p>
  </div>
  <div class="oddities-grid">${data.oddities.map((item, index) => `<article class="oddity-card" id="oddity-${escape(item.id)}">
    <div class="oddity-illustration"><img src="assets/${escape(item.image)}" alt="${escape(item.alt)}" width="480" height="320" loading="lazy"><span>SPECIMEN ${String(index + 1).padStart(2, '0')}</span></div>
    <p class="oddity-material">${escape(item.material)}</p>
    <h3>${escape(item.name)}</h3>
    <p class="oddity-copy">${escape(item.copy)}</p>
    <details class="oddity-record"><summary aria-label="Counter record for ${escape(item.name)}">Counter record <span aria-hidden="true">+</span></summary><div><p><strong>Claimed origin</strong>${escape(item.origin)}</p><p>${escape(item.record)}</p><p class="oddity-fiction">Fictional object and provenance. No authenticity claim or purchase.</p></div></details>
  </article>`).join('\n')}</div>
</section>`,
    GROUNDS_MAP: `<section class="grounds-section" id="grounds" aria-labelledby="grounds-heading"><div class="wrap section-pad">
  <div class="section-intro"><div><p class="eyebrow accent">${escape(copy.MAP_EYEBROW)}</p><h2 id="grounds-heading">${escape(data.map.title)}</h2></div><p>${escape(copy.MAP_INTRO)}</p></div>
  <div class="grounds-layout">
    <figure class="grounds-figure"><img src="assets/${escape(data.map.image)}" width="760" height="560" alt="${escape(data.branding ? `Fictional house plan with six numbered locations: ${data.map.locations.map(point => point.name).join(', ')}. Not to scale; access is not verified.` : 'Imagined grounds with six numbered locations: house, counter, pumpkin trail, rest bench, shorter return, and entrance. Solid loop and dashed shorter return. Fictional; not to scale.')}"><figcaption>${escape(data.map.caption)}</figcaption></figure>
    <ol class="grounds-key">${data.map.locations.map(point => `<li><span class="map-number">${escape(point.number)}</span><div>${point.attraction
      ? `<a class="text-link" data-attraction="${escape(point.attraction)}" data-map-location="${point.number}" href="#details-${escape(point.attraction)}">${escape(point.name)} <span aria-hidden="true">↗</span></a>`
      : `<h3>${escape(point.name)}</h3>`}<p>${escape(point.detail)}</p>${point.stop ? `<p class="map-stop-hint">${escape(p.stopHint(point.stop))}</p>` : ''}</div></li>`).join('\n')}</ol>
  </div>
  <p class="grounds-disclosure">${escape(data.map.disclosure)}</p>
</div></section>`,
    ATTRACTION_CARDS: Object.entries(data.attractions).map(([key, a]) => `<article class="haunt-card">
  <div class="haunt-image">
    <img src="assets/${escape(imageFile(a.image))}" alt="${escape(a.card.alt)}" width="900" height="600" loading="lazy">
    <span class="image-label">${escape(a.card.imageLabel)}</span>
  </div>
  <div class="haunt-copy">
    <div class="card-kicker">${escape(a.card.kicker)} <span>${escape(a.card.intensity)}</span></div>
    <h3>${escape(a.card.title)}</h3>
    <p>${escape(a.card.copy)}</p>
    <a class="text-link" data-attraction="${escape(key)}" href="#details-${escape(key)}">${escape(a.card.action)} <span aria-hidden="true">↗</span></a>
  </div>
</article>`).join('\n'),
    STATIC_ATTRACTIONS: `<section class="static-attractions fallback-content" aria-label="Attraction details">
${Object.entries(data.attractions).map(([key, a]) => `<article id="details-${escape(key)}" class="static-attraction">
  <p class="eyebrow accent">${escape(a.kicker)}</p>
  <h3>${escape(a.title)}</h3>
  <p>${escape(p.copy(a.description))}</p>
  <dl class="attraction-facts">${facts(key)}</dl>
  <p>${escape(a.access)}</p>
</article>`).join('\n')}
</section>`,
    FEATURED_PIZZAS: data.featured.map(feature => {
      const item = data.menu.pizzas.find(item => item.id === feature.id);
      if (!item) throw new Error(`Unknown featured pizza: ${feature.id}`);
      return `<article class="pizza-card" data-featured-id="${escape(item.id)}">
  <div class="pizza-photo">
    <img src="assets/${escape(imageFile(feature.image))}" alt="${escape(feature.alt)}" width="720" height="480" loading="lazy">
    <span class="pizza-badge">${escape(feature.badge)}</span>
  </div>
  <div class="pizza-title"><h3>${escape(item.name)}</h3><span>${p.money(item.price)}</span></div>
  <p>${escape(feature.description)}</p>
  <span class="food-note">${escape(feature.note)}</span>
</article>`;
    }).join('\n'),
    STATIC_MENU: `<section id="full-menu" class="static-menu fallback-content" aria-labelledby="static-menu-title">
  <h3 id="static-menu-title">The complete menu</h3>
  <p>Fictional menu. Prices are illustrative; nothing here places an order.</p>
${Object.entries(data.menu).map(([key, items]) => `<section id="full-menu-${escape(key)}" aria-label="${escape(data.menuCategories[key])}">
  <h3>${escape(data.menuCategories[key])}</h3>
  <div class="full-menu-items">${items.map(item => menuItem(item, 'h4')).join('\n')}</div>
</section>`).join('\n')}
  <p class="menu-disclaimer">${escape(data.disclosures.menu)}</p>
</section>`,
    MENU_FILTERS: `<div class="menu-filters" role="group" aria-label="Filter menu by category">
${Object.entries(data.menuCategories).map(([key, label], index) => `<button type="button" data-filter="${escape(key)}" aria-pressed="${index === 0}">${escape(label)}</button>`).join('\n')}
</div>`,
    MOOD_PICKER: `<fieldset class="time-picker" data-planner-control>
  <legend>CHOOSE YOUR SIDE OF SUNSET</legend>
  <div class="segmented">${Object.entries(data.moods).map(([key, mood]) => `<label><input type="radio" name="visit-mood" value="${escape(key)}"${key === 'day' ? ' checked' : ''}><span><svg class="icon"><use href="#icon-${key === 'day' ? 'sun' : 'moon'}"/></svg> ${escape(mood.label)}</span></label>`).join('\n')}</div>
</fieldset>`,
    DEFAULT_MOOD: `<div class="mood-description" id="mood-description" aria-live="polite">
  <p class="eyebrow accent" id="mood-time">${escape(p.moodTime('day'))}</p>
  <h3 id="mood-title">${data.moods.day.title.split('\n').map(escape).join('<br>')}</h3>
  <p id="mood-copy">${escape(data.moods.day.copy)}</p>
  <ul class="check-list" id="mood-features">${data.moods.day.features.map(text => `<li>${escape(p.copy(text))}</li>`).join('\n')}</ul>
</div>`,
    VISITOR_FACTS: `<dl>
  <div><dt>THE SEASON</dt><dd>${escape(p.seasonRange())}</dd></div>
  <div><dt>WHEN TO WANDER</dt><dd>${escape(p.hoursLabel())}<br><span>${escape(p.closingLabel())}</span></dd></div>
  <div><dt>THE COST OF CURIOSITY</dt><dd>${data.branding ? `House spaces and collection · Free to explore<br>Food and drinks priced separately<br><span>${escape(data.disclosures.admission)}</span>` : `Grounds &amp; oddities counter · Free<br>${escape(rules.stops.trail.title)} · ${p.money(rules.trailPrice)} per person<br><span>Under ${rules.freeUnderAge}s wander free with an adult.</span>`}</dd></div>
  <div><dt>THE ADDRESS, ALLEGEDLY</dt><dd>${escape(data.address.street)}<br>${escape(data.address.district)}</dd></div>
</dl>`,
    FAQ_ITEMS: data.faqs.map(faq => `<details${faq.open ? ' open' : ''}>
  <summary>${escape(faq.question)}<span aria-hidden="true">+</span></summary>
  <div class="faq-answer"><p>${escape(p.copy(faq.answer))}</p></div>
</details>`).join('\n'),
    DATE_OPTIONS: p.allowedDates.map(date => option(date, p.fullDateLabel(date))).join('\n'),
    ARRIVAL_OPTIONS: rules.arrivals.map(arrival => option(arrival.value, `${p.shortTime(arrival.value)} · ${arrival.label}`)).join('\n'),
    GUEST_FIELDS: `<fieldset class="guest-fields">
  <legend>Your traveling companions</legend>
  <label>Age ${data.admission?.minimumAge || rules.freeUnderAge} &amp; up<select name="guests" id="visit-guests">
${Array.from({ length: rules.guests.max - rules.guests.min + 1 }, (_, index) => index + rules.guests.min).map(n => option(n, `${n} ${n === 1 ? 'person' : 'people'}`, n === rules.guests.default)).join('\n')}
  </select></label>
  ${data.admission ? '<input type="hidden" name="children" id="visit-children" value="0">' : `<label>Under age ${rules.freeUnderAge}<select name="children" id="visit-children">
${Array.from({ length: rules.children.max - rules.children.min + 1 }, (_, index) => index + rules.children.min).map(n => option(n, n ? `${n} little ${n === 1 ? 'monster' : 'monsters'}` : 'None', n === rules.children.default)).join('\n')}
  </select></label>`}
</fieldset>`,
    PLAN_STOPS: `<fieldset class="plan-stops">
  <legend>Make time for</legend>
${p.stopKeys.map(key => `<label><input type="checkbox" name="${escape(key)}" checked><span>${escape(rules.stops[key].title)}<small>${escape(p.stopHint(key))}</small></span></label>`).join('\n')}
</fieldset>`
  };
  return template.replace(/(^[\t ]*)?\{\{([A-Z_]+)\}\}/gm, (_, indent = '', key) => {
    if (!Object.hasOwn(slots, key)) throw new Error(`Unknown template slot: ${key}`);
    return String(slots[key]).split('\n').map(line => indent + line).join('\n');
  });
}

return { render, validateSites, ROUTES };
});
