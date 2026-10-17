/* Portable, complete single-property websites. No DOM, network, or packages. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./website-renderer.js'), require('./website-copy.js'), require('./marketing-pack.js'));
  else root.BoneWebsiteExport = factory(root.BoneWebsite, root.BoneWebsiteCopy, root.BoneMarketing);
})(typeof globalThis === 'object' ? globalThis : this, function(website, copyAPI, archive) {
  'use strict';
  const FIXED = Object.freeze(['content.js', 'planner.js', 'field-notes.js', 'app.js',
    'styles.css', 'properties.css', 'field-notes.css', 'assets/favicon.svg',
    'assets/fonts/fraunces-700.ttf', 'assets/fonts/dm-sans-400.ttf', 'assets/fonts/dm-sans-600.ttf', 'assets/fonts/barlow-condensed-700.ttf',
    'assets/fonts/OFL-Fraunces.txt', 'assets/fonts/OFL-DM-Sans.txt', 'assets/fonts/OFL-Barlow-Condensed.txt']);
  const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', { fatal: true });
  const hash = async value => [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', typeof value === 'string' ? encoder.encode(value) : value))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  function prepare(model, record, options) {
    if (!options || !['draft', 'named'].includes(options.sourceState)) throw new TypeError('Choose the current draft or last named version for the website export.');
    const source = structuredClone(record), data = model.materialize(source);
    const sites = copyAPI.resolve(source, website.validateSites(structuredClone({ version: 1, sites: options.sites })));
    const propertyId = data.branding?.propertyId || 'bone-appetit';
    const profile = sites.find(site => site.id === propertyId);
    const image = value => value.endsWith('.svg') ? value : value + '.webp';
    const assets = [...website.artAssets(data), website.heroAsset(data), data.branding?.hero || 'haunted-roadhouse.webp', data.map.image,
      ...data.oddities.map(item => item.image), ...data.featured.map(item => image(item.image)), ...Object.values(data.attractions).map(item => image(item.image))];
    const paths = [...new Set(['index.template.html', ...FIXED, ...assets.map(asset => 'assets/' + asset)])];
    if (paths.some(path => path !== 'index.template.html' && !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\.[a-zA-Z0-9]+$/.test(path))) throw new TypeError('A website resource must be a bundled relative path.');
    return { data, sites, profile, propertyId, paths, sourceState: options.sourceState };
  }
  async function createWebsite(model, record, options, assets) {
    // Freeze every source before the first await; callers can keep editing safely.
    const prepared = prepare(model, record, options);
    const { data, sites, profile, propertyId, paths, sourceState } = prepared;
    const generatedAt = options.generatedAt || new Date().toISOString();
    if (typeof generatedAt !== 'string' || !Number.isFinite(Date.parse(generatedAt)) || new Date(generatedAt).toISOString() !== generatedAt) throw new TypeError('Website generation date must be an ISO timestamp.');
    const frozenAssets = new Map(paths.map(path => {
      const bytes = assets?.[path];
      if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 16 * 1024 * 1024) throw new TypeError(`Website resource missing, empty, or too large: ${path}. Retry the download.`);
      return [path, bytes.slice()];
    }));
    const text = path => decoder.decode(frozenAssets.get(path));
    const publicHash = await hash(JSON.stringify({ data, copy: profile.copy }));
    // Different public edits get separate plans, including exports sharing a host.
    data.planner.storageKey = `bone-website-${propertyId}-${publicHash.slice(0, 16)}-visit-v1`;
    const html = website.render(data, text('index.template.html'), {
      sites, standalone: true, mapSVG: text('assets/' + data.map.image), noteCSS: text('field-notes.css')
    });
    const files = paths.filter(path => path !== 'index.template.html').map(name => ({ name, bytes: frozenAssets.get(name) }));
    const add = (name, text) => files.push({ name, bytes: encoder.encode(text) });
    add('index.html', html);
    add('website-content.json', JSON.stringify({ format: 'bone-appetit-website-content', version: 1, propertyId, copy: profile.copy, data }, null, 2));
    add('README.txt', `COMPLETE RESTAURANT WEBSITE\n\n${data.name}\nSource: ${sourceState === 'named' ? 'Last named version' : 'Current draft'}\nExported: ${generatedAt}\n\nOPEN\n1. Extract the whole ZIP to a folder.\n2. Open index.html in your browser. Menus, house details and the visit planner work without an internet connection. JavaScript is needed for the interactive planner.\n3. Keep the assets folder, stylesheets and scripts together with index.html.\n\nSHARE\nSend the complete ZIP so the recipient can extract it and open index.html. You can also serve the entire extracted folder with any static web host. Uploading only index.html will omit its artwork, styles and scripts. This download does not publish anything.\n\nPLANS\nSave my plan stores only that visitor's selections in their browser. Existing creator and original restaurant plans are not included or overwritten. Public content changes get a separate saved-plan key. Browser storage for directly opened files varies by browser; if saving is unavailable, use Download itinerary or Download field notes. Serving the folder at a stable web address provides consistent browser-local storage. A plan is not a booking.\n\nEDIT AGAIN\nUse your creator campaign and export a new website ZIP. This package contains the rendered public site and website-content.json for reference; it is not a creator backup. Use the creator workspace's separate backup command to keep your brief, draft, named version and editing position.\n\nCONTENTS\nindex.html: complete restaurant website, embedded validated content and static menu/detail fallbacks.\napp.js, planner.js, content.js, field-notes.js: local menu, dialog, planner, validation and itinerary behavior.\nstyles.css, properties.css, field-notes.css: the original design and print styles.\nassets/: all artwork, four local fonts and their Open Font License texts.\nwebsite-content.json: the exported public content and resolved page copy; no working brief, other campaigns or saved visitor plans.\nmanifest.json: file sizes and SHA-256 checksums for every other file. It detects accidental changes; it is not a signature or approval.\n\nFICTION\nAll restaurant details, history, dates, facilities and prices are fictional Halloween parody. The fixed 2026 season and admission rules remain in place. No reservations, orders, payments, subscriptions or email are submitted. No external network requests are required.\n`);
    const manifest = { format: 'bone-appetit-website', version: 1, propertyId, venue: data.name, sourceState, generatedAt,
      publicContentSha256: publicHash, plannerStorageKey: data.planner.storageKey,
      files: await Promise.all(files.map(async file => ({ name: file.name, bytes: file.bytes.length, sha256: await hash(file.bytes) }))) };
    add('manifest.json', JSON.stringify(manifest, null, 2));
    return { files, manifest, title: data.name, filename: `${propertyId}-website-${sourceState}-${publicHash.slice(0, 8)}.zip` };
  }
  return { prepare, createWebsite, zip: files => archive.zip(files) };
});
