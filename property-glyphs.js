/* Original property-specific SVG glyphs; shared by the website and library builder. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.BoneGlyphs = factory();
})(typeof globalThis === 'object' ? globalThis : this, function() {
  'use strict';
  // Complete role coverage: identity, food, experiences, visits, actions and house details.
  const DEFINITIONS = {
    'bone-appetit': {
      season: ['porch-lantern', 'Porch lantern', '<path d="M9 5V3h6v2m-9 3h12l-1 12H7L6 8Zm-1 0 3-3h8l3 3M9 22h6M12 11c-3 3-2 5 0 6 2-1 3-3 0-6Z"/>'],
      dining: ['bone-slice', 'Bone crust pizza', '<path d="m6 7 6 14 8-13M5 7C2 7 2 3 5 3c1-2 4-1 4 1l8 1c2-2 5 0 4 2 1 3-3 4-4 1L8 7C7 9 5 9 5 7Z"/><circle cx="11" cy="11" r="1"/><circle cx="14" cy="14" r="1"/>'],
      night: ['woodland-moon', 'Moon over the hollow', '<path d="M14 3a6 6 0 0 0 7 8A7 7 0 0 1 14 3ZM7 9l-4 6h2l-3 4h10l-3-4h2L7 9Zm0 10v2m8-4 2-3 4 6h-6m2 0v2"/>'],
      signature: ['crooked-roadhouse', 'Crooked roadhouse', '<path d="m2 10 8-7 11 7M5 8l-1 13h15l1-12M14 6V2h3v6M9 21v-6h4v6M2 21h20M7 10h3v2H7Zm7 0h3v2h-3Z"/>'],
      garden: ['oak-sprig', 'Oak sprig', '<path d="M6 22 17 5M9 17c-6 1-8-4-4-5-4-4 0-7 3-4 0-5 5-6 6-2 4-3 8 1 4 4 5 1 4 5-1 5 2 4-3 7-5 3M9 17l-1-5m4 1h5"/>'],
      day: ['roadside-sunrise', 'Roadside sunrise', '<path d="M2 14h20M7 14a5 5 0 0 1 10 0M12 2v3M4 6l2 2m14-2-2 2M8 22l2-6m6 6-2-6M12 18v1m0 2v1M2 18h4m12 0h4"/>'],
      welcome: ['patchwork-heart', 'Patchwork hospitality', '<path d="M12 21 4 13C-1 7 6 1 12 7c6-6 13 0 8 6l-8 8ZM12 8l-2 4 4 3-2 5M8 11l4 2m0 1 3 3"/>']
    },
    'rest-in-pizza': {
      season: ['haunted-oven', 'Haunted brick oven', '<path d="M3 21V11a9 9 0 0 1 18 0v10H3Zm4-3v-6a5 5 0 0 1 10 0v6H7ZM2 21h20M5 6l3 2m4-6v5m7-1-3 2M3 13h4m10 0h4M10 18l2-4 2 4"/>'],
      dining: ['pizza-peel', 'Pizza on a peel', '<path d="m14 15 7 6M13 17l6 5M6 3C2 3 1 7 3 11l4 5c2 2 5 2 7 0s3-5 1-7l-4-5C10 3 8 2 6 3Z"/><circle cx="8" cy="9" r="4"/><circle cx="7" cy="8" r=".7"/><path d="m9 10 1 1"/>'],
      night: ['night-shift-ghost', 'Night shift ghost', '<path d="M6 8V6c-3-1-1-5 2-4 2-2 6-1 6 1 4-1 6 3 2 4v2M6 8h10M5 21v-7a7 7 0 0 1 14 0v7l-3-2-2 2-3-2-3 2-3-1Z"/><circle cx="10" cy="14" r=".6"/><circle cx="15" cy="14" r=".6"/><path d="M11 17h3"/>'],
      signature: ['pizza-rosette', 'Pizzeria rosette', '<path d="m12 2 3 2h4l1 4 2 3-2 4-1 4h-4l-3 3-3-3H5l-1-4-2-4 2-3 1-4h4l3-2Z"/><path d="m8 8 4 9 5-9c-3-2-6-2-9 0Zm1 2h7m-4 2h.1"/>'],
      garden: ['basil-pot', 'Courtyard basil', '<path d="M7 15h10l-2 7H9l-2-7Zm-1 0h12M12 15V6m0 5C4 12 3 6 4 4c6 0 8 3 8 7Zm0-3c0-5 4-7 8-6 1 4-3 8-8 6Z"/>'],
      day: ['awning-sun', 'Morning at the pizzeria', '<path d="M3 13h18l-2-5H5l-2 5Zm0 0q2 4 4 0 2 4 5 0 2 4 5 0 2 4 4 0M5 16v6h14v-6M9 22v-5h6v5M8 6a4 4 0 0 1 8 0M12 1v1M4 3l2 2m14-2-2 2"/>'],
      welcome: ['oven-mitt-heart', 'Made with hospitality', '<path d="M8 22v-4l-4-5c-2-3 1-5 3-3l1 1V5c0-4 9-4 9 0v9l-2 5v3H8Zm0-3h7M12 13l-2-2c-2-2 0-4 2-2 2-2 4 0 2 2l-2 2Z"/>']
    },
    'grave-expectations': {
      season: ['candelabrum', 'Estate candelabrum', '<path d="M12 7v13m-5 2h10M5 10v3q0 3 7 3t7-3v-3M3 7h4v3H3Zm7-3h4v3h-4Zm7 3h4v3h-4ZM5 5V3m7-1V1m7 4V3"/>'],
      dining: ['silver-cloche', 'Silver service', '<path d="M2 18h20M4 17a8 8 0 0 1 16 0M10 7h4m-2 0V5M3 21h18M7 14q0-3 3-4M2 3v6m3-6v6M2 6h3M3.5 9v5M20 3v11m0-11c-3 2-3 6 0 6"/>'],
      night: ['moonlit-goblet', 'Moonlit nightcap', '<path d="M7 9h10l-1 5c-1 4-7 4-8 0L7 9Zm5 8v5m-4 0h8M8 12h8M16 2a4 4 0 0 0 5 5 5 5 0 0 1-5-5ZM3 4v4M1 6h4"/>'],
      signature: ['estate-crest', 'House crest', '<path d="M4 4h16v8c0 5-8 10-8 10S4 17 4 12V4Zm3-2h10M12 7l2 3-2 3-2-3 2-3Zm0 6v5M8 14l4 4 4-4"/>'],
      garden: ['terrace-rose', 'Mourning terrace rose', '<path d="M12 22V11m0 7c-5 0-7-2-7-5 4 0 7 2 7 5Zm0-3c5 0 7-2 7-5-4 0-7 2-7 5ZM12 3c-4-4-8 1-5 4-1 4 4 6 6 3 4 2 7-3 4-5 0-3-4-5-5-2Zm-2 2 2-1 3 2-2 3-3-1V5Z"/>'],
      day: ['estate-window', 'Daylight through the estate', '<path d="M5 22V10a7 7 0 0 1 14 0v12H5ZM12 3v19M5 11h14M3 22h18M8 11a4 4 0 0 1 8 0M8 16h1m6 0h1M8 19h1m6 0h1"/>'],
      welcome: ['heart-place-setting', 'A place at the table', '<path d="M12 18c-10-6-6-13 0-8 6-5 10 2 0 8Z"/><path d="M3 3v6m-2-6v4q0 3 4 0V3M3 9v12M21 3v18m0-18c-3 2-3 7 0 7M9 3h6M9 22h6"/>']
    },
    'boobies-lodge': {
      season: ['antler-pumpkin', 'Antler pumpkin', '<path d="M8 11 4 7V2m0 4L1 4m3 3 3-3m9 7 4-4V2m0 4 3-2m-3 3-3-3M12 11V8l3-1M12 12C4 8 2 21 12 22c10-1 8-14 0-10Zm0 0c-3 1-3 8 0 10 3-2 3-9 0-10Z"/>'],
      dining: ['smoked-rack', 'Smoked rib rack', '<path d="M5 9c3-3 11-3 14 0l-2 9c-3 2-7 2-10 0L5 9Zm3-1 2 10m2-11v12m4-11-2 10M6 4q-2-2 0-3m6 3q-2-2 0-3m6 3q-2-2 0-3M4 22h16"/>'],
      night: ['monster-scoreboard', 'Monster game night', '<path d="M3 8h18v13H3V8Zm0 4h18m-9 0v9M6 3l3 5m9-5-3 5M6 15h3v3H6Zm9 0h3v3h-3ZM5 8 3 5m16 3 2-3"/>'],
      signature: ['timber-lodge', 'Timber lodge', '<path d="m2 11 10-9 10 9M5 9v13h14V9M9 22v-7h6v7M2 22h20M8 10h8m-4-4v7M5 14h3m8 0h3M5 18h3m8 0h3"/>'],
      garden: ['lodge-pine', 'Lodge pine', '<path d="m12 2-5 6h3l-6 6h4l-6 6h20l-6-6h4l-6-6h3l-5-6ZM12 20v2M3 8l2-2m14 0 2 2"/>'],
      day: ['ridge-sunrise', 'Sunrise over the ridge', '<path d="m2 21 7-11 6 11m-4 0 6-9 5 9H2Zm5-8 2 2 2-2M12 10a4 4 0 1 1 8 0M16 1v2m-7 0 2 2m12-2-2 2M2 6h4m15 2h2"/>'],
      welcome: ['cheers-heart', 'Lodge hospitality', '<path d="m4 8 6 2-3 12-6-2L4 8Zm10 2 6-2 3 12-6 2-3-12ZM3 12l6 2m6 0 6-2M12 9 8 5c-2-3 2-5 4-2 2-3 6-1 4 2l-4 4Z"/>']
    }
  };
  const EXTENSIONS = {
    "bone-appetit": {
      "menu": ["roadhouse-menu", "Roadhouse menu", "<path d=\"M4 3h13l3 3v16H4V3Zm13 0v4h3M7 9h7M7 13h10M7 17h6M2 6h2m-2 4h2m-2 4h2m-2 4h2\"/>"],
      "bites": ["bone-breadsticks", "Bone breadsticks", "<path d=\"M5 5C2 4 1 7 4 8l11 11c1 3 5 2 4-1 3-1 2-5-1-4L7 5c1-3-3-4-4-1m2 12 3-3m-3 7 5-5M12 3l2 2m2 2 2 2\"/>"],
      "dessert": ["graveyard-gelato", "Graveyard gelato", "<path d=\"M5 13h14l-3 9H8l-3-9Zm1 0a4 4 0 0 1 5-5 4 4 0 0 1 7 5M9 8V4a3 3 0 0 1 6 0v3M11 4h2M9 17h6\"/>"],
      "drinks": ["orchard-mug", "Orchard mug", "<path d=\"M4 7h12v13H4V7Zm12 2h3c4 0 4 7 0 7h-3M3 22h15M7 4q-2-2 0-3m5 3q-2-2 0-3M8 12l2-2 2 2-2 3-2-3\"/>"],
      "vegetarian": ["harvest-carrot", "Harvest carrot", "<path d=\"m8 9 7 4-12 9L8 9Zm2-1c-5-7 1-9 2-2 2-7 7-5 2 1 7-2 8 4 1 4M7 13l3 2m-6 3 2 1\"/>"],
      "spicy": ["lantern-chili", "Lantern chili", "<path d=\"M15 7c4 7-2 14-12 14 6-4 8-8 7-13l5-1Zm-5 1q2-5 6-3m-1 2q4-3 4-6M9 15l2 1\"/>"],
      "alcohol": ["roadhouse-bottle", "Roadhouse spirits", "<path d=\"M9 2h6v4l2 3v13H7V9l2-3V2Zm0 4h6M7 12h10M7 18h10M10 15h4\"/>"],
      "zeroProof": ["apple-fizz", "Apple fizz", "<path d=\"M5 7h14l-3 15H8L5 7Zm2 4h10M14 7l3-5h4M9 15c-2-2-4 1-1 4 1 1 2 1 3-1 2-2 0-4-2-3m0 0 1-2\"/>"],
      "trail": ["lantern-trail", "Lantern trail", "<path d=\"M7 22c-8-9 13-8 5-16M2 22h20M17 3h4l1 7h-6l1-7Zm1 0V1m1 9v8M2 4l3-3 3 3m-3-3v12\"/>"],
      "collection": ["curiosity-cabinet", "Curiosity cabinet", "<path d=\"M3 3h18v19H3V3Zm0 5h18M12 8v14M3 15h18M6 11h3m6 8h3M7 18v2m10-9v2M6 1h12\"/>"],
      "story": ["family-ledger", "Family ledger", "<path d=\"M3 4q5-3 9 0 4-3 9 0v17q-5-3-9 0-4-3-9 0V4Zm9 0v17M6 8h3m-3 4h3m6-4h3m-3 4h3M7 16h1m8 0h1\"/>"],
      "ghost": ["medallion-ghost", "Medallion ghost", "<path d=\"M5 21v-9a7 7 0 0 1 14 0v9l-3-2-4 2-4-2-3 2ZM9 10h.1m5 0h.1M9 14l3 3 3-3m-3 3v2\"/>"],
      "key": ["tagged-skeleton-key", "Tagged skeleton key", "<path d=\"M8 9a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 0 11 11m-3-3 2-2m1 5 2-2M7 4h2v2H7ZM13 4h8v5h-5l-3-5Z\"/>"],
      "postcard": ["tomorrow-postcard", "Tomorrow postcard", "<path d=\"M2 4h20v16H2V4Zm12 0v16M4 14l3-4 5 5M5 8h.1M16 7h4v4h-4Zm0 7h4m-4 3h3\"/>"],
      "badge": ["pumpkin-ribbon", "Pumpkin ribbon", "<path d=\"M12 3V1l3 1M12 4C4 0 1 15 12 16c11-1 8-16 0-12Zm0 0c-4 2-4 10 0 12 4-2 4-10 0-12M8 16l-2 7 5-2m5-5 2 7-5-2\"/>"],
      "souvenir": ["haunted-house-magnet", "Haunted house magnet", "<path d=\"M2 10 12 2l10 8M5 8v12h14V8M9 20v-6h6v6M7 23h10M7 10h2m6 0h2M3 16H1m22 0h-2\"/>"],
      "raven": ["ledger-raven", "Ledger raven", "<path d=\"M4 20h16v3H4v-3Zm5 0V9c0-7 8-8 10-4l3 2-4 1-2 10-7 2Zm0-9-5 6h5m3-7 3 5M16 5h.1\"/>"],
      "location": ["wicked-lane-pin", "Wicked Lane marker", "<path d=\"M12 22S4 13 4 9a8 8 0 0 1 16 0c0 4-8 13-8 13Zm-3-12 3-3 3 3m-5-1v5h4V9\"/>"],
      "clock": ["mantel-clock", "Mantel clock", "<path d=\"M4 22V9a8 8 0 0 1 16 0v13H4Zm-2 0h20M12 5v5l3 2M8 18h8M8 4l-2-2m10 2 2-2\"/>"],
      "calendar": ["autumn-calendar", "Autumn calendar", "<path d=\"M3 5h18v17H3V5Zm0 5h18M7 2v5m10-5v5M7 14h2m3 0h2m3 0h1M7 18h2m3 0h2m3 0h1\"/>"],
      "ticket": ["lantern-ticket", "Lantern ticket", "<path d=\"M2 6h20v4c-4 0-4 4 0 4v4H2v-4c4 0 4-4 0-4V6Zm6 0v3m0 2v2m0 2v3M12 10h6m-6 4h4\"/>"],
      "parking": ["roadside-parking", "Roadside parking", "<path d=\"M4 22V2h16v16H4M9 14V6h4c5 0 5 6 0 6H9M2 22h7m8 0h5M6 20h8\"/>"],
      "accessibility": ["open-path-access", "Open path access", "<path d=\"M9 4a2 2 0 1 0 0-.1M9 8v7h7l3 6 3-1M9 10h7M6 12a5 5 0 1 0 8 7M3 4h2m-1-1v2\"/>"],
      "restroom": ["porch-restroom", "Porch restroom", "<path d=\"M4 22V3h16v19H4Zm4-4v-6h8v6M12 7a1.5 1.5 0 1 0 0 .1M10 18v4m4-4v4M2 3h20\"/>"],
      "weather": ["wicked-weather", "Wicked weather", "<path d=\"M5 14a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4 4 0 1 1 3 9H5Zm1 3-2 4m8-4-2 4m8-4-2 4M4 3 2 1\"/>"],
      "map": ["hollow-foldout", "Hollow foldout map", "<path d=\"m2 5 7-3 6 3 7-3v17l-7 3-6-3-7 3V5Zm7-3v17m6-14v17M5 10l2 2m5 3 1 1m5-6 2-2\"/>"],
      "phone": ["parlor-telephone", "Parlor telephone", "<path d=\"M4 4c3-3 13-3 16 0l2 5-5 2-2-4H9l-2 4-5-2 2-5ZM8 11h8l4 10H4l4-10Zm4 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4\"/>"],
      "email": ["sealed-house-letter", "Sealed house letter", "<path d=\"M2 5h20v15H2V5Zm0 0 10 8L22 5M2 20l7-9m13 9-7-9M11 14h2v2h-2Z\"/>"],
      "camera": ["roadtrip-camera", "Roadtrip camera", "<path d=\"M3 7h5l2-4h5l2 4h4v14H3V7Zm4 0V5H4v2M12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8M18 10h1\"/>"],
      "plan": ["trail-itinerary", "Trail itinerary", "<path d=\"M4 3h16v19H4V3Zm4-2h8v4H8V1ZM8 9h2m4 0h2m-8 4h2m4 0h2M8 17l2 2 6-4\"/>"],
      "save": ["ledger-bookmark", "Save in the ledger", "<path d=\"M4 2h16v20H4V2Zm4 0v10l4-3 4 3V2M8 17h8M2 5h2m-2 5h2m-2 5h2\"/>"],
      "download": ["porch-download", "Download to the porch", "<path d=\"M12 2v13m-5-5 5 5 5-5M3 17v5h18v-5M6 19h2m8 0h2\"/>"],
      "print": ["woodblock-print", "Woodblock printer", "<path d=\"M7 8V2h10v6M5 18H2V8h20v10h-3M6 14h12v8H6v-8Zm3 3h6m-6 2h4M5 11h1m12 0h1\"/>"],
      "share": ["forked-trail-share", "Share a route", "<path d=\"M5 19v-5q0-7 7-7h7M15 3l4 4-4 4M9 14v5h12v-6M3 21h3\"/>"],
      "info": ["visitor-notice", "Visitor notice", "<path d=\"M4 3h16v17H7l-3 3V3ZM12 10v7m-1-10h2M8 20v3h10v-3\"/>"],
      "close": ["crossed-bones-close", "Close the ledger", "<path d=\"M5 5 19 19M19 5 5 19M3 3h4m10 0h4M3 21h4m10 0h4\"/>"],
      "arrow": ["lane-arrow", "Wicked Lane arrow", "<path d=\"M2 8h12V4l8 8-8 8v-4H2V8Zm4 0v8M10 8v8\"/>"],
      "oven": ["roadhouse-oven", "Roadhouse oven", "<path d=\"M4 22V10a8 8 0 0 1 16 0v12H4Zm4-4v-8a4 4 0 0 1 8 0v8H8ZM2 22h20M11 18l1-5 2 5M8 3 6 1\"/>"],
      "grill": ["bone-grill", "Roadhouse grill", "<path d=\"M3 10h18c0 7-18 7-18 0Zm4 5-3 7m13-7 3 7M6 6h12M6 10V8m4 2V8m4 2V8m4 2V8M9 4q-2-2 0-3m6 3q-2-2 0-3\"/>"],
      "coffee": ["afterlife-affogato", "Afterlife affogato", "<path d=\"M5 9h12v9c0 5-12 5-12 0V9Zm12 2h3c3 0 3 5 0 5h-3M3 23h16M8 6q-2-2 0-4m5 4q-2-2 0-4M8 12h6\"/>"],
      "music": ["porch-fiddle", "Porch fiddle", "<path d=\"M14 2l4 2-6 13c2 4-4 7-7 3s1-7 4-5l6-12M5 15l7 5M8 18l-2 3M20 4 7 19\"/>"]
    },
    "rest-in-pizza": {
      "menu": ["gingham-menu", "Pizzeria menu", "<path d=\"M3 2h18v20H3V2Zm0 4h18M7 2v4m5-4v4m5-4v4M7 10h10m-10 4h6m-6 4h10M18 9v10\"/>"],
      "bites": ["garlic-knot", "Garlic knot", "<path d=\"M7 7c-7-2-8 7-2 9l9 4c6 2 9-5 4-8L9 5C4 0 0 7 5 10l11 5M7 7l9 8M7 16l4-7m3 11 4-8\"/>"],
      "dessert": ["cannoli", "Dearly departed cannoli", "<path d=\"M7 4 20 12c4 3 0 10-4 7L3 11C0 8 3 2 7 4Zm0 0C3 3 0 10 4 12m12 7c-4-1 0-8 4-7M6 8h.1m4 4h.1m3 3h.1m4 0h.1\"/>"],
      "drinks": ["soda-fountain", "Blood orange soda", "<path d=\"M6 7h12l-2 15H8L6 7Zm-1 0h14M14 7l3-6h4M8 12h8M11 15a2 2 0 1 0 0 4 2 2 0 0 0 0-4\"/>"],
      "vegetarian": ["basil-pizza", "Basil pizza", "<path d=\"M3 10a9 9 0 1 0 18 0A9 9 0 0 0 3 10Zm4 0q0-5 7-5 1 7-5 8l-2-3Zm2 3 4-6M7 17h.1m10-5h.1m-5 7h.1\"/>"],
      "spicy": ["calabrian-pepper", "Calabrian pepper", "<path d=\"M8 7c-5 7 4 17 13 13-9-2-7-7-8-12L8 7Zm0 0q2-4 6-3m-1 4q4-3 5-7M9 13l2 2\"/>"],
      "alcohol": ["pizza-lager", "Dead mans draft", "<path d=\"M5 7h12v15H5V7Zm12 2h3v9h-3M5 7c-4-2 0-6 4-3 2-2 6-1 6 1 5-1 6 3 2 3M8 11v7m5-7v7\"/>"],
      "zeroProof": ["citrus-soda", "Soft landing soda", "<path d=\"M7 7h10l2 15H5L7 7Zm-2 15h16M12 7V2h5M9 13a3 3 0 1 0 6 0H9Zm3 0v3m-2-2 1 1m3-1-1 1\"/>"],
      "trail": ["rising-garden-gate", "Rising garden gate", "<path d=\"M3 22V9m18 13V9M3 13h18M3 20h18M7 9v13m5-13v13m5-13v13M5 7q7-10 14 0M12 6V1m0 4c-5 0-5-4-5-4 4 0 5 2 5 4\"/>"],
      "collection": ["lost-found-drawer", "Lost and found drawer", "<path d=\"M2 8h20v14H2V8Zm1 0 3-6h12l3 6M2 13h20M9 16h6v3H9v-3ZM6 5h12\"/>"],
      "story": ["founder-portrait", "Founders portrait", "<path d=\"M3 2h18v20H3V2Zm3 3h12v14H6V5Zm6 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6M8 19v-3q4-4 8 0v3\"/>"],
      "ghost": ["former-manager", "Former manager ghost", "<path d=\"M4 22V12a8 8 0 0 1 16 0v10l-4-2-4 2-4-2-4 2ZM8 11h1m6 0h1M10 15h4M12 16v3m-2-1h4\"/>"],
      "key": ["cellar-tag-key", "Cellar key tag", "<path d=\"M6 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 0v12h6v-3H9v-3h3v-3H6M11 3h10v7H11V3Zm3 2h4m-4 3h2\"/>"],
      "postcard": ["previous-owner-card", "Previous owners card", "<path d=\"M2 3h20v18H2V3Zm0 4h20M14 7v14M5 15l3-5 3 5H5Zm0 3h6M17 10h2v3h-2Zm-1 6h4\"/>"],
      "badge": ["staff-pumpkin", "Pumpkin staff badge", "<path d=\"M6 6h12v13H6V6Zm3-3h6v4H9V3ZM12 10c-6-2-6 6 0 6s6-8 0-6Zm0 0V8M8 22h8m-6-3v3m4-3v3\"/>"],
      "souvenir": ["unsettled-receipt", "Unsettled tab", "<path d=\"M5 2h14v20l-3-2-4 2-4-2-3 2V2Zm3 5h8M8 10h5m-5 4h8m-2 3h2M8 4h1m2 0h1m2 0h1\"/>"],
      "raven": ["receipt-raven", "Raven with receipt", "<path d=\"M7 19V8q0-7 7-6l3 3 4 1-5 3-1 9-8 1ZM7 10l-5 6 5-1m4-4 2 4M3 20h18v3H3v-3Zm11-15h.1\"/>"],
      "location": ["awning-pin", "Pizzeria location", "<path d=\"M12 22 5 13a8 8 0 1 1 14 0l-7 9ZM7 9h10l-2-3H9L7 9Zm1 0v5h8V9m-6 5v-3h4v3\"/>"],
      "clock": ["kitchen-timer", "Kitchen timer", "<path d=\"M12 5a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm-3-3h6m-3 0v3M12 8v5l-4 2M5 6 3 4m16 2 2-2M8 22h8\"/>"],
      "calendar": ["delivery-calendar", "Pizzeria calendar", "<path d=\"M4 4h16v18H4V4Zm0 5h16M8 1v5m8-5v5M7 13h3v3H7v-3Zm7 0h3m-3 4h3M7 19h3\"/>"],
      "ticket": ["pizza-stub", "Pizzeria ticket", "<path d=\"M1 7h22v3c-3 1-3 3 0 4v3H1v-3c3-1 3-3 0-4V7Zm7 0v10m4-7 3 5 3-5h-6ZM4 9v2m0 2v2\"/>"],
      "parking": ["delivery-parking", "Pizzeria parking", "<path d=\"M3 4h18v14H3V4Zm5 11V7h4c4 0 4 5 0 5H8M6 18v4m12-4v4M3 22h6m6 0h6\"/>"],
      "accessibility": ["courtyard-access", "Courtyard access", "<path d=\"M10 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4M10 8v6h6l3 7 3-1M10 10h6M7 12a5 5 0 1 0 7 7M2 3h3m-3 3h2\"/>"],
      "restroom": ["pizzeria-washroom", "Pizzeria washroom", "<path d=\"M3 22V2h18v20M7 22V9h10v13M9 6h6M12 12a1 1 0 1 0 0 .1M10 15h4v3h-4v-3Zm1 3v4m2-4v4\"/>"],
      "weather": ["rainy-awning", "Rainy day awning", "<path d=\"M3 12h18l-3-5H6l-3 5Zm0 0q3 4 6 0 3 4 6 0 3 4 6 0M5 17l-2 4m9-4-2 4m9-4-2 4M5 3 4 1m8 2V1m7 2 1-2\"/>"],
      "map": ["parlor-floorplan", "Pizzeria floor plan", "<path d=\"M2 3h20v18H2V3Zm0 6h8V3m0 6v5H2m8 0h7v7m0-7V8h5M5 17h2m6-11h2M12 18l2-2\"/>"],
      "phone": ["pizza-phone", "Pizzeria phone", "<path d=\"M4 2h5l2 6-3 2q2 4 6 6l2-3 6 2v5c-9 5-25-11-18-18Zm1 3h2m11 12v1\"/>"],
      "email": ["order-envelope", "Pizzeria envelope", "<path d=\"M2 6h20v15H2V6Zm0 0 10 9L22 6M2 21l7-9m13 9-7-9M8 2h8m-6 2h4\"/>"],
      "camera": ["photo-booth", "Pizzeria photo booth", "<path d=\"M3 5h18v17H3V5Zm4 0V2h10v3M12 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8M6 19h12M6 8h1m10 0h1\"/>"],
      "plan": ["order-pad", "Pizzeria visit pad", "<path d=\"M5 3h14v19H5V3Zm3 0V1m4 2V1m4 2V1M8 7h8M8 11h2m3 0h3M8 15h2m3 0h3M8 19h8\"/>"],
      "save": ["recipe-bookmark", "Save the recipe", "<path d=\"M3 3h18v19H3V3Zm4 0v19m4-19v10l3-2 3 2V3M11 17h6\"/>"],
      "download": ["takeaway-download", "Takeaway download", "<path d=\"M12 2v12m-4-4 4 4 4-4M4 16h16l2 6H2l2-6Zm0 0 3 6m13-6-3 6\"/>"],
      "print": ["receipt-printer", "Receipt printer", "<path d=\"M6 7V1h12v6M3 7h18v12h-4M7 19H3V7M7 13h10v9l-3-2-2 2-2-2-3 2v-9ZM10 16h4M6 10h1m10 0h1\"/>"],
      "share": ["pass-the-slice", "Pass the slice", "<path d=\"M3 19v-7q0-5 6-5h10m-4-4 4 4-4 4M10 14l3 8 7-8h-10ZM4 22h3\"/>"],
      "info": ["chalkboard-info", "Chalkboard information", "<path d=\"M4 2h16v18H4V2Zm3 18-2 3m12-3 2 3M12 10v6m-1-9h2M7 5h10\"/>"],
      "close": ["peel-cross", "Close pizzeria panel", "<path d=\"M4 4 20 20M20 4 4 20M2 2l4 1-3 3-1-4Zm20 0-1 4-3-3 4-1Z\"/>"],
      "arrow": ["delivery-arrow", "Pizzeria direction", "<path d=\"M2 10h15m-6-7 10 9-10 9m-1-7H2M7 7l-3 3 3 4\"/>"],
      "oven": ["brick-dome", "Brick dome oven", "<path d=\"M2 22V11a10 10 0 0 1 20 0v11H2Zm5 0V11a5 5 0 0 1 10 0v11M2 12h5m10 0h5M6 3l3 4m9-4-3 4M12 1v5M9 18h6\"/>"],
      "grill": ["pizza-oven-grate", "Pizzeria oven grate", "<path d=\"M2 9h20v7H2V9Zm3 7-1 6m15-6 1 6M6 9v7m4-7v7m4-7v7m4-7v7M6 5q3-2 0-4m6 4q3-2 0-4m6 4q3-2 0-4\"/>"],
      "coffee": ["espresso-cup", "Wake up espresso", "<path d=\"M6 10h10v5c0 7-10 7-10 0v-5Zm10 1h3c4 0 4 5 0 5h-3M3 22h18M8 6q-2-2 0-4m5 4q2-2 0-4\"/>"],
      "music": ["jukebox", "Pizzeria jukebox", "<path d=\"M4 22V9a8 8 0 0 1 16 0v13H4Zm4-10V9a4 4 0 0 1 8 0v3H8Zm-1 4h10v6H7v-6Zm3-7h4M10 19h4\"/>"]
    },
    "grave-expectations": {
      "menu": ["estate-bill-of-fare", "Estate bill of fare", "<path d=\"M5 2h14v20H5V2Zm3 3h8M8 9h8m-8 4h8m-8 4h8M3 5h2m14 0h2M3 19h2m14 0h2M11 5l1 1 1-1\"/>"],
      "bites": ["silver-starter", "Silver starter fork", "<path d=\"M4 2v9m3-9v9m3-9v9M4 8h6m-3 3v11M15 8c-3-4 1-8 4-5 4 4 1 8-2 7l-2-2Zm2 2v12\"/>"],
      "dessert": ["brulee-dish", "Creme brulee dish", "<path d=\"M3 13h18l-3 7H6l-3-7Zm-1 0h20M6 10h12M9 7l2-5 2 5m2 0 2-4 2 4M8 22h8\"/>"],
      "drinks": ["estate-decanter", "Estate decanter", "<path d=\"M9 2h6v3h-1v3c10 7 8 14-2 14S0 15 10 8V5H9V2Zm-3 13h12M9 18h6M10 5h4\"/>"],
      "vegetarian": ["estate-mushroom", "Estate mushroom", "<path d=\"M2 13a10 10 0 0 1 20 0H2Zm8 0-2 9h8l-2-9M6 10h.1m5-3h.1m6 3h.1M6 22h12\"/>"],
      "spicy": ["pepper-mill", "Estate pepper mill", "<path d=\"M9 3h6l2 4-2 4 3 10H6l3-10-2-4 2-4Zm0 8h6M6 21v2h12v-2M12 1v2M8 7h8M9 17h6\"/>"],
      "alcohol": ["cellar-bottle", "Ancestral cellar bottle", "<path d=\"M10 1h4v7l3 4v10H7V12l3-4V1Zm0 4h4M7 14h10M10 16h4v3h-4v-3M10 22h4\"/>"],
      "zeroProof": ["civil-refreshment", "Civil refreshment", "<path d=\"M5 4h14l-3 12H8L5 4Zm7 12v6m-5 0h10M7 9h10M18 1a3 3 0 1 0 0 6m-2-4 2 2\"/>"],
      "trail": ["terrace-balustrade", "Mourning terrace", "<path d=\"M2 10h20M3 19h18M4 10v9m4-9v9m4-9v9m4-9v9m4-9v9M2 22h20M8 7l4-5 4 5H8Zm4-5v8\"/>"],
      "collection": ["ancestral-cabinet", "Ancestral cabinet", "<path d=\"M4 4h16v18H4V4Zm-2 0 10-3 10 3M12 4v18M4 10h16M4 16h16M9 12v2m6-2v2M2 22h20\"/>"],
      "story": ["estate-deed", "Estate deed", "<path d=\"M5 2h14v20H5V2Zm3 4h8M8 9h8m-8 4h4M15 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6m-2 5-1 3 3-1 3 1-1-3\"/>"],
      "ghost": ["maitre-d-ghost", "Maitre d ghost", "<path d=\"M5 21V10a7 7 0 0 1 14 0v11l-4-2-3 2-3-2-4 2ZM9 9h.1m6 0h.1M9 13l3 2 3-2v4l-3-2-3 2v-4Zm3 3v3\"/>"],
      "key": ["estate-cellar-key", "Estate cellar key", "<path d=\"M7 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 0 11 11h4v-4h-4v-3h-3M5 6l2-2 2 2-2 2-2-2\"/>"],
      "postcard": ["estate-correspondence", "Estate correspondence", "<path d=\"M2 5h20v15H2V5Zm11 0v15M4 15h7M5 15V9l3-2 2 2v6M16 7h4v4h-4V7Zm0 7h4m-4 3h2\"/>"],
      "badge": ["estate-rosette", "Estate staff rosette", "<path d=\"m12 2 3 2 4 1v4l2 3-3 3-1 4-5-1-4 1-1-4-3-3 2-3V5l4-1 2-2ZM8 18l-2 5 6-3 6 3-2-5M9 10h6v4H9v-4\"/>"],
      "souvenir": ["estate-seal", "Estate souvenir seal", "<path d=\"M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 3 5 3v6l-5 3-5-3V9l5-3Zm-2 5 2-2 2 2-2 3-2-3\"/>"],
      "raven": ["executor-raven", "Executors raven", "<path d=\"M8 18V7c0-5 7-7 10-3l4 2-5 2-1 10H8Zm0-8-5 8h5m4-9 2 5M5 22h15m-10-4v4m5-4v4M15 4h.1\"/>"],
      "location": ["estate-gate-pin", "Estate gate marker", "<path d=\"M12 22C8 18 3 12 3 10a9 9 0 0 1 18 0c0 3-5 9-9 13ZM8 13V7h8v6m-8-3h8m-4-3v6M7 13h10\"/>"],
      "clock": ["ancestral-clock", "Ancestral clock", "<path d=\"M6 22V5l6-4 6 4v17H6Zm6-15a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0 2v3l2 1m-2 4v3m-5 2h10\"/>"],
      "calendar": ["estate-engagements", "Estate engagements", "<path d=\"M5 4h14v18H5V4Zm3-3v5m8-5v5M5 8h14M8 11h2m4 0h2M8 15h2m4 0h2M8 19h8M3 4h2m14 0h2\"/>"],
      "ticket": ["estate-admission", "Estate admission", "<path d=\"M3 5h18v5c-4 0-4 4 0 4v5H3v-5c4 0 4-4 0-4V5Zm6 0v3m0 2v4m0 2v3M13 9l2-2 2 2-2 4-2-4\"/>"],
      "parking": ["estate-valet", "Estate parking", "<path d=\"M4 3h16v15H4V3Zm5 11V6h4c4 0 4 5 0 5H9M12 18v4M7 22h10M2 6h2m16 0h2\"/>"],
      "accessibility": ["estate-access", "Estate access", "<path d=\"M11 5a2 2 0 1 0 0-4 2 2 0 0 0 0 4M11 8v7h6l3 6 2-1M11 10h6M8 12a5 5 0 1 0 6 8M3 7V3h4\"/>"],
      "restroom": ["estate-powder-room", "Estate powder room", "<path d=\"M5 22V5l7-3 7 3v17M8 22V8h8v14M12 10a1 1 0 1 0 0 .1M10 13h4v5h-4v-5Zm1 5v4m2-4v4M3 22h18\"/>"],
      "weather": ["terrace-umbrella", "Terrace umbrella", "<path d=\"M2 12a10 10 0 0 1 20 0c-2-2-4-2-6 0-3-2-5-2-8 0-2-2-4-2-6 0ZM12 2v17c0 4 5 4 5 0M8 12c0-6 2-10 4-10s4 4 4 10\"/>"],
      "map": ["estate-survey", "Estate survey map", "<path d=\"M3 3h18v18H3V3Zm4 4h10v10H7V7Zm0 5h10m-5-5v10M2 23l3-2m14 0 3 2M5 1v2m14-2v2\"/>"],
      "phone": ["estate-handset", "Estate telephone", "<path d=\"M5 2h4l2 5-3 3q2 4 6 6l3-3 5 2v4c-7 8-26-10-17-17ZM3 21h4m-4-3v3m16-18h3v3\"/>"],
      "email": ["wax-sealed-envelope", "Wax sealed letter", "<path d=\"M2 5h20v16H2V5Zm0 0 10 9L22 5M2 21l7-8m13 8-7-8M12 12a2 2 0 1 0 0 4 2 2 0 0 0 0-4\"/>"],
      "camera": ["estate-camera", "Estate portrait camera", "<path d=\"M3 7h18v14H3V7Zm4 0 2-4h6l2 4M12 10a4 4 0 1 0 0 8 4 4 0 0 0 0-8M1 10h2m18 0h2M5 5h1\"/>"],
      "plan": ["engagement-ledger", "Engagement ledger", "<path d=\"M4 3h16v19H4V3Zm4 0v19M11 7h6m-6 4h6m-6 4h6m-6 4h4M2 6h2m-2 5h2m-2 5h2\"/>"],
      "save": ["estate-bookmark", "Estate bookmark", "<path d=\"M6 2h12v20l-6-4-6 4V2Zm3 4h6M10 9l2-2 2 2-2 3-2-3M3 3v18m18-18v18\"/>"],
      "download": ["estate-tray-download", "Download to silver tray", "<path d=\"M12 2v12m-4-5 4 5 4-5M3 17h18l-2 5H5l-2-5Zm-2 0h22M6 20h12\"/>"],
      "print": ["estate-printing-press", "Estate printing press", "<path d=\"M7 7V2h10v5M2 8h20v10h-4M6 18H2V8M6 13h12v9H6v-9ZM9 16h6m-6 3h6M5 10h2m10 0h2\"/>"],
      "share": ["estate-dispatch", "Estate dispatch", "<path d=\"M4 20v-6q0-7 8-7h8m-5-5 5 5-5 5M11 16v5h10v-6M2 22h4\"/>"],
      "info": ["estate-monogram-info", "Estate information", "<path d=\"M12 2 22 7v10l-10 5L2 17V7l10-5Zm0 8v7m-1-10h2M8 5h8m-8 14h8\"/>"],
      "close": ["estate-saltire", "Close estate panel", "<path d=\"M5 5 19 19M19 5 5 19M3 6V3h3m12 0h3v3M3 18v3h3m12 0h3v-3\"/>"],
      "arrow": ["estate-direction", "Estate direction", "<path d=\"M2 12h19m-8-8 8 8-8 8M4 9v6M8 9v6\"/>"],
      "oven": ["estate-range", "Estate kitchen range", "<path d=\"M3 3h18v19H3V3Zm0 5h18M7 12h10v7H7v-7ZM7 5h.1m5 0h.1m5 0h.1M6 22v1m12-1v1\"/>"],
      "grill": ["steak-grill", "Estate steak grill", "<path d=\"M3 9h18v9H3V9Zm3 0v9m4-9v9m4-9v9m4-9v9M5 18v4m14-4v4M6 6l2-4m4 4 2-4m4 4 2-4\"/>"],
      "coffee": ["demitasse", "Estate demitasse", "<path d=\"M5 9h11v6c0 5-11 5-11 0V9Zm11 1h4v5h-4M3 21h18M7 6q-2-2 0-4m5 4q-2-2 0-4M7 12h7\"/>"],
      "music": ["estate-gramophone", "Estate gramophone", "<path d=\"M3 18h18v5H3v-5Zm5 0v-6m0 0 9-9 5 5-10 6-4-2ZM17 3l-2-2m-3 13v4M7 21h10\"/>"]
    },
    "boobies-lodge": {
      "menu": ["timber-menu", "Timber menu board", "<path d=\"M4 3h16v19H4V3Zm-2 0h20M2 22h20M7 7h10M7 12h6m-6 5h10M17 10v9\"/>"],
      "bites": ["loaded-nachos", "Loaded nachos", "<path d=\"M2 17h20l-3 5H5l-3-5Zm2 0 3-8 5 8m-1 0 5-11 5 11M7 9l-2-5 7 1-2 5M8 13h.1m8-2h.1m2 4h.1\"/>"],
      "dessert": ["lodge-brownie", "Afterlife brownie", "<path d=\"M3 10 15 5l7 5-12 5-7-5Zm0 0v8l7 5 12-6v-7M10 15v8M7 10h.1m6-2h.1m4 3h.1M15 5V2m-2 2 2-2 2 2\"/>"],
      "drinks": ["frosty-lodge-mug", "Frosty lodge mug", "<path d=\"M4 6h12v16H4V6Zm12 3h5v9h-5M4 6C0 2 6-1 8 3c3-4 8-1 8 3M8 10v8m4-8v8\"/>"],
      "vegetarian": ["lodge-veggie-burger", "Lodge veggie burger", "<path d=\"M3 10a9 9 0 0 1 18 0H3Zm0 4 3-2 3 2 3-2 3 2 3-2 3 2M3 17h18l-2 5H5l-2-5ZM8 6h.1m8 0h.1M12 5v2\"/>"],
      "spicy": ["smokehouse-heat", "Smokehouse heat", "<path d=\"M12 2c-1 6 7 7 7 13a7 7 0 0 1-14 0c0-4 2-7 4-9-1 5 2 5 3 5V2Zm0 12c-5 4-3 8 0 8s5-4 0-8\"/>"],
      "alcohol": ["cold-draft-tap", "Cold draft tap", "<path d=\"M4 3h15v4H4V3Zm5 4v7H4v-4h5m5-3v15H9v-5M2 22h18M19 3V1M16 11h6m-3 0v5\"/>"],
      "zeroProof": ["designated-monster", "Designated monster soda", "<path d=\"M6 6h12l-2 16H8L6 6Zm7 0 3-5h5M8 11h8M9 15h.1m6 0h.1M10 18h4M5 3 3 1m16 3 2-2\"/>"],
      "trail": ["beer-garden-trail", "Beer garden trail", "<path d=\"M4 22c-8-8 18-8 10-16M2 22h20M5 2 2 7h6L5 2Zm0 5v7M20 3l-3 5h6l-3-5Zm0 5v7\"/>"],
      "collection": ["trophy-case", "Trophy crypt case", "<path d=\"M3 3h18v19H3V3Zm0 5h18M12 8v14M3 16h18M6 10h3v3H6v-3Zm9 9h3M7 13v3m10-6v3\"/>"],
      "story": ["lodge-logbook", "Lodge logbook", "<path d=\"M4 2h16v20H4V2Zm4 0v20M11 7l3-3 3 3m-6 0h6M11 11h6m-6 4h6m-6 4h4M2 6h2m-2 5h2m-2 5h2\"/>"],
      "ghost": ["lodge-host-ghost", "Lodge host ghost", "<path d=\"M4 22V11a8 8 0 0 1 16 0v11l-4-3-4 3-4-3-4 3ZM8 9h1m6 0h1M8 13h8M7 3 5 1m12 2 2-2M12 14v5\"/>"],
      "key": ["lodge-cellar-key", "Lodge cellar key", "<path d=\"M7 11a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 0v11h8v-3h-5v-3h3v-3H7M5 5h4v2H5V5Z\"/>"],
      "postcard": ["lodge-postcard", "Lodge postcard", "<path d=\"M2 4h20v17H2V4Zm12 0v17M4 15l4-7 4 7H4Zm3 0v3M16 7h4v4h-4V7Zm0 8h4m-4 3h4\"/>"],
      "badge": ["lodge-pumpkin-pin", "Lodge pumpkin pin", "<path d=\"M12 2l3 3 5 1-1 5 2 4-4 3-1 5-4-2-4 2-1-5-4-3 2-4-1-5 5-1 3-3ZM12 9c-6-3-6 6 0 6s6-9 0-6Zm0 0V7\"/>"],
      "souvenir": ["lodge-tab-magnet", "Lodge tab magnet", "<path d=\"M4 2h16v20l-4-2-4 2-4-2-4 2V2Zm3 4 5-2 5 2m-10 4h10M7 14h10m-4 4h4M7 17h2\"/>"],
      "raven": ["lodge-scorekeeper", "Lodge scorekeeper raven", "<path d=\"M8 19V8c0-7 8-9 11-4l4 2-6 3-1 10H8Zm0-8-6 7h6m3-8 3 5M3 21h18v2H3v-2ZM16 4h.1\"/>"],
      "location": ["lodge-trail-marker", "Lodge trail marker", "<path d=\"M12 22 4 12a8 8 0 1 1 16 0l-8 10ZM7 10l5-5 5 5m-8-2v6h6V8m-4 6v-3h2v3\"/>"],
      "clock": ["scoreboard-clock", "Scoreboard clock", "<path d=\"M2 5h20v16H2V5Zm3 3h14v10H5V8Zm4 2v6m-2-4h4m5-2v6M8 2v3m8-3v3M9 23h6\"/>"],
      "calendar": ["game-day-calendar", "Game day calendar", "<path d=\"M3 4h18v18H3V4Zm4-3v6m10-6v6M3 9h18M7 13h3v3H7v-3Zm7 0h3v3h-3v-3M7 19h10\"/>"],
      "ticket": ["lodge-game-ticket", "Lodge game ticket", "<path d=\"M2 5h20v5c-3 1-3 3 0 4v5H2v-5c3-1 3-3 0-4V5Zm6 0v14M12 9h6v6h-6V9Zm3 0v6\"/>"],
      "parking": ["lodge-parking-post", "Lodge parking post", "<path d=\"M3 2h18v16H3V2Zm5 12V6h5c4 0 4 5 0 5H8M9 18v5m6-5v5M6 23h12\"/>"],
      "accessibility": ["lodge-level-access", "Lodge level access", "<path d=\"M10 4a2 2 0 1 0 0-.1M10 8v7h6l3 6h3M10 11h6M7 13a5 5 0 1 0 7 6M2 4 4 2l2 2\"/>"],
      "restroom": ["lodge-washroom", "Lodge washroom", "<path d=\"M4 22V4l8-3 8 3v18M7 22V7h10v15M12 10a1 1 0 1 0 0 .1M9 14h6v3H9v-3Zm2 3v5m2-5v5M2 22h20\"/>"],
      "weather": ["lodge-storm", "Lodge storm", "<path d=\"M5 13a4 4 0 0 1 0-8 6 6 0 0 1 11-1 4 4 0 1 1 2 8H5Zm7 2-4 4h4l-2 4 7-6h-5l2-2M4 16l-1 3m17-3-1 3\"/>"],
      "map": ["lodge-trail-map", "Lodge trail map", "<path d=\"m2 4 6-2 8 3 6-2v18l-6 2-8-3-6 2V4Zm6-2v18m8-15v18M4 12l2-3m4 7 3-2m5-5 2 3\"/>"],
      "phone": ["lodge-radio-phone", "Lodge radio phone", "<path d=\"M6 6h12v16H6V6Zm2 0V1m2 9h4v4h-4v-4Zm-1 8h6M3 9h3m12 0h3M9 3h6\"/>"],
      "email": ["lodge-mailbag", "Lodge message", "<path d=\"M3 6h18v15H3V6Zm0 0 9 8 9-8M3 21l7-9m11 9-7-9M7 3h10M10 1h4\"/>"],
      "camera": ["trophy-camera", "Trophy camera", "<path d=\"M2 8h20v14H2V8Zm5 0 2-5h6l2 5M12 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8M4 5h3M19 11h.1\"/>"],
      "plan": ["game-plan", "Lodge game plan", "<path d=\"M3 2h18v20H3V2Zm4 4h3v3H7V6Zm7 10h3v3h-3v-3ZM8 17v-4h8V7m-3 3 3-3 3 3M5 13h2\"/>"],
      "save": ["lodge-save-tag", "Save the lodge plan", "<path d=\"M4 2h16v20H4V2Zm4 0v10l4-3 4 3V2M8 16h8v4H8v-4Zm2 0v4\"/>"],
      "download": ["lodge-crate-download", "Download to lodge crate", "<path d=\"M12 1v13m-4-4 4 4 4-4M3 17h18v6H3v-6Zm3 0v6m12-6v6M1 17h22\"/>"],
      "print": ["lodge-ticket-printer", "Lodge ticket printer", "<path d=\"M6 8V2h12v6M2 8h20v11h-5M7 19H2V8M7 14h10v8H7v-8ZM10 17h4m-4 3h4M5 11h2m10 0h2\"/>"],
      "share": ["lodge-pass", "Pass along the plan", "<path d=\"M3 21v-9q0-5 7-5h11m-6-5 6 5-6 5M11 16v6h10v-6M1 21h4\"/>"],
      "info": ["lodge-noticeboard", "Lodge noticeboard", "<path d=\"M3 3h18v17H3V3Zm4 17-2 3m12-3 2 3M12 10v6m-1-9h2M6 3V1m12 2V1\"/>"],
      "close": ["crossed-timbers-close", "Close lodge panel", "<path d=\"M3 5 19 21l2-2L5 3 3 5Zm16-2L3 19l2 2L21 5l-2-2Z\"/>"],
      "arrow": ["trail-sign-arrow", "Lodge direction", "<path d=\"M2 7h12V3l8 9-8 9v-4H2V7Zm5 0v10M4 20v3\"/>"],
      "oven": ["lodge-smoker", "Lodge smoker", "<path d=\"M4 8h16v12H4V8Zm0 4h16M7 8V5h4v3M7 20v3m10-3v3M15 4q-2-2 0-3m4 3q-2-2 0-3M8 15h8\"/>"],
      "grill": ["smokehouse-barbecue", "Smokehouse barbecue", "<path d=\"M2 10h20c0 8-20 8-20 0Zm5 6-2 7m12-7 2 7M6 20h12M5 7h14M6 10V7m4 3V7m4 3V7m4 3V7M8 4q2-2 0-3m8 3q2-2 0-3\"/>"],
      "coffee": ["camp-mug", "Lodge camp coffee", "<path d=\"M4 8h13v13H4V8Zm13 2h5v8h-5M2 8h17M7 5q-2-2 0-4m6 4q-2-2 0-4M8 12l3-2 3 2-3 5-3-5\"/>"],
      "music": ["lodge-speaker", "Lodge speaker", "<path d=\"M5 2h14v21H5V2Zm7 9a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6a1 1 0 1 0 0 2 1 1 0 0 0 0-2M2 8v7m20-7v7\"/>"]
    },
  };
  const GROUPS = Object.freeze([
    Object.freeze({ id: "identity", label: "Identity & atmosphere", roles: Object.freeze(["season", "dining", "night", "signature", "garden", "day", "welcome"]) }),
    Object.freeze({ id: "menu", label: "Food & drinks", roles: Object.freeze(["menu", "bites", "dessert", "drinks", "vegetarian", "spicy", "alcohol", "zeroProof"]) }),
    Object.freeze({ id: "experiences", label: "Experiences & collection", roles: Object.freeze(["trail", "collection", "story", "ghost", "key", "postcard", "badge", "souvenir", "raven"]) }),
    Object.freeze({ id: "visit", label: "Visitor information", roles: Object.freeze(["location", "clock", "calendar", "ticket", "parking", "accessibility", "restroom", "weather", "map", "phone", "email", "camera"]) }),
    Object.freeze({ id: "actions", label: "Actions & navigation", roles: Object.freeze(["plan", "save", "download", "print", "share", "info", "close", "arrow"]) }),
    Object.freeze({ id: "house", label: "House details", roles: Object.freeze(["oven", "grill", "coffee", "music"]) })
  ]);
  const ROLES = Object.freeze(GROUPS.flatMap(group => group.roles));
  const LIBRARIES = Object.freeze(Object.fromEntries(Object.entries(DEFINITIONS).map(([id, original]) => {
    const definitions = { ...original, ...EXTENSIONS[id] };
    if (Object.keys(definitions).length !== ROLES.length || ROLES.some(role => !definitions[role])) throw new TypeError(`Incomplete glyph library: ${id}.`);
    return [id, Object.freeze(Object.fromEntries(ROLES.map(role => {
      const [name, label, body] = definitions[role];
      return [role, Object.freeze({ id: `${id}-${name}`, name, label, body })];
    })))];
  })));

  const propertyId = data => data.branding?.propertyId || 'bone-appetit';
  function library(data) {
    const id = propertyId(data);
    if (!Object.hasOwn(LIBRARIES, id)) throw new TypeError('This restaurant needs a registered glyph library.');
    return LIBRARIES[id];
  }
  const svg = glyph => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${glyph.label}">${glyph.body}</svg>`;
  const sprite = data => `<svg class="svg-library" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" data-glyph-library="${propertyId(data)}">\n${Object.values(library(data)).map(glyph => `  <symbol id="${glyph.id}" viewBox="0 0 24 24">${glyph.body}</symbol>`).join('\n')}\n</svg>`;
  return { LIBRARIES, GROUPS, ROLES, library, svg, sprite };
});
