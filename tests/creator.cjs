// Creator records, portable recovery, and storage failure regressions. No browser.
const assert = require('node:assert/strict');
const { createModel, createRepository, KEY, MAX_BYTES } = require('../creator-model.js');
const example = require('../site-data.json');
const original = JSON.stringify(example);
let nextId = 0;
const model = createModel(example, { newId: () => `campaign-${++nextId}`, now: () => '2026-10-16T18:00:00.000Z' });
const makeWorkspace = () => {
  const draft = model.newCampaign();
  return { version: 1, activeId: draft.id, entries: [model.entryFor(draft)] };
};
let workspace = makeWorkspace();
const record = workspace.entries[0].draft;
assert.deepEqual(model.materialize(record), example, 'Unedited example materializes unchanged.');
record.name = 'Supper at Wicked Lane';
record.brief.objective = 'Explore a different invitation.';
record.copy.headline = 'An extra place.\nA proper supper.';
record.content.menu[0].price = '24.50';
record.content.menu[0].name = 'The same house curse';
record.content.attractions.hollow.title = 'The lantern loop';
assert.equal(model.materialize(record).menu.pizzas[0].price, 24.5);
assert.equal(model.materialize(record).attractions.hollow.card.title, 'The lantern loop');
assert.equal(JSON.stringify(example), original, 'Editing cannot mutate the original reference.');
workspace.entries[0].saved = structuredClone(record);
assert.ok(model.equivalent(record, workspace.entries[0].saved));
record.updatedAt = '2026-10-16T18:01:00.000Z';
assert.ok(model.equivalent(record, workspace.entries[0].saved), 'Edit timestamp alone does not dirty content.');
const duplicate = model.duplicate(record, [record.name, `${record.name} (copy)`]);
assert.equal(duplicate.name, `${record.name} (copy 2)`);
assert.notEqual(duplicate.id, record.id);
duplicate.content.menu[0].name = 'Independent edit';
duplicate.reference.menu.pizzas[0].description = 'Independent reference';
assert.notEqual(duplicate.content.menu[0].name, record.content.menu[0].name);
assert.notEqual(duplicate.reference.menu.pizzas[0].description, record.reference.menu.pizzas[0].description);
workspace.entries.push(model.entryFor(duplicate));

// Incomplete raw fields survive draft recovery; explicit named versions stay valid.
record.content.menu[0].price = '';
record.brief.endsOn = '2026-02-30';
workspace.entries[0].view = { menuId: record.content.menu[2].id, attractionId: 'hollow', sections: [false, false, true, true] };
assert.doesNotThrow(() => model.serialize(workspace));
assert.throws(() => model.materialize(record), /Brief endsOn/);
record.brief.endsOn = '';
assert.throws(() => model.materialize(record), /Menu price/);
assert.ok(!model.equivalent(record, workspace.entries[0].saved));
const recovered = model.parseBackup(model.backup(workspace));
assert.deepEqual(recovered, workspace);
assert.equal(recovered.entries[0].draft.content.menu[0].price, '');
assert.equal(recovered.entries[0].saved.content.menu[0].price, '24.50');
assert.deepEqual(recovered.entries[0].view, workspace.entries[0].view);
const beforeImport = JSON.stringify(workspace);
const imported = model.mergeImport(workspace, recovered);
assert.equal(JSON.stringify(workspace), beforeImport, 'Import is a non-mutating transaction.');
assert.equal(imported.entries.length, 4);
assert.ok(imported.entries[2].draft.name.endsWith('(imported)'));
assert.notEqual(imported.entries[2].draft.id, workspace.entries[0].draft.id);
assert.equal(imported.entries[2].saved.id, imported.entries[2].draft.id);
assert.notEqual(imported.activeId, workspace.activeId);
assert.deepEqual(imported.entries.slice(0, 2), workspace.entries, 'Existing campaigns are retained exactly.');

const invalidBackups = [
  ['{broken', /valid JSON/],
  [JSON.stringify({ format: 'other', version: 1, exportedAt: model.now(), workspace }), /Unsupported backup/],
  [JSON.stringify({ format: 'bone-appetit-creator', version: 2, exportedAt: model.now(), workspace }), /Unsupported backup/],
  ['é'.repeat(MAX_BYTES / 2 + 1), /2 MiB/]
];
for (const [raw, expected] of invalidBackups) assert.throws(() => model.parseBackup(raw), expected);
for (const [mutate, expected] of [
  [w => { w.version = 2; }, /Unsupported workspace/],
  [w => { w.activeId = 'missing'; }, /active campaign/],
  [w => { w.entries.push(structuredClone(w.entries[0])); }, /duplicate campaign IDs/],
  [w => { w.entries[0].draft.reference.map.image = '../outside.svg'; }, /map.image/],
  [w => { w.entries[0].draft.reference.map.image = 'unknown.svg'; }, /outside this bundled/],
  [w => { w.entries[0].draft.content.menu[0].id = 'missing'; }, /menu IDs/],
  [w => { w.entries[0].view.menuId = 'missing'; }, /missing content/],
  [w => { w.entries[0].saved.content.menu[0].price = ''; }, /Menu price/],
  [w => { w.entries[0].draft.copy.headline = 'x'.repeat(181); }, /Headline/],
  [w => { w.entries[0].saved.reference.name = 'Different reference'; }, /same reference snapshot/]
]) {
  const invalid = structuredClone(workspace); mutate(invalid);
  const raw = JSON.stringify({ format: 'bone-appetit-creator', version: 1, exportedAt: model.now(), workspace: invalid });
  assert.throws(() => model.parseBackup(raw), expected);
  assert.equal(JSON.stringify(workspace), beforeImport);
}
const crowded = makeWorkspace();
while (crowded.entries.length < model.MAX_CAMPAIGNS) crowded.entries.push(model.entryFor(model.newCampaign()));
assert.throws(() => model.mergeImport(crowded, recovered), /at most 20/);
assert.equal(crowded.entries.length, 20);

// Storage reads and writes use a distinct key, preserve damaged data, and detect
// changes from another tab before writing. Failed writes never advance the baseline.
const values = new Map([['bone-appetit-visit-v1', 'visitor plan stays here']]);
let blocked = false, full = false;
const storage = {
  getItem(key) { if (blocked) throw new DOMException('Blocked', 'SecurityError'); return values.get(key) ?? null; },
  setItem(key, raw) { if (blocked) throw new DOMException('Blocked', 'SecurityError'); if (full) throw new DOMException('Full', 'QuotaExceededError'); values.set(key, raw); }
};
const repo = createRepository(storage, model);
assert.deepEqual(repo.load().workspace, model.emptyWorkspace());
repo.save(workspace);
assert.equal(values.get('bone-appetit-visit-v1'), 'visitor plan stays here');
assert.deepEqual(createRepository(storage, model).load().workspace, workspace);
const originalStored = values.get(KEY);
full = true;
assert.throws(() => repo.save(imported), /Full/);
assert.equal(values.get(KEY), originalStored);
full = false;
repo.save(imported);
const secondTab = createRepository(storage, model);
secondTab.load();
repo.save(workspace);
assert.throws(() => secondTab.save(imported), /Another tab/);
assert.equal(values.get(KEY), model.serialize(workspace));
values.set(KEY, '{damaged');
const damaged = createRepository(storage, model);
assert.equal(damaged.load().recoveryRaw, '{damaged');
assert.throws(() => damaged.save(workspace), /unreadable local copy/);
assert.equal(values.get(KEY), '{damaged');
damaged.save(workspace, true);
assert.equal(values.get(KEY), model.serialize(workspace));
blocked = true;
const unavailable = createRepository(storage, model);
assert.match(unavailable.load().problem, /unavailable/);
assert.throws(() => unavailable.save(workspace), /Blocked/);
assert.doesNotThrow(() => model.backup(workspace), 'Backup works while storage is blocked.');
blocked = false;
assert.throws(() => unavailable.save(workspace), /Another tab/, 'Do not overwrite existing data after a blocked initial read.');
values.delete(KEY);
unavailable.save(workspace);
assert.equal(values.get(KEY), model.serialize(workspace));
console.log('Creator duplication, content validation, unfinished draft recovery, named versions, backup/import, view resumption, import limits, and storage-failure/conflict protections passed.');
