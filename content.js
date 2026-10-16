/* Shared content contract. No DOM, packages, or network required. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BoneContent = factory();
})(typeof globalThis === 'object' ? globalThis : this, function() {
  'use strict';

  function validateContent(data) {
    const fail = (path, message) => { throw new TypeError(`site-data.json: ${path}: ${message}`); };
    const object = (value, path) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object.');
    };
    const text = (value, path) => {
      if (typeof value !== 'string' || !value.trim()) fail(path, 'must be non-empty text.');
    };
    const fields = (value, path, names) => {
      object(value, path);
      names.forEach(name => text(value[name], `${path}.${name}`));
    };
    const list = (value, path, min = 1) => {
      if (!Array.isArray(value) || value.length < min) fail(path, `must be an array with at least ${min} entries.`);
    };
    const integer = (value, path, min = 0, max = Number.MAX_SAFE_INTEGER) => {
      if (!Number.isSafeInteger(value) || value < min || value > max) fail(path, `must be a whole number from ${min} to ${max}.`);
    };
    const slug = (value, path) => {
      if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) fail(path, 'must be a lowercase identifier using letters, numbers, and single hyphens.');
    };
    const unique = (values, path) => {
      if (new Set(values).size !== values.length) fail(path, 'entries must be unique.');
    };
    const price = (value, path) => {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0
        || !Number.isSafeInteger(Math.round(value * 100)) || Math.abs(value * 100 - Math.round(value * 100)) > 0.000001) {
        fail(path, 'must be a non-negative price with at most two decimal places.');
      }
    };
    const asset = (value, path, extension = '') => {
      const pattern = extension ? new RegExp(`^[a-z0-9-]+\\.${extension}$`) : /^[a-z0-9-]+$/;
      if (typeof value !== 'string' || !pattern.test(value)) fail(path, `must name a local ${extension || 'WebP (without extension)'} asset, without directories.`);
    };
    const date = (value, path) => {
      if (typeof value !== 'string' || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) fail(path, 'must be a real date in YYYY-MM-DD format.');
      const parsed = new Date(`${value}T12:00:00Z`);
      if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(path, 'must be a real calendar date.');
    };
    const time = (value, path) => {
      if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) fail(path, 'must be a 24-hour time in HH:MM format.');
    };
    const exactKeys = (value, path, keys) => {
      object(value, path);
      if (Object.keys(value).length !== keys.length || !keys.every(key => Object.hasOwn(value, key))) fail(path, `must contain exactly ${keys.join(', ')}.`);
    };
    object(data, 'root');
    text(data.name, 'name');
    if (data.branding !== undefined) {
      exactKeys(data.branding, 'branding', ['propertyId', 'hero', 'heroAlt']);
      slug(data.branding.propertyId, 'branding.propertyId');
      asset(data.branding.hero, 'branding.hero', 'svg');
      text(data.branding.heroAlt, 'branding.heroAlt');
    }
    if (data.admission !== undefined) {
      exactKeys(data.admission, 'admission', ['minimumAge']);
      integer(data.admission.minimumAge, 'admission.minimumAge', 1, 100);
    }
    const imageAsset = (value, path) => asset(value, path, data.branding && typeof value === 'string' && value.endsWith('.svg') ? 'svg' : '');
    fields(data.season, 'season', ['start', 'end', 'timezone']);
    const { season, hours, planner: rules } = data;
    date(season.start, 'season.start');
    date(season.end, 'season.end');
    if (season.start > season.end) fail('season.end', 'must be on or after season.start.');
    if (season.start.slice(0, 4) !== season.end.slice(0, 4)) fail('season.end', 'the concept season must fit within one calendar year.');
    try { new Intl.DateTimeFormat('en-US', { timeZone: season.timezone }).format(); }
    catch { fail('season.timezone', 'must be a supported time zone.'); }
    list(season.weekdays, 'season.weekdays');
    season.weekdays.forEach((day, index) => integer(day, `season.weekdays[${index}]`, 0, 6));
    unique(season.weekdays, 'season.weekdays');
    let hasOpenDate = false;
    for (let day = new Date(`${season.start}T12:00:00Z`); day <= new Date(`${season.end}T12:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
      if (season.weekdays.includes(day.getUTCDay())) hasOpenDate = true;
    }
    if (!hasOpenDate) fail('season.weekdays', 'must include an open date within the season.');
    object(hours, 'hours');
    ['open', 'night', 'close', 'kitchenClose', 'trailClose'].forEach(key => time(hours[key], `hours.${key}`));
    if (!(hours.open < hours.night && hours.night < hours.close)) fail('hours', 'must have open < night < close within one day.');
    for (const key of ['kitchenClose', 'trailClose']) {
      if (!(hours.open < hours[key] && hours[key] <= hours.close)) fail(`hours.${key}`, 'must be after opening and no later than grounds closing.');
    }
    object(rules, 'planner');
    integer(rules.version, 'planner.version', 1);
    text(rules.storageKey, 'planner.storageKey');
    integer(rules.arrivalMinutes, 'planner.arrivalMinutes', 0, 1440);
    integer(rules.freeUnderAge, 'planner.freeUnderAge', 1);
    price(rules.trailPrice, 'planner.trailPrice');
    for (const key of ['guests', 'children']) {
      const path = `planner.${key}`, bounds = rules[key];
      object(bounds, path);
      integer(bounds.min, `${path}.min`, key === 'guests' ? 1 : 0, 1000);
      integer(bounds.max, `${path}.max`, bounds.min, 1000);
      integer(bounds.default, `${path}.default`, bounds.min, bounds.max);
    }
    if (data.admission && rules.children.max !== 0) fail('planner.children.max', 'must be zero for a property with a minimum admission age.');
    price(rules.trailPrice * rules.guests.max, 'planner.trailPrice × planner.guests.max');
    fields(rules.arrival, 'planner.arrival', ['title', 'detail']);
    text(rules.departureTitle, 'planner.departureTitle');
    exactKeys(rules.stops, 'planner.stops', ['pizza', 'trail', 'oddities']);
    for (const [key, stop] of Object.entries(rules.stops)) {
      const path = `planner.stops.${key}`;
      fields(stop, path, ['title', 'scheduleTitle', 'detail']);
      integer(stop.minutes, `${path}.minutes`, 1, 1440);
      if (stop.location !== undefined) text(stop.location, `${path}.location`);
    }
    list(rules.arrivals, 'planner.arrivals');
    rules.arrivals.forEach((arrival, index) => {
      const path = `planner.arrivals[${index}]`;
      fields(arrival, path, ['value', 'label']);
      time(arrival.value, `${path}.value`);
      if (arrival.value < hours.open || arrival.value >= hours.close) fail(`${path}.value`, 'must be during opening hours.');
      if (index && arrival.value <= rules.arrivals[index - 1].value) fail(`${path}.value`, 'arrival times must be unique and increasing.');
    });
    for (const key of ['open', 'night']) {
      if (!rules.arrivals.some(arrival => arrival.value === hours[key])) fail(`hours.${key}`, 'must match a planner.arrivals value so its visitor mode can be selected.');
    }
    fields(data.address, 'address', ['street', 'district']);
    object(data.menuCategories, 'menuCategories');
    object(data.menu, 'menu');
    exactKeys(data.menuCategories, 'menuCategories', Object.keys(data.menu));
    if (!Object.hasOwn(data.menu, 'pizzas')) fail('menu.pizzas', 'is required.');
    const menuIds = new Set();
    for (const [category, items] of Object.entries(data.menu)) {
      slug(category, `menu.${category}`);
      text(data.menuCategories[category], `menuCategories.${category}`);
      list(items, `menu.${category}`);
      items.forEach((item, index) => {
        const path = `menu.${category}[${index}]`;
        fields(item, path, ['id', 'name', 'description']);
        slug(item.id, `${path}.id`);
        if (menuIds.has(item.id)) fail(`${path}.id`, `duplicate menu ID "${item.id}".`);
        menuIds.add(item.id);
        price(item.price, `${path}.price`);
        list(item.tags, `${path}.tags`, 0);
        item.tags.forEach((tag, i) => text(tag, `${path}.tags[${i}]`));
        unique(item.tags, `${path}.tags`);
      });
    }
    if (!data.menu.pizzas.some(item => !item.tags.includes('KIDS'))) fail('menu.pizzas', 'needs at least one standard pizza for the attraction price.');
    list(data.featured, 'featured');
    unique(data.featured.map(item => item && item.id), 'featured IDs');
    data.featured.forEach((item, index) => {
      const path = `featured[${index}]`;
      fields(item, path, ['id', 'image', 'alt', 'badge', 'description', 'note']);
      if (!data.menu.pizzas.some(pizza => pizza.id === item.id)) fail(`${path}.id`, 'must reference a menu.pizzas ID.');
      imageAsset(item.image, `${path}.image`);
    });
    exactKeys(data.attractions, 'attractions', ['pizzeria', 'hollow', 'oddities']);
    const expectedStops = { pizzeria: 'pizza', hollow: 'trail', oddities: 'oddities' };
    for (const [key, attraction] of Object.entries(data.attractions)) {
      const path = `attractions.${key}`;
      fields(attraction, path, ['title', 'kicker', 'image', 'alt', 'description', 'access', 'stop', 'setting']);
      if (attraction.stop !== expectedStops[key]) fail(`${path}.stop`, `must reference ${expectedStops[key]}.`);
      imageAsset(attraction.image, `${path}.image`);
      if (attraction.priceLabel !== undefined) text(attraction.priceLabel, `${path}.priceLabel`);
      fields(attraction.card, `${path}.card`, ['title', 'copy', 'alt', 'imageLabel', 'kicker', 'intensity', 'action']);
    }
    exactKeys(data.moods, 'moods', ['day', 'night']);
    for (const [key, mood] of Object.entries(data.moods)) {
      const path = `moods.${key}`;
      fields(mood, path, ['title', 'copy', 'timeDetail', 'label']);
      list(mood.features, `${path}.features`);
      mood.features.forEach((value, index) => text(value, `${path}.features[${index}]`));
    }
    fields(data.disclosures, 'disclosures', ['menu', 'access', 'sensory', 'weather', 'estimate']);
    if (data.disclosures.admission !== undefined) text(data.disclosures.admission, 'disclosures.admission');
    if (data.admission && data.disclosures.admission === undefined) fail('disclosures.admission', 'is required for a property with a minimum admission age.');
    list(data.faqs, 'faqs');
    data.faqs.forEach((faq, index) => {
      fields(faq, `faqs[${index}]`, ['question', 'answer']);
      if (typeof faq.open !== 'boolean') fail(`faqs[${index}].open`, 'must be true or false.');
    });
    list(data.oddities, 'oddities');
    if (data.oddities.length !== 6) fail('oddities', 'this illustrated six-specimen edition requires exactly six records.');
    unique(data.oddities.map(item => item && item.id), 'oddities IDs');
    data.oddities.forEach((item, index) => {
      const path = `oddities[${index}]`;
      fields(item, path, ['id', 'name', 'image', 'alt', 'material', 'copy', 'origin', 'record']);
      slug(item.id, `${path}.id`);
      asset(item.image, `${path}.image`, 'svg');
    });
    fields(data.map, 'map', ['image', 'title', 'caption', 'disclosure']);
    asset(data.map.image, 'map.image', 'svg');
    list(data.map.locations, 'map.locations');
    if (data.map.locations.length !== 6) fail('map.locations', 'the illustrated map requires six numbered locations.');
    data.map.locations.forEach((point, index) => {
      const path = `map.locations[${index}]`;
      fields(point, path, ['name', 'detail']);
      if (point.number !== index + 1) fail(`${path}.number`, `must be ${index + 1} to match the illustrated map.`);
      const illustratedAttraction = ['pizzeria', 'oddities', 'hollow'][index];
      if (point.attraction !== illustratedAttraction) fail(`${path}.attraction`, `must ${illustratedAttraction ? `reference ${illustratedAttraction}` : 'be omitted'} to match the illustrated map.`);
      if (point.attraction !== undefined || point.stop !== undefined) {
        if (!Object.hasOwn(expectedStops, point.attraction)) fail(`${path}.attraction`, 'must reference an attraction.');
        if (point.stop !== expectedStops[point.attraction]) fail(`${path}.stop`, 'must match the referenced attraction stop.');
      }
    });
    fields(data.fieldNotes, 'fieldNotes', ['form', 'title', 'stamp']);
    fields(data.fieldNotes.houseNotes, 'fieldNotes.houseNotes', ['pizza', 'trail', 'oddities', 'grounds']);
    const checkTokens = (value, path = '') => {
      if (typeof value === 'string' && /\{\{|\}\}/.test(value)) {
        const supportsTokens = /^attractions\.[^.]+\.description$|^faqs\[\d+\]\.answer$|^moods\.[^.]+\.features\[\d+\]$/.test(path);
        const remaining = value.replace(/\{\{(DAY_RANGE|NIGHT_TIME|FREE_UNDER_AGE)\}\}/g, '');
        if (!supportsTokens || /\{\{|\}\}/.test(remaining)) fail(path, 'contains an unsupported or misplaced copy token. Use DAY_RANGE, NIGHT_TIME, or FREE_UNDER_AGE only in attraction descriptions, FAQ answers, or mood features.');
      } else if (Array.isArray(value)) value.forEach((entry, index) => checkTokens(entry, `${path}[${index}]`));
      else if (value && typeof value === 'object') Object.entries(value).forEach(([key, entry]) => checkTokens(entry, path ? `${path}.${key}` : key));
    };
    checkTokens(data);
    return data;
  }

  return { validateContent };
});
