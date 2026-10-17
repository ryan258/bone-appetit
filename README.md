# Bone Appétit

A fictional Halloween roadside destination: haunted pizzeria, pumpkin trail, and oddities counter. Built as a self-contained static website with HTML, CSS, and vanilla JavaScript.

For system architecture, data models, and isolation boundaries, see [docs/architecture.md](docs/architecture.md). For completed milestones, verification status, and future horizons, see [roadmap.md](roadmap.md).

## Open it

On this Mac, double-click **Preview.command**. It starts a loopback-only Python server at **http://127.0.0.1:4173/** and opens the site in your browser. The stable address lets saved plans survive preview restarts. Opening the launcher again reuses a running preview only after checking its project and folder identity. If another service occupies the address, the launcher stops with a clear message; it does not open that service or switch ports. Keep the Terminal window open while using the preview; Control-C stops it. No package installation or build is needed.

From a terminal, `python3 preview.py` does the same thing. Use the launcher consistently: another HTTP server does not provide its project-identity check. Plans previously saved at a random preview port stay associated with that old address; this change cannot automatically retrieve them from a different origin.

## Explore four complete restaurants

The preview now contains four full restaurant websites. Use **Choose your haunt** above the header or in the footer to switch between them. These are ordinary links with separate page URLs and an active-property indicator; they work without JavaScript. The creator library also links to each property's original visitor website.

| Property | Local page | Personality |
| --- | --- | --- |
| Bone Appétit | `index.html` | The original haunted pizzeria, pumpkin trail and doubtful inventory. |
| Rest in Pizza | `rest-in-pizza.html` | Neighborhood pizza, a rising garden and a founder with unfinished staffing matters. |
| Grave Expectations Chop House | `grave-expectations.html` | Candlelit steaks, terrace air and an ancestral collection with excellent posture. |
| BooBies Lodge | `boobies-lodge.html` | A cheeky 21+ sports lodge, beer garden, monster games and unofficial trophies. |

Each includes its own introduction, full menu (24 items at Bone Appétit; 18 at each new property), three house experiences, long-form story, six collection records, fictional map, day/night visit modes, FAQs, shareable menu/detail links, visitor guide, visit planner, and text/illustrated itinerary downloads. All retain the local fonts and Halloween paper/ink design. The three illustrated sites use their own artwork and restrained accent variations.

Saved visitor plans stay separate: Bone Appétit retains `bone-appetit-visit-v1`; the others use `bone-property-rest-in-pizza-visit-v1`, `bone-property-grave-expectations-visit-v1`, and `bone-property-boobies-lodge-visit-v1`. **Save my plan** remains explicit. Switching through the property links asks before discarding an itinerary that differs from its saved or default state; Cancel lets you save or download first. Clicking the current property returns to the top without replacing its current draft. Browser-local creator campaigns keep their existing separate key.

The lodge accepts parties age 21+ only in this fictional concept; its planner has no child selector, and its visitor guide and downloads carry that admission policy. The new properties describe free optional spaces, with food/drinks priced separately. Their planners start with the dining room and use the actual garden/terrace names; Bone Appétit's original trail pricing, daytime trail-first order and under-five policy remain intact. Date/hour feasibility and past-season wording use the shared planner.

Without JavaScript, all four sites still show their full menus, house details, maps, FAQs and property links. Scripts enhance those static pages with dialogs, filtering, saved plans and downloads. No website creates reservations, orders, payments, subscriptions or real game/broadcast promises.

Public visitor pages are built from source content. Creator campaigns can now preview these complete websites with edited copy through the workspace. Campaign previews do not overwrite the bundled public pages. For maintenance of the original public sources, edit `site-data.json` for Bone Appétit, each `reference` in `property-data.json` for the other restaurants' menus/facts/experiences, and `visitor-sites.json` for their page introductions, stories and section copy. `index.template.html` owns the common structure; `properties.css` owns the switcher and property layout variations. Run `npm run build` to validate and regenerate all four pages. Do not edit generated delivery HTML directly.

## Create and resume campaigns

Open the preview as usual, then choose **Creator workspace** in the destination's footer. The workspace is also available at `http://127.0.0.1:4173/creator.html`. It uses the same local fonts, artwork, and paper/ink palette as the original destination.

1. Choose **Start with Bone Appétit** to create an editable campaign with a filled example brief and the original copy. Or import a creator backup.
2. Give it a campaign name. Edit the audience, objective, occasion, offer, call to action, tone, channels, campaign dates, and creative boundaries. Brief fields may remain unfinished.
3. Edit the venue name, headline, introduction, action label, menu names/descriptions/prices, and attraction titles/descriptions. The adjacent preview reflects the current copy. Under Essential copy, expand **Website story, section headings, and supporting copy** to edit the full page through a field picker. Use a blank line between story paragraphs, or four separate lines for at-a-glance facts. **Restore original field** restores that one field.
4. Choose **Save named version**, or press Command-S / Control-S, to keep a deliberate version. **Duplicate current draft** creates an independent campaign, including unsaved edits, while keeping the original.
5. Reopen the workspace to resume the last campaign automatically. Its selected menu item, attraction, website-copy field, open editing panels, and unfinished draft are recovered. Choose any campaign in the list to resume it.
6. In **Preview your restaurant website**, choose **Current draft** or **Last named version**, then **Preview full website**. Explore the full restaurant design, menu categories, attraction dialogs, map, FAQs, and planner. Choose **Phone** to inspect the narrow layout. Editing or changing the source clears the old preview; refresh when ready. Choose a different campaign above to preview another property.
7. To share the full site, choose its **Website source**, then **Download complete website ZIP**. Extract the whole ZIP and open **index.html**, or send the complete ZIP to someone else. It contains the website, artwork, fonts, styles, full menu and planner; your brief and saved plans stay in the workspace.
8. Use **Download workspace backup** for all campaigns, or **Back up current campaign** for a single campaign. Import adds copies with new IDs; existing campaigns are kept. Name collisions receive an imported suffix.

Draft recovery checkpoints edits after a short pause and when leaving the page. It retains unfinished values, including an incomplete price, separately from the last named version. Named saving requires valid content and dates; an invalid draft cannot replace a named version. **Restore named version** brings that deliberate version back. Restore and campaign removal offer one-level undo until another content edit, save, switch, or other workspace action; undo does not survive reloading.

Creator work uses its own `bone-appetit-creator-v1` localStorage key. Visitor plans keep their existing separate key. Work stays in this browser at this origin unless you download a backup. JSON backups contain the brief, editable copy, optional website-copy edits, reference snapshot, named versions, draft edits, and editing position. Existing version 1 backups without website edits still open unchanged. The reference snapshot and explicit website overrides travel with unfinished campaigns; unedited website fields use the bundled property profile on reopening. This edition supports 20 campaigns and backups up to 2 MiB; references are limited to this bundled edition's artwork. A single-campaign backup helps retain one campaign before removing it from a full workspace.

If browser storage is blocked or full, the workspace keeps current work in memory and reports the failure. Named saving does not report success when storage fails; download a backup to keep the work. If another tab has changed the stored workspace, the writer detects that changed copy before writing and asks you to back up and reload. This is a local change check, not a simultaneous multi-user editing system. Malformed local data is left untouched; the recovery controls can download its original bytes and explicitly replace it with the workspace shown. Reloading after a storage failure asks before discarding unbacked work.

The original Bone Appétit destination, artwork, menus, prices, visit planner, and 2026 concept season remain its reference. Campaign dates are brief metadata; editing them does not alter the destination's season. Local campaign authoring, complete website previews and ZIP exports, JSON recovery, and marketing packs are available; website publication is a separate action.

The full preview uses `website-renderer.js`, the same renderer used by the public-page build. Hero copy comes from the campaign headline/introduction/action label. Venue and menu edits update the full menu and featured cards; edited attraction descriptions update their homepage cards and detail dialogs. Supporting page copy starts from the property's own `visitor-sites.json` profile and accepts validated optional overrides in the campaign's `website` field. This keeps the property design, artwork, routes, admission policy, hours, and schedule rules intact. Page-only copy edits do not become marketing-pack copy; the existing pack uses the campaign essentials, brief, menu, and selected attraction, and its campaign backup includes website edits.

Previews run in a sandbox with scripts, form interactions, print dialogs, and downloads, but without same-origin access or parent navigation. Fonts are embedded locally to preserve typography inside that isolated origin. Preview planner saves are temporary in-frame memory; they cannot read or overwrite visitor plans or the creator library. Refreshing a preview clears its temporary plan. Property/creator links within the frame stay in the preview; use the creator campaign selector to change properties. Preview URLs and fragment navigation are local to the frame and do not create public share links. If assets fail, retry **Preview full website**; if profile/template loading fails, use **Retry website resources**. Missing interactive scripts leave the full static menu and details readable. An edit made during an async build invalidates that build so it cannot return an outdated preview.

## Download a complete restaurant website

In the creator's website section, choose **Current draft** or **Last named version**, then **Download complete website ZIP**. This works independently of building a preview or marketing pack. Each campaign produces one complete restaurant website in its original design, including the resolved website-copy edits. Repeat for another campaign to export that property. Validation must pass; incomplete drafts remain recoverable and cannot produce a misleading partial download.

Extract the entire ZIP and open `index.html` in a browser. The full menu, house details, map, collection, FAQs and planner are included; local scripts load embedded validated content and need no fetch calls or internet connection. The package also includes all referenced artwork, four local font files and their licenses, three stylesheets, a public `website-content.json` snapshot, a short `README.txt`, and a SHA-256 integrity manifest. File hashes detect accidental changes; they are not approval or a signature. Use the separate creator backup command to keep your editable campaign and working brief. Website exports omit campaign names/briefs, other campaigns, creator UI, and saved visitor plans.

Share the complete ZIP so someone can extract it and open the site, or serve the whole extracted folder with a static host. All asset paths are relative, including when hosted in a subfolder. Each package contains just its selected property; its top/footer property strip points to that site and does not link to unbundled siblings or the creator workspace. Downloading creates files only; it does not publish, deploy or send anything.

The exported planner has the same date, price, schedule, admission, save/restore/reset/undo and text/illustrated itinerary behavior as the visitor site. It uses a content-derived storage key separate from the creator, bundled visitor pages and differently edited exports. Identical public content retains the same key; a public copy/menu change creates a new one. Browser storage behavior for directly opened files varies; blocked storage falls back to in-memory use and itinerary downloads. A stable static-host URL provides consistent browser-local resumption. No visitor's plan is embedded in the shared ZIP, and a saved itinerary remains a fictional plan rather than a reservation.

The download is built from a frozen source and cleared if that source changes during resource loading or hashing. A missing/empty resource stops the download and supports retry. The ZIP uses the existing bounded archive writer and includes only resources required by that property; PNG source artwork, the creator, other restaurant sites and marketing documents are excluded.

## Three Halloween property starters

The creator library now offers three additional fictional properties. Choose **Start this property**, or **Add all three properties** to create the collection with one click. Existing campaigns are kept. A second copy receives a unique copy name, and the existing 20-campaign/2 MiB limits still apply. Bone Appétit remains available as the original example and one of the four complete visitor websites.

| Property | Concept and voice | Headline | Example menu items |
| --- | --- | --- | --- |
| **Rest in Pizza** | A family-friendly neighborhood pizzeria. Warm dough, afterlife puns, and a founder who refuses to leave payroll alone. | “The dough rises. So does the owner.” | Dead & Buried Pepperoni; Margherita Morticia; Last Rites Garlic Knots; Tiramisu Mortem |
| **Grave Expectations Chop House** | An upscale steakhouse. Candlelight, inherited confidence, and a cellar committee of questionable attendance. | “A cut above. Six feet below.” | Ribeye in Perpetuity; Filet of the Deceased; Estate Tartare; Crème Brûlée Bequest |
| **BooBies Lodge** | A cheeky 21+ sports lodge with adult pin-up lumberjack hospitality, monster games, and an unreasonable quantity of rib napkins. | “Great racks. Grave decisions.” | The Great Rack; Resting Witch Burger; Haunted Hoops; Lumberjack-o’-Lantern |

Each property has 18 menu items (54 across the collection), a complete structured brief, essential campaign copy, three house experiences, hours, a fictional address, admission wording, six collection records, an illustrated fictional map, and its own vector artwork. All three use the fixed October 1–November 1, 2026 concept season. The satire changes with the property; the original paper/ink design and clear operational language remain.

The starters are independent campaigns. Edit, duplicate, name/save, resume, back up and import them using the existing controls. Every starter can produce the full six-piece marketing pack. Two signature main courses are selected initially for the new properties; choose up to four menu items if desired. Bone Appétit retains its original three featured pizzas. Pack filenames identify the property, and previews/downloads switch artwork with the source campaign. The lodge's 21+ admission language travels with every piece and its reference planner does not allow children. Printed outdoor-closing labels use each property's own garden or terrace name.

`property-data.json` owns the property content. `property-catalog.js` validates the bundled definitions and creates fresh campaign IDs and independent content snapshots. The existing version 1 campaign/backup format and storage key are retained. The old internal category/experience keys remain for compatibility; display labels describe steaks, main events, terraces and collections as appropriate. Optional branding and admission fields are validated, and reference artwork stays restricted to this edition's bundled files. Six new repository-native SVGs provide three property illustrations and three schematic maps; they request no remote assets.

If the catalog fails to load, the original example and existing campaigns remain available. **Retry property starters** reloads just the catalog, without discarding edits or reloading the workspace. Adding all three requires three free campaign spaces and validates the complete candidate workspace before applying it. No starter is inserted into your browser storage until you choose it or import a backup.

To generate a portable collection outside the browser, choose a new absolute output directory:

```sh
node scripts/export-properties.cjs /absolute/new-output-directory
```

The command writes three property folders, their complete marketing ZIPs, and `three-properties-backup.json` containing all three named campaigns. Import that JSON through **Import backup** to add copies. The CLI refuses to reuse an existing output directory, keeps unrelated campaigns out of the export, and does not access browser storage or publish anything.

## Build a marketing pack

In the creator workspace, open a campaign and scroll to **A campaign, properly packed**. The filled example is ready to try without retyping a brief.

1. Choose **Current draft** or **Last named version** as the source. A valid draft can be exported without replacing its named version. The pack never saves or publishes a campaign.
2. Keep the three featured pizzas or choose one to four items under **Choose menu items**. Choose the attraction spotlight. These export choices last for the current open workspace; they do not change the saved campaign schema.
3. Choose **Build marketing pack**. Review the summary first, then use **Preview piece** for each of the six pieces. Source and build time appear above the preview. Editing campaign content, switching campaigns or versions, saving, or changing export choices clears the old pack; build again to refresh it.
4. Choose **Download complete ZIP**, extract it, and open its `index.html`. Individual HTML and plain-text downloads are also available. **Print this piece** uses your browser's print dialog; Save as PDF is available there if your browser supports it.

| Piece | Contents and files |
| --- | --- |
| Landing copy | Headline, introduction, common offer/CTA, selected menu, attraction spotlight, shared venue facts and disclosures. `landing.html` and `.txt`. The HTML is a readable campaign page; add an approved destination in your publishing tool. |
| Menu insert | One to four menu items with current names, descriptions, USD prices and reference tags, offer, venue facts, CTA and dietary/fictional disclosures. `menu-insert.html` and `.txt`. |
| Social copy | Three editorial drafts: destination introduction, first selected menu item, and attraction spotlight. Each carries the offer/CTA, facts and fictional context. Unicode character counts are shown for editing; these are not platform-specific ad formats. `social-copy.html` and `.txt`. |
| Email draft | Subject, preheader and body, with a readable preview, text fallback and a UTF-8 plain-text email draft. `email-draft.html`, `.txt` and `.eml`. The `.eml` sets `X-Unsent: 1` and has no sender or recipients; mail-editor import behavior varies. Nothing is sent or subscribed. |
| Poster | Existing haunted-roadhouse artwork, venue, headline, offer, fixed concept season/hours, fictional address and action label. `poster.html` and `.txt`. |
| Review summary | Source version/ID/edit time, generation time, source hash, full structured brief, campaign window, shared facts, selected menu/attraction, missing-brief warnings and human review actions. `review-summary.html` and `.txt`. |

All pieces derive from one validated source snapshot. Edited attraction tokens resolve through the existing planner. The brief's campaign window is listed separately in the review summary; consumer copy uses the fixed venue season and timezone. The common offer comes from the brief; the call to action uses the brief or falls back to the action label when blank. Audience, objective, occasion, tone, channels and boundaries remain review context; this is deterministic template assembly, not an AI rewriting service or semantic fact checker.

For a readable poster, building requires a nonempty offer of at most 240 characters, headline up to 100, venue name up to 80, and action label up to 60. Longer campaign drafts remain recoverable; they are never silently shortened. Campaign validation, valid prices, dates and feasible reference schedules must also pass. Incomplete optional brief fields become review warnings. Menu insert and poster use US Letter styles with 0.4-inch margins and no bleed. The default three-item sample is checked to fit the printable area; longer or four-item menus can flow across pages. Inspect line breaks, pagination and printer settings before use. These HTML files are not prepress PDFs or social images.

Every HTML file embeds its fonts and any artwork and works independently offline without JavaScript. Individual HTML files carry the full font licenses in non-rendering source comments. The ZIP also includes font licenses, `campaign.json` (an importable backup of exactly the selected source, excluding other campaigns and any later draft), and `manifest.json` with SHA-256 hashes and sizes for all other files. Importing `campaign.json` follows the existing non-destructive import flow and adds a new campaign copy. Hashes detect accidental modification; they are not approval signatures. The archive uses dependency-free, uncompressed ZIP with a 64 MiB bound. Only fixed local art/font/license paths are loaded; no remote generation service is used.

Review remains explicit: free-text claims are not fact-checked, ingredients/tags and artwork do not automatically change with edited descriptions, and campaign dates may differ from the fixed venue season. The summary flags missing brief fields, dates outside the season, and past campaign/venue dates using the venue timezone. All outputs remain fictional drafts, with no invented real URL, sender, recipients, booking, checkout, metrics or endorsements. Supply approved destination and email details in the appropriate publishing tool before any real use.

## What works

- Responsive homepage, mobile navigation, and real section links.
- A parody of roadside-attraction marketing and cheerful family-business administration: the extra place setting, Visitor Services, and doubtful inventory recur across the story, attractions, and field notes.
- A fictional grounds sketch with six numbered locations, a solid trail loop, a dashed shorter return, readable location descriptions, and links to attraction details.
- Six illustrated oddities with native expandable counter records, imagined provenance, and clear no-sale disclosures.
- A designed field-note itinerary with a contextual house note, map, legend, party/estimate, and fictional disclosures. Download field notes produces a self-contained HTML keepsake with embedded art/styles and a print button; it works offline. The original plain-text itinerary remains available.
- Three attraction detail dialogs with time, price, intensity, and concept access information.
- A complete 24-item static menu, enhanced with four category filters when JavaScript works.
- Shareable menu/category and attraction anchors work on direct entry, reload, Back, and Forward. Enhanced clicks keep the URL in sync; modified clicks keep native new-tab behavior.
- Static attraction descriptions, durations, prices, and fictional access details when JavaScript is disabled or app.js/planner.js fails to load. Ordinary menu/attraction links and mobile navigation remain usable; planner controls appear only after initialization succeeds.
- Daytime and after-dark visitor modes.
- A visit builder for the 20 Thursday–Sunday dates in the October 1–November 1, 2026 concept season.
- Arrival time, party size, optional stops, schedule, and trail estimate. Under-fives are free; food and souvenirs are excluded.
- Explicit browser-local saving, unsaved-change status, restore-saved action, reset with one-level undo, and downloadable plain-text itineraries.
- A text-focused homepage printout and a Print itinerary action with fictional disclosures. Printing the full-menu dialog includes its selected category.
- Fixed 2026 concept-season wording, with an explicit archive notice after November 1, 2026. Past dates remain available for exploring the fictional concept.
- Native keyboard-operable dialogs, persistent scrolling exits, Escape dismissal, focus restoration, a skip link that focuses main content, reduced-motion support, and disclosure FAQs.
- All fonts and images served locally. No analytics, remote embeds, API keys, or third-party page requests.

## Edit it

- `site-data.json`: canonical menu, featured-item references, attraction copy, FAQs, visit moods, season dates, hours, prices, party limits, stop durations, fictional map locations, six oddities, field-note copy, and fictional disclosures.
- `content.js`: shared content validation for generation and browser initialization, with field-specific editing errors.
- `index.template.html`: editable page structure, unique homepage/story copy, and named slots for shared content.
- `index.html`, `rest-in-pizza.html`, `grave-expectations.html`, and `boobies-lodge.html`: generated delivery pages, including the full static fallbacks and a safe embedded content snapshot. Regenerate it; do not edit it directly. It also embeds inert map/style templates for offline field-note downloads.
- `styles.css`: responsive design, typography, counter/map sections, and reduced-motion/print rules.
- `field-notes.js` and `field-notes.css`: shared field-note card/export markup and styles. The page generator and browser download use the same renderer; the live page, printed plan, and offline download use the same stylesheet.
- `planner.js`: shared DOM-free validation, calendar, visit modes, scheduling, estimates, factual labels, and itinerary export. The browser and page generator use these same functions.
- `app.js`: DOM rendering, navigation/dialog events, explicit storage, saved/draft status, reset undo, and print interactions.
- `creator.html`, `creator.css`, and `creator.js`: separate local campaign workspace, essential content forms, live copy preview, local recovery, and backup/import controls.
- `creator-model.js`: DOM-free campaign, workspace, validation, duplication, backup/import, and storage-change checks. Each campaign retains its reference snapshot.
- `property-data.json` and `property-catalog.js`: three independent Halloween property starters, their content, and validated campaign creation.
- `website-copy.js`: bounded editable page-copy fields, literal text handling, and campaign-to-page copy resolution.
- `website-renderer.js`: DOM-free shared renderer for the static build and complete creator preview; `scripts/render-site.cjs` supplies files/assets for Node.
- `website-export.js`: complete public website packaging, asset closure, source isolation, standalone navigation and integrity manifest.
- `website-workspace.js`: browser preview/export adapter, draft/named selection, resource retry, source invalidation, field picker, and isolated preview frame.
- `scripts/export-properties.cjs`: portable named-campaign collection and marketing-pack export to a fresh directory.
- `marketing-pack.js`: DOM-free campaign-to-pack generation, shared facts/copy, escaped offline documents, MIME email draft, integrity manifest and stored ZIP writer.
- `marketing-workspace.js`: creator pack source/selection controls, frozen async builds, preview, individual downloads, print action and ZIP download. It does not write campaign storage.
- `visitor-sites.json`: per-property visitor copy, narratives, section headings, metadata and stable page routes.
- `properties.css`: shared property switcher and the three illustrated restaurant layouts/accent variations.
- `scripts/render-site.cjs`: dependency-free four-page generation and read-only generated-output drift checking. It validates every source and stages every rendered file before replacing delivery pages.
- `scripts/package-site.cjs`: stages all four complete visitor websites, creator studio, local assets, styles, scripts and `.nojekyll` for static hosting or GitHub Pages.
- `.github/workflows/deploy.yml`: automated GitHub Actions workflow validating all gates and deploying to GitHub Pages on push to `main`.
- `assets/manifest.json`: existing image-generation prompts, retained image filenames, font-license paths, and provenance for the seven new project-authored SVG assets.
- `assets/grounds-map.svg` and `assets/oddity-*.svg`: editable vector art. The map is a fictional schematic, not geography or verified access evidence. The six object images are invented specimen illustrations.
- `assets/fonts/`: locally hosted typefaces and their SIL Open Font Licenses.

The original food PNGs are preserved. The live site uses smaller WebP versions. The three new attraction images were made with the built-in image generation tool.

## Maintenance workflow

The delivered page stays static: double-click Preview.command as usual. No package install or generation is needed just to view it. When editing shared content or layout, update site-data.json, property-data.json, visitor-sites.json or index.template.html, then regenerate all four delivery pages with `node scripts/render-site.cjs`. Node is needed for this maintenance step only; the generator has no package dependencies and makes no network requests.

The content file owns repeated facts. Featured menu entries reference canonical menu IDs, so their names/prices cannot drift. Attraction duration/price facts, planner choices, visitor details, and downloads derive from the same rules. The displayed year derives from the season start date; a season must fit within one calendar year. Copy tokens `{{DAY_RANGE}}`, `{{NIGHT_TIME}}`, and `{{FREE_UNDER_AGE}}` resolve through the shared planner module in attraction descriptions, FAQ answers, and mood features. Unsupported or misplaced tokens are rejected. Featured descriptions may intentionally use shorter editorial wording than full-menu descriptions.

Use Node 22 or newer for maintenance (`.nvmrc` selects Node 22). `npm run validate` checks all four profiles, content, schedule feasibility, referenced assets and template slots without writing anything. `npm run build` renders/validates all four sources first, writes temporary pages, then replaces each delivery file by rename. Invalid JSON, content, references or schedules leave all previous delivery pages intact and report the relevant field. Browser initialization uses the same content and schedule checks; invalid embedded data leaves the static fallback page available.

The current contract keeps the three attraction types, two visitor modes, six illustrated specimens, and six numbered map locations. Dates must be real, ordered, within one calendar year, and include an open weekday. Hours use `HH:MM` within one day; both opening and the night boundary must be offered arrival choices. Durations are positive whole minutes (arrival time may be zero); party defaults must fit their limits, and party maxima cannot exceed 1,000. Prices are non-negative amounts with at most two decimal places. Menu IDs must be unique across all categories, and featured items must reference pizzas. Asset names stay local, and referenced delivery assets must exist.

Every advertised arrival must fit **all three stops**, finishing dining by kitchen close, the trail by trail close, and the entire visit by grounds close. Finishing exactly at closing is allowed. Removing optional stops only makes the remaining stops finish earlier. If an edit breaks this rule, remove the late arrival, shorten the relevant durations, or extend the fictional hours consistently. The planner does not silently skip stops or move someone to another arrival. This edition treats kitchen close as the end of the scheduled dining stop.

Shared URLs use `#full-menu`, `#full-menu-pizzas`, `#full-menu-bites`, `#full-menu-sweets`, `#full-menu-drinks`, and `#details-pizzeria`, `#details-hollow`, or `#details-oddities`. Use the normal links and copy the address to share the current view. Menu filters replace the current detail URL so they do not fill browser history. Back and Forward restore the relevant view. Close/Escape restores the preceding page anchor; a directly opened detail returns to the menu or haunts section. With JavaScript disabled or a required script unavailable, the same URLs target readable static content. An unknown hash does not open a dialog. These URLs share content views, not browser-local saved plans.

Fast targeted checks, without launching a browser:

```sh
npm run check
```

This runs only generated-output, content-validation, planner, creative-content, creator-model, marketing-pack, property-catalog, four-website, website-workspace and website-export checks. It needs Node's standard library, npm and Python 3 (for independent ZIP/MIME reading); no dependency installation is needed. The checks cover invalid edits, all 800 current date/arrival/stop combinations, closing constraints, decimal currency formatting, generated-page preservation on errors, shared-content propagation, export escaping, offline assets, and creator recovery. Individual commands are `npm run check:generated`, `npm run check:validation`, `npm run check:planner`, `npm run check:creative`, `npm run check:creator`, `npm run check:marketing`, `npm run check:properties`, and `npm run check:websites`. `npm run check:website-workspace` checks shared rendering, page-copy validation, all four property previews, coherent featured/card edits, v1 compatibility and backup/import. The creator check covers duplication isolation, editable content, named/draft separation, import validation and limits, backup round trips, view resumption, damaged data, blocked/full storage, and changed local copies. `npm run check:preview` separately runs the six Python launcher checks using temporary loopback ports and mocked browser opening. Keep existing storage IDs/version stable unless a separate migration is planned. Use two-space indentation, readable HTML blocks, and one CSS declaration per line.

`npm run check:website-export` validates all four complete exports, frozen source consistency, edited copy/menu data, escaping, public-only contents, safe ZIP paths, font licenses, distinct planner keys and unchanged public pages. An independent Python ZIP/HTML/CSS reader verifies CRCs, sizes, SHA-256 hashes and that every referenced resource is present. The focused `npm run check:website-export-browser` downloads draft/named ZIPs, extracts them outside the checkout, opens all four websites offline, checks their menus/details/planners/fonts/art and no-JavaScript fallbacks, serves them under one temporary static host to check independent saved plans, and verifies validation, retry, stale-download prevention and missing-export-script recovery.

```sh
npm run check:website-export
npm run check:website-export-browser
```

### GitHub Pages hosting

The repository includes an automated GitHub Pages deployment workflow in `.github/workflows/deploy.yml`. On push to `main` (or manual `workflow_dispatch`), the workflow:
1. Runs the deterministic validation gates (`npm run check && npm run check:preview`).
2. Packages all four static restaurant sites, creator studio, local assets, styles, scripts, and `.nojekyll` into `_site` using `npm run build:pages`.
3. Deploys the static bundle to GitHub Pages at `https://ryan258.github.io/bone-appetit/`.

To package and inspect the static deployment bundle locally:

```sh
npm run build:pages
```

Browser checks are separate and never run as part of `npm run check`. Development dependencies are pinned in `package.json` and `package-lock.json`; this edition uses Playwright 1.63.0 and its matching Chromium revision. Prepare them once, or after changing the lockfile:

```sh
npm ci
npm run browser:install
npm run check:browser-env
```

The preflight checks the pinned package and browser executable without launching a browser. Every browser check uses this preflight before starting a server, with an actionable message if setup is missing. `npm ci` installs development tooling only; the preview and generator still need no packages. On a machine with the matching browser already installed, the browser installation command reuses it.

`npm run check:sharing` performs one focused headless pass through direct links/reloads, Back/Forward, category URLs, focus return, planner handoff, saving/reload/reset/undo/restore, invalid-selection recovery, 375/1440-pixel planner reflow, script failures, invalid embedded content, and blocked storage. It uses a disposable loopback server with a bounded startup wait, isolated browser data, and temporary screenshot output. It makes no external requests. For an explicitly requested visible pass, use `BONE_BROWSER_VISIBLE=1 npm run check:sharing`.

`npm run check:creator-browser` separately checks the creator workflow with isolated storage: brief/content editing, named versions, duplication, incomplete draft resumption, backup/import, rejected imports, restore/remove undo, changed-tab protection, blocked-storage backup rescue, damaged-data recovery, literal rendering of imported text, mobile/desktop and simulated 200% text reflow, and the untouched no-JavaScript visitor guide. It uses the pinned Chromium and temporary local server; it never runs as part of `npm run check`. For an explicitly requested visible pass, use `BONE_BROWSER_VISIBLE=1 npm run check:creator-browser`.

`npm run check:website-workspace-browser` is the focused headless creator-to-website pass. It checks all four designs, hero/story/menu/card edits, draft/named sources, menu/detail/planner interactions, temporary preview-plan isolation, field/panel resumption, backup/import, duplication, incomplete-copy/price validation, async invalidation, failed-resource retry, missing-script static fallback, phone reflow, and the public visitor planner. It uses isolated storage and a disposable loopback server and prints its evidence directory. Run it only when a browser pass is appropriate:

```sh
npm run check:website-workspace
npm run check:website-workspace-browser
```

`npm run check:marketing` checks shared facts/copy, invalid sources and selections, HTML escaping, exact source backup/import, review warnings, archive integrity and UTF-8 email encoding without launching a browser. Python's independent standard-library ZIP and MIME readers validate the generated artifact. `npm run check:marketing-browser` performs the separate focused headless pack pass: source-version selection, six previews, ZIP and individual downloads, unchanged named saves, offline/no-JavaScript documents and links, print action, Letter sample layouts, mobile/desktop reflow, invalid input, missing assets, retry, stale async builds and missing marketing scripts. It uses isolated storage and a disposable loopback server and prints its temporary artifact directory. For an explicitly requested visible pass, use `BONE_BROWSER_VISIBLE=1 npm run check:marketing-browser`.

`npm run check:properties` validates the three catalogs, all 54 menu items, independent campaign creation, admission rules, reference artwork, six-piece packs and version 1 backup/import. `npm run check:properties-browser` is the separate focused browser check for collection creation, distinct property menus/art, named saves/resume, duplication, backup/import, all 21 offline HTML files, Letter poster/menu samples, responsive cards and catalog failure/retry. It uses isolated storage and a disposable local server; it never runs as part of the default check. Use `BONE_BROWSER_VISIBLE=1 npm run check:properties-browser` only for an explicitly requested visible pass.

`npm run check:websites` validates the four complete generated pages, 78 menu items, stable property links, four independent storage keys, 3,200 date/arrival/stop schedules, adult admission controls, escaped page copy, drift detection and preservation of all pages after an invalid property/profile edit. `npm run check:websites-browser` is the focused headless visitor check across all four sites: switcher, all category prices, details, deep links/reloads, separate saved plans, restore/reset/undo, unsaved-switch protection, Back/Forward, downloads/offline notes, narrow layouts and no-JavaScript/script failures. It uses the pinned browser, isolated storage and a disposable local server. Use `BONE_BROWSER_VISIBLE=1 npm run check:websites-browser` only for an explicitly requested visible pass.

With Playwright and Chromium available, `npm run check:maintenance` checks disabled JavaScript, each required blocked script (including content.js), all menu prices, ordinary fallback links, and narrow dialog layouts using a disposable loopback server. `npm run check:reliability` checks the saved/draft/undo/restart and print paths; close any preview already using port 4173 first. `npm run check:creative-browser` checks map links/focus, counter records, no-JavaScript use, offline HTML, print output, and export-script failure. Each browser check uses isolated storage and writes its evidence to a temporary directory.

`npm run check:final-review` is the broader historical browser review: skip-link focus, internal anchors, scrolling exits, five responsive widths, short screens, simulated 200% text enlargement, menu counts/prices, modal keyboard traversal, map focus return, offline disclosure parity, and complete no-JavaScript print records. It also requires Poppler's `pdftotext` on PATH for PDF content checks. Like the other browser checks, it starts and stops its own disposable loopback server and writes evidence outside the project. It is not part of the targeted default checks.

The retained `preview-desktop.jpg` is an October 3 historical screenshot and predates the map, oddities collection, and later copy changes. It is not current acceptance evidence.

## Creative scope

The satire targets inflated roadside heritage, gift-shop provenance, and cheerful administrative treatment of unexplained events. It remains a cozy fictional destination. Functional failures, save status, prices, dietary/access disclosures, and recovery actions use plain language. The extra place setting is a story detail; it never adds a guest or a charge to the planner.

The map and six-object collection are static HTML/SVG and work without JavaScript. The three attraction links in the map reuse the existing dialogs when enhancement succeeds and otherwise lead to static descriptions. Counter records use native details elements. No shop, checkout, directions service, surprise audio, or tracking was added.

Field notes embed their map and CSS in the generated page’s inert templates. The download is made locally from current selections and requests no remote fonts or images. If field-notes.js is unavailable, the extra download control stays hidden while ordinary planning, saving, text download, and printing continue to work.

## Scope and data

Everything describes a fictional destination. The address, history, prices, hours, and physical accessibility features are concept content. There is no checkout, reservation system, order submission, or mailing list. All UI language reflects this.

**Save my plan** writes the itinerary to `localStorage` under `bone-appetit-visit-v1`. **Undo reset** can also write the previously saved plan back to that same key. Other edits stay in memory until you explicitly save. No personal identifiers are collected. Saved values are validated before use; malformed or inaccessible storage does not stop the planner. **Restore saved plan** replaces the current draft with the last saved selections without writing storage. **Reset** removes the saved plan when browser storage permits it and returns to the default daytime itinerary. **Undo reset** restores the previous draft and saved-plan state; it remains available until saving, restoring, or reloading. If storage is blocked, selections can still be recovered in memory, and the interface reports any saved-copy failure. The download is generated entirely in the browser.

This is a permanent 2026 fictional concept, not a live seasonal booking service. After the season, the planner explicitly identifies its dates as archived rather than implying a future visit.

## Verification

### Complete website ZIP exports — October 16, 2026

Each edited campaign can now export a complete standalone website from the current draft or last named version. `website-export.js` validates and freezes the selected public content, renders it with the shared website renderer, bundles exactly its local styles/scripts/artwork/fonts/licenses, and adds opening instructions, a public content snapshot and integrity manifest. The existing archive writer creates the ZIP. Working briefs, campaign names, other campaigns, creator pages and saved visitor plans are excluded. Standalone navigation has no links to absent sibling websites or creator pages; public-page generation remains byte-identical. Different public edits get different planner storage keys.

The targeted export, website-workspace, four-website and generated-output checks passed. An independent Python reader verified four ZIPs for CRCs, paths, file sizes, SHA-256 hashes, and complete HTML/CSS resource references. Creator HTML and edited/new script syntax were also checked. No full suite or older broad browser pass was run.

The authorized focused headless export pass passed with Playwright 1.63.0 / Chromium 153.0.8010.12: eight draft/named downloads, all four extracted websites opened offline via file URLs, original fonts/art, menu categories and direct links/reloads, attraction dialogs, planner save/reload, text and illustrated itinerary downloads, no-JavaScript menu/detail fallbacks, and 375px reflow. Four extracted sites were also served under a single temporary static host to verify independent planner saves and recovery. Invalid input, failed-resource retry, prevention of stale downloads after editing, missing-export-script recovery and unchanged named/draft source data were checked. No collected page errors, external requests or final file-resource failures remained. The browser found a redundant cross-origin font preload that failed for file URLs; standalone exports now omit that preload while preserving the original CSS/font files. The complete pass then passed. Desktop steakhouse and narrow lodge exports were visually inspected.

See [the export verification record](verification/website-export-2026-10-16.json) for hashes, source preservation and retained test fixtures. Existing generated public pages, canonical/property/profile JSON, artwork, base styles, application, planner, creator model, marketing pack, lockfile and earlier verification records match the pre-export snapshot. The shared renderer/template gained standalone-only navigation/preload choices; the creator adapter/UI gained the export action. Other engines, human VoiceOver/dictation, printing and production hosting were not checked. No files were staged, committed, pushed, published or sent.


### Creator-to-website editing — October 16, 2026

The creator now renders complete restaurant previews through the same DOM-free `website-renderer.js` as the public-page build. All four original generated pages still match the shared renderer byte for byte. The workspace adds a bounded page-copy picker, draft/named source selection and desktop/phone widths. Campaign edits update the hero, full menu, featured descriptions, attraction cards/details and selected supporting page copy; existing visual designs and parody remain in place. Optional website-copy and editor-view fields preserve compatibility with old version 1 saves and backups.

The authorized focused headless pass passed on Playwright 1.63.0 / Chromium 153.0.8010.12, covering all four properties, interactive menus/details/planning, isolated temporary preview saves, resumption, named/draft differences, backups/import, duplication, invalid copy/prices, async invalidation, font-fetch retry, missing-app-script static fallback and narrow reflow. The public visitor planner still saved to its usual key. No collected page errors or external requests remained. Representative desktop and phone-preview captures were visually inspected. During implementation, the preview sandbox was corrected to permit form interaction while retaining an opaque origin; the browser check's frame lookup, nested-panel setup and delayed-request cleanup were also corrected before its complete passing run.

Targeted DOM-free website-workspace, creator-model, marketing-pack, content-validation, planner, property-catalog, four-website and generated-page checks passed during this increment; final changed-source checks are listed in [the creator-to-website verification record](verification/website-workspace-2026-10-16.json). HTML structure/local references and edited JavaScript syntax were checked. The full suite, older broad browser passes, other engines, human VoiceOver/dictation and physical printing were not run. Previewing does not publish or overwrite the bundled restaurant pages. Source snapshots and explicit page-copy edits travel in backups; unedited page-copy fields use the current bundled profile. This checkout has been bundled into logically grouped Git commits reflecting each verified layer, with all tests passing. No pushes, remote publication or deployment took place.


### Four full restaurant websites — October 16, 2026

All four restaurants now use the shared visitor template with individual page URLs, metadata, introductions, section wording, long-form stories, menus, experiences, collections, maps, FAQs and visit planners. Native property links work in the top switcher and footer. New-property hero actions lead to their labeled menu or house-experience sections. The original Bone Appétit content, fonts, base stylesheet, artwork, pricing and visitor storage key remain its reference.

Targeted website checks passed for all four generated pages, 78 menu items, four unique visitor storage keys, 3,200 date/arrival/activity combinations, adult admission, escaped profile copy, valid action destinations, drift detection, and preservation of every delivery page when a property/profile edit is invalid. Content-validation, planner, creative/field-note, creator-model, marketing-pack, property-catalog and generated-page checks also passed. All five visitor/creator HTML files passed nesting, unique-ID, local-reference and anchor checks; new/edited JavaScript syntax passed.

The authorized focused headless visitor pass passed with Playwright 1.63.0 and Chromium 153.0.8010.12. It verified native property switching and current-property indication, hero destinations, all category counts/prices, house-detail text/images, direct menu links/reloads, four separate saved plans, restore/reset/undo, cancellation of an unsaved-plan switch, Back/Forward, correct download filenames/content, four offline illustrated field-note downloads, 375/1440-pixel page/detail layouts, all four complete no-JavaScript guides and property links, and blocked app/planner/content-script fallbacks. No collected page errors or external requests remained. Desktop/narrow homepage captures and representative menu/story captures were visually inspected. Test assertions were corrected to distinguish supported tokens inside embedded JSON from unresolved template slots, and to recognize the existing uppercase plain-text itinerary heading.

See [the website verification record](verification/websites-2026-10-16.json) for hashes, scope and retained evidence. Screenshots and example itinerary downloads are retained in this chat's visualization directory. The main `styles.css`, canonical `site-data.json`, all existing art/font files, launcher, dependency lockfile and earlier verification records match the pre-website snapshot. Shared visitor/generator/field-note code was extended for property artwork, labels, navigation protection and adult admission; the creator library gains links to the original property websites.

The full suite, historical broad browser passes, Lighthouse, other browser engines, human VoiceOver/dictation, actual PDF pagination and physical printing were not rerun. Verification is scoped to the generated source and tested browser states; it does not establish accessibility conformance or real restaurant operation. The project folder has no Git metadata. Nothing was staged, committed, pushed, deployed, published or emailed.

### Three Halloween properties — October 16, 2026

The property catalog and focused browser pass passed for Rest in Pizza, Grave Expectations Chop House and BooBies Lodge: 54 distinct menu items, independent templates and edits, property-specific artwork, age/admission wording, six-piece marketing packs, one-click collection creation, preservation of existing campaigns, named saving/resumption, duplication, workspace backup/import, catalog failure/retry, 375/1440-pixel cards, all 21 offline HTML files, and six Letter menu/poster samples. The source backup format and localStorage version remain 1. No collected page errors or external requests remained in the final browser pass.

Targeted property, creator-model, marketing-pack, content-validation, planner and generated-page checks passed. New/edited JavaScript syntax, creator HTML structure/IDs/local references and all six new SVG XML files were checked. Starter-card and representative menu/poster captures were visually inspected. Visual review corrected oversized starter images and replaced inherited “Trail until” wording with the actual property garden/terrace name. One intermediate browser run timed out awaiting a pack; the check now reports build failures directly, and the final complete pass passed. The timeout's cause was not reproduced or established.

See [the property verification record](verification/properties-2026-10-16.json) for source hashes, scope, artifact paths and limitations. Three named campaign examples, their importable collection backup, and complete marketing packs are retained in this chat's visualization directory. The original visitor HTML/template, canonical content, application, base stylesheet, field notes, artwork, launcher, lockfile and earlier verification records match the pre-property snapshot. Shared creator, content/planner and marketing code changed only to support the new property catalog, validated branding/admission and correct display labels/artwork.

The full suite and historical broad browser passes were not run. Physical printing, actual PDF pagination, other browser engines, human assistive technology and mail-client import remain unverified. These are campaign starters and offline marketing pages inside the existing tool; the original public-facing visitor website remains Bone Appétit. Nothing was staged, committed, pushed, deployed, published or emailed.

### Marketing pack increment — October 16, 2026

`npm run check:marketing` passed for consistent campaign copy/facts, selection/size validation, invalid campaign prices/dates/schedules, literal HTML escaping, source backup/import, optional-brief warnings, partial date boundaries, venue-timezone archive boundaries, embedded font licenses and early UTF-8 declaration, MIME headers/body and safe ZIP paths. Python's independent ZIP and email readers verified CRCs, file sizes, SHA-256 hashes, Unicode email subject/body and absent sender/recipients. `npm run check:creator` and `npm run check:generated` also passed. New/edited JavaScript syntax and creator HTML nesting, unique IDs and local references were checked.

The authorized focused `npm run check:marketing-browser` passed with Playwright 1.63.0 and Chromium 153.0.8010.12: current-draft versus named-version pricing, all six previews, ZIP and individual HTML/text downloads, unchanged named/draft storage, exact source recovery, offline/no-JavaScript HTML and index links, loaded images, print action, 375/1440-pixel workspace reflow, invalid prices and overlong offers, missing-asset retry, source edits during async generation and missing marketing-script recovery. No collected page errors or external requests remained. Both an edited-price campaign and the unedited example menu/poster fit the 740 × 979 CSS-pixel Letter printable area under Chromium print-media emulation. Menu/poster screenshots were visually inspected. The initial menu overflow was corrected with print spacing/type; a test wait was corrected to respect the existing autosave debounce.

After that browser pass, complete font-license comments were added to individual HTML files, and archive-date warnings were aligned to the shared venue-timezone rule. Targeted marketing checks passed again. A byte comparison after removing only the new non-rendering license comment confirmed all seven retained example HTML bodies/styles match the browser-verified output exactly. No additional browser launch was needed for those final changes.

See [the marketing verification record](verification/increment-three-2026-10-16.json) for runtime versions, scope, source hashes and artifact paths. An offline example pack and its menu/poster images are retained outside the project in this chat's visualization directory. Source hashes confirm the original visitor HTML/template, canonical content, styles, application, planner, field notes, artwork, launcher, lockfile and previous verification records remain unchanged. Only creator UI files, package commands and this README were updated alongside the new generator, adapter and focused checks.

The full suite and previous broad browser checks were not run. Actual PDF pagination, physical printers, other browser engines, human assistive technology and mail-client import remain unverified. Print-media geometry is scoped evidence for the supplied samples, not a guarantee that arbitrary edited copy will fit one page. No Git metadata is present. Nothing was staged, committed, pushed, deployed, published or emailed.

### Creator workspace increment — October 16, 2026

`npm run check:creator` passed the DOM-free creator checks for editing/materialization, independent duplication, named/draft separation, unfinished values, backup/import round trips and validation, saved editing position, size/count limits, protected damaged data, blocked/full storage, and changed local copies. `npm run check:generated` and the new JavaScript syntax checks passed. Creator HTML nesting, unique IDs, and local file references were checked.

The focused headless `npm run check:creator-browser` passed with the pinned Playwright/Chromium: brief and content editing, named saving, unchanged visitor storage, unfinished draft and view resumption, duplication, restore/remove undo, workspace/single-campaign backups, non-destructive import and rejected files, literal untrusted-text rendering, changed-tab recovery, blocked-storage backup/import rescue, damaged-data protection/replacement, script-load retry recovery, 375/1440-pixel reflow, simulated 200% text reflow, and the original no-JavaScript visitor guide. No collected page errors or external requests remained. The captured desktop and narrow workspace header/library views were inspected; a full manual editor walkthrough remains unverified.

See [the creator verification record](verification/increment-two-2026-10-16.json) for runtime versions, scope, limits, source hashes, and temporary screenshot locations. A pre-increment source-hash comparison confirms that the original content, styles, artwork, application, planner, field notes, launcher, and earlier verification records remain unchanged. The existing homepage gains only a footer link; package commands and this documentation now include the creator workspace.

The full suite, historical broad browser checks, Lighthouse, human VoiceOver/dictation, other browser engines, and physical-print acceptance were not rerun. The folder still has no Git metadata. Nothing was staged, committed, pushed, deployed, or published.

### Editing and sharing increment — October 16, 2026

`npm run check` passed: generated-output drift, 39 invalid-edit regressions, closing safeguards, currency formatting, failed-edit output preservation, existing planner propagation, and creative/export contracts. All 800 current date/arrival/stop combinations remain valid. Invalid edits now report their field before generation can replace the working page.

The focused headless `npm run check:sharing` passed with Playwright 1.63.0 and Chromium revision 1243: direct menu/category/attraction links and reloads, Back/Forward, per-entry return anchors, category URLs, focus return, attraction-to-planner transition, save/reload/reset/undo/restore, invalid-selection recovery, planner reflow at 375/1440 pixels, no-JavaScript and blocked-script fallbacks, invalid embedded content, and blocked storage. The check reported no collected page errors or external requests. A fallback-link timing failure during verification was resolved by applying reduced-motion settings to the fallback test contexts; the final run passed. The two scrolled planner-control screenshots were inspected; they are not a complete-page visual review.

A clean `npm ci --offline --ignore-scripts` installation from the existing package cache and the browser dependency preflight also passed. The matching browser was already installed; no browser download was needed. See [the dated verification record](verification/increment-one-2026-10-16.json) for exact runtime versions, scope, and SHA-256 hashes of implementation and check inputs. The record identifies temporary screenshot output, which may be cleaned up by the operating system.

Canonical content, parody, artwork, and both stylesheets match the pre-increment snapshot. Generated `index.html` differs only by loading `content.js` before the planner. This pass did not rerun the full suite, historical broad browser checks, Lighthouse, human assistive-technology, other browser engines, or physical-print acceptance. No Git metadata is present; changes were compared with a temporary baseline snapshot. Nothing was staged, committed, pushed, deployed, or published.

### Final review — October 13, 2026

Corrected the remaining consistency and accessibility issues while retaining the paper/ink palette, imagery, typography, parody, and fictional boundaries:

- Oddities attraction, card, FAQ, and itinerary copy now agree that the six-object collection is for browsing only. The estimate disclosure is shared by the live card and both download formats.
- Field notes retain the shared access, sensory, and weather disclosures when printed or downloaded for offline use.
- Every dialog's close button stays within reach after scrolling. Titles scroll normally so enlarged headings do not occupy the usable area of short screens.
- The skip link moves focus into main content. Menu changes announce a concise category/count status instead of making the entire replacement menu a live region. Focus outlines on the paper menu section use dark ink, and itinerary times use a darker olive after the open-planner audit identified insufficient contrast.
- Long headings, grid children, menu prices, and trail estimates reflow when text is enlarged. Header offset follows its rendered height; the header stops sticking on short viewports.
- Closed FAQ answers and counter records remain in the Chromium printout with JavaScript disabled, without changing their on-screen open/closed state.

The focused final-review browser check passed at 320, 375, 768, 1024, and 1440 CSS pixels with 700- and 320-pixel viewport heights. Simulated text-only enlargement passed at 200% for 320/768/1024/1440 widths, including the menu and planner. It verified all menu-category counts/prices, modal keyboard traversal, map-dialog focus return, no-JavaScript menu/map use, complete printed records, and no page errors. The maximum-party plan retained eight guests age five-plus, four under-fives, and a $96 estimate. Its downloaded HTML worked with networking disabled and included the shared disclosures without external requests.

The existing targeted saved-plan/undo/restart browser check passed, including invalid data, blocked/full storage, downloads, print action, and season/archive wording. Shared-planner, creative-content, generated-output, JavaScript syntax, and CSS parsing checks passed. No full suite was run.

Fresh Lighthouse checks returned 100 accessibility, best practices, and SEO for the homepage and inspected planner, drinks-menu, and Pumpkin Hollow dialog states. This is automated evidence for those states, not accessibility conformance. The map, counter, enlarged menu, and Letter-size planner/offline print samples were visually inspected; both maximum-party itineraries fit one page with the map and complete fictional/access/sensory/weather disclosures.

Human VoiceOver/dictation, Safari/Firefox, actual browser text-zoom settings, touch hardware, and physical-printer acceptance remain untested. The project folder contains no Git metadata, so a Git diff/status audit is unavailable; source changes were compared against a temporary pre-review snapshot. Nothing was staged, committed, pushed, deployed, or published.

### Creative pass — October 13, 2026

Targeted content checks passed for exactly six distinct objects, six map locations, matching map/attraction links, local SVG assets, escaped export content, and unchanged party estimates. Browser checks passed for native counter records, map dialogs and focus return, no-JavaScript records/links, offline field-note download and print action, export-script failure, and layouts at 320/768/1440 CSS pixels. A party of eight guests age five-plus and four under-fives still produced a $96 trail estimate. The existing targeted saved-plan/undo/restart check also passed.

The map, counter section, and field-note samples were visually inspected. Both the planner and offline field notes fit one Letter-size page in the inspected maximum-party sample, retaining the map, estimate, house note, and fictional/no-booking disclosure. The offline HTML opened with networking disabled and made no external requests. It uses local system font fallbacks rather than fetching the site’s webfonts. Complete-menu and attraction fallbacks also passed with app.js/planner.js blocked. No full suite, stage, commit, push, deployment, or publication was performed. Human assistive-technology, Safari/Firefox, and physical-printer acceptance remain untested.

### Maintenance pass — October 13, 2026

Shared-planner and generated-output checks passed. Mutation probes verified propagation of prices, durations, hours, day/night cutoff, guest limits, and season dates; malformed plans and unsafe HTML text were rejected or escaped as appropriate. The page had no duplicate IDs, missing internal anchors, or missing local assets.

Browser checks passed with JavaScript disabled, app.js blocked, and planner.js blocked: all 24 menu items and three attractions remained readable, access/allergy disclosures remained present, native links worked, and navigation remained usable. Enhanced menus preserved every price. Planner/menu/trail-dialog layouts fit 320, 768, and 1440 CSS pixels. The existing focused reliability check also passed against the extracted module, including saving, restart recovery, restoration, reset undo, blocked/full storage, downloads, and browser-generated print samples.

No full suite or external publication action was performed. Human assistive-technology, Safari/Firefox, and physical-printer acceptance remain untested.

### Reliability pass — October 13, 2026

The six focused launcher checks passed, including stable-origin restarts, reuse of this project’s preview, rejection of another folder or unrelated service, and refusal to follow identity-check redirects. Run them with `python3 -B tests/test_preview.py`; they need only Python’s standard library and permission to bind temporary loopback ports.

The focused browser check is `node tests/reliability.cjs` with Node, Playwright, and its Chromium browser available. Close an existing preview before running it. It starts and stops its own local preview, restarts it to check save recovery, uses isolated browser storage, and places screenshots, downloads, and print samples in a temporary folder. It does not publish or contact live services.

Browser checks passed for restart recovery; saved-versus-draft status and restoration; separate draft/saved reset undo; repeated resets; retry after blocked or full storage; invalid saved data; and before/during/after-season wording. Planner, menu, and attraction-dialog layouts fit 320, 768, and 1440 CSS pixels. Browser-generated Letter-size print samples were inspected: the itinerary and selected drinks category each fit one page; the homepage printed as a five-page text guide with all FAQs and fictional disclosures. JavaScript/Python parsing, unique HTML IDs, local references, and internal anchors also passed.

These checks do not establish VoiceOver, dictation, Safari/Firefox, physical-printer, or full accessibility acceptance. No full suite, staging, commits, deployment, or publication was performed.

### Original build checks

Targeted browser checks covered menu filters, attraction details, mobile navigation, day/night itinerary order, all available date weekdays, party estimates, optional stops, save/reload/reset, blocked and malformed storage, download contents, Escape dismissal, and focus restoration. Static checks covered JavaScript syntax, duplicate IDs, local asset references, and internal anchors. Desktop, tablet, and narrow phone layouts were inspected.

After fixing a headline contrast issue and a logo accessible-name mismatch, a mobile Lighthouse snapshot returned 100 accessibility, 100 best practices, and 100 SEO. This is automated evidence for that snapshot, not accessibility conformance certification or a screen-reader/user study. No full test suite, deployment, or publication was performed.
