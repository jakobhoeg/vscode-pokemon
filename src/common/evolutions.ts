/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Item-triggered evolutions: giving `item` to a `from` Pokémon turns it into `to`.
 *
 * Covers the "use item" evolutions (evolution stones, Auspicious/Malicious
 * Armor, apples, teapots, …) plus the classic "trade while holding" items
 * (Metal Coat, King's Rock, …) and the Linking Cord, so every item evolution
 * can be done just by handing over the item.
 *
 * Keys are pokemon-data.ts keys. Both sides must be registered there -
 * src/test/suite/evolutions.test.ts checks it.
 */

export interface ItemEvolution {
  from: string;
  to: string;
  item: string;
}

const TABLE: Array<[item: string, pairs: Array<[from: string, to: string]>]> = [
  [
    'fire_stone',
    [
      ['vulpix', 'ninetales'],
      ['growlithe', 'arcanine'],
      ['eevee', 'flareon'],
      ['pansear', 'simisear'],
      ['capsakid', 'scovillain'],
    ],
  ],
  [
    'water_stone',
    [
      ['poliwhirl', 'poliwrath'],
      ['shellder', 'cloyster'],
      ['staryu', 'starmie'],
      ['eevee', 'vaporeon'],
      ['lombre', 'ludicolo'],
      ['panpour', 'simipour'],
    ],
  ],
  [
    'thunder_stone',
    [
      ['pikachu', 'raichu'],
      ['pikachu_female', 'raichu'],
      ['eevee', 'jolteon'],
      ['eelektrik', 'eelektross'],
      ['charjabug', 'vikavolt'],
      ['magneton', 'magnezone'],
      ['nosepass', 'probopass'],
    ],
  ],
  [
    'leaf_stone',
    [
      ['gloom', 'vileplume'],
      ['weepinbell', 'victreebel'],
      ['exeggcute', 'exeggutor'],
      ['nuzleaf', 'shiftry'],
      ['pansage', 'simisage'],
      ['eevee', 'leafeon'],
    ],
  ],
  [
    'moon_stone',
    [
      ['nidorina', 'nidoqueen'],
      ['nidorino', 'nidoking'],
      ['clefairy', 'clefable'],
      ['jigglypuff', 'wigglytuff'],
      ['skitty', 'delcatty'],
      ['munna', 'musharna'],
    ],
  ],
  [
    'sun_stone',
    [
      ['gloom', 'bellossom'],
      ['sunkern', 'sunflora'],
      ['cottonee', 'whimsicott'],
      ['petilil', 'lilligant'],
      ['helioptile', 'heliolisk'],
    ],
  ],
  [
    'shiny_stone',
    [
      ['togetic', 'togekiss'],
      ['roselia', 'roserade'],
      ['minccino', 'cinccino'],
      ['floette', 'florges'],
      ['floette_blue', 'florges_blue'],
      ['floette_orange', 'florges_orange'],
      ['floette_red', 'florges_red'],
      ['floette_white', 'florges_white'],
      ['floette_yellow', 'florges_yellow'],
    ],
  ],
  [
    'dusk_stone',
    [
      ['murkrow', 'honchkrow'],
      ['misdreavus', 'mismagius'],
      ['lampent', 'chandelure'],
      ['doublade', 'aegislash'],
    ],
  ],
  [
    'dawn_stone',
    [
      ['kirlia', 'gallade'],
      ['snorunt', 'froslass'],
    ],
  ],
  [
    'ice_stone',
    [
      ['eevee', 'glaceon'],
      ['darumaka_galarian', 'darmanitan_galarian'],
      ['crabrawler', 'crabominable'],
    ],
  ],
  ['oval_stone', [['happiny', 'chansey']]],
  ['auspicious_armor', [['charcadet', 'armarouge']]],
  ['malicious_armor', [['charcadet', 'ceruledge']]],
  ['sweet_apple', [['applin', 'appletun']]],
  ['tart_apple', [['applin', 'flapple']]],
  ['syrupy_apple', [['applin', 'dipplin']]],
  ['cracked_pot', [['sinistea', 'polteageist']]],
  ['chipped_pot', [['sinistea', 'polteageist']]],
  ['unremarkable_teacup', [['poltchageist', 'sinistcha']]],
  ['masterpiece_teacup', [['poltchageist', 'sinistcha']]],
  ['black_augurite', [['scyther', 'kleavor']]],
  ['peat_block', [['ursaring', 'ursaluna']]],
  ['leaders_crest', [['bisharp', 'kingambit']]],
  ['scroll_of_darkness', [['kubfu', 'urshifu']]],
  ['scroll_of_waters', [['kubfu', 'urshifu_rapid_strike']]],
  [
    'metal_coat',
    [
      ['onix', 'steelix'],
      ['scyther', 'scizor'],
    ],
  ],
  [
    'kings_rock',
    [
      ['poliwhirl', 'politoed'],
      ['slowpoke', 'slowking'],
    ],
  ],
  ['dragon_scale', [['seadra', 'kingdra']]],
  ['up_grade', [['porygon', 'porygon2']]],
  ['dubious_disc', [['porygon2', 'porygonZ']]],
  ['protector', [['rhydon', 'rhyperior']]],
  ['electirizer', [['electabuzz', 'electivire']]],
  ['magmarizer', [['magmar', 'magmortar']]],
  ['reaper_cloth', [['dusclops', 'dusknoir']]],
  ['deep_sea_tooth', [['clamperl', 'huntail']]],
  ['deep_sea_scale', [['clamperl', 'gorebyss']]],
  ['razor_claw', [['sneasel', 'weavile']]],
  ['razor_fang', [['gligar', 'gliscor']]],
  ['prism_scale', [['feebas', 'milotic']]],
  ['whipped_dream', [['swirlix', 'slurpuff']]],
  ['sachet', [['spritzee', 'aromatisse']]],
  [
    'linking_cord',
    [
      ['kadabra', 'alakazam'],
      ['machoke', 'machamp'],
      ['graveler', 'golem'],
      ['haunter', 'gengar'],
    ],
  ],
  ['strawberry_sweet', [['milcery', 'alcremie']]],
];

export const ITEM_EVOLUTIONS: ItemEvolution[] = TABLE.flatMap(([item, pairs]) =>
  pairs.map(([from, to]) => ({ from, to, item })),
);

/** The key the Pokémon `from` evolves into when given `item`, if any. */
export function findEvolution(from: string, item: string): string | undefined {
  return ITEM_EVOLUTIONS.find((e) => e.from === from && e.item === item)?.to;
}

/** Every evolution `from` can reach with an item. */
export function evolutionsFor(from: string): ItemEvolution[] {
  return ITEM_EVOLUTIONS.filter((e) => e.from === from);
}

/** Every Pokémon that evolves with `item`. */
export function evolutionsWith(item: string): ItemEvolution[] {
  return ITEM_EVOLUTIONS.filter((e) => e.item === item);
}
