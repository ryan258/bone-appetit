'use strict';

(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const make = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const form = $('#planner-form');
  const plannerDialog = $('#planner-dialog');
  const menuDialog = $('#menu-dialog');
  const attractionDialog = $('#attraction-dialog');
  const status = $('#plan-status');
  let activeAttraction = 'pizzeria';
  // Failed scripts leave the complete static page and ordinary links available.
  if (!window.BonePlanner || typeof plannerDialog.showModal !== 'function') return;
  let data, planner;
  try {
    data = JSON.parse($('#site-data').textContent);
    planner = window.BonePlanner.createPlanner(data);
  } catch { return; }
  const { rules, stopKeys, planKeys, validPlan, schedule, partyLabel, fullDateLabel, moodForTime } = planner;
  const storageKey = rules.storageKey;
  const creatorPreview = document.documentElement.hasAttribute('data-creator-preview');
  // Preview plans live only in this frame; visitor saves are never read or written.
  let previewPlan = null, previewHash = '';
  const visitStorage = creatorPreview ? {
    getItem: () => previewPlan, setItem: (_key, value) => { previewPlan = value; },
    removeItem: () => { previewPlan = null; }
  } : {
    getItem: key => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: key => localStorage.removeItem(key)
  };
  const currentHash = () => creatorPreview ? previewHash : location.hash;
  if (creatorPreview) document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    if (href.startsWith('#')) {
      if (detailRoute(href)) return; // Existing dialog handlers own these links.
      event.preventDefault();
      previewHash = href;
      syncDetailRoute();
      const target = href === '#' ? $('#main') : document.getElementById(href.slice(1));
      target?.scrollIntoView();
    } else {
      event.preventDefault(); event.stopPropagation();
      status.textContent = 'Choose another campaign in the creator workspace to preview a different property.';
    }
  }, true);

  const { menu, attractions, moods } = data;

  // Navigation remains ordinary anchor navigation; the mobile control is a disclosure.
  const navToggle = $('.nav-toggle');
  const nav = $('#main-nav');
  const header = $('.site-header');
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      document.documentElement.style.setProperty('--header-offset', `${header.getBoundingClientRect().height + 12}px`);
    }).observe(header);
  }
  function closeNav(returnFocus = false) {
    navToggle.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
    if (returnFocus) navToggle.focus();
  }
  navToggle.addEventListener('click', () => {
    const expanded = navToggle.getAttribute('aria-expanded') !== 'true';
    navToggle.setAttribute('aria-expanded', String(expanded));
    nav.classList.toggle('is-open', expanded);
  });
  $$('a', nav).forEach(link => link.addEventListener('click', () => closeNav()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && nav.classList.contains('is-open')) closeNav(true);
  });
  document.addEventListener('click', event => {
    if (!$('.site-header').contains(event.target)) closeNav();
  });
  matchMedia('(min-width: 981px)').addEventListener('change', event => {
    if (event.matches) closeNav();
  });

  // Native dialogs provide modal semantics, focus containment, and Escape dismissal.
  let routedDialog = null;
  let returnHash = '';
  function clearDetailRoute() {
    routedDialog = null;
    if (creatorPreview) { previewHash = returnHash; return; }
    const state = { ...history.state };
    delete state.boneAppetitReturnHash;
    history.replaceState(Object.keys(state).length ? state : null, '', location.pathname + location.search + returnHash);
  }
  function openDialog(dialog) {
    if (routedDialog && dialog !== menuDialog && dialog !== attractionDialog) clearDetailRoute();
    closeNav();
    $$('dialog[open]').forEach(open => open.close());
    dialog.showModal();
    dialog.scrollTop = 0;
    document.body.classList.add('modal-open');
    $('[data-close]', dialog).focus({ preventScroll: true });
  }
  $$('dialog').forEach(dialog => {
    $('[data-close]', dialog).addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => {
      if (!$('dialog[open]')) document.body.classList.remove('modal-open');
      // History navigation clears routedDialog before closing. A user's close or
      // Escape returns to the page anchor without adding another history entry.
      if (dialog === routedDialog && !dialog.open) clearDetailRoute();
    });
    let startedOutside = false;
    const outside = event => {
      const rect = dialog.getBoundingClientRect();
      return event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    };
    dialog.addEventListener('pointerdown', event => { startedOutside = event.target === dialog && outside(event); });
    dialog.addEventListener('click', event => {
      if (startedOutside && event.target === dialog && outside(event)) dialog.close();
      startedOutside = false;
    });
  });

  function renderMenu(category = 'pizzas') {
    if (!Object.hasOwn(menu, category)) category = 'pizzas';
    $$('[data-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === category)));
    const items = menu[category].map(({ id, name, price, description, tags }) => {
      const article = make('article', undefined, 'full-menu-item');
      const photo = $(`#full-menu [data-menu-id="${id}"] .full-menu-photo`);
      if (photo) { const image = photo.cloneNode(); image.loading = 'eager'; article.append(image); }
      const heading = make('div');
      heading.append(make('h3', name), make('strong', planner.money(price)));
      article.append(heading, make('p', description));
      if (tags.length) {
        const tagList = make('div', undefined, 'menu-tags');
        tags.forEach(tag => tagList.append(make('span', tag)));
        article.append(tagList);
      }
      return article;
    });
    $('#full-menu-items').replaceChildren(...items);
    $('#menu-result-status').textContent = `${items.length} items in ${data.menuCategories[category]}.`;
  }
  function renderAttraction(key) {
    activeAttraction = key;
    const data = attractions[activeAttraction];
    $('#attraction-title').textContent = data.title;
    $('#attraction-kicker').textContent = data.kicker;
    // Use the same resolved artwork as the static card, including in offline exports.
    const cardImage = $(`.haunt-card [data-attraction="${key}"]`)?.closest('.haunt-card')?.querySelector('img');
    $('#attraction-image').src = cardImage?.getAttribute('src') || `assets/${data.image.endsWith('.svg') ? data.image : data.image + '.webp'}`;
    $('#attraction-image').alt = cardImage?.alt || data.alt;
    $('#attraction-description').textContent = planner.copy(data.description);
    $('#attraction-access').textContent = data.access;
    $('#attraction-facts').replaceChildren(...planner.attractionFacts(activeAttraction).map(([label, value]) => {
      const row = make('div'); row.append(make('dt', label), make('dd', value)); return row;
    }));
  }

  function detailRoute(hash) {
    if (hash === '#full-menu') return { dialog: menuDialog, category: 'pizzas' };
    const category = hash.slice('#full-menu-'.length);
    if (hash.startsWith('#full-menu-') && Object.hasOwn(menu, category)) return { dialog: menuDialog, category };
    const attraction = hash.slice('#details-'.length);
    if (hash.startsWith('#details-') && Object.hasOwn(attractions, attraction)) return { dialog: attractionDialog, attraction };
    return null;
  }
  function syncDetailRoute() {
    const route = detailRoute(currentHash());
    if (!route) {
      const previous = routedDialog;
      routedDialog = null;
      if (previous && previous.open) previous.close();
      return;
    }
    if (route.category) renderMenu(route.category);
    else renderAttraction(route.attraction);
    const previousHash = creatorPreview ? returnHash : history.state?.boneAppetitReturnHash;
    returnHash = typeof previousHash === 'string' && (previousHash === '' || previousHash.startsWith('#')) && !detailRoute(previousHash)
      ? previousHash : route.category ? '#menu' : '#haunts';
    routedDialog = route.dialog;
    if (!route.dialog.open) openDialog(route.dialog);
  }
  function navigateDetail(hash, replace = false) {
    if (!detailRoute(currentHash())) returnHash = currentHash();
    if (creatorPreview) { previewHash = hash; syncDetailRoute(); return; }
    if (location.hash !== hash) history[replace ? 'replaceState' : 'pushState']({ ...history.state, boneAppetitReturnHash: returnHash }, '', hash);
    syncDetailRoute();
  }
  $$('[data-open-menu], [data-menu-category], [data-attraction]').forEach(link => link.addEventListener('click', event => {
    // Preserve new-tab, copy-link, and other native link actions.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigateDetail(link.getAttribute('href'));
  }));
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => {
    navigateDetail(`#full-menu-${button.dataset.filter}`, true);
  }));

  function renderMood(value, updateArrival = false) {
    const mood = moods[value];
    $$('[name="visit-mood"]').forEach(radio => { radio.checked = radio.value === value; });
    $('#mood-time').textContent = planner.moodTime(value);
    $('#mood-title').replaceChildren(...mood.title.split('\n').flatMap((part, index) => index ? [make('br'), document.createTextNode(part)] : [document.createTextNode(part)]));
    $('#mood-copy').textContent = mood.copy;
    $('#mood-features').replaceChildren(...mood.features.map(item => make('li', planner.copy(item))));
    if (updateArrival) form.elements.time.value = planner.moodArrival(value);
  }
  $$('[name="visit-mood"]').forEach(radio => radio.addEventListener('change', () => {
    renderMood(radio.value, true);
    updatePlan();
    status.textContent = '';
  }));

  const defaultDate = planner.defaultDate();
  $('#season-note').textContent = planner.seasonNote();
  form.elements.date.value = defaultDate;
  function getPlan() {
    return {
      version: rules.version, date: form.elements.date.value, time: form.elements.time.value,
      guests: Number(form.elements.guests.value), children: Number(form.elements.children.value),
      ...Object.fromEntries(stopKeys.map(key => [key, form.elements[key].checked]))
    };
  }
  function applyPlan(plan) {
    ['date', 'time', 'guests', 'children'].forEach(key => { form.elements[key].value = String(plan[key]); });
    stopKeys.forEach(key => { form.elements[key].checked = plan[key]; });
  }
  function updatePlan() {
    const plan = getPlan();
    const valid = validPlan(plan);
    $('.plan-preview').hidden = !valid;
    $$('[type="submit"], #print-plan, #download-plan, #download-field-notes', form).forEach(button => { button.disabled = !valid; });
    if (!valid) {
      status.textContent = 'Please choose a date, arrival time, and party size from the available options. The itinerary is hidden until these selections are valid.';
      updateSaveState();
      return;
    }
    $('#plan-summary-date').textContent = fullDateLabel(plan.date);
    $('#plan-summary-party').textContent = `${partyLabel(plan)} · ${moods[moodForTime(plan.time)].label}`;
    $('#plan-timeline').replaceChildren(...schedule(plan).map(stop => {
      const item = make('li'); item.append(make('time', stop.time), make('strong', stop.title), make('span', stop.detail)); return item;
    }));
    $('#plan-estimate').textContent = planner.money(planner.trailEstimate(plan));
    $('#plan-house-note').textContent = planner.fieldNote(plan);
    updateSaveState();
  }
  let savedPlan = null;
  let storageUnavailable = false;
  let resetUndo = null;
  function updateSaveState() {
    const draft = getPlan();
    const unchanged = savedPlan && planKeys.every(key => draft[key] === savedPlan[key]);
    $('#plan-save-state').textContent = creatorPreview
      ? unchanged ? 'Saved only in this preview; cleared when the preview refreshes.' : 'Preview only. Save temporarily here or download an itinerary; visitor plans stay unchanged.'
      : storageUnavailable
      ? 'Browser saving is unavailable. Keep a copy with Download itinerary.'
      : unchanged ? 'Saved in this browser.'
        : savedPlan ? 'Unsaved changes. Save to keep this draft, or restore your saved plan.'
          : 'Not saved yet. Choose Save my plan to keep this itinerary in this browser.';
    $('#restore-plan').disabled = !savedPlan;
    $('#undo-reset').hidden = !resetUndo;
  }
  function clearUndo() {
    resetUndo = null;
    $('#undo-reset').hidden = true;
  }
  try {
    const raw = visitStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (validPlan(parsed)) { savedPlan = parsed; applyPlan(parsed); }
    }
  } catch (error) {
    // Malformed JSON is ignored; blocked storage is reported separately.
    storageUnavailable = !(error instanceof SyntaxError);
  }
  renderMood(moodForTime(form.elements.time.value));
  updatePlan();
  form.addEventListener('change', () => {
    status.textContent = '';
    renderMood(moodForTime(form.elements.time.value));
    updatePlan();
  });
  $$('[data-open-planner]').forEach(button => button.addEventListener('click', () => {
    status.textContent = '';
    updatePlan();
    openDialog(plannerDialog);
  }));
  $('#attraction-plan').addEventListener('click', () => {
    const attraction = attractions[activeAttraction];
    form.elements[attraction.stop].checked = true;
    updatePlan();
    status.textContent = `${attraction.title} is included in your itinerary. Save to keep your changes.`;
    openDialog(plannerDialog);
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const plan = getPlan();
    if (!validPlan(plan)) { status.textContent = 'Please choose a date, arrival time, and party size from the available options.'; return; }
    try {
      visitStorage.setItem(storageKey, JSON.stringify(plan));
      savedPlan = plan;
      storageUnavailable = false;
      clearUndo();
      status.textContent = creatorPreview ? 'Saved only in this preview. Your visitor plans are unchanged.' : 'Your plan is saved in this browser. No reservation has been made. Download a copy to take it with you.';
    } catch {
      storageUnavailable = true;
      status.textContent = 'This browser couldn’t save your plan. You can still download a copy of the itinerary.';
    }
    updateSaveState();
  });
  $('#restore-plan').addEventListener('click', () => {
    if (!savedPlan) return;
    applyPlan(savedPlan);
    renderMood(moodForTime(savedPlan.time));
    clearUndo();
    updatePlan();
    status.textContent = 'Your saved selections are restored. No reservation has been made.';
  });
  $('#print-plan').addEventListener('click', () => {
    if (!validPlan(getPlan())) { status.textContent = 'Please choose a valid date, time, and party size first.'; return; }
    updatePlan();
    window.print();
  });
  $('#download-plan').addEventListener('click', () => {
    const plan = getPlan();
    if (!validPlan(plan)) { status.textContent = 'Please choose a valid date, time, and party size first.'; return; }
    const text = planner.itineraryText(plan);
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
    const link = make('a'); link.href = url; link.download = `${data.branding?.propertyId || 'bone-appetit'}-visit-${plan.date}.txt`;
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = 'Your itinerary download is ready. It’s a plan, not a reservation.';
  });
  if (window.BoneFieldNotes) {
    $('#download-field-notes').addEventListener('click', () => {
      const plan = getPlan();
      if (!validPlan(plan)) { status.textContent = 'Please choose a valid date, time, and party size first.'; return; }
      const html = window.BoneFieldNotes.document(data, plan, {
        mapSVG: $('#field-map-art').innerHTML,
        css: $('#field-note-styles').content.querySelector('style').textContent
      });
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      const link = make('a');
      link.href = url;
      link.download = `${data.branding?.propertyId || 'bone-appetit'}-field-notes-${plan.date}.html`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = 'Your field notes are downloaded with the map included. They work offline and are not a booking or ticket.';
    });
    document.documentElement.classList.add('field-notes-ready');
  }
  $('#reset-plan').addEventListener('click', () => {
    // Keep one undo snapshot until saving or restoring deliberately replaces it.
    if (!resetUndo) resetUndo = { draft: getPlan(), saved: savedPlan ? { ...savedPlan } : null };
    applyPlan(planner.defaultPlan());
    renderMood('day');
    let removed = true;
    try {
      visitStorage.removeItem(storageKey);
      savedPlan = null;
      storageUnavailable = false;
    } catch { removed = false; storageUnavailable = true; }
    updatePlan();
    status.textContent = removed ? 'Fresh start. Your saved plan has been cleared. Undo reset can bring back your previous draft and saved plan.' : 'The form is reset. Browser storage is unavailable, so an earlier saved copy could not be cleared. You can undo this reset.';
  });
  $('#undo-reset').addEventListener('click', () => {
    if (!resetUndo) return;
    const previous = resetUndo;
    applyPlan(previous.draft);
    renderMood(moodForTime(previous.draft.time));
    let restored = true;
    try {
      if (previous.saved) visitStorage.setItem(storageKey, JSON.stringify(previous.saved));
      else visitStorage.removeItem(storageKey);
      savedPlan = previous.saved;
      storageUnavailable = false;
    } catch { restored = false; storageUnavailable = true; }
    // Focus a surviving control before the undo button disappears.
    $('#reset-plan').focus({ preventScroll: true });
    if (restored) clearUndo();
    updatePlan();
    status.textContent = restored ? 'Your previous draft and saved-plan state are restored.' : 'Your previous draft is restored. Browser storage is unavailable, so the saved copy could not be restored. Download a copy, or try Undo reset again when saving is available.';
  });

  document.documentElement.classList.add('enhanced');
  if (creatorPreview) parent.postMessage({ type: 'bone-website-ready', token: document.documentElement.getAttribute('data-creator-preview') }, '*');
  const defaultVisit = planner.defaultPlan();
  $$('[data-property-link]').forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (link.getAttribute('aria-current') === 'page') { event.preventDefault(); $('#main').focus({ preventScroll: true }); window.scrollTo({ top: 0 }); return; }
    const current = getPlan(), baseline = savedPlan || defaultVisit;
    if (planKeys.some(key => current[key] !== baseline[key]) && !window.confirm('This restaurant has unsaved itinerary changes. Switch restaurants and discard those changes? Choose Cancel to save or download the itinerary first.')) event.preventDefault();
  }));
  window.addEventListener('hashchange', syncDetailRoute);
  window.addEventListener('popstate', syncDetailRoute);
  syncDetailRoute();

  let printDetails = null;
  window.addEventListener('beforeprint', () => {
    if (printDetails) return;
    printDetails = $$('details').filter(detail => !detail.open);
    printDetails.forEach(detail => { detail.open = true; });
  });
  window.addEventListener('afterprint', () => {
    if (!printDetails) return;
    printDetails.forEach(detail => { detail.open = false; });
    printDetails = null;
  });
})();
