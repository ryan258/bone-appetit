/* Bundled fictional property starters. Existing campaign/backup schema stays v1. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BoneProperties = factory();
})(typeof globalThis === 'object' ? globalThis : this, function() {
  'use strict';
  const ART = Object.freeze(['rest-in-pizza.svg', 'grave-expectations.svg', 'boobies-lodge.svg',
    'rest-in-pizza-map.svg', 'grave-expectations-map.svg', 'boobies-lodge-map.svg']);
  const IDS = Object.freeze(['rest-in-pizza', 'grave-expectations', 'boobies-lodge']);
  function createCatalog(model, data) {
    if (data?.version !== 1 || !Array.isArray(data.properties) || data.properties.length !== IDS.length) throw new TypeError('Choose the bundled version 1 three-property catalog.');
    const definitions = new Map();
    const make = definition => {
      const record = model.newCampaign();
      record.name = `${definition.reference.name} · Halloween 2026`;
      record.reference = structuredClone(definition.reference);
      record.copy = structuredClone(definition.copy);
      record.brief = structuredClone(definition.brief);
      record.content = {
        venueName: record.reference.name,
        menu: Object.entries(record.reference.menu).flatMap(([category, items]) => items.map(item => ({ id: item.id, category, name: item.name, description: item.description, price: String(item.price) }))),
        attractions: Object.fromEntries(Object.entries(record.reference.attractions).map(([key, item]) => [key, { title: item.title, description: item.description }]))
      };
      model.materialize(record);
      return record;
    };
    for (const definition of data.properties) {
      if (!IDS.includes(definition?.id) || definitions.has(definition.id)) throw new TypeError('Property IDs must match this bundled catalog without duplicates.');
      for (const field of ['type', 'summary']) if (typeof definition[field] !== 'string' || !definition[field].trim()) throw new TypeError(`Property ${field} is required.`);
      if (definition.reference?.branding?.propertyId !== definition.id || definition.reference.branding.hero !== `${definition.id}.svg`) throw new TypeError('Property branding must match its bundled ID.');
      make(definition);
      definitions.set(definition.id, structuredClone(definition));
    }
    return {
      list: IDS.map(id => { const property = definitions.get(id); return { id, name: property.reference.name, type: property.type, summary: property.summary, hero: property.reference.branding.hero, heroAlt: property.reference.branding.heroAlt }; }),
      create(id) {
        if (!definitions.has(id)) throw new TypeError('This property starter is unavailable.');
        return make(definitions.get(id));
      }
    };
  }
  return { ART, IDS, createCatalog };
});
