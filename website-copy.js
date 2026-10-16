/* Editable website copy. Legacy v1 campaigns may omit website entirely. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BoneWebsiteCopy = factory();
})(typeof globalThis === 'object' ? globalThis : this, function() {
  'use strict';
  const FIELDS = Object.freeze(["BRAND_TAGLINE", "META_DESCRIPTION", "PAGE_TITLE", "HERO_EYEBROW", "HERO_SECONDARY", "HERO_FOOTNOTE", "SEAL_TOP", "SEAL_BOTTOM", "HERO_CAPTION", "GLANCE_ITEMS", "HAUNTS_EYEBROW", "HAUNTS_HEADING", "HAUNTS_INTRO", "MENU_EYEBROW", "MENU_HEADING", "MENU_INTRO", "MENU_NOTE", "STORY_CAPTION", "STORY_YEAR", "STORY_STAMP", "STORY_EYEBROW", "STORY_HEADING", "STORY_LEDE", "STORY_PARAGRAPHS", "STORY_SIGNOFF", "STORY_ACTION", "STORY_FICTION", "VISIT_EYEBROW", "VISIT_HEADING", "VISIT_INTRO", "ACCESS_EYEBROW", "ACCESS_HEADING", "ACCESS_INTRO", "ACCESS_NOTE", "COLLECTION_EYEBROW", "COLLECTION_HEADING", "COLLECTION_INTRO", "MAP_EYEBROW", "MAP_INTRO", "LAST_EYEBROW", "LAST_HEADING", "LAST_INTRO", "FOOTER_TAGLINE", "MENU_DIALOG_EYEBROW", "MENU_DIALOG_HEADING", "MENU_DIALOG_INTRO"].map(key => Object.freeze({ key,
    label: key.toLowerCase().replaceAll('_', ' ').replace(/^./, char => char.toUpperCase()),
    array: ['GLANCE_ITEMS', 'STORY_PARAGRAPHS'].includes(key) })));
  function validate(edits, required = false) {
    if (!edits || typeof edits !== 'object' || Array.isArray(edits)) throw new TypeError('Website copy must be an object.');
    for (const [key, value] of Object.entries(edits)) {
      const field = FIELDS.find(field => field.key === key);
      if (!field) throw new TypeError('Website copy contains an unsupported field.');
      const valid = value => typeof value === 'string' && value.length <= 10000 && (!required || !!value.trim());
      if (field.array ? !Array.isArray(value) || value.length > 8 || !value.every(valid)
        || (required && (key === 'GLANCE_ITEMS' ? value.length !== 4 : !value.length)) : !valid(value)) {
        throw new TypeError(`${field.label}: enter ${key === 'GLANCE_ITEMS' ? 'four non-empty lines' : 'non-empty copy of at most 10,000 characters per field or paragraph'}.`);
      }
    }
    return edits;
  }
  function resolve(record, sites, required = true) {
    const id = record.reference.branding?.propertyId || 'bone-appetit';
    const site = sites.find(site => site.id === id);
    if (!site) throw new TypeError('This property has no bundled website profile.');
    validate(record.website || {}, required);
    const replace = value => value.replaceAll(site.name, record.content.venueName.trim());
    const copy = Object.fromEntries(Object.entries(site.copy).map(([key, value]) => [key, Array.isArray(value) ? value.map(replace) : replace(value)]));
    Object.assign(copy, structuredClone(record.website || {}), {
      HERO_HEADLINE: record.copy.headline, HERO_DESCRIPTION: record.copy.introduction, HERO_ACTION: record.copy.actionLabel
    });
    return sites.map(profile => profile.id === id ? { ...profile, name: record.content.venueName.trim(), copy } : profile);
  }
  return { FIELDS, validate, resolve };
});
