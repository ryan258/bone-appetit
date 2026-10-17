// Focused source-to-pack, escaping, recovery and archive integrity checks. No browser.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { createModel } = require('../creator-model.js');
const api = require('../marketing-pack.js');
const example = require('../site-data.json');
const model = createModel(example, { now: () => '2026-10-16T18:00:00.000Z', newId: () => 'marketing-source' });
const assets = Object.fromEntries(Object.entries(api.assetsFor(model.newCampaign())).map(([key, file]) => [key, new Uint8Array(fs.readFileSync(path.resolve(__dirname, '..', file)))]));
const decoder = new TextDecoder();
const hash = value => createHash('sha256').update(value).digest('hex');
async function run() {
  const record = model.newCampaign();
  record.name = 'A supper worth returning to';
  record.copy.headline = 'The extra place.\nA proper supper.';
  record.brief.offer = 'Supper, lanterns, and absolutely no paperwork.';
  record.brief.callToAction = 'Explore this fictional supper.';
  record.content.menu[0].name = 'House Curse Supper';
  record.content.menu[0].description = 'A tidy haunting with peppers.';
  record.content.menu[0].price = '24.50';
  record.content.attractions.hollow.title = 'The lantern loop';
  record.content.attractions.hollow.description = 'Residents report after {{NIGHT_TIME}}.';
  const original = JSON.stringify(record), reference = JSON.stringify(example);
  const options = { sourceState: 'draft', menuIds: [record.content.menu[0].id], attractionId: 'hollow', generatedAt: model.now() };
  const pack = await api.createPack(model, record, options, assets);
  const text = name => decoder.decode(pack.files.find(file => file.name === name).bytes);
  assert.equal(JSON.stringify(record), original, 'Export does not change a draft or its reference.');
  assert.equal(JSON.stringify(example), reference);
  assert.equal(pack.files.length, 19);
  assert.equal(pack.manifest.campaign.sha256, hash(original));
  for (const piece of Object.keys(api.TITLES)) {
    assert.match(text(piece + '.html'), /<!doctype html>/);
    assert.ok(text(piece + '.html').includes(api.FICTION));
    assert.ok(text(piece + '.txt').includes(api.FICTION));
    assert.ok(text(piece + '.txt').includes(record.brief.offer), `${piece} uses the common offer.`);
    assert.ok(!/<script|(?:src|href)=["']https?:\/\/|url\(["']?https?:\/\/|src="assets\//i.test(text(piece + '.html')), 'Offline documents have no scripts or remote asset references.');
    assert.ok(text(piece + '.html').includes('SIL OPEN FONT LICENSE'));
    assert.ok(text(piece + '.html').indexOf('<meta charset="utf-8">') < 1024, 'UTF-8 detection precedes embedded license comments.');
  }
  for (const name of ['landing.txt', 'menu-insert.txt', 'social-copy.txt', 'email-draft.txt', 'review-summary.txt']) {
    assert.ok(text(name).includes('House Curse Supper'));
    assert.ok(text(name).includes('$24.50 USD'));
    assert.ok(text(name).includes('3–10 pm'));
    assert.ok(text(name).includes('America/Chicago'));
  }
  assert.match(text('landing.txt'), /The lantern loop\nResidents report after 6 pm/);
  assert.doesNotMatch(text('social-copy.txt'), /\{\{NIGHT_TIME\}\}/);
  assert.match(text('review-summary.txt'), /NOT APPROVED OR PUBLISHED/);
  assert.match(text('review-summary.txt'), /Campaign window: 2026-10-01 → 2026-11-01/);
  assert.match(text('poster.txt'), /October 1 – November 1, 2026/);
  const imported = model.parseBackup(text('campaign.json'));
  assert.deepEqual(imported.entries[0].draft, record);
  assert.equal(imported.entries[0].saved, null);
  const named = await api.createPack(model, record, { ...options, sourceState: 'named' }, assets);
  assert.deepEqual(model.parseBackup(decoder.decode(named.files.find(file => file.name === 'campaign.json').bytes)).entries[0].saved, record);
  for (const file of pack.manifest.files) {
    const actual = pack.files.find(item => item.name === file.name);
    assert.equal(actual.bytes.length, file.bytes);
    assert.equal(hash(actual.bytes), file.sha256);
  }
  const incomplete = structuredClone(record);
  incomplete.brief.audience = ''; incomplete.brief.callToAction = '';
  incomplete.brief.startsOn = '2026-09-01'; incomplete.brief.endsOn = '2026-12-01';
  const review = api.prepare(model, incomplete, { ...options, generatedAt: '2027-01-01T00:00:00.000Z' });
  assert.equal(review.facts.cta, record.copy.actionLabel);
  assert.ok(review.issues.some(issue => /audience: not supplied/.test(issue)));
  assert.ok(review.issues.some(issue => /outside the fixed/.test(issue)));
  assert.ok(review.issues.some(issue => /archived concept/.test(issue)));
  assert.ok(!api.prepare(model, record, { ...options, generatedAt: '2026-11-02T00:30:00.000Z' }).issues.some(issue => /archived concept/.test(issue)), 'Season remains current on its final local date even after midnight UTC.');
  assert.ok(api.prepare(model, record, { ...options, generatedAt: '2026-11-02T06:30:00.000Z' }).issues.some(issue => /archived concept/.test(issue)), 'Archive warnings use the venue timezone.');
  for (const dates of [{ startsOn: '2027-01-01', endsOn: '' }, { startsOn: '', endsOn: '2026-09-01' }]) {
    const partial = structuredClone(record); Object.assign(partial.brief, dates);
    assert.ok(api.prepare(model, partial, options).issues.some(issue => /outside the fixed/.test(issue)), 'Either partial campaign boundary can fall outside the venue season.');
  }
  for (const [mutate, expected] of [
    [r => { r.brief.offer = ''; }, /Offer/],
    [r => { r.brief.offer = 'x'.repeat(241); }, /1–240/],
    [r => { r.copy.headline = 'x'.repeat(101); }, /Headline/],
    [r => { r.content.menu[0].price = '24.555'; }, /Menu price/],
    [r => { r.brief.endsOn = '2026-10-00'; }, /endsOn/],
    [r => { r.reference.hours.kitchenClose = '15:01'; }, /cannot finish/]
  ]) {
    const invalid = structuredClone(record); mutate(invalid);
    assert.throws(() => api.prepare(model, invalid, options), expected);
  }
  for (const bad of [{ sourceState: 'other' }, { menuIds: [] }, { menuIds: ['missing'] }, { menuIds: [options.menuIds[0], options.menuIds[0]] }, { menuIds: record.content.menu.slice(0, 5).map(item => item.id) }, { attractionId: 'missing' }, { generatedAt: 'yesterday' }]) {
    assert.throws(() => api.prepare(model, record, { ...options, ...bad }));
  }
  await assert.rejects(api.createPack(model, record, options, {}), /asset is unavailable/);
  const hostile = structuredClone(record);
  hostile.copy.headline = '</style><script>alert("x")</script>';
  hostile.brief.offer = '<img src=x onerror=alert(1)> & the supper';
  hostile.content.menu[0].name = '<svg onload=alert(1)>';
  const escaped = await api.createPack(model, hostile, options, assets);
  for (const file of escaped.files.filter(file => file.name.endsWith('.html'))) {
    const html = decoder.decode(file.bytes);
    assert.ok(!/<script|<svg onload|<img src=x/.test(html), `${file.name} renders text without executable markup.`);
    if (file.name !== 'index.html') assert.ok(html.includes('&lt;'), `${file.name} escapes markup characters.`);
  }
  assert.equal(api.crc32(new TextEncoder().encode('123456789')), 0xcbf43926);
  assert.throws(() => api.zip([{ name: '../outside.txt', bytes: new Uint8Array() }]), /safe/);
  assert.throws(() => api.zip([pack.files[0], pack.files[0]]), /unique/);
  assert.throws(() => api.zip([{ name: 'x'.repeat(65536) + '.txt', bytes: new Uint8Array() }]), /too long/);
  const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bone-marketing-unit-'));
  const target = path.join(output, 'pack.zip'); fs.writeFileSync(target, api.zip(pack.files));
  // An independent standard-library ZIP and MIME reader verifies the actual artifact.
  const result = spawnSync(process.env.PYTHON || 'python3', ['-c', `
import sys,zipfile,json,hashlib,email,email.policy
with zipfile.ZipFile(sys.argv[1]) as z:
 assert z.testzip() is None
 m=json.loads(z.read('manifest.json'))
 assert len(z.namelist())==19
 for f in m['files']:
  raw=z.read(f['name']); assert len(raw)==f['bytes']; assert hashlib.sha256(raw).hexdigest()==f['sha256']
 message=email.message_from_bytes(z.read('email-draft.eml'),policy=email.policy.default)
 assert str(message['Subject'])=='Bone Appétit: The extra place. A proper supper.'
 assert message['To'] is None and message['From'] is None and message['X-Unsent']=='1'
 assert 'House Curse Supper' in message.get_content() and '$24.50 USD' in message.get_content()
 assert not message.defects
 assert not any(name.startswith('/') or '..' in name.split('/') for name in z.namelist())
print('Independent ZIP, CRC, manifest and email checks passed.')
`, target], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  const longSubject = 'é🦇'.repeat(100) + '\r\nBcc: nobody';
  const eml = api.emailMessage(longSubject, 'Literal message');
  assert.doesNotMatch(eml, /\r\nBcc:/);
  for (const line of eml.split('\r\n').slice(0, -1)) assert.ok(line.length <= 78, 'MIME lines stay within 78 characters.');
  console.log('Marketing checks passed: shared copy/facts, validation, escaping, source backup, review warnings, ZIP and MIME integrity.');
  console.log(`Artifact: ${target}`);
}
run().catch(error => { console.error(error); process.exitCode = 1; });
