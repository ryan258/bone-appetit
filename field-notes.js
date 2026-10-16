/* Shared field-note markup for the generated planner and its offline keepsake. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./planner.js'));
  else root.BoneFieldNotes = factory(root.BonePlanner);
})(typeof globalThis === 'object' ? globalThis : this, function(plannerAPI) {
  'use strict';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);

  function card(data, plan, mapSVG = '') {
    const p = plannerAPI.createPlanner(data);
    if (!p.validPlan(plan)) throw new TypeError('Field notes need a valid itinerary.');
    const map = mapSVG || `<img src="assets/${escape(data.map.image)}" width="760" height="560" alt="${data.branding ? 'Six numbered locations on a fictional house plan. Not to scale; access is not verified.' : 'Six numbered locations on the fictional grounds; solid trail loop and dashed shorter return. Not to scale.'}">`;
    return `<article class="field-note-paper plan-preview" aria-label="Your fictional field notes">
  <header class="field-note-heading">
    <p class="field-note-form">${escape(data.fieldNotes.form)}</p>
    <p class="field-note-brand">${escape(data.name)}</p>
    <p class="field-note-stamp">${escape(data.fieldNotes.stamp)}</p>
  </header>
  <h3 id="plan-summary-date">${escape(p.fullDateLabel(plan.date))}</h3>
  <p id="plan-summary-party" aria-live="polite">${escape(p.partyLabel(plan))} · ${escape(data.moods[p.moodForTime(plan.time)].label)}</p>
  <div class="field-note-body">
    <ol id="plan-timeline">${p.schedule(plan).map(stop => `<li><time>${escape(stop.time)}</time><strong>${escape(stop.title)}</strong><span>${escape(stop.detail)}</span></li>`).join('\n')}</ol>
    <aside class="field-note-reference">
      ${map}
      <p class="field-note-map-caption">Fictional grounds · Not to scale</p>
      <ol class="field-note-map-key">${data.map.locations.map(point => `<li><span>${escape(point.number)}</span>${escape(point.name)}</li>`).join('\n')}</ol>
      <p class="field-note-route-key">${data.branding ? 'Solid lines: imagined spaces. Dashed lines: shorter return.' : 'Solid line: trail loop. Dashed line: shorter return.'}</p>
    </aside>
  </div>
  <div class="plan-total" role="status" aria-atomic="true"><span>${data.branding ? 'Activities estimate' : 'Trail estimate'}</span><strong id="plan-estimate">${p.money(p.trailEstimate(plan))}</strong></div>
  <p class="small-note">${escape(data.disclosures.estimate)}</p>
  <p class="field-note-house" id="plan-house-note">${escape(p.fieldNote(plan))}</p>
  <footer class="field-note-footer">
    <p>${escape(data.address.street)}, ${escape(data.address.district)} · Fictional address</p>
    <p>${escape(p.seasonRange())} · ${escape(p.hoursLabel())}<br>${escape(p.closingLabel())}</p>
    <p class="field-note-access">${escape(data.disclosures.access)} ${escape(data.disclosures.sensory)} ${escape(data.disclosures.weather)}${data.disclosures.admission ? ' ' + escape(data.disclosures.admission) : ''}</p>
    <p class="field-note-disclosure">Fictional ${p.year} concept season. This itinerary is not a booking or ticket. Map, address, hours, routes, and access provisions describe an imagined venue; they are not real directions or verified facilities.</p>
  </footer>
</article>`;
  }

  function document(data, plan, assets) {
    if (!assets || !assets.mapSVG || !assets.css) throw new TypeError('Offline field notes need embedded map art and styles.');
    return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(data.name)} — ${escape(data.fieldNotes.title)}</title>
<style>${assets.css}</style></head>
<body class="field-notes-export">
  <div class="field-note-tools"><h1>${escape(data.fieldNotes.title)}</h1><p>A fictional itinerary, not a booking or ticket. This copy works offline.</p><button type="button" id="print-field-notes">Print field notes</button></div>
  ${card(data, plan, assets.mapSVG)}
  <script>document.getElementById('print-field-notes').addEventListener('click', () => window.print());</script>
</body></html>`;
  }
  return { card, document };
});
