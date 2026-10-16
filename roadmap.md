# Bone Appétit Roadmap

A roadmap of completed milestones, architectural boundaries, and future directions for Bone Appétit and its collection of fictional Halloween restaurant destinations and creator tools.

---

## 1. Project Overview & Philosophy

**Bone Appétit** is a self-contained, offline-first web project exploring a fictional roadside haunt, pumpkin trail, oddities counter, and sister restaurant concepts. Built with semantic HTML, vanilla CSS, and modular vanilla JavaScript, it emphasizes:

- **Zero-runtime dependencies**: Runs on any modern browser and Python 3 standard library loopback preview; maintenance build requires only Node.js with no external npm packages.
- **Privacy & Local Ownership**: All data, itineraries, campaigns, and backups remain in the user's browser `localStorage` or offline files. Zero analytics, trackers, cookies, or external requests.
- **Parody & Narrative Integrity**: Satirizes roadside attraction marketing, gift-shop provenance, and cheerful small-business administration while maintaining strict concept boundaries (no reservations, payment processing, or live promises).
- **Deterministic Verification**: Fast, DOM-free unit gates validate all combinations of hours, menus, schedules, and exports before any browser execution or file deployment.

---

## 2. Completed Milestones (v1.0 State)

### Milestone 1: Core Destination & Interactive Visitor Experience
- **Bone Appétit Homepage**: Responsive landing page (`index.html`) featuring the paper/ink palette, typography, hero narrative, and visit moods.
- **Canonical Menu & Filter**: 24-item static menu categorized into Pizzas, Bites, Sweets, and Drinks, enhanced with category filtering when JS is available.
- **Attraction Experiences**: Three house attraction dialogs (Pizzeria, Pumpkin Hollow, Doubtful Oddities) with duration, intensity, access details, and accessible dialogs.
- **Fictional Grounds Schematic**: Six numbered map locations with illustrated markers and direct navigation to attraction details.
- **Curated Oddities Counter**: Native `<details>` drawer records for six specimen items with provenance and clear no-sale disclosures.
- **Visit Planner**: Dynamic itinerary builder calculating fees, trail walking estimates, and party capacity for all 20 Thursday–Sunday dates in the 2026 concept season. Under-fives are free.
- **Offline Keepsakes**: Printable text itineraries and self-contained offline HTML field notes embedding local SVGs and stylesheets.

### Milestone 2: Stable Loopback Preview & Environment Safety
- **Safe Server**: `preview.py` and `Preview.command` launch a dedicated loopback HTTP server on port 4173 (`http://127.0.0.1:4173`).
- **Identity Verification**: Reuses running preview servers only after confirming project identity; halts with clear diagnostics if an unrelated service occupies the port.
- **Origin Stability**: Preserves browser `localStorage` across restarts by binding consistently to the same origin.

### Milestone 3: Deep Linking, History Navigation & UI Resilience
- **Direct Hash Routing**: Shareable URL anchors (`#full-menu`, `#full-menu-pizzas`, `#details-pizzeria`, etc.) with browser history integration (Back/Forward support).
- **Accessible Interactions**: Keyboard traps, Escape key dismissal, focus restoration, and skip navigation.
- **Draft & Save Mechanics**: Explicit plan saving, unsaved change alerts, plan restoration, and reset undo.

### Milestone 4: Creator Campaign Workspace
- **Authoring Studio**: Dedicated studio (`creator.html`) matching the destination aesthetic.
- **Structured Briefing**: Fields for campaign name, target audience, objective, occasion, offer, call to action, tone, channels, dates, and creative guardrails.
- **Live Copy Editing**: Interactive editing of venue names, headlines, intros, menu items, prices, and attraction descriptions.
- **Campaign State Machine**: Named version saving (Command/Ctrl-S), auto-checkpointed drafts, draft recovery, independent duplication, and one-level undo.
- **Backup & Recovery**: JSON workspace backup and restore supporting up to 20 campaigns with cross-tab conflict detection and corrupted storage protection.

### Milestone 5: Six-Piece Marketing Collateral Generator
- **Multi-Channel Collateral**: Deterministic offline generator (`marketing-pack.js`) producing:
  1. *Landing Page* (`landing.html`, `landing.txt`)
  2. *Menu Insert* (`menu-insert.html`, `menu-insert.txt`, US Letter print layout)
  3. *Social Media Copy* (`social-copy.html`, `social-copy.txt`)
  4. *Email Draft* (`email-draft.html`, `email-draft.txt`, UTF-8 RFC 822 `.eml`)
  5. *Printable Poster* (`poster.html`, `poster.txt`, US Letter print layout)
  6. *Audit & Review Summary* (`review-summary.html`, `review-summary.txt` with SHA-256 manifests)
- **Zero-Dependency Archive**: Offline ZIP generation without third-party libraries.
- **Safety Safeguards**: Character length boundaries, font licensing disclosures, and explicit disclaimer insertions.

### Milestone 6: Sister Properties Portfolio Expansion
- **Property Starter Catalog**: Added three full fictional restaurant concepts (`property-data.json`, `property-catalog.js`):
  1. *Rest in Pizza*: Family-friendly haunted neighborhood pizzeria.
  2. *Grave Expectations Chop House*: Candlelit upscale steakhouse and ancestral cellar.
  3. *BooBies Lodge*: Cheeky 21+ sports lodge with monster games and adult hospitality.
- **Curated Menu Expansions**: 18 distinctive menu items per property (54 new items total).
- **Native Vector Assets**: Six custom SVGs for property logos, scene artwork, and schematic grounds maps.
- **Policy Enforcement**: Adult 21+ admission logic for BooBies Lodge (no children in planner; age disclaimers across all marketing collateral).
- **CLI Export**: `scripts/export-properties.cjs` for batch offline export to fresh directories.

### Milestone 7: Four Complete Visitor Websites
- **Multi-Site Static Delivery**: Static pages generated from source profiles (`index.html`, `rest-in-pizza.html`, `grave-expectations.html`, `boobies-lodge.html`).
- **Global Haunt Switcher**: Accessible navigation header and footer switcher with active property indicator.
- **Dedicated State Isolation**: Four separate `localStorage` keys for visitor itineraries (`bone-appetit-visit-v1`, `bone-property-rest-in-pizza-visit-v1`, `bone-property-grave-expectations-visit-v1`, `bone-property-boobies-lodge-visit-v1`).
- **Static Fallbacks**: Full menus, descriptions, maps, and links remain functional with JavaScript disabled.

### Milestone 8: Creator-to-Website Live Editing & Preview
- **Unified Renderer**: `website-renderer.js` powers both build-time page generation (`scripts/render-site.cjs`) and client-side dynamic previewing.
- **Sandboxed Rendering**: Isolated `<iframe>` sandbox (`allow-scripts allow-forms allow-downloads`, no `allow-same-origin`) preventing cross-origin contamination.
- **Flexible Viewports**: Instant toggle between Desktop (fluid) and Phone (375px) preview sizes.
- **Draft vs. Named Comparison**: Instant toggle between current working draft and last deliberate named version.
- **Granular Copy Overrides**: Bounded field picker allowing overrides for venue story, section headings, and supporting details without altering core structural layout.

### Milestone 9: Portable Single-Property Website ZIP Export
- **Self-Contained Packages**: `website-export.js` generates complete, standalone single-property website ZIPs containing `index.html`, embedded content snapshot, all artwork, local fonts, licenses, and SHA-256 integrity manifest.
- **Frozen Source Isolation**: Source snapshot is frozen at export trigger to guarantee consistency during asynchronous resource gathering and hashing.
- **Dedicated Visitor Storage**: Exported sites generate a unique content-hash planner storage key (`bone-website-{propertyId}-{hash}-visit-v1`), preventing plan collisions when hosted alongside other exports.

---

## 3. Current System Status

| Component | Status | Verification Gate |
| --- | --- | --- |
| Static Delivery Pages (4 sites) | Verified v1.0 | `npm run check:generated` / `npm run check:websites` |
| Content & Schedule Schemas | Verified v1.0 | `npm run check:validation` / `npm run check:planner` |
| Creative & Field Notes | Verified v1.0 | `npm run check:creative` |
| Creator Campaign Engine | Verified v1.0 | `npm run check:creator` |
| Marketing Pack Assembler | Verified v1.0 | `npm run check:marketing` |
| Sister Properties Catalog | Verified v1.0 | `npm run check:properties` |
| Website Workspace Adapter | Verified v1.0 | `npm run check:website-workspace` |
| Single-Property Website Export | Verified v1.0 | `npm run check:website-export` |
| Python Preview Launcher | Verified v1.0 | `npm run check:preview` |
| End-to-End Headless Browser Suite | Verified v1.0 | Playwright / Chromium (153.0.8010.12) |

---

## 4. Architecture & Guardrails

- **Immutable Public Sources**: Delivery HTML pages are generated artifacts. All source changes occur in `site-data.json`, `property-data.json`, `visitor-sites.json`, or `index.template.html`.
- **Atomic Build Replacement**: `scripts/render-site.cjs` renders to temporary files and replaces targets atomically by rename, preventing torn pages on error.
- **Token Resolution**: Tokens such as `{{DAY_RANGE}}`, `{{NIGHT_TIME}}`, and `{{FREE_UNDER_AGE}}` resolve strictly through `planner.js`.
- **Egress Prevention**: No remote CDN references, analytics beacons, font CDNs, or external APIs. All fonts and graphics are local and embedded where appropriate.

---

## 5. Future Horizons (Post-v1 Consideration)

The following directions represent potential explorations after the v1 release, subject to operator prioritization:

1. **Additional Seasonal Overlays & Sister Concepts**
   - Exploration of winter roadside oddities (e.g., Krampus-themed winter lodge).
   - Additional regional menu variations and historic counter artifacts.

2. **Keepsake Formats & Export Enhancements**
   - SVG badge / souvenir ticket generator in the visitor itinerary downloader.
   - Enhanced print-media CSS stylesheets for additional standard paper formats (A4).

3. **Creator Usability & Collaboration**
   - Offline export of individual campaign bundles including embedded SVG artwork.
   - Campaign comparison diff view (side-by-side visualization of named versions).
