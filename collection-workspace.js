/* Explicit campaign selection and frozen four-property downloads. */
'use strict';
window.BoneCollectionWorkspace = function({ model, entries }) {
  const $ = selector => document.querySelector(selector);
  const api = window.BoneWebsiteCollection;
  let sites, generation = 0;
  const selections = new Map(), assets = new Map();
  const status = text => { $('#collection-status').textContent = text; };
  function records() {
    return sites.map(site => {
      const entry = entries().find(entry => entry.draft.id === selections.get(site.id));
      if (!entry) throw new Error(`Choose a campaign for ${site.name}.`);
      if ($('#collection-source').value === 'named' && !entry.saved) throw new Error(`Save a named version of ${entry.draft.name || site.name}, or choose Current drafts.`);
      return $('#collection-source').value === 'named' ? entry.saved : entry.draft;
    });
  }
  function refresh() {
    generation++;
    $('#collection-export').setAttribute('aria-busy', 'false');
    if (!sites) { $('#download-collection').disabled = true; return; }
    for (const site of sites) {
      const candidates = entries().filter(entry => (entry.draft.reference.branding?.propertyId || 'bone-appetit') === site.id);
      const picker = $(`[data-collection-property="${site.id}"]`);
      if (!candidates.some(entry => entry.draft.id === selections.get(site.id))) {
        selections.set(site.id, candidates.length === 1 ? candidates[0].draft.id : '');
      }
      const placeholder = document.createElement('option'); placeholder.value = '';
      placeholder.textContent = !candidates.length ? 'Start or import a campaign for this property' : 'Choose a campaign';
      picker.replaceChildren(placeholder, ...candidates.map(entry => {
        const option = document.createElement('option'); option.value = entry.draft.id;
        const record = $('#collection-source').value === 'named' && entry.saved ? entry.saved : entry.draft;
        option.textContent = `${record.name.trim() || 'Untitled campaign'} · ${record.content.venueName}${$('#collection-source').value === 'named' && !entry.saved ? ' · No named version' : ''}`;
        return option;
      }));
      picker.value = selections.get(site.id); picker.disabled = !candidates.length;
    }
    try {
      records();
      $('#download-collection').disabled = !api;
      status(api ? 'Ready: four selected campaigns. Download uses the source shown above for all four.' : 'A collection export script is unavailable. Reload the workspace to retry.');
    } catch (error) { $('#download-collection').disabled = true; status(error.message); }
  }
  async function load() {
    $('#retry-collection').hidden = true;
    try {
      if (!api || !window.BoneWebsite || !window.BoneWebsiteExport) throw new Error('A collection script is unavailable. Reload the workspace to retry.');
      const response = await fetch('visitor-sites.json', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('The restaurant profiles could not be loaded.');
      sites = window.BoneWebsite.validateSites(await response.json());
      $('#collection-properties').replaceChildren(...sites.map(site => {
        const label = document.createElement('label'), name = document.createElement('span'), select = document.createElement('select');
        label.className = 'creator-field'; name.textContent = site.name;
        select.dataset.collectionProperty = site.id;
        select.addEventListener('change', () => { selections.set(site.id, select.value); refresh(); });
        label.append(name, select); return label;
      }));
      refresh();
    } catch (error) { status(`Collection export unavailable: ${error.message} Individual editing and exports remain available.`); $('#retry-collection').hidden = false; }
  }
  async function download() {
    const ticket = ++generation;
    try {
      const snapshot = structuredClone(records());
      const options = { sites: structuredClone(sites), sourceState: $('#collection-source').value };
      const prepared = api.prepare(model, snapshot, options);
      $('#download-collection').disabled = true;
      $('#collection-export').setAttribute('aria-busy', 'true');
      status('Preparing four complete connected websites…');
      const loaded = Object.fromEntries(await Promise.all(prepared.paths.map(async path => {
        if (!assets.has(path)) assets.set(path, (async () => {
          const response = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
          if (!response.ok) throw new Error(`Could not load ${path}.`);
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (!bytes.length || bytes.length > 16 * 1024 * 1024) throw new Error(`Resource empty or too large: ${path}.`);
          return bytes;
        })().catch(error => { assets.delete(path); throw error; }));
        return [path, await assets.get(path)];
      })));
      if (ticket !== generation) return;
      const pack = await api.createCollection(model, snapshot, options, loaded);
      if (ticket !== generation) return;
      const url = URL.createObjectURL(new Blob([api.zip(pack.files)], { type: 'application/zip' }));
      const link = document.createElement('a'); link.href = url; link.download = pack.filename;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status(`Collection ZIP prepared from all four ${options.sourceState === 'named' ? 'named versions' : 'current drafts'}. Extract the whole ZIP, open index.html, and use Choose your haunt to explore. Campaigns are unchanged.`);
    } catch (error) {
      if (ticket === generation) status(`Could not export collection: ${error.message} Campaigns are kept. Correct the selection/content or retry the download.`);
    } finally {
      if (ticket === generation) { $('#download-collection').disabled = false; $('#collection-export').setAttribute('aria-busy', 'false'); }
    }
  }
  $('#collection-source').addEventListener('change', refresh);
  $('#download-collection').addEventListener('click', download);
  $('#retry-collection').addEventListener('click', load);
  load();
  return { refresh };
};
