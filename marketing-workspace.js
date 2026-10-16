/* Browser adapter: preview/export a frozen campaign without changing its save. */
'use strict';
window.BoneMarketingWorkspace = function({ model, active }) {
  const $ = selector => document.querySelector(selector);
  const api = window.BoneMarketing;
  const decoder = new TextDecoder();
  let pack = null, generation = 0, campaignId = null;
  const assetPromises = new Map();
  const status = text => { if ($('#pack-status').textContent !== text) $('#pack-status').textContent = text; };
  const source = () => $('#pack-source').value === 'named' ? active()?.saved : active()?.draft;
  function invalidate() {
    generation++;
    pack = null;
    $('#pack-results').hidden = true;
    $('#pack-preview').srcdoc = '';
    $('#build-pack').disabled = false;
    $('#marketing-pack').setAttribute('aria-busy', 'false');
    status('Build a pack from the selected source. Editing the campaign or export choices clears the previous pack.');
  }
  function refresh() {
    invalidate();
    const entry = active();
    if (!entry) return;
    $('#pack-source option[value="named"]').disabled = !entry.saved;
    if (!entry.saved) $('#pack-source').value = 'draft';
    const record = source();
    const previousIds = campaignId === record.id ? [...document.querySelectorAll('[data-pack-menu]:checked')].map(input => input.value) : record.reference.featured.slice(0, 3).map(item => item.id);
    const previousAttraction = campaignId === record.id ? $('#pack-attraction').value : 'hollow';
    campaignId = record.id;
    const labels = record.content.menu.map(item => {
      const label = document.createElement('label'), input = document.createElement('input');
      input.type = 'checkbox'; input.value = item.id; input.dataset.packMenu = '';
      input.checked = previousIds.includes(item.id);
      const name = document.createElement('span'); name.textContent = `${record.reference.menuCategories[item.category]} · ${item.name || item.id}`;
      label.append(input, name); return label;
    });
    $('#pack-menu-items').replaceChildren(...labels);
    $('#pack-attraction').replaceChildren(...Object.entries(record.content.attractions).map(([key, item]) => {
      const option = document.createElement('option'); option.value = key; option.textContent = item.title || key; return option;
    }));
    $('#pack-attraction').value = previousAttraction || 'hollow';
  }
  async function loadAssets(record) {
    const paths = api.assetsFor(record), cacheKey = JSON.stringify(paths);
    if (!assetPromises.has(cacheKey)) assetPromises.set(cacheKey, Promise.all(Object.entries(paths).map(async ([key, path]) => {
      const response = await fetch(path, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Could not load ${path}. Retry building the pack.`);
      return [key, new Uint8Array(await response.arrayBuffer())];
    })).then(entries => Object.fromEntries(entries)).catch(error => { assetPromises.delete(cacheKey); throw error; }));
    return assetPromises.get(cacheKey);
  }
  function preview() {
    if (!pack) return;
    const key = $('#pack-piece').value;
    $('#print-pack-piece').disabled = true;
    $('#pack-preview').title = `${api.TITLES[key]} — ${pack.title}`;
    $('#pack-preview').srcdoc = decoder.decode(pack.files.find(file => file.name === `${key}.html`).bytes);
  }
  function download(bytes, filename, type) {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const link = document.createElement('a'); link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('#pack-source').addEventListener('change', refresh);
  $('#pack-menu-items').addEventListener('change', invalidate);
  $('#pack-attraction').addEventListener('change', invalidate);
  $('#build-pack').addEventListener('click', async () => {
    invalidate();
    const token = generation;
    try {
      if (!api) throw new Error('The marketing script is unavailable. Reload the workspace to retry.');
      const record = structuredClone(source());
      const options = { sourceState: $('#pack-source').value, menuIds: [...document.querySelectorAll('[data-pack-menu]:checked')].map(input => input.value), attractionId: $('#pack-attraction').value };
      api.prepare(model, record, options);
      $('#build-pack').disabled = true;
      $('#marketing-pack').setAttribute('aria-busy', 'true');
      status('Building six pieces and embedding the local art and fonts…');
      const result = await api.createPack(model, record, options, await loadAssets(record));
      if (token !== generation) return;
      pack = result;
      $('#pack-results').hidden = false;
      $('#pack-provenance').textContent = `${pack.title} · ${pack.sourceState === 'named' ? 'Last named version' : 'Current draft'} · Built ${pack.manifest.generatedAt}. Review required; nothing has been published.`;
      preview();
      status(`Six pieces are ready from the ${pack.sourceState === 'named' ? 'last named version' : 'current draft'}. Start with the review summary, then download the ZIP.`);
    } catch (error) {
      if (token === generation) status(`Could not build the pack: ${error.message}`);
    } finally {
      if (token === generation) { $('#build-pack').disabled = false; $('#marketing-pack').setAttribute('aria-busy', 'false'); }
    }
  });
  $('#pack-piece').addEventListener('change', preview);
  $('#pack-preview').addEventListener('load', () => {
    const main = $('#pack-preview').contentDocument?.querySelector('main');
    $('#print-pack-piece').disabled = !pack || !main?.classList.contains($('#pack-piece').value);
  });
  $('#download-pack').addEventListener('click', () => {
    if (!pack) return;
    try {
      download(api.zip(pack.files), `${pack.manifest.campaign.propertyId || 'bone-appetit'}-marketing-pack.zip`, 'application/zip');
      status('ZIP prepared. Extract it and open index.html. Review every piece before use.');
    } catch (error) { status(`Could not prepare the ZIP: ${error.message}`); }
  });
  for (const [id, extension, type] of [['download-pack-html', 'html', 'text/html;charset=utf-8'], ['download-pack-text', 'txt', 'text/plain;charset=utf-8']]) {
    $('#' + id).addEventListener('click', () => {
      if (!pack) return;
      const file = pack.files.find(file => file.name === `${$('#pack-piece').value}.${extension}`);
      download(file.bytes, file.name, type);
      status(`${file.name} prepared from the displayed pack.`);
    });
  }
  $('#print-pack-piece').addEventListener('click', async () => {
    if (!pack) return;
    const frame = $('#pack-preview'), token = generation, piece = $('#pack-piece').value;
    try {
      await frame.contentDocument.fonts.ready;
      if (token !== generation || piece !== $('#pack-piece').value) return;
      frame.contentWindow.focus(); frame.contentWindow.print();
    } catch (error) { status('Printing is unavailable here. Download this HTML and open it in your browser, then use Print.'); }
  });
  return { refresh };
};
