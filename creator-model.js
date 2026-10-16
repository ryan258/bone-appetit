/* Portable creator records and storage transactions. No DOM or packages. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./planner.js'), require('./property-catalog.js'), require('./website-copy.js'));
  else root.BoneCreator = factory(root.BonePlanner, root.BoneProperties, root.BoneWebsiteCopy);
})(typeof globalThis === 'object' ? globalThis : this, function(plannerAPI, propertyAPI, websiteCopy) {
  'use strict';
  const KEY = 'bone-appetit-creator-v1';
  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_CAMPAIGNS = 20;
  const BRIEF_FIELDS = ['audience', 'objective', 'occasion', 'offer', 'callToAction', 'tone', 'channels', 'startsOn', 'endsOn', 'boundaries'];
  const clone = value => structuredClone(value);
  const fail = message => { throw new TypeError(message); };
  const bytes = text => new TextEncoder().encode(text).length;
  const object = (value, path, keys) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${path} must be an object.`);
    if (keys && (Object.keys(value).length !== keys.length || !keys.every(key => Object.hasOwn(value, key)))) fail(`${path} has missing or unsupported fields.`);
  };
  const text = (value, path, max = 4000, required = false) => {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) fail(`${path} ${required ? 'is required and' : ''} must be text of at most ${max} characters.`);
  };
  const timestamp = (value, path) => {
    if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail(`${path} must be an ISO timestamp.`);
  };
  const id = value => {
    if (typeof value !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(value)) fail('Campaign ID is invalid.');
  };
  function createModel(example, options = {}) {
    plannerAPI.createPlanner(example);
    const now = options.now || (() => new Date().toISOString());
    const newId = options.newId || (() => globalThis.crypto.randomUUID());
    const imageFile = image => image.endsWith('.svg') ? image : image + '.webp';
    const knownArt = new Set([example.map.image, ...example.oddities.map(item => item.image),
      ...example.featured.map(item => imageFile(item.image)), ...Object.values(example.attractions).map(item => imageFile(item.image)),
      ...(example.branding ? [example.branding.hero] : []), ...(propertyAPI?.ART || [])]);

    function validateDraft(record) {
      object(record, 'Campaign', ['id', 'name', 'createdAt', 'updatedAt', 'brief', 'copy', 'reference', 'content', ...(record && Object.hasOwn(record, 'website') ? ['website'] : [])]);
      if (Object.hasOwn(record, 'website')) websiteCopy.validate(record.website);
      id(record.id);
      text(record.name, 'Campaign name', 120);
      timestamp(record.createdAt, 'Created date');
      timestamp(record.updatedAt, 'Edited date');
      object(record.brief, 'Brief', BRIEF_FIELDS);
      BRIEF_FIELDS.forEach(key => text(record.brief[key], `Brief ${key}`, key.endsWith('On') ? 10 : 4000));
      object(record.copy, 'Campaign copy', ['headline', 'introduction', 'actionLabel']);
      text(record.copy.headline, 'Headline', 180);
      text(record.copy.introduction, 'Introduction', 2000);
      text(record.copy.actionLabel, 'Action label', 80);
      // Backups contain their reference snapshot, so later source copy edits do not
      // silently change a recovered campaign. Art is restricted to bundled files.
      plannerAPI.createPlanner(record.reference);
      const referenceArt = [record.reference.map.image, ...record.reference.oddities.map(item => item.image),
        ...record.reference.featured.map(item => imageFile(item.image)), ...Object.values(record.reference.attractions).map(item => imageFile(item.image)),
        ...(record.reference.branding ? [record.reference.branding.hero] : [])];
      if (referenceArt.some(asset => !knownArt.has(asset))) fail('Campaign reference uses artwork outside this bundled edition.');
      const items = Object.entries(record.reference.menu).flatMap(([category, entries]) => entries.map(item => ({ ...item, category })));
      if (items.length > 200) fail('A campaign can contain at most 200 menu items.');
      object(record.content, 'Editable content', ['venueName', 'menu', 'attractions']);
      text(record.content.venueName, 'Venue name', 120);
      if (!Array.isArray(record.content.menu) || record.content.menu.length !== items.length) fail('Editable menu must match the reference menu.');
      record.content.menu.forEach((item, index) => {
        object(item, `Menu item ${index + 1}`, ['id', 'category', 'name', 'description', 'price']);
        if (item.id !== items[index].id || item.category !== items[index].category) fail('Editable menu IDs and categories must match the reference.');
        text(item.name, 'Menu name', 120);
        text(item.description, 'Menu description', 2000);
        text(item.price, 'Menu price', 20);
      });
      const attractionKeys = Object.keys(record.reference.attractions);
      object(record.content.attractions, 'Editable attractions', attractionKeys);
      for (const key of attractionKeys) {
        object(record.content.attractions[key], `Attraction ${key}`, ['title', 'description']);
        text(record.content.attractions[key].title, `Attraction ${key} title`, 120);
        text(record.content.attractions[key].description, `Attraction ${key} description`, 4000);
      }
      return record;
    }
    function materialize(record) {
      validateDraft(record);
      text(record.name, 'Campaign name', 120, true);
      text(record.copy.headline, 'Headline', 180, true);
      text(record.copy.introduction, 'Introduction', 2000, true);
      text(record.copy.actionLabel, 'Action label', 80, true);
      text(record.content.venueName, 'Venue name', 120, true);
      for (const key of ['startsOn', 'endsOn']) {
        const value = record.brief[key];
        if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value + 'T12:00:00Z'))
          || new Date(value + 'T12:00:00Z').toISOString().slice(0, 10) !== value)) fail(`Brief ${key} must be a real YYYY-MM-DD date or empty.`);
      }
      if (record.brief.startsOn && record.brief.endsOn && record.brief.startsOn > record.brief.endsOn) fail('Brief end date must be on or after its start date.');
      if (record.website) websiteCopy.validate(record.website, true);
      const data = clone(record.reference);
      data.name = record.content.venueName.trim();
      record.content.menu.forEach(edit => {
        if (!/^\d+(?:\.\d{1,2})?$/.test(edit.price)) fail(`Menu price for ${edit.name || edit.id} must be a non-negative amount with at most two decimal places.`);
        const item = data.menu[edit.category].find(item => item.id === edit.id);
        item.name = edit.name;
        if (edit.description !== item.description) {
          const feature = data.featured.find(feature => feature.id === edit.id);
          if (feature) feature.description = edit.description;
        }
        item.description = edit.description;
        item.price = Number(edit.price);
      });
      for (const [key, edit] of Object.entries(record.content.attractions)) {
        if (edit.title !== data.attractions[key].title) data.attractions[key].card.title = edit.title;
        if (edit.description !== data.attractions[key].description) data.attractions[key].card.copy = plannerAPI.createPlanner(record.reference).copy(edit.description);
        data.attractions[key].title = edit.title;
        data.attractions[key].description = edit.description;
      }
      plannerAPI.createPlanner(data);
      return data;
    }
    function newCampaign() {
      const date = now();
      return {
        id: newId(), name: 'Bone Appétit · 2026 concept', createdAt: date, updatedAt: date,
        brief: {
          audience: 'Families, night owls, and visitors who prefer a gentle Halloween outing.',
          objective: 'Introduce the fictional destination and invite visitors to explore a possible visit.',
          occasion: 'The fixed 2026 Halloween concept season.',
          offer: 'Wood-fired pizza, an optional pumpkin trail, and six oddities to browse.',
          callToAction: 'Explore the menu and build a fictional visit.',
          tone: 'Warm absurdity and cheerful administration of unexplained events.',
          channels: 'Website', startsOn: example.season.start, endsOn: example.season.end,
          boundaries: 'Keep operational information clear. All venue details are fictional. No booking or payment claims.'
        },
        copy: {
          headline: 'Come hungry.\nLeave haunted.',
          introduction: 'Wood-fired pizza. Pumpkin-lit paths. A family business with an extra place setting and a rather loose approach to the guest register. Pull over and stay a spell.',
          actionLabel: 'Make a night of it'
        },
        reference: clone(example),
        content: {
          venueName: example.name,
          menu: Object.entries(example.menu).flatMap(([category, items]) => items.map(item => ({ id: item.id, category, name: item.name, description: item.description, price: String(item.price) }))),
          attractions: Object.fromEntries(Object.entries(example.attractions).map(([key, item]) => [key, { title: item.title, description: item.description }]))
        }
      };
    }
    function uniqueName(base, names, suffix) {
      let index = 1, name;
      do {
        const ending = ` (${suffix}${index === 1 ? '' : ` ${index}`})`;
        name = (base.trim() || 'Untitled campaign').slice(0, 120 - ending.length) + ending;
        index++;
      } while (names.some(existing => existing.toLowerCase() === name.toLowerCase()));
      return name;
    }
    function duplicate(record, names = []) {
      validateDraft(record);
      const copy = clone(record);
      copy.id = newId();
      copy.name = uniqueName(record.name, names, 'copy');
      copy.createdAt = copy.updatedAt = now();
      return copy;
    }
    const emptyWorkspace = () => ({ version: 1, activeId: null, entries: [] });
    const entryFor = draft => ({ draft: clone(draft), saved: null, view: { menuId: draft.content.menu[0].id, attractionId: Object.keys(draft.content.attractions)[0], sections: [true, true, true, false] } });
    function validateWorkspace(workspace) {
      object(workspace, 'Workspace', ['version', 'activeId', 'entries']);
      if (workspace.version !== 1) fail('Unsupported workspace version. This edition reads version 1.');
      if (!Array.isArray(workspace.entries) || workspace.entries.length > MAX_CAMPAIGNS) fail(`A workspace can contain at most ${MAX_CAMPAIGNS} campaigns.`);
      const ids = new Set();
      workspace.entries.forEach(entry => {
        object(entry, 'Campaign entry', ['draft', 'saved', 'view']);
        validateDraft(entry.draft);
        object(entry.view, 'Campaign view', ['menuId', 'attractionId', 'sections',
          ...(entry.view && Object.hasOwn(entry.view, 'websiteField') ? ['websiteField'] : []),
          ...(entry.view && Object.hasOwn(entry.view, 'websiteOpen') ? ['websiteOpen'] : [])]);
        if (Object.hasOwn(entry.view, 'websiteField') && !websiteCopy.FIELDS.some(field => field.key === entry.view.websiteField)) fail('Campaign view references an unsupported website field.');
        if (Object.hasOwn(entry.view, 'websiteOpen') && typeof entry.view.websiteOpen !== 'boolean') fail('Campaign website panel state must be open or closed.');
        if (!entry.draft.content.menu.some(item => item.id === entry.view.menuId) || !Object.hasOwn(entry.draft.content.attractions, entry.view.attractionId)) fail('Campaign view references missing content.');
        if (!Array.isArray(entry.view.sections) || entry.view.sections.length !== 4 || entry.view.sections.some(value => typeof value !== 'boolean')) fail('Campaign view sections must contain four open/closed values.');
        if (ids.has(entry.draft.id)) fail('Workspace contains duplicate campaign IDs.');
        ids.add(entry.draft.id);
        if (entry.saved !== null) {
          materialize(entry.saved);
          if (entry.saved.id !== entry.draft.id) fail('Saved version and draft must have the same campaign ID.');
          if (JSON.stringify(entry.saved.reference) !== JSON.stringify(entry.draft.reference)) fail('Saved version and draft must share the same reference snapshot.');
        }
      });
      if ((ids.size === 0 && workspace.activeId !== null) || (ids.size > 0 && !ids.has(workspace.activeId))) fail('Workspace active campaign is missing.');
      return workspace;
    }
    function serialize(workspace) {
      validateWorkspace(workspace);
      const raw = JSON.stringify(workspace);
      if (bytes(raw) + 512 > MAX_BYTES) fail('Workspace exceeds the 2 MiB limit. Remove an unneeded campaign after backing it up.');
      return raw;
    }
    function backup(workspace) {
      validateWorkspace(workspace);
      const raw = JSON.stringify({ format: 'bone-appetit-creator', version: 1, exportedAt: now(), workspace });
      if (bytes(raw) > MAX_BYTES) fail('Backup exceeds the 2 MiB limit. Remove an unneeded campaign after backing it up.');
      return raw;
    }
    function parseBackup(raw) {
      if (typeof raw !== 'string' || bytes(raw) > MAX_BYTES) fail('Import must be a JSON backup no larger than 2 MiB.');
      let parsed;
      try { parsed = JSON.parse(raw); } catch { fail('This file is not valid JSON. Existing campaigns were kept.'); }
      object(parsed, 'Backup', ['format', 'version', 'exportedAt', 'workspace']);
      if (parsed.format !== 'bone-appetit-creator' || parsed.version !== 1) fail('Unsupported backup format or version. Choose a version 1 Bone Appétit creator backup.');
      timestamp(parsed.exportedAt, 'Backup date');
      validateWorkspace(parsed.workspace);
      if (!parsed.workspace.entries.length) fail('This backup contains no campaigns.');
      return clone(parsed.workspace);
    }
    function mergeImport(workspace, imported) {
      validateWorkspace(workspace);
      validateWorkspace(imported);
      const result = clone(workspace);
      const names = result.entries.map(entry => entry.draft.name);
      for (const original of imported.entries) {
        const entry = clone(original), previousId = entry.draft.id;
        entry.draft.id = newId();
        const name = names.some(name => name.toLowerCase() === entry.draft.name.toLowerCase())
          ? uniqueName(entry.draft.name, names, 'imported') : entry.draft.name;
        if (entry.saved) {
          entry.saved.id = entry.draft.id;
          if (entry.saved.name === entry.draft.name) entry.saved.name = name;
        }
        entry.draft.name = name;
        names.push(name);
        result.entries.push(entry);
        if (previousId === imported.activeId) result.activeId = entry.draft.id;
      }
      serialize(result);
      return result;
    }
    const equivalent = (left, right) => {
      if (!left || !right) return false;
      const clean = record => { const copy = clone(record); delete copy.updatedAt; return copy; };
      return JSON.stringify(clean(left)) === JSON.stringify(clean(right));
    };
    return { newCampaign, duplicate, entryFor, emptyWorkspace, validateDraft, materialize, validateWorkspace, serialize, backup, parseBackup, mergeImport, equivalent, now, MAX_BYTES, MAX_CAMPAIGNS, BRIEF_FIELDS };
  }

  function createRepository(storage, model) {
    let expectedRaw, damagedRaw = null;
    function load() {
      try {
        expectedRaw = storage.getItem(KEY);
      } catch { return { workspace: model.emptyWorkspace(), problem: 'Browser storage is unavailable. Work can stay in memory; download a backup to keep it.', recoveryRaw: null }; }
      if (expectedRaw === null) return { workspace: model.emptyWorkspace(), problem: '', recoveryRaw: null };
      try {
        if (bytes(expectedRaw) > MAX_BYTES) fail('Stored workspace exceeds the size limit.');
        const workspace = JSON.parse(expectedRaw);
        model.validateWorkspace(workspace);
        return { workspace, problem: '', recoveryRaw: null };
      } catch {
        damagedRaw = expectedRaw;
        return { workspace: model.emptyWorkspace(), problem: 'The stored creator workspace could not be read. Its original data has been kept. Download the recovery file before replacing that local copy.', recoveryRaw: damagedRaw };
      }
    }
    function save(workspace, replaceDamaged = false) {
      const raw = model.serialize(workspace);
      if (damagedRaw !== null && !replaceDamaged) fail('The unreadable local copy is protected. Download a backup, then use Replace unreadable local copy.');
      const current = storage.getItem(KEY);
      if (expectedRaw === undefined && current === null) expectedRaw = null;
      if (current !== expectedRaw) fail('Another tab changed this workspace. Back up the work shown here, then reload the saved workspace.');
      storage.setItem(KEY, raw);
      expectedRaw = raw;
      damagedRaw = null;
    }
    return { load, save };
  }
  return { createModel, createRepository, KEY, MAX_BYTES };
});
