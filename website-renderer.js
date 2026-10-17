/* One renderer for generated visitor pages and creator website previews. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./planner.js'), require('./field-notes.js'));
  else root.BoneWebsite = factory(root.BonePlanner, root.BoneFieldNotes);
})(typeof globalThis === 'object' ? globalThis : this, function(plannerAPI, fieldNotes) {
'use strict';
const { createPlanner } = plannerAPI;
const ROUTES = Object.freeze({ 'bone-appetit': 'index.html', 'rest-in-pizza': 'rest-in-pizza.html', 'grave-expectations': 'grave-expectations.html', 'boobies-lodge': 'boobies-lodge.html' });

// Current presentation artwork is independent of immutable campaign snapshots.
const HERO_ART = Object.freeze({
  'rest-in-pizza': { asset: 'rest-in-pizza-theme.webp', alt: 'A retro neighborhood pizza parlor on Halloween: a friendly ghost tosses dough while costumed families collect their pizza.' },
  'grave-expectations': { asset: 'grave-expectations-theme.webp', alt: 'An ancestral steakhouse with candlelit tables, oxblood velvet, gilded portraits and a translucent ghost maître d’ presenting supper.' },
  'boobies-lodge': { asset: 'boobies-lodge-theme.webp', alt: 'An adult Halloween timber sports lodge with plaid-clad bartenders, smoked ribs, frosty beer and monster sports on the screens.' }
});
const heroAsset = data => HERO_ART[data.branding?.propertyId]?.asset || data.branding?.hero || 'haunted-roadhouse.webp';
const heroAlt = data => HERO_ART[data.branding?.propertyId]?.alt || data.branding?.heroAlt || 'A crooked Victorian pizzeria glowing with warm light, surrounded by jack-o’-lanterns and autumn woods.';

// Stable property/dish IDs let old saves use the current artwork without migrations.
const RESTAURANT_ART = Object.freeze({
  'bone-appetit': { logo: 'bone-appetit-logo.webp', food: {
    'witchs-cauldron': { asset: 'bone-witchs-cauldron-food.webp', alt: 'Concept image of a blackened-crust pizza with bubbling cheese and red and green hot peppers on a candlelit roadhouse table.' },
    'headless-horseman': { asset: 'bone-headless-horseman-food.webp', alt: 'Concept image of sausage, smoked cheese, bone-shaped parmesan and red onion on a wood-fired pizza beside a Halloween lantern.' },
    'poltergeist-pepperoni': { asset: 'bone-poltergeist-pepperoni-food.webp', alt: 'Concept image of a pepperoni, garlic and basil pizza with a lifted slice trailing melted cheese in a haunted roadhouse.' },
    "cemetery-margherita": {"asset": "bone-cemetery-margherita-food.webp", "alt": "Concept image of Cemetery Margherita: San Marzano tomato, fresh mozzarella, basil, and black sea salt."},
    "black-lagoon-bianca": {"asset": "bone-black-lagoon-bianca-food.webp", "alt": "Concept image of Black Lagoon Bianca: Garlic béchamel, roasted mushrooms, truffle oil, and arugula."},
    "devils-harvest": {"asset": "bone-devils-harvest-food.webp", "alt": "Concept image of Devil’s Harvest: Spicy nduja, roasted peppers, caramelized onions, and Calabrian honey."},
    "little-monster-cheese": {"asset": "bone-little-monster-cheese-food.webp", "alt": "Concept image of Little Monster Cheese: A smaller tomato-and-mozzarella pizza for a smaller appetite."},
    "crawlers-breadsticks": {"asset": "bone-crawlers-breadsticks-food.webp", "alt": "Concept image of Crawler’s Breadsticks: Garlic butter, parmesan, and a side of marinara."},
    "pumpkin-arancini": {"asset": "bone-pumpkin-arancini-food.webp", "alt": "Concept image of Pumpkin Arancini: Crispy pumpkin risotto balls with sage and pecorino cream."},
    "crypt-caprese": {"asset": "bone-crypt-caprese-food.webp", "alt": "Concept image of Crypt Caprese: Heirloom tomatoes, burrata, basil, and aged balsamic."},
    "funeral-fries": {"asset": "bone-funeral-fries-food.webp", "alt": "Concept image of Funeral Fries: Parmesan, herbs, and black garlic aioli."},
    "bat-wing-wings": {"asset": "bone-bat-wing-wings-food.webp", "alt": "Concept image of Bat-Wing Wings: Chicken wings with hot sauce, garlic parmesan, or smoky bourbon glaze."},
    "graveyard-garlic-knots": {"asset": "bone-graveyard-garlic-knots-food.webp", "alt": "Concept image of Graveyard Garlic Knots: Warm dough knots with garlic butter, parsley, and parmesan."},
    "inferno-mozzarella": {"asset": "bone-inferno-mozzarella-food.webp", "alt": "Concept image of Inferno Mozzarella: Fried mozzarella with a gently fiery Calabrian marinara."},
    "graveyard-gelato": {"asset": "bone-graveyard-gelato-food.webp", "alt": "Concept image of Graveyard Gelato: Vanilla bean gelato, chocolate soil, and a tombstone cookie."},
    "seance-tiramisu": {"asset": "bone-seance-tiramisu-food.webp", "alt": "Concept image of Séance Tiramisu: Espresso-soaked sponge, mascarpone, and cocoa dust."},
    "black-candle-cheesecake": {"asset": "bone-black-candle-cheesecake-food.webp", "alt": "Concept image of Black Candle Cheesecake: Baked cheesecake, blackberry compote, and dark cocoa crumble."},
    "afterlife-affogato": {"asset": "bone-afterlife-affogato-food.webp", "alt": "Concept image of Afterlife Affogato: Vanilla gelato drowned in hot espresso."},
    "wicked-orchard-cider": {"asset": "bone-wicked-orchard-cider-food.webp", "alt": "Concept image of Wicked Orchard Cider: Warm apple cider, cinnamon, and orange peel. Zero-proof drink."},
    "midnight-cola": {"asset": "bone-midnight-cola-food.webp", "alt": "Concept image of Midnight Cola: House cola with vanilla, cherry, and a twist of lime. Zero-proof drink."},
    "little-ghost-cocoa": {"asset": "bone-little-ghost-cocoa-food.webp", "alt": "Concept image of Little Ghost Cocoa: Warm cocoa with a marshmallow ghost. Zero-proof drink."},
    "ravens-negroni": {"asset": "bone-ravens-negroni-food.webp", "alt": "Concept image of Raven’s Negroni: Gin, Campari, sweet vermouth, and blood orange. Alcoholic drink, 21+."},
    "the-last-rites": {"asset": "bone-the-last-rites-food.webp", "alt": "Concept image of The Last Rites: Bourbon, maple, lemon, and smoky bitters over a large cube. Alcoholic drink, 21+."},
    "blood-orange-spritz": {"asset": "bone-blood-orange-spritz-food.webp", "alt": "Concept image of Blood Orange Spritz: Aperol, prosecco, blood orange, and soda. Alcoholic drink, 21+."}
  },
    story: Object.freeze({"asset": "bone-exterior-story.webp", "alt": "Concept illustration of A lovingly crooked Victorian roadside restaurant at autumn dusk among rural woods, moss-green trim, amber windows, broad porch, small pumpkin lanterns, a pizza oven glowing through the side window."}),
    map: "bone-grounds-map.webp",
    attractions: Object.freeze({
      pizzeria: Object.freeze({"asset": "bone-dining-room-scene.webp", "alt": "Concept illustration of Wide interior of a crooked Victorian roadside pizzeria with old dark wood tables, moss-green chairs, a busy wood-fired oven, slightly off-kilter family portraits, pumpkins and warm amber lanterns."}),
      hollow: Object.freeze({"asset": "pumpkin-hollow.webp", "alt": "An autumn trail winding past glowing jack-o’-lanterns beneath string lights."}),
      oddities: Object.freeze({"asset": "oddities-cabinet.webp", "alt": "An old wooden curiosity cabinet filled with tiny ghosts, antique keys, and Halloween souvenirs."})
    }),
    oddities: Object.freeze({
      "employee-of-the-month": Object.freeze({"asset": "bone-ghost-object.webp", "alt": "Concept image of A small ivory glazed ceramic ghost figurine wearing a plain employee award medallion, friendly resigned face; aged brass medallion with moss-green ribbon on a worn wood base.."}),
      "unlisted-room-key": Object.freeze({"asset": "bone-key-object.webp", "alt": "Concept image of One aged brass skeleton key with a weathered paper tag marked exactly \"13\", faded green twine.."}),
      "next-thursday-postcard": Object.freeze({"asset": "bone-postcard-object.webp", "alt": "Concept image of One weathered illustrated postcard depicting a crooked Victorian roadside house in autumn woods beneath a moon."}),
      "pumpkin-visitor-badge": Object.freeze({"asset": "bone-badge-object.webp", "alt": "Concept image of One orange jack-o-lantern enamel pin with a blank faded moss-green visitor ribbon and antique brass edges.."}),
      "unresolved-business-magnet": Object.freeze({"asset": "bone-magnet-object.webp", "alt": "Concept image of One crafted souvenir magnet depicting a crooked Victorian roadside house with a tiny pumpkin."}),
      "raven-from-accounts": Object.freeze({"asset": "bone-raven-object.webp", "alt": "Concept image of One black painted-resin raven figurine perched on a small weathered moss-green accounting ledger on a wood shelf."})
    })
  },
  'rest-in-pizza': { logo: 'rest-in-pizza-logo.webp', food: {
    'dead-and-buried-pepperoni': { asset: 'rest-dead-and-buried-food.webp', alt: 'Concept image of a cupped-pepperoni pizza on red gingham with a cheerful ceramic ghost behind the plate.' },
    'margherita-morticia': { asset: 'rest-margherita-morticia-food.webp', alt: 'Concept image of tomato, mozzarella and basil pizza on a cream plate at a retro Halloween pizzeria.' },
    "the-exorcist": {"asset": "rest-the-exorcist-food.webp", "alt": "Concept image of a wood-fired pizza with hot soppressata, roasted peppers, mozzarella and chili honey on red gingham."},
    "mushroom-afterlife": {"asset": "rest-mushroom-afterlife-food.webp", "alt": "Concept image of a white pizza with roasted mushrooms, fontina, garlic cream and thyme beside a friendly ceramic ghost."},
    "sausage-seance": {"asset": "rest-sausage-seance-food.webp", "alt": "Concept image of a wood-fired pizza topped with fennel sausage, red onion, tomato, mozzarella and pecorino."},
    "little-boo-cheese": {"asset": "rest-little-boo-cheese-food.webp", "alt": "Concept image of a small tomato-and-mozzarella pizza with a blistered crust on a cream plate."},
    "last-rites-garlic-knots": {"asset": "rest-last-rites-garlic-knots-food.webp", "alt": "Concept image of garlic knots with butter, parsley and parmesan in a gingham-lined basket beside marinara."},
    "burial-burrata": {"asset": "rest-burial-burrata-food.webp", "alt": "Concept image of creamy burrata with roast tomatoes, basil and toasted bread on a cream plate."},
    "graveyard-meatballs": {"asset": "rest-graveyard-meatballs-food.webp", "alt": "Concept image of three beef-and-pork meatballs with tomato sauce and pecorino in a cream bowl."},
    "crypt-caesar": {"asset": "rest-crypt-caesar-food.webp", "alt": "Concept image of romaine Caesar salad with parmesan, anchovy dressing and sourdough crumbs."},
    "tiramisu-mortem": {"asset": "rest-tiramisu-mortem-food.webp", "alt": "Concept image of layered espresso-and-mascarpone tiramisu dusted with cocoa on a cream dessert plate."},
    "dearly-departed-cannoli": {"asset": "rest-dearly-departed-cannoli-food.webp", "alt": "Concept image of two ricotta cannoli with chocolate and pistachio ends on a cream plate."},
    "haunted-sundae": {"asset": "rest-haunted-sundae-food.webp", "alt": "Concept image of vanilla gelato with cherry sauce and chocolate soil in a glass dessert bowl."},
    "blood-orange-soda": {"asset": "rest-blood-orange-soda-food.webp", "alt": "Concept image of blood-orange soda with ice and a lime wedge beside a ceramic ghost. Zero-proof drink."},
    "little-ghost-cocoa": {"asset": "rest-little-ghost-cocoa-food.webp", "alt": "Concept image of a cream mug of warm cocoa topped with marshmallows. Zero-proof drink."},
    "wake-up-espresso": {"asset": "rest-wake-up-espresso-food.webp", "alt": "Concept image of a double espresso with golden crema in a small cream cup and saucer. Zero-proof drink."},
    "dead-mans-draft": {"asset": "rest-dead-mans-draft-food.webp", "alt": "Concept image of a chilled glass of golden house lager with a white foam head. Alcoholic drink, 21+."},
    "last-call-negroni": {"asset": "rest-last-call-negroni-food.webp", "alt": "Concept image of a ruby-orange Negroni over ice with orange peel. Alcoholic drink, 21+."}
  },
    story: Object.freeze({"asset": "rest-exterior-story.webp", "alt": "Concept illustration of a brick pizzeria with a tomato-red awning, cream trim, glowing oven, basil pots and Halloween pumpkins at dusk."}),
    map: 'rest-grounds-map.webp',
    attractions: Object.freeze({
      pizzeria: Object.freeze({"asset": "rest-proofing-room-scene.webp", "alt": "Concept illustration of a warm pizzeria with red booths, gingham tables, a founder portrait and a friendly ghost beside the oven."}),
      hollow: Object.freeze({"asset": "rest-rising-garden-scene.webp", "alt": "Concept illustration of a pizzeria courtyard with terracotta herbs, gingham tables and a friendly scarecrow taking a long break."}),
      oddities: Object.freeze({"asset": "rest-lost-found-crypt-scene.webp", "alt": "Concept illustration of a cream-painted pizzeria cabinet with gingham liners and six gently haunted lost-and-found curiosities."})
    }),
    oddities: Object.freeze({
      "employee-of-the-month": Object.freeze({"asset": "rest-former-manager-object.webp", "alt": "Concept image of an ivory ceramic ghost with a tomato-red employee medallion on a cream pedestal."}),
      "unlisted-room-key": Object.freeze({"asset": "rest-cellar-key-object.webp", "alt": "Concept image of an aged brass key with a paper tag marked 13 and red twine on a gingham-lined shelf."}),
      "next-thursday-postcard": Object.freeze({"asset": "rest-previous-owner-postcard-object.webp", "alt": "Concept image of a vintage illustrated postcard showing a red-awning pizzeria beneath an autumn moon."}),
      "pumpkin-visitor-badge": Object.freeze({"asset": "rest-pumpkin-badge-object.webp", "alt": "Concept image of an orange pumpkin enamel employee badge with a blank cream-and-red ribbon."}),
      "unresolved-business-magnet": Object.freeze({"asset": "rest-unsettled-tab-object.webp", "alt": "Concept image of a red-awning pizzeria souvenir magnet holding a curled receipt."}),
      "raven-from-accounts": Object.freeze({"asset": "rest-raven-accounts-object.webp", "alt": "Concept image of a black resin raven figurine on a red accounting ledger beside a receipt."})
    })
  },
  'grave-expectations': { logo: 'grave-expectations-logo.webp', food: {
    'ribeye-in-perpetuity': { asset: 'grave-ribeye-in-perpetuity-food.webp', alt: 'Concept image of a seared ribeye with melting peppercorn butter and roasted shallot on a gold-rimmed plate in candlelight.' },
    'filet-of-the-deceased': { asset: 'grave-filet-of-the-deceased-food.webp', alt: 'Concept image of a seared filet medallion with red-wine jus and glazed shallots against oxblood velvet and antique gold.' },
    "the-heir-apparent-strip": {"asset": "grave-the-heir-apparent-strip-food.webp", "alt": "Concept image of The Heir Apparent Strip: A 12 oz strip steak with bone-marrow butter."},
    "porterhouse-for-the-executors": {"asset": "grave-porterhouse-for-the-executors-food.webp", "alt": "Concept image of Porterhouse for the Executors: A 32 oz porterhouse to share, with herb butter and roast garlic."},
    "lamb-of-the-last-testament": {"asset": "grave-lamb-of-the-last-testament-food.webp", "alt": "Concept image of Lamb of the Last Testament: Roasted lamb chops, rosemary jus, and fondant potato."},
    "mushroom-mausoleum": {"asset": "grave-mushroom-mausoleum-food.webp", "alt": "Concept image of Mushroom Mausoleum: Roasted portobello, wild-mushroom ragout, parmesan polenta, and thyme butter."},
    "estate-tartare": {"asset": "grave-estate-tartare-food.webp", "alt": "Concept image of Estate Tartare: Hand-cut beef, capers, shallot, egg yolk, and toasted sourdough."},
    "ancestral-onion-soup": {"asset": "grave-ancestral-onion-soup-food.webp", "alt": "Concept image of Ancestral Onion Soup: Slow-cooked onion in beef broth, Gruyère toast, and a lid of quiet authority."},
    "buried-bone-marrow": {"asset": "grave-buried-bone-marrow-food.webp", "alt": "Concept image of Buried Bone Marrow: Roasted bone marrow, parsley salad, and sourdough."},
    "heirloom-wedge": {"asset": "grave-heirloom-wedge-food.webp", "alt": "Concept image of The Heirloom Wedge: Iceberg, blue cheese, tomato, and chive dressing."},
    "creme-brulee-bequest": {"asset": "grave-creme-brulee-bequest-food.webp", "alt": "Concept image of Crème Brûlée Bequest: Vanilla custard beneath a brittle caramel lid."},
    "black-tie-forest": {"asset": "grave-black-tie-forest-food.webp", "alt": "Concept image of Black Tie Forest: Chocolate cake, cherries, and whipped cream."},
    "the-cheese-executor": {"asset": "grave-the-cheese-executor-food.webp", "alt": "Concept image of The Cheese Executor: Three cheeses with fruit preserve and crackers."},
    "old-money-fashioned": {"asset": "grave-old-money-fashioned-food.webp", "alt": "Concept image of Old Money Fashioned: Bourbon, bitters, sugar, and orange oils. Alcoholic drink, 21+."},
    "widows-martini": {"asset": "grave-widows-martini-food.webp", "alt": "Concept image of Widow’s Martini: Gin, dry vermouth, and a lemon twist. Alcoholic drink, 21+."},
    "house-red-in-trust": {"asset": "grave-house-red-in-trust-food.webp", "alt": "Concept image of House Red in Trust: A fictional house red by the glass. Alcoholic drink, 21+."},
    "bloodline-fizz": {"asset": "grave-bloodline-fizz-food.webp", "alt": "Concept image of Bloodline Fizz: Blood orange, rosemary, lemon, and sparkling water. Zero-proof drink."},
    "the-designated-heir": {"asset": "grave-the-designated-heir-food.webp", "alt": "Concept image of The Designated Heir: Blackcurrant, lime, and soda. Zero-proof drink."}
  },
    story: Object.freeze({"asset": "grave-exterior-story.webp", "alt": "Concept illustration of Entire facade of an original grand ancestral stone chop house at autumn dusk, imposing but inviting, arched gold-lit windows, oxblood canopy, clipped hedges and subtle pumpkin lanterns on stone steps."}),
    map: "grave-grounds-map.webp",
    attractions: Object.freeze({
      pizzeria: Object.freeze({"asset": "grave-dining-room-scene.webp", "alt": "Concept illustration of Wide interior of an ancestral upscale steakhouse: oxblood velvet banquettes, dark paneling, antique gold chandeliers, enormous original family portraits appearing slightly judgmental, cream linen and polished silver."}),
      hollow: Object.freeze({"asset": "grave-mourning-terrace-scene.webp", "alt": "Concept illustration of A sheltered stone terrace outside an ancestral steakhouse at blue hour, clipped topiary hedges in absurdly formal shapes, iron cafe chairs with oxblood cushions, cream linen tables, antique brass lanterns and discreet carved pumpkins."}),
      oddities: Object.freeze({"asset": "grave-ancestral-cabinet-scene.webp", "alt": "Concept illustration of An elaborate antique-gold-trimmed walnut cabinet in a candlelit ancestral steakhouse."})
    }),
    oddities: Object.freeze({
      "employee-of-the-month": Object.freeze({"asset": "grave-ghost-object.webp", "alt": "Concept image of A small ivory glazed ceramic ghost figurine wearing a plain employee award medallion, friendly resigned face; antique-gold medallion on an oxblood velvet miniature plinth.."}),
      "unlisted-room-key": Object.freeze({"asset": "grave-key-object.webp", "alt": "Concept image of One aged brass skeleton key with a weathered paper tag marked exactly \"13\", a luxurious oxblood tassel.."}),
      "next-thursday-postcard": Object.freeze({"asset": "grave-postcard-object.webp", "alt": "Concept image of One weathered illustrated postcard depicting a grand ancestral stone steakhouse beneath an autumn moon."}),
      "pumpkin-visitor-badge": Object.freeze({"asset": "grave-badge-object.webp", "alt": "Concept image of One orange jack-o-lantern enamel pin with an elaborate antique-gold edge and blank oxblood staff ribbon.."}),
      "unresolved-business-magnet": Object.freeze({"asset": "grave-magnet-object.webp", "alt": "Concept image of One crafted souvenir magnet depicting a grand stone manor restaurant with gold-lit windows."}),
      "raven-from-accounts": Object.freeze({"asset": "grave-raven-object.webp", "alt": "Concept image of One black painted-resin raven figurine perched on a small oxblood leather accounting ledger with gold corner pieces."})
    })
  },
  'boobies-lodge': { logo: 'boobies-lodge-logo.webp', food: {
    'the-great-rack': { asset: 'lodge-the-great-rack-food.webp', alt: 'Concept image of a half rack of glazed smoked ribs with fries and slaw on a timber lodge table beside a jack-o’-lantern.' },
    'double-dare-rack': { asset: 'lodge-double-dare-rack-food.webp', alt: 'Concept image of a full rack of glazed smoked ribs with fries and slaw on a large tray in a Halloween sports lodge.' },
    'resting-witch-burger': { asset: 'lodge-resting-witch-burger-food.webp', alt: 'Concept image of a single beef burger with smoked cheddar, bacon, pickles and lodge sauce on a timber table.' },
    'hot-ghoul-chicken': { asset: 'lodge-hot-ghoul-chicken-food.webp', alt: 'Concept image of a crispy chicken sandwich with chili glaze, pickles and slaw beside a pumpkin lantern.' },
    'deadwood-smash': { asset: 'lodge-deadwood-smash-food.webp', alt: 'Concept image of a double smash burger with melted American cheese, griddled onion and mustard.' },
    'the-veggie-vixen': { asset: 'lodge-the-veggie-vixen-food.webp', alt: 'Concept image of a bean-and-mushroom burger with cheddar, lettuce and tomato relish on a lodge table.' },
    'boo-bites-wings': { asset: 'lodge-boo-bites-wings-food.webp', alt: 'Concept image of buffalo chicken wings with blue-cheese dip in a rustic lodge basket.' },
    'loaded-lumberjacks': { asset: 'lodge-loaded-lumberjacks-food.webp', alt: 'Concept image of fries loaded with smoked pork, cheddar, scallions and lodge sauce.' },
    'haunted-hoops': { asset: 'lodge-haunted-hoops-food.webp', alt: 'Concept image of golden beer-battered onion rings and ranch dip beside a plaid napkin.' },
    'nachos-of-the-living-dead': { asset: 'lodge-nachos-of-the-living-dead-food.webp', alt: 'Concept image of corn-chip nachos with black beans, queso, jalapeños, salsa and sour cream.' },
    'cheesecake-after-dark': { asset: 'lodge-cheesecake-after-dark-food.webp', alt: 'Concept image of vanilla cheesecake with blackberry sauce and chocolate crumbs in warm lodge light.' },
    'brownie-points-afterlife': { asset: 'lodge-brownie-points-afterlife-food.webp', alt: 'Concept image of a warm chocolate brownie with vanilla ice cream and caramel.' },
    'pumpkin-spice-sinner': { asset: 'lodge-pumpkin-spice-sinner-food.webp', alt: 'Concept image of pumpkin bread pudding with cinnamon cream and caramel.' },
    'cold-shoulder-lager': { asset: 'lodge-cold-shoulder-lager-food.webp', alt: 'Concept image of a frosty mug of golden house lager with a white foam head. Alcoholic drink, 21+.' },
    'lumberjack-o-lantern': { asset: 'lodge-lumberjack-o-lantern-food.webp', alt: 'Concept image of an amber bourbon-and-apple cocktail with lemon, cinnamon and ice. Alcoholic drink, 21+.' },
    'resting-beach-face': { asset: 'lodge-resting-beach-face-food.webp', alt: 'Concept image of a rum, pineapple, lime and ginger cocktail in a tall glass. Alcoholic drink, 21+.' },
    'designated-monster': { asset: 'lodge-designated-monster-food.webp', alt: 'Concept image of a purple blackberry, lime, mint and soda mocktail with ice. Zero-proof drink.' },
    'banshee-ginger-fizz': { asset: 'lodge-banshee-ginger-fizz-food.webp', alt: 'Concept image of a sparkling ginger, orange and lime mocktail with ice. Zero-proof drink.' }
  },
    story: Object.freeze({ asset: 'lodge-exterior-story.webp', alt: 'Concept illustration of a glowing timber lodge among autumn pines, with porch lanterns, pumpkins and an owl-shaped sign at dusk.' }),
    map: 'lodge-grounds-map.webp',
    attractions: Object.freeze({
      pizzeria: Object.freeze({ asset: 'lodge-main-event-scene.webp', alt: 'Concept illustration of the timber sports lodge with plaid booths, monster-game screens, Halloween decorations and adult hosts serving adult guests.' }),
      hollow: Object.freeze({ asset: 'lodge-afterlife-garden-scene.webp', alt: 'Concept illustration of a lantern-lit timber beer garden with plaid seating and a decorative skeleton waiting beside a mug.' }),
      oddities: Object.freeze({ asset: 'lodge-trophy-crypt-scene.webp', alt: 'Concept illustration of an amber-lit timber trophy cabinet holding six Halloween curiosities and unofficial sports cups.' })
    }),
    oddities: Object.freeze({
      'employee-of-the-month': Object.freeze({ asset: 'lodge-former-manager-object.webp', alt: 'Concept image of a glazed ceramic ghost wearing an employee medallion on a tiny wooden trophy base.' }),
      'unlisted-room-key': Object.freeze({ asset: 'lodge-cellar-key-object.webp', alt: 'Concept image of an aged brass key with a tag marked 13 and a worn green ribbon.' }),
      'next-thursday-postcard': Object.freeze({ asset: 'lodge-previous-owner-postcard-object.webp', alt: 'Concept image of a weathered illustrated postcard showing an autumn timber lodge beneath a moon.' }),
      'pumpkin-visitor-badge': Object.freeze({ asset: 'lodge-pumpkin-badge-object.webp', alt: 'Concept image of an orange pumpkin enamel staff pin with a blank green ribbon.' }),
      'unresolved-business-magnet': Object.freeze({ asset: 'lodge-unsettled-tab-object.webp', alt: 'Concept image of a timber-lodge souvenir magnet holding a curling receipt on a wooden shelf.' }),
      'raven-from-accounts': Object.freeze({ asset: 'lodge-raven-accounts-object.webp', alt: 'Concept image of a black resin raven figurine perched on a green accounting ledger beside a receipt.' })
    })
  }
});
Object.values(RESTAURANT_ART).forEach(art => {
  Object.values(art.food).forEach(Object.freeze);
  Object.freeze(art.food); Object.freeze(art);
});
const propertyArt = data => RESTAURANT_ART[data.branding?.propertyId || 'bone-appetit'];
const logoAsset = data => propertyArt(data)?.logo || RESTAURANT_ART['bone-appetit'].logo;
const foodArt = (data, id) => propertyArt(data)?.food[id] || null;
const featuredArt = (data, feature) => foodArt(data, feature.id) || { asset: imageFile(feature.image), alt: feature.alt };
const storyArt = data => propertyArt(data)?.story || { asset: heroAsset(data), alt: heroAlt(data) };
const mapAsset = data => propertyArt(data)?.map || data.map.image;
const oddityArt = (data, item) => propertyArt(data)?.oddities?.[item.id] || { asset: item.image, alt: item.alt };
const attractionArt = (data, key) => {
  const a = data.attractions[key];
  return propertyArt(data)?.attractions?.[key] || key === 'pizzeria' && foodArt(data, data.featured[0]?.id) || { asset: imageFile(a.image), alt: a.card.alt };
};
const artAssets = data => [...new Set([logoAsset(data), storyArt(data).asset, mapAsset(data), ...Object.values(data.menu).flat().flatMap(item => foodArt(data, item.id) ? [foodArt(data, item.id).asset] : []), ...data.oddities.map(item => oddityArt(data, item).asset), ...data.featured.map(feature => featuredArt(data, feature).asset), ...Object.keys(data.attractions).map(key => attractionArt(data, key).asset)])];

const escape = value => String(value).replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[c]);

function validateSites(registry) {
  if (registry.version !== 1 || !Array.isArray(registry.sites) || registry.sites.length !== 4) throw new TypeError('visitor-sites.json: expected the four version 1 restaurant profiles.');
  const ids = new Set();
  registry.sites.forEach(site => {
    if (!Object.hasOwn(ROUTES, site.id) || ids.has(site.id) || site.href !== ROUTES[site.id]) throw new TypeError('visitor-sites.json: restaurant IDs and page routes must match the four bundled properties.');
    ids.add(site.id);
    for (const key of ['name', 'shortName']) if (typeof site[key] !== 'string' || !site[key].trim()) throw new TypeError(`visitor-sites.json: ${site.id}.${key} is required.`);
    if (!site.copy || typeof site.copy !== 'object' || Array.isArray(site.copy)) throw new TypeError(`visitor-sites.json: ${site.id}.copy is required.`);
    for (const [key, value] of Object.entries(site.copy)) {
      const valid = text => typeof text === 'string' && !!text.trim() && text.length <= 10000;
      if (['GLANCE_ITEMS', 'STORY_PARAGRAPHS'].includes(key) ? !Array.isArray(value) || !value.length || !value.every(valid) : !valid(value)) throw new TypeError(`visitor-sites.json: ${site.id}.copy.${key} must contain non-empty copy.`);
    }
    for (const key of ['META_DESCRIPTION', 'PAGE_TITLE', 'STORY_PARAGRAPHS', 'GLANCE_ITEMS', 'COLLECTION_EYEBROW', 'COLLECTION_HEADING', 'COLLECTION_INTRO', 'MAP_EYEBROW', 'MAP_INTRO']) {
      if (!Object.hasOwn(site.copy, key)) throw new TypeError(`visitor-sites.json: ${site.id}.copy.${key} is required.`);
    }
    if (site.copy.GLANCE_ITEMS?.length !== 4) throw new TypeError(`visitor-sites.json: ${site.id} needs four at-a-glance facts.`);
    for (const key of ['HERO_ACTION_TARGET', 'HERO_SECONDARY_TARGET']) if (!['#menu', '#haunts', '#visit'].includes(site.copy[key])) throw new TypeError(`visitor-sites.json: ${site.id}.copy.${key} must target the menu, haunts or visit section.`);
  });
  return registry.sites;
}
const rich = value => escape(value).replace(/\*([^*]+)\*/g, '<em>$1</em>').replaceAll('\n', '<br>');
const imageFile = image => image.endsWith('.svg') ? image : image + '.webp';

function render(data, template, options = {}) {
  const p = createPlanner(data);
  const sites = options.sites;
  const site = sites.find(site => site.id === (data.branding?.propertyId || 'bone-appetit'));
  if (!site) throw new TypeError('This restaurant needs a registered visitor website profile.');
  const copy = site.copy;
  const copySlots = Object.fromEntries(Object.entries(copy).filter(([, value]) => typeof value === 'string').map(([key, value]) => [key, /HEADLINE|HEADING|SIGNOFF|ACCESS_NOTE/.test(key) ? rich(value) : escape(value)]));
  copySlots.META_DESCRIPTION = escape(copy.META_DESCRIPTION.replaceAll(site.name, data.name));
  copySlots.PAGE_TITLE = escape(copy.PAGE_TITLE.replaceAll(site.name, data.name));
  copySlots.STORY_PARAGRAPHS = copy.STORY_PARAGRAPHS.map(text => `<p>${escape(text)}</p>`).join('\n');
  copySlots.GLANCE_ITEMS = copy.GLANCE_ITEMS.map((text, index) => `<span><svg class="icon" aria-hidden="true"><use href="#icon-${['pumpkin', data.branding && site.id !== 'rest-in-pizza' ? 'star' : 'pizza', 'moon', 'star'][index]}"/></svg>${escape(text)}</span>`).join('\n');
  const navigation = options.standalone ? [{ ...site, href: 'index.html', shortName: data.name }] : sites;
  const switcher = footer => `<nav${footer ? '' : ' id="property-switcher"'} class="property-switcher${footer ? ' property-switcher-footer' : ''}" aria-label="${footer ? 'Restaurant properties in footer' : 'Explore restaurant properties'}"><span>CHOOSE YOUR HAUNT</span><ul>${navigation.map(property => `<li><a href="${escape(property.href)}" data-property-link="${escape(property.id)}"${property.id === site.id ? ' aria-current="page"' : ''}>${escape(property.shortName)}</a></li>`).join('')}</ul><p>${options.standalone ? 'Fictional restaurant · Your visit plan stays in this browser' : 'Four fictional restaurants · Each keeps its own saved visit plan'}</p></nav>`;
  const { rules } = p;
  const option = (value, text, selected = false) => `<option value="${escape(value)}"${selected ? ' selected' : ''}>${escape(text)}</option>`;
  const menuItem = (item, heading = 'h3') => `<article class="full-menu-item" data-menu-id="${escape(item.id)}">
  ${foodArt(data, item.id) ? `<img class="full-menu-photo" src="assets/${escape(foodArt(data, item.id).asset)}" alt="${escape(foodArt(data, item.id).alt)}" width="720" height="480" loading="lazy">\n  ` : ''}<div><${heading}>${escape(item.name)}</${heading}><strong>${p.money(item.price)}</strong></div>
  <p>${escape(item.description)}</p>
  ${item.tags.length ? `<div class="menu-tags">${item.tags.map(tag => `<span>${escape(tag)}</span>`).join(' ')}</div>` : ''}
</article>`;
  const facts = key => p.attractionFacts(key).map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('\n');
  if (!/^[a-z0-9-]+\.svg$/.test(data.map.image)) throw new Error('The map must name a local SVG asset.');
  const { mapSVG, noteCSS } = options;
  if (typeof template !== 'string' || typeof mapSVG !== 'string' || typeof noteCSS !== 'string') throw new TypeError('The website template, map and field-note styles are required.');
  const slots = {
    ...copySlots,
    BODY_ATTRIBUTES: ` class="restaurant-theme theme-${escape(site.id)}${data.branding ? ` property-site property-${escape(site.id)}` : ''}"`,
    PROPERTY_SWITCHER: switcher(false),
    PROPERTY_SWITCHER_FOOTER: switcher(true),
    FONT_PRELOAD: options.standalone || options.collection ? '' : '<link rel="preload" href="assets/fonts/fraunces-700.ttf" as="font" type="font/ttf" crossorigin>',
    CREATOR_LINK: options.standalone || options.collection ? '' : '<a href="creator.html">Creator workspace</a>',
    COLLECTION_NAV: data.branding ? 'The collection' : 'The counter',
    LOGO_ASSET: `assets/${escape(logoAsset(data))}`,
    HERO_ASSET: `assets/${escape(heroAsset(data))}`,
    HERO_ALT: escape(heroAlt(data)),
    STORY_ASSET: `assets/${escape(storyArt(data).asset)}`,
    STORY_ALT: escape(storyArt(data).alt),
    DINING_ASSET: `assets/${escape(attractionArt(data, 'pizzeria').asset)}`,
    YEAR: p.year,
    NAME: escape(data.name),
    SEASON_BAR: escape(p.seasonRange().replace(`, ${p.year}`, '').toUpperCase()),
    SITE_DATA: JSON.stringify(data, null, 2).replace(/</g, '\\u003c'),
    MENU_DISCLOSURE: escape(data.disclosures.menu),
    FIELD_NOTE_CARD: fieldNotes.card(data, p.defaultPlan(new Date(`${data.season.start}T12:00:00Z`))).replace(`src="assets/${escape(data.map.image)}"`, `src="assets/${escape(mapAsset(data))}"`),
    FIELD_NOTE_ASSETS: `<template id="field-map-art">${mapSVG}</template>\n<template id="field-note-styles"><style>${noteCSS}</style></template>`,
    ODDITIES_COLLECTION: `<section class="oddities-section section-pad wrap" id="oddities" aria-labelledby="oddities-title">
  <div class="section-intro">
    <div><p class="eyebrow accent">${escape(copy.COLLECTION_EYEBROW)}</p><h2 id="oddities-title">${rich(copy.COLLECTION_HEADING)}</h2></div>
    <p>${escape(copy.COLLECTION_INTRO)}</p>
  </div>
  <div class="oddities-grid">${data.oddities.map((item, index) => `<article class="oddity-card" id="oddity-${escape(item.id)}">
    <div class="oddity-illustration"><img src="assets/${escape(oddityArt(data, item).asset)}" alt="${escape(oddityArt(data, item).alt)}" width="480" height="320" loading="lazy"><span>SPECIMEN ${String(index + 1).padStart(2, '0')}</span></div>
    <p class="oddity-material">${escape(item.material)}</p>
    <h3>${escape(item.name)}</h3>
    <p class="oddity-copy">${escape(item.copy)}</p>
    <details class="oddity-record"><summary aria-label="Counter record for ${escape(item.name)}">Counter record <span aria-hidden="true">+</span></summary><div><p><strong>Claimed origin</strong>${escape(item.origin)}</p><p>${escape(item.record)}</p><p class="oddity-fiction">Fictional object and provenance. No authenticity claim or purchase.</p></div></details>
  </article>`).join('\n')}</div>
</section>`,
    GROUNDS_MAP: `<section class="grounds-section" id="grounds" aria-labelledby="grounds-heading"><div class="wrap section-pad">
  <div class="section-intro"><div><p class="eyebrow accent">${escape(copy.MAP_EYEBROW)}</p><h2 id="grounds-heading">${escape(data.map.title)}</h2></div><p>${escape(copy.MAP_INTRO)}</p></div>
  <div class="grounds-layout">
    <figure class="grounds-figure"><img src="assets/${escape(mapAsset(data))}" width="760" height="560" alt="${escape(data.branding ? `Fictional house plan with six numbered locations: ${data.map.locations.map(point => point.name).join(', ')}. Not to scale; access is not verified.` : 'Imagined grounds with six numbered locations: house, counter, pumpkin trail, rest bench, shorter return, and entrance. Solid loop and dashed shorter return. Fictional; not to scale.')}"><figcaption>${escape(data.map.caption)}</figcaption></figure>
    <ol class="grounds-key">${data.map.locations.map(point => `<li><span class="map-number">${escape(point.number)}</span><div>${point.attraction
      ? `<a class="text-link" data-attraction="${escape(point.attraction)}" data-map-location="${point.number}" href="#details-${escape(point.attraction)}">${escape(point.name)} <span aria-hidden="true">↗</span></a>`
      : `<h3>${escape(point.name)}</h3>`}<p>${escape(point.detail)}</p>${point.stop ? `<p class="map-stop-hint">${escape(p.stopHint(point.stop))}</p>` : ''}</div></li>`).join('\n')}</ol>
  </div>
  <p class="grounds-disclosure">${escape(data.map.disclosure)}</p>
</div></section>`,
    ATTRACTION_CARDS: Object.entries(data.attractions).map(([key, a]) => `<article class="haunt-card">
  <div class="haunt-image">
    <img src="assets/${escape(attractionArt(data, key).asset)}" alt="${escape(attractionArt(data, key).alt)}" width="900" height="600" loading="lazy">
    <span class="image-label">${escape(a.card.imageLabel)}</span>
  </div>
  <div class="haunt-copy">
    <div class="card-kicker">${escape(a.card.kicker)} <span>${escape(a.card.intensity)}</span></div>
    <h3>${escape(a.card.title)}</h3>
    <p>${escape(a.card.copy)}</p>
    <a class="text-link" data-attraction="${escape(key)}" href="#details-${escape(key)}">${escape(a.card.action)} <span aria-hidden="true">↗</span></a>
  </div>
</article>`).join('\n'),
    STATIC_ATTRACTIONS: `<section class="static-attractions fallback-content" aria-label="Attraction details">
${Object.entries(data.attractions).map(([key, a]) => `<article id="details-${escape(key)}" class="static-attraction">
  <p class="eyebrow accent">${escape(a.kicker)}</p>
  <h3>${escape(a.title)}</h3>
  <p>${escape(p.copy(a.description))}</p>
  <dl class="attraction-facts">${facts(key)}</dl>
  <p>${escape(a.access)}</p>
</article>`).join('\n')}
</section>`,
    FEATURED_PIZZAS: data.featured.map(feature => {
      const item = data.menu.pizzas.find(item => item.id === feature.id);
      if (!item) throw new Error(`Unknown featured pizza: ${feature.id}`);
      return `<article class="pizza-card" data-featured-id="${escape(item.id)}">
  <div class="pizza-photo">
    <img src="assets/${escape(featuredArt(data, feature).asset)}" alt="${escape(featuredArt(data, feature).alt)}" width="720" height="480" loading="lazy">
    <span class="pizza-badge">${escape(feature.badge)}</span>
  </div>
  <div class="pizza-title"><h3>${escape(item.name)}</h3><span>${p.money(item.price)}</span></div>
  <p>${escape(feature.description)}</p>
  <span class="food-note">${escape(feature.note)}</span>
</article>`;
    }).join('\n'),
    STATIC_MENU: `<section id="full-menu" class="static-menu fallback-content" aria-labelledby="static-menu-title">
  <h3 id="static-menu-title">The complete menu</h3>
  <p>Fictional menu. Prices are illustrative; nothing here places an order.</p>
${Object.entries(data.menu).map(([key, items]) => `<section id="full-menu-${escape(key)}" aria-label="${escape(data.menuCategories[key])}">
  <h3>${escape(data.menuCategories[key])}</h3>
  <div class="full-menu-items">${items.map(item => menuItem(item, 'h4')).join('\n')}</div>
</section>`).join('\n')}
  <p class="menu-disclaimer">${escape(data.disclosures.menu)}</p>
</section>`,
    MENU_FILTERS: `<div class="menu-filters" role="group" aria-label="Filter menu by category">
${Object.entries(data.menuCategories).map(([key, label], index) => `<button type="button" data-filter="${escape(key)}" aria-pressed="${index === 0}">${escape(label)}</button>`).join('\n')}
</div>`,
    MOOD_PICKER: `<fieldset class="time-picker" data-planner-control>
  <legend>CHOOSE YOUR SIDE OF SUNSET</legend>
  <div class="segmented">${Object.entries(data.moods).map(([key, mood]) => `<label><input type="radio" name="visit-mood" value="${escape(key)}"${key === 'day' ? ' checked' : ''}><span><svg class="icon"><use href="#icon-${key === 'day' ? 'sun' : 'moon'}"/></svg> ${escape(mood.label)}</span></label>`).join('\n')}</div>
</fieldset>`,
    DEFAULT_MOOD: `<div class="mood-description" id="mood-description" aria-live="polite">
  <p class="eyebrow accent" id="mood-time">${escape(p.moodTime('day'))}</p>
  <h3 id="mood-title">${data.moods.day.title.split('\n').map(escape).join('<br>')}</h3>
  <p id="mood-copy">${escape(data.moods.day.copy)}</p>
  <ul class="check-list" id="mood-features">${data.moods.day.features.map(text => `<li>${escape(p.copy(text))}</li>`).join('\n')}</ul>
</div>`,
    VISITOR_FACTS: `<dl>
  <div><dt>THE SEASON</dt><dd>${escape(p.seasonRange())}</dd></div>
  <div><dt>WHEN TO WANDER</dt><dd>${escape(p.hoursLabel())}<br><span>${escape(p.closingLabel())}</span></dd></div>
  <div><dt>THE COST OF CURIOSITY</dt><dd>${data.branding ? `House spaces and collection · Free to explore<br>Food and drinks priced separately<br><span>${escape(data.disclosures.admission)}</span>` : `Grounds &amp; oddities counter · Free<br>${escape(rules.stops.trail.title)} · ${p.money(rules.trailPrice)} per person<br><span>Under ${rules.freeUnderAge}s wander free with an adult.</span>`}</dd></div>
  <div><dt>THE ADDRESS, ALLEGEDLY</dt><dd>${escape(data.address.street)}<br>${escape(data.address.district)}</dd></div>
</dl>`,
    FAQ_ITEMS: data.faqs.map(faq => `<details${faq.open ? ' open' : ''}>
  <summary>${escape(faq.question)}<span aria-hidden="true">+</span></summary>
  <div class="faq-answer"><p>${escape(p.copy(faq.answer))}</p></div>
</details>`).join('\n'),
    DATE_OPTIONS: p.allowedDates.map(date => option(date, p.fullDateLabel(date))).join('\n'),
    ARRIVAL_OPTIONS: rules.arrivals.map(arrival => option(arrival.value, `${p.shortTime(arrival.value)} · ${arrival.label}`)).join('\n'),
    GUEST_FIELDS: `<fieldset class="guest-fields">
  <legend>Your traveling companions</legend>
  <label>Age ${data.admission?.minimumAge || rules.freeUnderAge} &amp; up<select name="guests" id="visit-guests">
${Array.from({ length: rules.guests.max - rules.guests.min + 1 }, (_, index) => index + rules.guests.min).map(n => option(n, `${n} ${n === 1 ? 'person' : 'people'}`, n === rules.guests.default)).join('\n')}
  </select></label>
  ${data.admission ? '<input type="hidden" name="children" id="visit-children" value="0">' : `<label>Under age ${rules.freeUnderAge}<select name="children" id="visit-children">
${Array.from({ length: rules.children.max - rules.children.min + 1 }, (_, index) => index + rules.children.min).map(n => option(n, n ? `${n} little ${n === 1 ? 'monster' : 'monsters'}` : 'None', n === rules.children.default)).join('\n')}
  </select></label>`}
</fieldset>`,
    PLAN_STOPS: `<fieldset class="plan-stops">
  <legend>Make time for</legend>
${p.stopKeys.map(key => `<label><input type="checkbox" name="${escape(key)}" checked><span>${escape(rules.stops[key].title)}<small>${escape(p.stopHint(key))}</small></span></label>`).join('\n')}
</fieldset>`
  };
  return template.replace(/(^[\t ]*)?\{\{([A-Z_]+)\}\}/gm, (_, indent = '', key) => {
    if (!Object.hasOwn(slots, key)) throw new Error(`Unknown template slot: ${key}`);
    return String(slots[key]).split('\n').map(line => indent + line).join('\n');
  });
}

return { render, validateSites, ROUTES, HERO_ART, heroAsset, heroAlt, RESTAURANT_ART, logoAsset, foodArt, featuredArt, storyArt, mapAsset, oddityArt, attractionArt, artAssets };
});
