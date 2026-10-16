# System Architecture: Bone Appétit & Sister Properties

This document describes the architectural foundation, data flow, client-side isolation boundaries, and verification procedures of the Bone Appétit web platform.

---

## 1. High-Level Architecture Overview

Bone Appétit is designed as an offline-first, dependency-free static web application and creative suite. It consists of three primary operational surfaces:

1. **Public Visitor Destinations (4 Sites)**:
   - `index.html` (Bone Appétit: haunted pizzeria, pumpkin trail, oddities counter)
   - `rest-in-pizza.html` (Rest in Pizza: neighborhood haunt & rising dough)
   - `grave-expectations.html` (Grave Expectations Chop House: candlelit steaks & ancestral posture)
   - `boobies-lodge.html` (BooBies Lodge: 21+ sports lodge, monster games & craft brews)
2. **Creator Campaign Workspace**:
   - `creator.html`: Local authoring tool for campaign briefs, custom menu items, copy editing, versioning, marketing pack generation, and full live restaurant previews.
3. **Local Loopback Preview Server**:
   - `preview.py` / `Preview.command`: Loopback-only Python HTTP server running on `http://127.0.0.1:4173` with project identity verification and collision guards.

```
                          [Source Content Layer]
       site-data.json   property-data.json   visitor-sites.json
             │                  │                     │
             └──────────┬───────┴─────────────────────┘
                        │
                        ▼
             [website-renderer.js] (DOM-Free Engine)
                        │
         ┌──────────────┴─────────────────────────┐
         │                                        │
         ▼ (Build Time)                           ▼ (Client-Side Preview)
scripts/render-site.cjs                   website-workspace.js
         │                                        │
         ▼                                        ▼
[Static Delivery Pages]                   [Sandboxed <iframe>]
 index.html                                (Isolated Origin,
 rest-in-pizza.html                         allow-scripts,
 grave-expectations.html                    allow-forms,
 boobies-lodge.html                         allow-downloads)
```

---

## 2. Core Modules & Separation of Concerns

### A. Shared Business Logic & Scheduling
- **`content.js`**: Shared schema validation and boundary checking for menu items, attraction definitions, hours, pricing, and season ranges.
- **`planner.js`**: DOM-free calculation engine for schedule feasibility, party estimates, stop durations, and time-token substitution (`{{DAY_RANGE}}`, `{{NIGHT_TIME}}`, `{{FREE_UNDER_AGE}}`). Both build-time renderers and client-side runtimes invoke these same functions.
- **`field-notes.js` / `field-notes.css`**: Renderers and style definitions for the field-note keepsake cards and standalone downloadable HTML documents.

### B. Visitor Page Runtime
- **`app.js`**: Client-side orchestrator handling DOM events, modal dialog traps, hash-based navigation (`#full-menu`, `#details-pizzeria`), daytime/after-dark mood toggles, and local itinerary state management.
- **`properties.css`**: Styling layer providing property switcher navigation and per-venue visual identity and accent colors.

### C. Creator Studio & Marketing Engine
- **`creator-model.js`**: Pure functional model managing campaign life cycle, brief metadata, price validations, version snapshots, JSON export/import, and quota enforcement (max 20 campaigns, 2 MiB payload limit).
- **`property-catalog.js`**: Validates bundled property starters and produces independent campaign instances with isolated content trees.
- **`marketing-pack.js`**: Pure functional generator creating the six-piece collateral pack (Landing copy, Menu insert, Social copy, UTF-8 RFC 822 Email draft, US Letter poster, and Manifested review summary) bundled into an uncompressed ZIP.
- **`website-copy.js`**: Defines the allowlist of overridable website fields and handles clean hierarchical fallback resolution.
- **`website-workspace.js`**: Manages the live iframe sandbox, viewport size toggle (Desktop vs. 375px Phone), draft vs. named source selector, and async build cache invalidation.

---

## 3. Data Storage & Isolation Model

All persistence uses browser `localStorage`. To prevent crosstalk, data is strictly partitioned into distinct namespaces:

| Storage Key | Scope | Content |
| --- | --- | --- |
| `bone-appetit-visit-v1` | Public Visitor | Saved visit date, arrival time, party size, and optional stops for Bone Appétit |
| `bone-property-rest-in-pizza-visit-v1` | Public Visitor | Saved visit itinerary for Rest in Pizza |
| `bone-property-grave-expectations-visit-v1` | Public Visitor | Saved visit itinerary for Grave Expectations Chop House |
| `bone-property-boobies-lodge-visit-v1` | Public Visitor | Saved visit itinerary for BooBies Lodge |
| `bone-appetit-creator-v1` | Creator Tool | Workspace campaigns, active brief, draft edits, named versions, and UI positions |

### Sandboxing & Security Boundaries
- **Preview Isolation**: Live previews inside the Creator Workspace render within `<iframe sandbox="allow-scripts allow-forms allow-downloads">`. Crucially, `allow-same-origin` is omitted, assigning the preview an opaque origin.
- **Temporary State**: Any plan saved inside an iframe preview operates exclusively in temporary memory and cannot touch the parent origin's `localStorage` or visitor keys.
- **Cross-Tab Safety**: The creator storage model verifies a state hash before writing. If another tab modified workspace data, the user is warned and guided to save a backup before reloading.
- **Network Egress Guard**: The application loads all assets (fonts, SVGs, images) from local relative paths; zero network requests or third-party tracking scripts are executed.

---

## 4. Maintenance & Deterministic Build Process

1. **Source Content Modification**:
   - Update `site-data.json` for Bone Appétit.
   - Update `property-data.json` for Rest in Pizza, Grave Expectations, and BooBies Lodge.
   - Update `visitor-sites.json` for long-form narrative copy, section titles, and meta descriptions.
   - Update `index.template.html` for base structural layout.
2. **Validation**:
   - Run `npm run validate` to verify schema, hours, schedule feasibility, and asset references without writing to disk.
3. **Atomic Build**:
   - Run `npm run build` (`node scripts/render-site.cjs`). Each page is rendered to a temporary sibling file (`.<filename>.*.tmp`), validated, and atomically moved into place by rename.
   - Run `npm run check:generated` to verify that all four static files match their sources byte-for-byte.

---

## 5. Verification Framework

The test suite enforces stability and prevents regressions across multiple tiers:

```
[npm run check]
├── check:generated        (Drift detection between source and delivery pages)
├── check:validation       (39 content regressions, schedule boundary constraints)
├── check:planner          (Arrival/departure math, party limits, closing times)
├── check:creative         (6 oddities, map anchors, field-note generation)
├── check:creator          (Duplication, versioning, conflict guards, backup/restore)
├── check:marketing        (Deterministic ZIP generation, MIME validation, print letter limits)
├── check:properties       (Multi-property catalogs, 21+ admission logic)
├── check:websites         (4 sites, 78 menu items, 3,200 schedules, adult rules)
└── check:website-workspace (Shared renderer parity, sandboxed preview, copy override resolution)

[npm run check:preview]    (Python unit tests for loopback server & identity check)
[Browser Test Suite]       (Playwright + Chromium focused headless verification passes)
```
