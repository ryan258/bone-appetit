/* Four edited restaurants in one connected, public-only website archive. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./website-export.js'), require('./website-renderer.js'));
  else root.BoneWebsiteCollection = factory(root.BoneWebsiteExport, root.BoneWebsite);
})(typeof globalThis === 'object' ? globalThis : this, function(single, website) {
  'use strict';
  const encoder = new TextEncoder(), decoder = new TextDecoder('utf-8', { fatal: true });
  const hash = async bytes => [...new Uint8Array(await crypto.subtle.digest('SHA-256', typeof bytes === 'string' ? encoder.encode(bytes) : bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  function prepare(model, records, options) {
    if (!Array.isArray(records) || records.length !== 4) throw new TypeError('Choose one campaign for each of the four restaurant properties.');
    const sources = structuredClone(records), prepared = sources.map(record => single.prepare(model, record, options));
    const byId = new Map();
    prepared.forEach((item, index) => {
      if (byId.has(item.propertyId)) throw new TypeError('Choose four different properties, one campaign for each.');
      byId.set(item.propertyId, { ...item, source: sources[index] });
    });
    const ordered = Object.keys(website.ROUTES).map(id => {
      if (!byId.has(id)) throw new TypeError(`The collection is missing ${id}. Choose a campaign for every property.`);
      return byId.get(id);
    });
    return { properties: ordered, paths: [...new Set(ordered.flatMap(item => item.paths))] };
  }
  async function createCollection(model, records, options, assets) {
    const prepared = prepare(model, records, options);
    const frozenOptions = structuredClone(options);
    const frozenAssets = Object.fromEntries(prepared.paths.map(path => {
      const bytes = assets?.[path];
      if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length > 16 * 1024 * 1024) throw new TypeError(`Collection resource missing, empty, or too large: ${path}. Retry the download.`);
      return [path, bytes.slice()];
    }));
    frozenOptions.generatedAt ||= new Date().toISOString();
    const packs = await Promise.all(prepared.properties.map(item => single.createWebsite(model, item.source, frozenOptions, frozenAssets)));
    const snapshots = packs.map(pack => JSON.parse(decoder.decode(pack.files.find(file => file.name === 'website-content.json').bytes)));
    const sites = prepared.properties.map(item => ({ ...item.profile, shortName: item.data.name }));
    const files = new Map();
    for (const pack of packs) for (const file of pack.files) {
      if (!['index.html','website-content.json','README.txt','manifest.json'].includes(file.name)) files.set(file.name, file);
    }
    const add = (name, text) => files.set(name, { name, bytes: encoder.encode(text) });
    const properties = snapshots.map((snapshot, index) => {
      const id = snapshot.propertyId, route = website.ROUTES[id];
      const html = website.render(snapshot.data, decoder.decode(frozenAssets['index.template.html']), {
        sites, collection: true, mapSVG: decoder.decode(frozenAssets['assets/' + snapshot.data.map.image]), noteCSS: decoder.decode(frozenAssets['field-notes.css'])
      });
      add(route, html);
      add(`content/${id}.json`, JSON.stringify(snapshot, null, 2));
      return { propertyId: id, name: snapshot.data.name, href: route, sourceState: frozenOptions.sourceState,
        publicContentSha256: packs[index].manifest.publicContentSha256, plannerStorageKey: snapshot.data.planner.storageKey };
    });
    add('README.txt', `FOUR RESTAURANTS. ONE PORTABLE HAUNTING.\n\nCOMPLETE WEBSITE COLLECTION\nSource: ${frozenOptions.sourceState === 'named' ? 'Last named versions' : 'Current drafts'}\nExported: ${frozenOptions.generatedAt}\n\nOPEN AND EXPLORE\n1. Extract the entire ZIP to one folder.\n2. Open index.html to start at Bone Appétit.\n3. Use CHOOSE YOUR HAUNT at the top or footer to switch between all four edited restaurants. Each keeps its own design, menu, artwork, story and planner.\n\nPAGES\n${properties.map(item => `${item.name}: ${item.href}`).join('\n')}\n\nSHARE\nSend the whole ZIP so the recipient can extract it and open index.html. Or serve the entire folder from any static web host, including a subfolder. Keep all four HTML files, scripts, stylesheets and assets together. No internet connection is required to open the extracted sites. JavaScript enables the menus, dialogs and planner; full static menus and details remain readable without it. This download does not publish or send anything.\n\nPLANS\nEach property has a separate content-derived browser storage key. Original creator/visitor saves and other edited content are not overwritten. Identical public content uses the same key as its individual website export. Browser storage for file URLs varies; if saving is unavailable, use Download itinerary or Download field notes. A stable static web address provides consistent browser-local resumption. The ZIP contains no visitor plans.\n\nCONTENTS AND EDITING\nThe four restaurant HTML files contain the full public pages and embedded validated planner data. Shared scripts, original styles, local artwork, four fonts and their licenses are included once. content/ contains a public content snapshot for each property. manifest.json records the source type, public names, routes, separate planner keys, file sizes and SHA-256 checksums. These checksums detect accidental changes; they are not a signature or approval.\n\nCampaign names, working briefs, other campaigns, creator pages and saved plans are excluded. This package is not a creator backup. Keep a separate creator backup for future editing, then export another collection when ready.\n\nFICTION\nAll four restaurants retain their Halloween parody, fictional prices/facilities and fixed 2026 concept season. The lodge's 21+ admission rule remains in place. No booking, order, payment, subscription or email is submitted.\n`);
    const manifest = { format: 'bone-appetit-website-collection', version: 1, generatedAt: frozenOptions.generatedAt,
      sourceState: frozenOptions.sourceState, properties,
      files: await Promise.all([...files.values()].map(async file => ({ name: file.name, bytes: file.bytes.length, sha256: await hash(file.bytes) }))) };
    add('manifest.json', JSON.stringify(manifest, null, 2));
    const fingerprint = await hash(JSON.stringify(properties.map(item => [item.propertyId, item.publicContentSha256])));
    return { files: [...files.values()], manifest, filename: `bone-appetit-collection-${frozenOptions.sourceState}-${fingerprint.slice(0, 8)}.zip` };
  }
  return { prepare, createCollection, zip: files => single.zip(files) };
});
