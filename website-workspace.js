/* Creator adapter: the same full-site renderer, isolated from visitor storage. */
'use strict';
window.BoneWebsiteWorkspace = function({ model, active, checkpoint }) {
  const $ = selector => document.querySelector(selector);
  const api = window.BoneWebsite, copyAPI = window.BoneWebsiteCopy, exportAPI = window.BoneWebsiteExport;
  let sites, template, resources, generation = 0, editorId = null, readyToken = null, exportGeneration = 0;
  const exportAssets = new Map();
  const frame = $('#website-preview');
  const status = message => { $('#website-status').textContent = message; };
  const source = () => $('#website-source').value === 'named' ? active()?.saved : active()?.draft;
  async function fetchText(path) {
    const response = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Could not load ${path}.`);
    return response.text();
  }
  function fillField() {
    const record = active()?.draft;
    if (!record || !sites) return;
    const key = $('#website-field').value, field = copyAPI.FIELDS.find(field => field.key === key);
    const copy = copyAPI.resolve(record, sites, false).find(site => site.id === (record.reference.branding?.propertyId || 'bone-appetit')).copy;
    $('#website-copy-edit').value = field.array ? copy[key].join(key === 'GLANCE_ITEMS' ? '\n' : '\n\n') : copy[key];
    $('#website-copy-edit').dataset.websiteKey = key;
    $('#website-field-label').textContent = field.label;
    $('#website-field-hint').textContent = key === 'GLANCE_ITEMS' ? 'Enter exactly four facts, one per line.' : key === 'STORY_PARAGRAPHS' ? 'Separate story paragraphs with a blank line. Up to eight paragraphs.' : /HEADLINE|HEADING|SIGNOFF|ACCESS_NOTE/.test(key) ? 'Use *words* for emphasis and a new line for a line break. HTML stays plain text.' : 'Plain text. The original layout and artwork are kept.';
  }
  function refresh(editing = false) {
    generation++; exportGeneration++; readyToken = null;
    $('#website-export-status').textContent = exportAPI ? 'Choose a source, then download its complete website.' : 'A website export script is unavailable. Reload the workspace to retry.';
    $('#website-results').hidden = true; frame.removeAttribute('srcdoc');
    $('#website-workspace').setAttribute('aria-busy', 'false');
    const entry = active();
    $('#website-source option[value="named"]').disabled = !entry?.saved;
    if (!entry?.saved) $('#website-source').value = 'draft';
    $('#preview-website').disabled = !entry || !sites;
    $('#download-website').disabled = !entry || !sites || !exportAPI;
    if (sites) status('Preview the selected source. Changes clear the previous preview; refresh when you are ready.');
    if (entry && sites && (editing || editorId !== entry.draft.id)) {
      $('#website-field').value = entry.view.websiteField || 'STORY_HEADING';
      $('.website-copy-fields').open = entry.view.websiteOpen || false;
      fillField();
    }
    editorId = entry?.draft.id;
  }
  async function load() {
    $('#retry-website').hidden = true;
    try {
      if (!api || !copyAPI) throw new Error('A website preview script is unavailable. Reload the workspace to retry.');
      const loaded = await Promise.all([fetchText('visitor-sites.json'), fetchText('index.template.html')]);
      sites = api.validateSites(JSON.parse(loaded[0])); template = loaded[1];
      $('#website-field').replaceChildren(...copyAPI.FIELDS.map(field => {
        const option = document.createElement('option'); option.value = field.key; option.textContent = field.label; return option;
      }));
      $('#website-field').value = 'STORY_HEADING';
      for (const id of ['website-field','website-copy-edit','website-reset-field']) $('#' + id).disabled = false;
      refresh(true);
    } catch (error) { status(`Website preview unavailable: ${error.message} Your campaign editing and saves remain available.`); $('#retry-website').hidden = false; }
  }
  async function styles() {
    if (!resources) resources = (async () => {
      const css = await Promise.all(['styles.css','properties.css','field-notes.css'].map(fetchText));
      // Opaque sandbox origins cannot load same-origin-only font requests. Embed
      // the four bundled fonts so the original typography survives isolation.
      const paths = [...css[0].matchAll(/url\('(assets\/fonts\/[a-z0-9-]+\.ttf)'\)/g)].map(match => match[1]);
      for (const path of paths) {
        const response = await fetch(path, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error(`Could not load ${path}.`);
        const bytes = new Uint8Array(await response.arrayBuffer()); let binary = '';
        for (let index = 0; index < bytes.length; index += 8192) binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
        css[0] = css[0].replaceAll(path, `data:font/ttf;base64,${btoa(binary)}`);
      }
      return css;
    })().catch(error => { resources = null; throw error; });
    return resources;
  }
  async function preview() {
    refresh();
    const ticket = generation, record = source() && structuredClone(source());
    if (!record || !sites) return;
    try {
      const data = model.materialize(record), profiles = copyAPI.resolve(record, sites);
      $('#preview-website').disabled = true;
      $('#website-workspace').setAttribute('aria-busy', 'true');
      status('Preparing the full website from this campaign…');
      const [css, mapSVG] = await Promise.all([styles(), fetchText(`assets/${data.map.image}`)]);
      if (ticket !== generation) return;
      const html = api.render(data, template, { sites: profiles, mapSVG, noteCSS: css[2] });
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const base = doc.createElement('base'); base.href = new URL('.', location.href).href; doc.head.prepend(base);
      doc.querySelectorAll('link[rel="stylesheet"],link[rel="preload"]').forEach(node => node.remove());
      css.forEach(text => { const style = doc.createElement('style'); style.textContent = text; doc.head.append(style); });
      readyToken = String(ticket);
      doc.documentElement.setAttribute('data-creator-preview', readyToken);
      frame.title = `${record.content.venueName} — ${$('#website-source').value === 'named' ? 'named version' : 'current draft'} website preview`;
      $('#website-provenance').textContent = `${record.name} · ${$('#website-source').value === 'named' ? 'Last named version' : 'Current draft'} · Edited ${new Date(record.updatedAt).toLocaleString()} · Preview plans clear on refresh`;
      $('#website-results').hidden = false;
      status('Website rendered. Loading its interactive menus and planner…');
      frame.srcdoc = '<!doctype html>\n' + doc.documentElement.outerHTML;
    } catch (error) {
      if (ticket !== generation) return;
      status(`Could not preview: ${error.message} Your draft is kept. Correct the field or retry Preview full website.`);
    } finally {
      if (ticket === generation) { $('#preview-website').disabled = false; $('#website-workspace').setAttribute('aria-busy', 'false'); }
    }
  }
  async function downloadWebsite() {
    const ticket = ++exportGeneration, record = source() && structuredClone(source());
    if (!record || !sites || !exportAPI) return;
    const exportStatus = message => { $('#website-export-status').textContent = message; };
    try {
      const options = { sourceState: $('#website-source').value, sites };
      const prepared = exportAPI.prepare(model, record, options);
      $('#download-website').disabled = true;
      exportStatus('Preparing the complete website, artwork, styles, and planner…');
      const assets = Object.fromEntries(await Promise.all(prepared.paths.map(async path => {
        if (!exportAssets.has(path)) exportAssets.set(path, (async () => {
          const response = await fetch(path, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
          if (!response.ok) throw new Error(`Could not load ${path}.`);
          const bytes = new Uint8Array(await response.arrayBuffer());
          if (!bytes.length || bytes.length > 16 * 1024 * 1024) throw new Error(`Website resource is empty or too large: ${path}.`);
          return bytes;
        })().catch(error => { exportAssets.delete(path); throw error; }));
        return [path, await exportAssets.get(path)];
      })));
      if (ticket !== exportGeneration) return;
      const pack = await exportAPI.createWebsite(model, record, options, assets);
      if (ticket !== exportGeneration) return;
      const bytes = exportAPI.zip(pack.files);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
      const link = document.createElement('a'); link.href = url; link.download = pack.filename;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      exportStatus(`Website ZIP prepared for ${pack.title} from the ${options.sourceState === 'named' ? 'last named version' : 'current draft'}. Extract the whole ZIP and open index.html. Your campaign is unchanged.`);
    } catch (error) {
      if (ticket === exportGeneration) exportStatus(`Could not export website: ${error.message} Your campaign is kept. Correct the field or retry Download complete website ZIP.`);
    } finally {
      if (ticket === exportGeneration) $('#download-website').disabled = false;
    }
  }
  window.addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.data?.type !== 'bone-website-ready' || event.data.token !== readyToken) return;
    status('Full website ready. Explore its menu, attractions, and planner. Preview plans stay only in this frame.');
  });
  frame.addEventListener('load', () => {
    const ticket = generation;
    setTimeout(() => {
      if (ticket === generation && readyToken && $('#website-status').textContent.startsWith('Website rendered.')) status('The full static website is available. An interactive script did not load; use Preview full website to retry.');
    }, 1000);
  });
  $('#preview-website').addEventListener('click', preview);
  $('#download-website').addEventListener('click', downloadWebsite);
  $('#website-source').addEventListener('change', () => refresh());
  $('#website-size').addEventListener('change', event => { frame.dataset.size = event.target.value; });
  $('#website-field').addEventListener('change', () => {
    if (!active()) return;
    active().view.websiteField = $('#website-field').value;
    fillField(); checkpoint();
  });
  $('.website-copy-fields').addEventListener('toggle', event => {
    if (!active() || !!active().view.websiteOpen === event.target.open) return;
    active().view.websiteOpen = event.target.open; checkpoint();
  });
  $('#website-reset-field').addEventListener('click', () => {
    const record = active()?.draft; if (!record || !sites) return;
    const key = $('#website-field').value;
    const base = sites.find(site => site.id === (record.reference.branding?.propertyId || 'bone-appetit')).copy[key];
    $('#website-copy-edit').value = Array.isArray(base) ? base.join(key === 'GLANCE_ITEMS' ? '\n' : '\n\n') : base;
    $('#website-copy-edit').dispatchEvent(new Event('input', { bubbles: true }));
  });
  $('#retry-website').addEventListener('click', load);
  load();
  return { refresh };
};
