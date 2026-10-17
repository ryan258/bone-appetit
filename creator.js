'use strict';

(() => {
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const clone = value => structuredClone(value);
  const setText = (selector, text) => {
    const node = $(selector);
    if (node.textContent !== text) node.textContent = text;
  };
  const make = (tag, text) => {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    return element;
  };
  let model, repository, workspace, timer, marketing, website, collection, properties, pending = false, writeFailed = false;
  let recoveryRaw = null, undo = null, backedUpState = '', ready = false;
  const active = () => workspace.entries.find(entry => entry.draft.id === workspace.activeId);
  const announce = message => { $('#workspace-status').textContent = message; };
  const storageMessage = message => {
    $('#storage-status').textContent = message;
    $('#storage-status').hidden = !message;
    $('#download-recovery').hidden = recoveryRaw === null;
    $('#replace-damaged').hidden = recoveryRaw === null;
  };
  const problemMessage = error => error.name === 'QuotaExceededError'
    ? 'Browser storage is full. The work shown here remains in memory. Download a workspace backup to keep it.'
    : error.name === 'SecurityError' ? 'Browser saving is unavailable. Download a workspace backup to keep the work shown here.' : error.message;
  function persist(candidate = workspace, replaceDamaged = false) {
    clearTimeout(timer);
    pending = false;
    try {
      repository.save(candidate, replaceDamaged);
      writeFailed = false;
      recoveryRaw = null;
      storageMessage('');
      return true;
    } catch (error) {
      writeFailed = true;
      storageMessage(problemMessage(error));
      return false;
    }
  }
  function clearUndo() { undo = null; $('#undo-workspace').hidden = true; }
  function checkpoint() {
    clearTimeout(timer);
    pending = true;
    timer = setTimeout(() => { persist(); renderSaveState(); renderLibrary(); }, 400);
  }
  function renderSaveState() {
    const entry = active();
    if (!entry) return;
    $('#restore-named').disabled = !entry.saved || model.equivalent(entry.draft, entry.saved);
    setText('#draft-state', writeFailed ? 'This work is in memory. Download a backup to keep it.'
      : pending ? 'Recovering your draft…'
        : model.equivalent(entry.draft, entry.saved) ? 'Named version saved in this browser.'
          : entry.saved ? 'Draft recovered in this browser. Changes are not in the named version yet.'
            : 'Draft recovered in this browser. Save a named version when you are ready.');
  }
  function renderLibrary() {
    $('#library-empty').hidden = workspace.entries.length > 0;
    $('#backup-workspace').disabled = workspace.entries.length === 0;
    $('#backup-campaign').disabled = !active();
    $('#start-example').disabled = workspace.entries.length >= model.MAX_CAMPAIGNS;
    $('#duplicate-campaign').disabled = workspace.entries.length >= model.MAX_CAMPAIGNS;
    $$('[data-start-property]').forEach(button => { button.disabled = workspace.entries.length >= model.MAX_CAMPAIGNS; });
    $('#start-property-collection').disabled = !properties || workspace.entries.length > model.MAX_CAMPAIGNS - 3;
    const list = workspace.entries.map(entry => {
      const li = make('li'), button = make('button');
      button.type = 'button';
      button.dataset.campaignId = entry.draft.id;
      if (entry.draft.id === workspace.activeId) button.setAttribute('aria-current', 'true');
      const state = entry.saved ? model.equivalent(entry.draft, entry.saved) ? 'Named version' : 'Draft changes' : 'Draft';
      const date = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(entry.draft.updatedAt));
      button.append(make('strong', entry.draft.name.trim() || 'Untitled campaign'), make('span', `${state} · ${date}`));
      li.append(button);
      return li;
    });
    $('#campaign-list').replaceChildren(...list);
  }
  function renderMenuFields() {
    const entry = active();
    if (!entry) return;
    const item = entry.draft.content.menu.find(item => item.id === entry.view.menuId);
    $$('[data-menu]').forEach(input => { input.value = item[input.dataset.menu]; });
  }
  function renderAttractionFields() {
    const entry = active();
    if (!entry) return;
    const attraction = entry.draft.content.attractions[entry.view.attractionId];
    $$('[data-attraction-edit]').forEach(input => { input.value = attraction[input.dataset.attractionEdit]; });
  }
  function renderPreview() {
    const entry = active();
    if (!entry) return;
    const record = entry.draft, item = record.content.menu.find(item => item.id === entry.view.menuId);
    const attraction = record.content.attractions[entry.view.attractionId];
    const branding = record.reference.branding;
    $('.creator-preview-image').src = `assets/${window.BoneWebsite?.heroAsset(record.reference) || branding?.hero || 'haunted-roadhouse.webp'}`;
    $('.creator-preview-image').alt = window.BoneWebsite?.heroAlt(record.reference) || branding?.heroAlt || 'The fictional haunted pizzeria at Wicked Lane.';
    $('#preview-logo').src = `assets/${window.BoneWebsite?.logoAsset(record.reference) || 'bone-appetit-logo.webp'}`;
    const food = window.BoneWebsite?.foodArt(record.reference, item.id);
    $('#preview-food').hidden = !food;
    if (food) { $('#preview-food-image').src = `assets/${food.asset}`; $('#preview-food-image').alt = food.alt; }
    else { $('#preview-food-image').removeAttribute('src'); $('#preview-food-image').alt = ''; }
    $('#preview-venue').textContent = record.content.venueName || 'Venue name';
    $('#preview-headline').textContent = record.copy.headline || 'Your headline';
    $('#preview-introduction').textContent = record.copy.introduction;
    $('#preview-action').textContent = record.copy.actionLabel || 'Your action';
    $('#preview-menu-name').textContent = item.name || 'Item name';
    const amount = /^\d+(?:\.\d{1,2})?$/.test(item.price) ? Number(item.price) : NaN;
    $('#preview-menu-price').textContent = Number.isFinite(amount) ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: Number.isInteger(amount) ? 0 : 2 }).format(amount) : 'Price incomplete';
    $('#preview-menu-description').textContent = item.description;
    $('#preview-attraction-title').textContent = attraction.title || 'Attraction title';
    const experienceArt = window.BoneWebsite?.RESTAURANT_ART[branding?.propertyId || 'bone-appetit']?.attractions?.[entry.view.attractionId];
    $('#preview-experience-image').hidden = !experienceArt;
    if (experienceArt) { $('#preview-experience-image').src = `assets/${experienceArt.asset}`; $('#preview-experience-image').alt = experienceArt.alt; }
    else { $('#preview-experience-image').removeAttribute('src'); $('#preview-experience-image').alt = ''; }
    $('#preview-attraction-description').textContent = window.BonePlanner.createPlanner(record.reference).copy(attraction.description);
    try {
      model.materialize(record);
      setText('#preview-validation', 'Content is valid for a named version.');
    } catch (error) { setText('#preview-validation', error.message); }
  }
  function renderEditor() {
    const entry = active();
    $('#campaign-editor').hidden = !entry;
    $('#remove-campaign').disabled = !entry;
    if (!entry) return;
    const draft = entry.draft;
    $('#editor-title').textContent = draft.name.trim() || 'Untitled campaign';
    $('#campaign-name').value = draft.name;
    $('[data-field="venueName"]').value = draft.content.venueName;
    $$('[data-brief]').forEach(input => { input.value = draft.brief[input.dataset.brief]; });
    $$('[data-copy]').forEach(input => { input.value = draft.copy[input.dataset.copy]; });
    $('#menu-item-picker').replaceChildren(...draft.content.menu.map(item => {
      const option = make('option', `${draft.reference.menuCategories[item.category]} · ${item.name || item.id}`);
      option.value = item.id;
      return option;
    }));
    $('#menu-item-picker').value = entry.view.menuId;
    $('#attraction-picker').replaceChildren(...Object.entries(draft.content.attractions).map(([key, item]) => {
      const option = make('option', item.title || key); option.value = key; return option;
    }));
    $('#attraction-picker').value = entry.view.attractionId;
    $$('.creator-section').forEach((section, index) => { section.open = entry.view.sections[index]; });
    renderMenuFields();
    renderAttractionFields();
    renderPreview();
    renderSaveState();
  }
  function render() { renderLibrary(); renderEditor(); marketing?.refresh(); website?.refresh(true); collection?.refresh(); }
  function focusEditor() { $('#campaign-name').focus(); }
  function addCampaign(draft, view = null) {
    if (workspace.entries.length >= model.MAX_CAMPAIGNS) { announce('The workspace holds 20 campaigns. Back up and remove an unneeded one before adding another.'); return; }
    clearUndo();
    const entry = model.entryFor(draft);
    if (view) entry.view = clone(view);
    workspace.entries.push(entry);
    workspace.activeId = draft.id;
    persist();
    render();
    focusEditor();
  }
  function saveNamed(event) {
    event?.preventDefault();
    if (!active()) return;
    try {
      model.materialize(active().draft);
      const candidate = clone(workspace);
      const entry = candidate.entries.find(entry => entry.draft.id === candidate.activeId);
      entry.draft.name = entry.draft.name.trim();
      entry.draft.updatedAt = model.now();
      entry.saved = clone(entry.draft);
      if (!persist(candidate)) { renderSaveState(); announce('The named version could not be saved. Keep your draft with a backup.'); return; }
      workspace = candidate;
      marketing?.refresh();
      website?.refresh();
      collection?.refresh();
      clearUndo();
      renderLibrary();
      renderSaveState();
      $('#campaign-name').value = entry.draft.name;
      $('#editor-title').textContent = entry.draft.name;
      announce(`Saved named version: ${entry.draft.name}.`);
    } catch (error) { announce(`Could not save: ${error.message}`); }
  }
  function download(raw, filename) {
    const url = URL.createObjectURL(new Blob([raw], { type: 'application/json;charset=utf-8' }));
    const link = make('a');
    link.href = url; link.download = filename;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function loadProperties() {
    $('#retry-properties').hidden = true;
    $('#property-status').textContent = 'Loading the property starters…';
    try {
      if (!window.BoneProperties) throw new Error('The property script is unavailable. Reload the workspace to retry.');
      const response = await fetch('property-data.json', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('The bundled property content could not be loaded.');
      properties = window.BoneProperties.createCatalog(model, await response.json());
      const cards = properties.list.map(property => {
        const article = make('article'), image = make('img'), body = make('div'), button = make('button', 'Start this property');
        article.className = 'property-card'; image.src = `assets/${window.BoneWebsite?.HERO_ART[property.id]?.asset || property.hero}`; image.alt = window.BoneWebsite?.HERO_ART[property.id]?.alt || property.heroAlt; image.width = 1536; image.height = 1024;
        button.type = 'button'; button.className = 'text-link'; button.dataset.startProperty = property.id;
        button.setAttribute('aria-label', `Start ${property.name}`);
        const website = make('a', 'Explore the original property website ↗'); website.href = `${property.id}.html`; website.className = 'text-link';
        const logo = make('img'); logo.className = 'property-logo'; logo.src = `assets/${window.BoneWebsite?.RESTAURANT_ART[property.id]?.logo || 'bone-appetit-logo.webp'}`; logo.alt = ''; logo.width = 80; logo.height = 80;
        body.append(logo, make('p', property.type), make('h4', property.name), make('p', property.summary), button, website); article.append(image, body); return article;
      });
      $('#property-options').replaceChildren(...cards);
      $('#property-status').textContent = 'Start one property or add the collection. Existing campaigns are kept.';
      renderLibrary();
    } catch (error) {
      $('#property-status').textContent = `Could not load the property starters: ${error.message} Your campaigns and the original example remain available.`;
      $('#retry-properties').hidden = false;
    }
  }
  function propertyDraft(id, names) {
    let draft = properties.create(id);
    if (names.some(name => name.toLowerCase() === draft.name.toLowerCase())) draft = model.duplicate(draft, names);
    return draft;
  }
  function bindEvents() {
    $('#retry-properties').addEventListener('click', loadProperties);
    $('#property-options').addEventListener('click', event => {
      const button = event.target.closest('[data-start-property]');
      if (!button || !properties) return;
      try {
        const draft = propertyDraft(button.dataset.startProperty, workspace.entries.map(entry => entry.draft.name));
        addCampaign(draft); announce(`${draft.content.venueName} is ready to edit and pack.`);
      } catch (error) { announce(`Could not start this property: ${error.message}`); }
    });
    $('#start-property-collection').addEventListener('click', () => {
      if (!properties) return;
      try {
        if (workspace.entries.length > model.MAX_CAMPAIGNS - 3) throw new Error('The collection needs three free campaign spaces. Back up and remove an unneeded campaign first.');
        const candidate = clone(workspace), names = candidate.entries.map(entry => entry.draft.name), added = [];
        for (const property of properties.list) {
          const draft = propertyDraft(property.id, names); names.push(draft.name);
          candidate.entries.push(model.entryFor(draft)); added.push(draft.id);
        }
        candidate.activeId = added[0];
        model.serialize(candidate);
        workspace = candidate; clearUndo(); persist(); render(); focusEditor();
        announce('Added all three independent properties. Existing campaigns were kept. Select a campaign to edit it or build its marketing pack.');
      } catch (error) { announce(`Could not add the collection: ${error.message}`); }
    });
    $('#start-example').addEventListener('click', () => {
      let draft = model.newCampaign();
      const names = workspace.entries.map(entry => entry.draft.name);
      if (names.includes(draft.name)) draft = model.duplicate(draft, names);
      addCampaign(draft); announce('The Bone Appétit example is ready to edit.');
    });
    $('#duplicate-campaign').addEventListener('click', () => {
      if (!active()) return;
      addCampaign(model.duplicate(active().draft, workspace.entries.map(entry => entry.draft.name)), active().view);
      announce('Created an independent copy of the current draft.');
    });
    $('#campaign-list').addEventListener('click', event => {
      const button = event.target.closest('[data-campaign-id]');
      if (!button) return;
      workspace.activeId = button.dataset.campaignId;
      clearUndo();
      persist();
      render();
      focusEditor();
      announce('Resumed this campaign, including its recovered draft.');
    });
    $('#creator-form').addEventListener('input', event => {
      const input = event.target, entry = active();
      if (!entry) return;
      if (input.dataset.field === 'name') entry.draft.name = input.value;
      else if (input.dataset.field === 'venueName') entry.draft.content.venueName = input.value;
      else if (input.dataset.brief) entry.draft.brief[input.dataset.brief] = input.value;
      else if (input.dataset.copy) entry.draft.copy[input.dataset.copy] = input.value;
      else if (input.dataset.websiteKey) {
        const key = input.dataset.websiteKey;
        entry.draft.website ||= {};
        entry.draft.website[key] = key === 'GLANCE_ITEMS' ? input.value.split('\n') : key === 'STORY_PARAGRAPHS' ? input.value.split(/\n\s*\n/) : input.value;
      }
      else if (input.dataset.menu) entry.draft.content.menu.find(item => item.id === entry.view.menuId)[input.dataset.menu] = input.value;
      else if (input.dataset.attractionEdit) entry.draft.content.attractions[entry.view.attractionId][input.dataset.attractionEdit] = input.value;
      else return;
      if (input.dataset.menu === 'name') $('#menu-item-picker').selectedOptions[0].textContent = `${entry.draft.reference.menuCategories[entry.draft.content.menu.find(item => item.id === entry.view.menuId).category]} · ${input.value || entry.view.menuId}`;
      if (input.dataset.attractionEdit === 'title') $('#attraction-picker').selectedOptions[0].textContent = input.value || entry.view.attractionId;
      entry.draft.updatedAt = model.now();
      marketing?.refresh();
      website?.refresh();
      collection?.refresh();
      clearUndo();
      checkpoint();
      // Keep focused fields in place; only non-interactive preview text changes.
      $('#editor-title').textContent = entry.draft.name.trim() || 'Untitled campaign';
      renderPreview();
      renderSaveState();
    });
    $('#menu-item-picker').addEventListener('change', event => {
      active().view.menuId = event.target.value;
      checkpoint(); renderMenuFields(); renderPreview();
    });
    $('#attraction-picker').addEventListener('change', event => {
      active().view.attractionId = event.target.value;
      checkpoint(); renderAttractionFields(); renderPreview();
    });
    $$('.creator-section').forEach((section, index) => section.addEventListener('toggle', () => {
      const entry = active();
      if (!entry || entry.view.sections[index] === section.open) return;
      entry.view.sections[index] = section.open;
      checkpoint();
    }));
    $('#creator-form').addEventListener('submit', saveNamed);
    document.addEventListener('keydown', event => {
      if (active() && (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 's') saveNamed(event);
    });
    $('#restore-named').addEventListener('click', () => {
      if (!active()?.saved) return;
      undo = clone(workspace);
      active().draft = clone(active().saved);
      persist(); render();
      $('#undo-workspace').hidden = false;
      $('#undo-workspace').textContent = 'Undo restore';
      focusEditor(); announce('Restored the named version. Undo restore can bring the previous draft back.');
    });
    $('#remove-campaign').addEventListener('click', () => {
      if (!active()) return;
      undo = clone(workspace);
      workspace.entries = workspace.entries.filter(entry => entry.draft.id !== workspace.activeId);
      workspace.activeId = workspace.entries[0]?.draft.id || null;
      persist(); render();
      $('#undo-workspace').hidden = false;
      $('#undo-workspace').textContent = 'Undo remove';
      $('#undo-workspace').focus(); announce('Removed this campaign. Undo remove brings its draft and named version back.');
    });
    $('#undo-workspace').addEventListener('click', () => {
      if (!undo) return;
      workspace = undo; clearUndo(); persist(); render(); focusEditor(); announce('The previous campaign state is restored.');
    });
    $('#backup-workspace').addEventListener('click', () => {
      try {
        download(model.backup(workspace), `bone-appetit-workspace-${new Date().toISOString().slice(0, 10)}.json`);
        backedUpState = JSON.stringify(workspace);
        announce('Workspace backup prepared, including all named versions and current drafts.');
      } catch (error) { announce(`Could not prepare backup: ${error.message}`); }
    });
    $('#backup-campaign').addEventListener('click', () => {
      if (!active()) return;
      try {
        download(model.backup({ version: 1, activeId: workspace.activeId, entries: [clone(active())] }), 'bone-appetit-campaign-backup.json');
        announce('Current campaign backup prepared, including its named version and draft.');
      } catch (error) { announce(`Could not prepare campaign backup: ${error.message}`); }
    });
    $('#import-backup').addEventListener('change', async event => {
      const file = event.target.files[0];
      event.target.value = '';
      if (!file) return;
      try {
        if (file.size > model.MAX_BYTES) throw new Error('Choose a JSON backup no larger than 2 MiB.');
        const imported = model.parseBackup(await file.text());
        // Merge into the latest in-memory work after reading, so edits made while
        // a file is being read cannot be replaced by an earlier snapshot.
        const candidate = model.mergeImport(workspace, imported);
        workspace = candidate;
        clearUndo(); persist(); render(); focusEditor();
        announce(`Imported ${imported.entries.length} campaign ${imported.entries.length === 1 ? 'copy' : 'copies'}. Existing campaigns were kept.`);
      } catch (error) { announce(`Import was not applied: ${error.message}`); }
    });
    $('#download-recovery').addEventListener('click', () => {
      if (recoveryRaw !== null) download(recoveryRaw, 'bone-appetit-unreadable-local-data.json');
    });
    $('#replace-damaged').addEventListener('click', () => {
      if (recoveryRaw === null || !window.confirm('Replace the unreadable local creator copy with the campaigns shown here? Download its recovery file first if you want to keep the original data.')) return;
      if (persist(workspace, true)) { renderSaveState(); announce('Replaced the unreadable local copy with the current workspace.'); }
    });
    $('#reload-workspace').addEventListener('click', () => {
      if (pending) persist();
      if (writeFailed && backedUpState !== JSON.stringify(workspace) && !window.confirm('The work shown here could not be stored. Reloading can discard it. Download a workspace backup first, or choose OK to reload anyway.')) return;
      window.location.reload();
    });
    window.addEventListener('pagehide', () => { if (pending) persist(); });
    window.addEventListener('beforeunload', event => {
      if (pending) persist();
      if (writeFailed && workspace.entries.length && backedUpState !== JSON.stringify(workspace)) { event.preventDefault(); event.returnValue = ''; }
    });
    window.addEventListener('storage', event => {
      if (event.key !== window.BoneCreator.KEY && event.key !== null) return;
      writeFailed = true;
      storageMessage('Another tab changed this workspace. Back up the work shown here, then reload the saved workspace.');
      renderSaveState();
    });
  }
  async function startup() {
    if (ready) return;
    $('#retry-startup').hidden = true;
    $('#startup-status').textContent = 'Loading the example and your local workspace…';
    try {
      if (!window.BoneCreator || !window.BoneWebsiteCopy) throw new Error('A creator script is unavailable.');
      const response = await fetch('site-data.json', { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('The reference content could not be loaded.');
      model = window.BoneCreator.createModel(await response.json());
      repository = window.BoneCreator.createRepository({ getItem: key => window.localStorage.getItem(key), setItem: (key, value) => window.localStorage.setItem(key, value) }, model);
      const loaded = repository.load();
      workspace = loaded.workspace;
      recoveryRaw = loaded.recoveryRaw;
      writeFailed = !!loaded.problem;
      storageMessage(loaded.problem);
      if (window.BoneMarketingWorkspace) marketing = window.BoneMarketingWorkspace({ model, active });
      else {
        $('#build-pack').disabled = true;
        $('#pack-status').textContent = 'A marketing script is unavailable. Reload the workspace to retry.';
      }
      if (window.BoneWebsiteWorkspace) website = window.BoneWebsiteWorkspace({ model, active, checkpoint });
      else $('#website-status').textContent = 'A website preview script is unavailable. Reload the workspace to retry. Your campaign editing and saves remain available.';
      if (window.BoneCollectionWorkspace) collection = window.BoneCollectionWorkspace({ model, entries: () => workspace.entries });
      else $('#collection-status').textContent = 'A collection export script is unavailable. Reload the workspace to retry.';
      bindEvents();
      render();
      ready = true;
      document.documentElement.classList.add('creator-ready');
      $('#startup-status').hidden = true;
      if (active()) announce('Resumed your last campaign, including its recovered draft and editing section.');
      loadProperties();
    } catch (error) {
      $('#startup-status').textContent = `Could not open the workspace: ${error.message} Open it through Preview.command, then retry.`;
      $('#retry-startup').hidden = false;
    }
  }
  $('#retry-startup').addEventListener('click', () => window.location.reload());
  startup();
})();
