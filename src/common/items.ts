/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Items that can be fed to Pokémon (see "Feeding" in the README).
 *
 * Sprites live in media/items/<key>.png (30x30, taken from the PokéAPI item
 * sprites in sprites/sprites/items). Keep this table and that folder in sync -
 * src/test/suite/items.test.ts checks it.
 */

export enum ItemCategory {
  candy = 'candy',
  medicine = 'medicine',
  berry = 'berry',
  treat = 'treat',
  vitamin = 'vitamin',
  evolution = 'evolution',
}

export const enum ItemEffect {
  /** +levels */
  levelUp = 'level-up',
  /** restore HP (cosmetic flash) */
  heal = 'heal',
  /** +happiness */
  happiness = 'happiness',
  /** permanent speed boost */
  speed = 'speed',
  /** cosmetic stat up */
  stat = 'stat',
  /** evolves the Pokémon if it has an evolution for this item (see evolutions.ts) */
  evolve = 'evolve',
}

export interface ItemConfig {
  /** Display name */
  name: string;
  category: ItemCategory;
  effect: ItemEffect;
  /** How much the effect applies (levels, happiness points, speed %) */
  amount: number;
  /** Happiness gained on top of the effect (every snack makes them a bit happier) */
  happiness: number;
  /** Short text floated above the Pokémon when eaten */
  floatText: string;
}

export const ITEMS: Record<string, ItemConfig> = {
  // ----- candy -----------------------------------------------------------
  rare_candy: {
    name: 'Rare Candy',
    category: ItemCategory.candy,
    effect: ItemEffect.levelUp,
    amount: 1,
    happiness: 5,
    floatText: 'LV UP!',
  },
  exp_candy_xs: {
    name: 'Exp. Candy XS',
    category: ItemCategory.candy,
    effect: ItemEffect.levelUp,
    amount: 1,
    happiness: 3,
    floatText: 'LV UP!',
  },
  exp_candy_l: {
    name: 'Exp. Candy L',
    category: ItemCategory.candy,
    effect: ItemEffect.levelUp,
    amount: 3,
    happiness: 3,
    floatText: 'LV UP!',
  },
  // ----- medicine --------------------------------------------------------
  potion: {
    name: 'Potion',
    category: ItemCategory.medicine,
    effect: ItemEffect.heal,
    amount: 20,
    happiness: 1,
    floatText: '+20 HP',
  },
  super_potion: {
    name: 'Super Potion',
    category: ItemCategory.medicine,
    effect: ItemEffect.heal,
    amount: 60,
    happiness: 1,
    floatText: '+60 HP',
  },
  hyper_potion: {
    name: 'Hyper Potion',
    category: ItemCategory.medicine,
    effect: ItemEffect.heal,
    amount: 120,
    happiness: 1,
    floatText: '+120 HP',
  },
  max_potion: {
    name: 'Max Potion',
    category: ItemCategory.medicine,
    effect: ItemEffect.heal,
    amount: 999,
    happiness: 1,
    floatText: 'MAX HP',
  },
  full_restore: {
    name: 'Full Restore',
    category: ItemCategory.medicine,
    effect: ItemEffect.heal,
    amount: 999,
    happiness: 2,
    floatText: 'FULL HP',
  },
  revive: {
    name: 'Revive',
    category: ItemCategory.medicine,
    effect: ItemEffect.heal,
    amount: 50,
    happiness: 2,
    floatText: 'REVIVED',
  },
  max_revive: {
    name: 'Max Revive',
    category: ItemCategory.medicine,
    effect: ItemEffect.heal,
    amount: 999,
    happiness: 3,
    floatText: 'REVIVED',
  },
  // ----- berries ---------------------------------------------------------
  oran_berry: {
    name: 'Oran Berry',
    category: ItemCategory.berry,
    effect: ItemEffect.happiness,
    amount: 10,
    happiness: 0,
    floatText: '♥',
  },
  sitrus_berry: {
    name: 'Sitrus Berry',
    category: ItemCategory.berry,
    effect: ItemEffect.happiness,
    amount: 15,
    happiness: 0,
    floatText: '♥',
  },
  pecha_berry: {
    name: 'Pecha Berry',
    category: ItemCategory.berry,
    effect: ItemEffect.happiness,
    amount: 10,
    happiness: 0,
    floatText: '♥',
  },
  cheri_berry: {
    name: 'Cheri Berry',
    category: ItemCategory.berry,
    effect: ItemEffect.happiness,
    amount: 10,
    happiness: 0,
    floatText: '♥',
  },
  lum_berry: {
    name: 'Lum Berry',
    category: ItemCategory.berry,
    effect: ItemEffect.happiness,
    amount: 15,
    happiness: 0,
    floatText: '♥',
  },
  leppa_berry: {
    name: 'Leppa Berry',
    category: ItemCategory.berry,
    effect: ItemEffect.happiness,
    amount: 10,
    happiness: 0,
    floatText: '♥',
  },
  razz_berry: {
    name: 'Razz Berry',
    category: ItemCategory.berry,
    effect: ItemEffect.happiness,
    amount: 10,
    happiness: 0,
    floatText: '♥',
  },
  pinap_berry: {
    name: 'Pinap Berry',
    category: ItemCategory.berry,
    effect: ItemEffect.happiness,
    amount: 10,
    happiness: 0,
    floatText: '♥',
  },
  // ----- treats ----------------------------------------------------------
  lava_cookie: {
    name: 'Lava Cookie',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 20,
    happiness: 0,
    floatText: '♥♥',
  },
  old_gateau: {
    name: 'Old Gateau',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 20,
    happiness: 0,
    floatText: '♥♥',
  },
  casteliacone: {
    name: 'Casteliacone',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 20,
    happiness: 0,
    floatText: '♥♥',
  },
  lumiose_galette: {
    name: 'Lumiose Galette',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 20,
    happiness: 0,
    floatText: '♥♥',
  },
  shalour_sable: {
    name: 'Shalour Sable',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 20,
    happiness: 0,
    floatText: '♥♥',
  },
  big_malasada: {
    name: 'Big Malasada',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 20,
    happiness: 0,
    floatText: '♥♥',
  },
  pewter_crunchies: {
    name: 'Pewter Crunchies',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 20,
    happiness: 0,
    floatText: '♥♥',
  },
  rage_candy_bar: {
    name: 'Rage Candy Bar',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 20,
    happiness: 0,
    floatText: '♥♥',
  },
  sweet_heart: {
    name: 'Sweet Heart',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 30,
    happiness: 0,
    floatText: '♥♥♥',
  },
  moomoo_milk: {
    name: 'Moomoo Milk',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 15,
    happiness: 0,
    floatText: '♥',
  },
  lemonade: {
    name: 'Lemonade',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 15,
    happiness: 0,
    floatText: '♥',
  },
  soda_pop: {
    name: 'Soda Pop',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 10,
    happiness: 0,
    floatText: '♥',
  },
  fresh_water: {
    name: 'Fresh Water',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 10,
    happiness: 0,
    floatText: '♥',
  },
  honey: {
    name: 'Honey',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 15,
    happiness: 0,
    floatText: '♥',
  },
  sweet_apple: {
    // also evolves Applin into Appletun (evolutions.ts)
    name: 'Sweet Apple',
    category: ItemCategory.treat,
    effect: ItemEffect.happiness,
    amount: 15,
    happiness: 0,
    floatText: '♥',
  },
  // ----- vitamins --------------------------------------------------------
  carbos: {
    name: 'Carbos',
    category: ItemCategory.vitamin,
    effect: ItemEffect.speed,
    amount: 10,
    happiness: 2,
    floatText: 'SPEED UP!',
  },
  protein: {
    name: 'Protein',
    category: ItemCategory.vitamin,
    effect: ItemEffect.stat,
    amount: 10,
    happiness: 2,
    floatText: 'ATK UP!',
  },
  iron: {
    name: 'Iron',
    category: ItemCategory.vitamin,
    effect: ItemEffect.stat,
    amount: 10,
    happiness: 2,
    floatText: 'DEF UP!',
  },
  calcium: {
    name: 'Calcium',
    category: ItemCategory.vitamin,
    effect: ItemEffect.stat,
    amount: 10,
    happiness: 2,
    floatText: 'SP.ATK UP!',
  },
  zinc: {
    name: 'Zinc',
    category: ItemCategory.vitamin,
    effect: ItemEffect.stat,
    amount: 10,
    happiness: 2,
    floatText: 'SP.DEF UP!',
  },
  hp_up: {
    name: 'HP Up',
    category: ItemCategory.vitamin,
    effect: ItemEffect.stat,
    amount: 10,
    happiness: 2,
    floatText: 'HP UP!',
  },
  // ----- evolution items (see src/common/evolutions.ts) ------------------
  fire_stone: {
    name: 'Fire Stone',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  water_stone: {
    name: 'Water Stone',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  thunder_stone: {
    name: 'Thunder Stone',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  leaf_stone: {
    name: 'Leaf Stone',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  moon_stone: {
    name: 'Moon Stone',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  sun_stone: {
    name: 'Sun Stone',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  shiny_stone: {
    name: 'Shiny Stone',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  dusk_stone: {
    name: 'Dusk Stone',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  dawn_stone: {
    name: 'Dawn Stone',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  ice_stone: {
    name: 'Ice Stone',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  oval_stone: {
    name: 'Oval Stone',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  auspicious_armor: {
    name: 'Auspicious Armor',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  malicious_armor: {
    name: 'Malicious Armor',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  tart_apple: {
    name: 'Tart Apple',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  syrupy_apple: {
    name: 'Syrupy Apple',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  cracked_pot: {
    name: 'Cracked Pot',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  chipped_pot: {
    name: 'Chipped Pot',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  unremarkable_teacup: {
    name: 'Unremarkable Teacup',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  masterpiece_teacup: {
    name: 'Masterpiece Teacup',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  black_augurite: {
    name: 'Black Augurite',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  peat_block: {
    name: 'Peat Block',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  leaders_crest: {
    name: "Leader's Crest",
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  scroll_of_darkness: {
    name: 'Scroll of Darkness',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  scroll_of_waters: {
    name: 'Scroll of Waters',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  metal_coat: {
    name: 'Metal Coat',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  kings_rock: {
    name: "King's Rock",
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  dragon_scale: {
    name: 'Dragon Scale',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  up_grade: {
    name: 'Up-Grade',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  dubious_disc: {
    name: 'Dubious Disc',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  protector: {
    name: 'Protector',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  electirizer: {
    name: 'Electirizer',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  magmarizer: {
    name: 'Magmarizer',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  reaper_cloth: {
    name: 'Reaper Cloth',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  deep_sea_tooth: {
    name: 'Deep Sea Tooth',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  deep_sea_scale: {
    name: 'Deep Sea Scale',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  razor_claw: {
    name: 'Razor Claw',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  razor_fang: {
    name: 'Razor Fang',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  prism_scale: {
    name: 'Prism Scale',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  whipped_dream: {
    name: 'Whipped Dream',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  sachet: {
    name: 'Sachet',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  linking_cord: {
    name: 'Linking Cord',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
  strawberry_sweet: {
    name: 'Strawberry Sweet',
    category: ItemCategory.evolution,
    effect: ItemEffect.evolve,
    amount: 0,
    happiness: 5,
    floatText: 'EVOLVED!',
  },
};

export type ItemKey = keyof typeof ITEMS;

export const DEFAULT_FEED_ITEM: ItemKey = 'oran_berry';

export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  [ItemCategory.candy]: 'Candy',
  [ItemCategory.medicine]: 'Medicine',
  [ItemCategory.berry]: 'Berries',
  [ItemCategory.treat]: 'Treats',
  [ItemCategory.vitamin]: 'Vitamins',
  [ItemCategory.evolution]: 'Evolution items',
};

export function getItem(key: string): ItemConfig | undefined {
  return ITEMS[key];
}

export function getAllItemKeys(): ItemKey[] {
  return Object.keys(ITEMS);
}

export function itemSpriteFile(key: string): string {
  return `items/${key}.png`;
}

/** Maximum level / happiness a Pokémon can reach by feeding. */
export const MAX_LEVEL = 100;
export const MAX_HAPPINESS = 255;
export const MAX_SPEED_BOOST = 1.5;
export const DEFAULT_LEVEL = 5;
export const DEFAULT_HAPPINESS = 70;
