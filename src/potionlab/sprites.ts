// Potion Lab — ingredient + recipe → Kenney food-kit sprite mapping.
//
// The food-kit pack ships 200 64×64 PNG previews of its 3D models at
// /public/assets/kenney/food-kit/Previews/. This module maps every
// Potion Lab ingredient id and every recipe id to a fitting sprite.
//
// Where food-kit genuinely lacks a thematic match (feathers, abstract
// concepts like "Bottled Library Silence"), we use the closest related
// sprite (often a bottle/jar/herb/bowl) rather than falling back to
// emoji — per pass directive #4 (don't fall back to emoji).

const FK = "/assets/kenney/food-kit/Previews";

/** Resolve a sprite filename to its full URL. */
export function spriteUrl(filename: string): string {
  return `${FK}/${filename}`;
}

// ── Ingredient → sprite filename ─────────────────────────────────────

export const INGREDIENT_SPRITE: Record<string, string> = {
  // ── Common ───────────────────────────────────────────────────
  moonwater:     "bottle-oil.png",
  dustflame:     "shaker-pepper.png",
  clovergreen:   "broccoli.png",
  windseed:      "mushroom.png",
  spirit_sugar:  "shaker-salt.png",
  salt_of_dawn:  "shaker-salt.png",
  willow_bark:   "loaf-baguette.png",
  frogspot:      "mushroom.png",
  mint_leaf:     "celery-stick.png",
  honey_drop:    "honey.png",
  river_pebble:  "coconut-half.png",
  feather_white: "whipped-cream.png",

  // ── Uncommon ─────────────────────────────────────────────────
  phoenix_ash:    "paprika-slice.png",
  fairy_dust:     "shaker-salt.png",
  dragon_scale:   "fish.png",
  sea_glass:      "ice-cream-scoop-mint.png",
  ember_pepper:   "paprika.png",
  shadow_silk:    "wine-red.png",
  moss_of_quiet:  "cabbage.png",
  cloudbloom:     "cauliflower.png",
  gold_thread:    "loaf.png",
  river_song:     "cup-tea.png",

  // ── Rare ─────────────────────────────────────────────────────
  unicorn_hair: "honey.png",
  starlight:    "ice-cream-scoop-mint.png",
  krakenink:    "wine-red.png",
  thunderstone: "candy-bar.png",
  moonpearl:    "egg.png",
  lava_chip:    "cookie-chocolate.png",
  yeti_breath:  "ice-cream-cup.png",
  wishbone:     "fish-bones.png",

  // ── Legendary ────────────────────────────────────────────────
  phoenix_egg: "egg-half.png",
  siren_song:  "cup.png",
  godsbreath:  "soda-can.png",
  heart_oak:   "pumpkin.png",
  sunfire:     "lemon.png",
  void_droplet:"chocolate.png",

  // ── Mythic ───────────────────────────────────────────────────
  true_name:       "honey.png",
  alchemists_tear: "wine-white.png",
  time_grain:      "rice-ball.png",
  rainbow_root:    "carrot.png",

  // ── Harry Potter inspired ────────────────────────────────────
  mandrake_root:  "carrot.png",
  bezoar:         "coconut-half.png",
  gillyweed:      "salad.png",
  boomslang_skin: "sausage.png",
  lacewing_flies: "mushroom-half.png",
  wormwood:       "celery-stick.png",
  asphodel_root:  "leek.png",
  valerian_sprig: "broccoli.png",
  ashwinder_egg:  "egg.png",
  phoenix_tear:   "bottle-oil.png",

  // ── Greek mythology ─────────────────────────────────────────
  ambrosia:             "honey.png",
  nectar:               "wine-white.png",
  lethe_water:          "wine-red.png",
  olympus_dew:          "ice-cream-scoop-mint.png",
  minotaur_horn:        "loaf-baguette.png",
  medusa_scale:         "fish.png",
  golden_fleece_thread: "loaf-baguette.png",
  cyclops_eyelash:      "mushroom-half.png",
  siren_voicebox:       "bottle-musterd.png",
  hydra_scale:          "fish.png",

  // ── Skyrim / Nordic ─────────────────────────────────────────
  imp_stool:         "mushroom.png",
  deathbell:         "eggplant.png",
  nightshade:        "cherries.png",
  moon_sugar:        "candy-bar.png",
  snowberry:         "strawberry.png",
  sleeping_tree_sap: "honey.png",
  frost_salt:        "shaker-salt.png",
  void_salt:         "shaker-pepper.png",
  fire_salt:         "paprika-slice.png",
  troll_fat:         "cheese.png",

  // ── Schoolyard ──────────────────────────────────────────────
  lunch_box_apple:   "apple.png",
  homework_paper:    "bread.png",
  playground_dust:   "loaf.png",
  lost_tooth:        "egg-half.png",
  birthday_candle:   "cupcake.png",
  library_silence:   "cup-coffee.png",
  first_snowflake:   "ice-cream.png",
  campfire_smoke:    "frying-pan.png",
  pinky_promise:     "lollypop.png",
  ocean_listen:      "fish.png",
};

// ── Recipe → sprite filename (results — bottles / cups / drinks) ─────

export const RECIPE_SPRITE: Record<string, string> = {
  // Known recipes
  vitality_tonic:        "bottle-ketchup.png",
  calm_brew:             "cup-tea.png",
  lucky_draught:         "wine-white.png",
  courage_cordial:       "bottle-musterd.png",
  sleep_syrup:           "mug.png",
  focus_elixir:          "soda-bottle.png",
  kindness_balm:         "honey.png",
  summer_lemonade:       "soda-glass.png",
  spirit_glow:           "wine-white.png",
  frog_chorus:           "bowl-soup.png",
  feather_step:          "cocktail.png",
  warm_hearth:           "cup-coffee.png",
  // Secret / advanced
  phoenix_revival:       "bottle-oil.png",
  dragon_friendship:     "wine-red.png",
  midnight_invisibility: "chocolate.png",
  deep_listening:        "cup-tea.png",
  thunderfeet:           "soda.png",
  starlit_dream:         "wine-white.png",
  yeti_calm:             "ice-cream-cup.png",
  lavafire_courage:      "cocktail.png",
  luck_of_seven:         "honey.png",
  wisdom_of_oak:         "pot-stew.png",
  // Harry Potter (recipes)
  felix_felicis:         "wine-white.png",
  polyjuice_lite:        "soda-bottle.png",
  dreamless_sleep:       "mug.png",
  wiggenweld:            "bottle-ketchup.png",
  wolfsbane_kid:         "cup-coffee.png",
  veritaserum_safe:      "cup.png",
  // Greek myth
  ambrosia_breakfast:    "honey.png",
  achilles_courage:      "bottle-musterd.png",
  lethe_lullaby:         "wine-red.png",
  olympus_runner:        "soda-glass.png",
  hydra_resilience:      "bowl-broth.png",
  siren_pause:           "cocktail.png",
  // Skyrim
  draught_of_health:     "bottle-ketchup.png",
  potion_of_invisibility:"chocolate.png",
  resist_fire:           "bottle-oil.png",
  fortify_smithing:      "bottle-musterd.png",
  skooma_cousin:         "frappe.png",
  frost_breath:          "ice-cream-cup.png",
  // Schoolyard
  test_day_clarity:      "cup-coffee.png",
  playground_speed:      "soda.png",
  birthday_wish:         "cupcake.png",
  lost_tooth_fairy:      "cocktail.png",
  shell_listen:          "cup-tea.png",
  campfire_courage:      "cup-coffee.png",
  // Easter eggs
  rainbow_potion:        "cocktail.png",
  siren_serenade:        "wine-white.png",
  void_window:           "chocolate.png",
  time_taffy:            "candy-bar.png",
  true_self:             "ice-cream-scoop-mint.png",
  pocket_pet:            "egg-cup.png",
};

// ── Fallback resolution ─────────────────────────────────────────────

/** All food-kit sprite filenames known to exist on disk — verified at
 *  the bottom of this module. If a mapping above references one that
 *  ISN'T in this set, the resolver falls through to a sensible default
 *  for the ingredient's element. */
const FK_FILES_AVAILABLE = new Set<string>([
  "advocado-half.png","apple-half.png","apple.png","avocado.png","bacon-raw.png","bacon.png",
  "bag-flat.png","bag.png","banana.png","barrel.png","beet.png","bottle-ketchup.png",
  "bottle-musterd.png","bottle-oil.png","bowl-broth.png","bowl-cereal.png","bowl-soup.png",
  "bowl.png","bread.png","broccoli.png","burger-cheese-double.png","burger-cheese.png",
  "burger-double.png","burger.png","cabbage.png","cake-birthday.png","cake-slicer.png","cake.png",
  "can-open.png","can-small.png","can.png","candy-bar-wrapper.png","candy-bar.png","carrot.png",
  "carton-small.png","carton.png","cauliflower.png","celery-stick.png","cheese-cut.png",
  "cheese-slicer.png","cheese.png","cherries.png","chinese.png","chocolate-wrapper.png",
  "chocolate.png","chopstic-decorative.png","chopstick.png","cocktail.png","coconut-half.png",
  "coconut.png","cookie-chocolate.png","cookie.png","cooking-fork.png","cooking-knife-chopping.png",
  "cooking-knife.png","cooking-spatula.png","cooking-spoon.png","corn-dog.png","corn.png",
  "croissant.png","cup-coffee.png","cup-saucer.png","cup-tea.png","cup.png","cupcake.png",
  "cutting-board-japanese.png","cutting-board-round.png","cutting-board.png","dim-sum.png",
  "donut-chocolate.png","donut-sprinkles.png","donut.png","egg-cooked.png","egg-cup.png",
  "egg-half.png","egg.png","eggplant.png","fish-bones.png","fish.png","frappe.png",
  "fries-empty.png","fries.png","frikandel-speciaal.png","frying-pan-lid.png","frying-pan.png",
  "ginger-bread-cutter.png","ginger-bread.png","glass-wine.png","glass.png","grapes.png",
  "honey.png","hot-dog-raw.png","hot-dog.png","ice-cream-cne.png","ice-cream-cup.png",
  "ice-cream-scoop-chocolate.png","ice-cream-scoop-mint.png","ice-cream.png","knife-block.png",
  "leek.png","lemon-half.png","lemon.png","loaf-baguette.png","loaf-round.png","loaf.png",
  "lollypop.png","maki-roe.png","maki-salmon.png","maki-vegetable.png","meat-cooked.png",
  "meat-patty.png","meat-raw.png","meat-ribs.png","meat-sausage.png","meat-tenderizer.png",
  "mincemeat-pie.png","mortar-pestle.png","mortar.png","muffin.png","mug.png",
  "mushroom-half.png","mushroom.png","mussel-open.png","mussel.png","onion-half.png","onion.png",
  "orange.png","pan-stew.png","pan.png","pancakes.png","paprika-slice.png","paprika.png",
  "peanut-butter.png","pear-half.png","pear.png","pepper-mill.png","pepper.png","pie.png",
  "pineapple.png","pizza-box.png","pizza-cutter.png","pizza.png","plate-broken.png",
  "plate-deep.png","plate-dinner.png","plate-rectangle.png","plate-sauerkraut.png","plate.png",
  "popsicle-chocolate.png","popsicle-stick.png","popsicle.png","pot-lid.png","pot-stew-lid.png",
  "pot-stew.png","pot.png","pudding.png","pumpkin-basic.png","pumpkin.png","radish.png",
  "rice-ball.png","rollingPin.png","salad.png","sandwich.png","sausage-half.png","sausage.png",
  "shaker-pepper.png","shaker-salt.png","skewer-vegetables.png","skewer.png","soda-bottle.png",
  "soda-can-crushed.png","soda-can.png","soda-glass.png","soda.png","soy.png","steamer.png",
  "strawberry.png","styrofoam-dinner.png","styrofoam.png","sub.png","sundae.png",
  "sushi-egg.png","sushi-salmon.png","taco.png","tajine-lid.png","tajine.png",
  "tomato-slice.png","tomato.png","turkey.png","utensil-fork.png","utensil-knife.png",
  "utensil-spoon.png","waffle.png","watermelon.png","whipped-cream.png","whisk.png",
  "whole-ham.png","wholer-ham.png","wine-red.png","wine-white.png",
]);

/** Sensible default sprite per element — used when a mapping above
 *  references a file that doesn't actually exist on disk. */
const ELEMENT_FALLBACK: Record<string, string> = {
  fire:   "paprika.png",
  water:  "bottle-oil.png",
  earth:  "carrot.png",
  air:    "cauliflower.png",
  spirit: "candy-bar.png",
  shadow: "wine-red.png",
  gold:   "honey.png",
  wild:   "cocktail.png",
};

/** Resolve an ingredient id → URL with safe fallback. */
export function ingredientSpriteUrl(id: string, element?: string): string {
  const f = INGREDIENT_SPRITE[id];
  if (f && FK_FILES_AVAILABLE.has(f)) return spriteUrl(f);
  // Fall back to element default; otherwise to a generic bowl.
  const fb = element ? ELEMENT_FALLBACK[element] : undefined;
  return spriteUrl(fb && FK_FILES_AVAILABLE.has(fb) ? fb : "bowl.png");
}

/** Resolve a recipe id → URL with safe fallback. */
export function recipeSpriteUrl(id: string): string {
  const f = RECIPE_SPRITE[id];
  if (f && FK_FILES_AVAILABLE.has(f)) return spriteUrl(f);
  return spriteUrl("bottle-oil.png");
}
