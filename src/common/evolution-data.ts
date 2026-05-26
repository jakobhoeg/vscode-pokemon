// Evolution chains and XP growth rates for the 249 species in POKEMON_DATA.
//
// Growth-rate formulas (canonical, see https://bulbapedia.bulbagarden.net/wiki/Experience):
//   fast        : (4/5) * n^3
//   medium-fast : n^3
//   medium-slow : (6/5)n^3 - 15n^2 + 100n - 140
//   slow        : (5/4) * n^3
//   (erratic and fluctuating exist in canon but no Gen1/Gen2 species ships with them in this set.)
//
// Evolution methods that aren't level-up (item, trade, friendship, time-of-day) are mapped to a
// canonical level at which the evolution would typically happen in the games, per the user-confirmed
// simplification in the plan. We only encode the *first* evolution path here (e.g., Eevee -> Vaporeon);
// branching evolutions are out of scope.

export type GrowthRate = 'fast' | 'medium-fast' | 'medium-slow' | 'slow';

export interface EvolutionInfo {
  growthRate: GrowthRate;
  evolvesTo?: {
    type: string;
    level: number;
  };
}

export const EVOLUTION_DATA: Record<string, EvolutionInfo> = {
  // --- Gen 1 ---
  bulbasaur: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'ivysaur', level: 16 },
  },
  ivysaur: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'venusaur', level: 32 },
  },
  venusaur: { growthRate: 'medium-slow' },
  charmander: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'charmeleon', level: 16 },
  },
  charmeleon: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'charizard', level: 36 },
  },
  charizard: { growthRate: 'medium-slow' },
  squirtle: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'wartortle', level: 16 },
  },
  wartortle: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'blastoise', level: 36 },
  },
  blastoise: { growthRate: 'medium-slow' },
  caterpie: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'metapod', level: 7 },
  },
  metapod: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'butterfree', level: 10 },
  },
  butterfree: { growthRate: 'medium-fast' },
  weedle: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'kakuna', level: 7 },
  },
  kakuna: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'beedrill', level: 10 },
  },
  beedrill: { growthRate: 'medium-fast' },
  pidgey: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'pidgeotto', level: 18 },
  },
  pidgeotto: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'pidgeot', level: 36 },
  },
  pidgeot: { growthRate: 'medium-slow' },
  rattata: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'raticate', level: 20 },
  },
  raticate: { growthRate: 'medium-fast' },
  spearow: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'fearow', level: 20 },
  },
  fearow: { growthRate: 'medium-fast' },
  ekans: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'arbok', level: 22 },
  },
  arbok: { growthRate: 'medium-fast' },
  pikachu: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'raichu', level: 20 },
  }, // thunder stone
  raichu: { growthRate: 'medium-fast' },
  sandshrew: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'sandslash', level: 22 },
  },
  sandslash: { growthRate: 'medium-fast' },
  nidoran_female: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'nidorina', level: 16 },
  },
  nidorina: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'nidoqueen', level: 28 },
  }, // moon stone
  nidoqueen: { growthRate: 'medium-slow' },
  nidoran_male: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'nidorino', level: 16 },
  },
  nidorino: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'nidoking', level: 28 },
  }, // moon stone
  nidoking: { growthRate: 'medium-slow' },
  clefairy: {
    growthRate: 'fast',
    evolvesTo: { type: 'clefable', level: 28 },
  }, // moon stone
  clefable: { growthRate: 'fast' },
  vulpix: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'ninetales', level: 20 },
  }, // fire stone
  ninetales: { growthRate: 'medium-fast' },
  jigglypuff: {
    growthRate: 'fast',
    evolvesTo: { type: 'wigglytuff', level: 28 },
  }, // moon stone
  wigglytuff: { growthRate: 'fast' },
  zubat: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'golbat', level: 22 },
  },
  golbat: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'crobat', level: 36 },
  }, // friendship
  oddish: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'gloom', level: 21 },
  },
  gloom: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'vileplume', level: 28 },
  }, // leaf stone
  vileplume: { growthRate: 'medium-slow' },
  paras: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'parasect', level: 24 },
  },
  parasect: { growthRate: 'medium-fast' },
  venonat: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'venomoth', level: 31 },
  },
  venomoth: { growthRate: 'medium-fast' },
  diglett: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'dugtrio', level: 26 },
  },
  dugtrio: { growthRate: 'medium-fast' },
  meowth: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'persian', level: 28 },
  },
  persian: { growthRate: 'medium-fast' },
  psyduck: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'golduck', level: 33 },
  },
  golduck: { growthRate: 'medium-fast' },
  mankey: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'primeape', level: 28 },
  },
  primeape: { growthRate: 'medium-fast' },
  growlithe: {
    growthRate: 'slow',
    evolvesTo: { type: 'arcanine', level: 30 },
  }, // fire stone
  arcanine: { growthRate: 'slow' },
  poliwag: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'poliwhirl', level: 25 },
  },
  poliwhirl: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'poliwrath', level: 30 },
  }, // water stone
  poliwrath: { growthRate: 'medium-slow' },
  abra: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'kadabra', level: 16 },
  },
  kadabra: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'alakazam', level: 36 },
  }, // trade
  alakazam: { growthRate: 'medium-slow' },
  machop: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'machoke', level: 28 },
  },
  machoke: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'machamp', level: 38 },
  }, // trade
  machamp: { growthRate: 'medium-slow' },
  bellsprout: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'weepinbell', level: 21 },
  },
  weepinbell: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'victreebel', level: 30 },
  }, // leaf stone
  victreebel: { growthRate: 'medium-slow' },
  tentacool: {
    growthRate: 'slow',
    evolvesTo: { type: 'tentacruel', level: 30 },
  },
  tentacruel: { growthRate: 'slow' },
  geodude: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'graveler', level: 25 },
  },
  graveler: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'golem', level: 38 },
  }, // trade
  golem: { growthRate: 'medium-slow' },
  ponyta: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'rapidash', level: 40 },
  },
  rapidash: { growthRate: 'medium-fast' },
  slowpoke: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'slowbro', level: 37 },
  },
  slowbro: { growthRate: 'medium-fast' },
  magnemite: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'magneton', level: 30 },
  },
  magneton: { growthRate: 'medium-fast' },
  farfetchd: { growthRate: 'medium-fast' },
  doduo: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'dodrio', level: 31 },
  },
  dodrio: { growthRate: 'medium-fast' },
  seel: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'dewgong', level: 34 },
  },
  dewgong: { growthRate: 'medium-fast' },
  grimer: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'muk', level: 38 },
  },
  muk: { growthRate: 'medium-fast' },
  shellder: {
    growthRate: 'slow',
    evolvesTo: { type: 'cloyster', level: 30 },
  }, // water stone
  cloyster: { growthRate: 'slow' },
  gastly: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'haunter', level: 25 },
  },
  haunter: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'gengar', level: 38 },
  }, // trade
  gengar: { growthRate: 'medium-slow' },
  onix: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'steelix', level: 36 },
  }, // trade w/ metal coat
  drowzee: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'hypno', level: 26 },
  },
  hypno: { growthRate: 'medium-fast' },
  krabby: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'kingler', level: 28 },
  },
  kingler: { growthRate: 'medium-fast' },
  voltorb: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'electrode', level: 30 },
  },
  electrode: { growthRate: 'medium-fast' },
  exeggcute: {
    growthRate: 'slow',
    evolvesTo: { type: 'exeggutor', level: 30 },
  }, // leaf stone
  exeggutor: { growthRate: 'slow' },
  cubone: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'marowak', level: 28 },
  },
  marowak: { growthRate: 'medium-fast' },
  hitmonlee: { growthRate: 'medium-fast' },
  hitmonchan: { growthRate: 'medium-fast' },
  lickitung: { growthRate: 'medium-fast' },
  koffing: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'weezing', level: 35 },
  },
  weezing: { growthRate: 'medium-fast' },
  rhyhorn: { growthRate: 'slow', evolvesTo: { type: 'rhydon', level: 42 } },
  rhydon: { growthRate: 'slow' },
  chansey: { growthRate: 'fast', evolvesTo: { type: 'blissey', level: 30 } }, // friendship
  tangela: { growthRate: 'medium-fast' },
  kangaskhan: { growthRate: 'medium-slow' },
  horsea: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'seadra', level: 32 },
  },
  seadra: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'kingdra', level: 42 },
  }, // trade w/ dragonscale
  goldeen: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'seaking', level: 33 },
  },
  seaking: { growthRate: 'medium-fast' },
  staryu: { growthRate: 'slow', evolvesTo: { type: 'starmie', level: 30 } }, // water stone
  starmie: { growthRate: 'slow' },
  mrmime: { growthRate: 'medium-fast' },
  scyther: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'scizor', level: 30 },
  }, // trade w/ metal coat
  jynx: { growthRate: 'medium-fast' },
  electabuzz: { growthRate: 'medium-fast' },
  magmar: { growthRate: 'medium-fast' },
  pinsir: { growthRate: 'slow' },
  tauros: { growthRate: 'slow' },
  magikarp: {
    growthRate: 'slow',
    evolvesTo: { type: 'gyarados', level: 20 },
  },
  gyarados: { growthRate: 'slow' },
  lapras: { growthRate: 'slow' },
  ditto: { growthRate: 'medium-fast' },
  eevee: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'vaporeon', level: 25 },
  }, // water stone (default branch)
  vaporeon: { growthRate: 'medium-fast' },
  jolteon: { growthRate: 'medium-fast' },
  flareon: { growthRate: 'medium-fast' },
  porygon: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'porygon2', level: 30 },
  }, // trade w/ upgrade
  omanyte: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'omastar', level: 40 },
  },
  omastar: { growthRate: 'medium-fast' },
  kabuto: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'kabutops', level: 40 },
  },
  kabutops: { growthRate: 'medium-fast' },
  aerodactyl: { growthRate: 'slow' },
  snorlax: { growthRate: 'slow' },
  articuno: { growthRate: 'slow' },
  zapdos: { growthRate: 'slow' },
  moltres: { growthRate: 'slow' },
  dratini: {
    growthRate: 'slow',
    evolvesTo: { type: 'dragonair', level: 30 },
  },
  dragonair: {
    growthRate: 'slow',
    evolvesTo: { type: 'dragonite', level: 55 },
  },
  dragonite: { growthRate: 'slow' },
  mewtwo: { growthRate: 'slow' },
  mew: { growthRate: 'medium-slow' },

  // --- Gen 2 ---
  chikorita: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'bayleef', level: 16 },
  },
  bayleef: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'meganium', level: 32 },
  },
  meganium: { growthRate: 'medium-slow' },
  cyndaquil: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'quilava', level: 14 },
  },
  quilava: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'typhlosion', level: 36 },
  },
  typhlosion: { growthRate: 'medium-slow' },
  totodile: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'croconaw', level: 18 },
  },
  croconaw: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'feraligatr', level: 30 },
  },
  feraligatr: { growthRate: 'medium-slow' },
  sentret: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'furret', level: 15 },
  },
  furret: { growthRate: 'medium-fast' },
  hoothoot: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'noctowl', level: 20 },
  },
  noctowl: { growthRate: 'medium-fast' },
  ledyba: { growthRate: 'fast', evolvesTo: { type: 'ledian', level: 18 } },
  ledian: { growthRate: 'fast' },
  spinarak: { growthRate: 'fast', evolvesTo: { type: 'ariados', level: 22 } },
  ariados: { growthRate: 'fast' },
  crobat: { growthRate: 'medium-fast' },
  chinchou: { growthRate: 'slow', evolvesTo: { type: 'lanturn', level: 27 } },
  lanturn: { growthRate: 'slow' },
  pichu: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'pikachu', level: 10 },
  }, // friendship (baby)
  cleffa: { growthRate: 'fast', evolvesTo: { type: 'clefairy', level: 10 } }, // friendship (baby)
  igglybuff: {
    growthRate: 'fast',
    evolvesTo: { type: 'jigglypuff', level: 10 },
  }, // friendship (baby)
  togepi: { growthRate: 'fast', evolvesTo: { type: 'togetic', level: 10 } }, // friendship (baby)
  togetic: { growthRate: 'fast' },
  natu: { growthRate: 'medium-fast', evolvesTo: { type: 'xatu', level: 25 } },
  xatu: { growthRate: 'medium-fast' },
  mareep: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'flaaffy', level: 15 },
  },
  flaaffy: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'ampharos', level: 30 },
  },
  ampharos: { growthRate: 'medium-slow' },
  bellossom: { growthRate: 'medium-slow' },
  marill: { growthRate: 'fast', evolvesTo: { type: 'azumarill', level: 18 } },
  azumarill: { growthRate: 'fast' },
  sudowoodo: { growthRate: 'medium-fast' },
  politoed: { growthRate: 'medium-slow' },
  hoppip: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'skiploom', level: 18 },
  },
  skiploom: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'jumpluff', level: 27 },
  },
  jumpluff: { growthRate: 'medium-slow' },
  aipom: { growthRate: 'fast' },
  sunkern: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'sunflora', level: 25 },
  }, // sun stone
  sunflora: { growthRate: 'medium-slow' },
  yanma: { growthRate: 'medium-fast' },
  wooper: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'quagsire', level: 20 },
  },
  quagsire: { growthRate: 'medium-fast' },
  espeon: { growthRate: 'medium-fast' },
  umbreon: { growthRate: 'medium-fast' },
  murkrow: { growthRate: 'medium-slow' },
  slowking: { growthRate: 'medium-fast' },
  misdreavus: { growthRate: 'fast' },
  wobbuffet: { growthRate: 'medium-fast' },
  girafarig: { growthRate: 'medium-fast' },
  pineco: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'forretress', level: 31 },
  },
  forretress: { growthRate: 'medium-fast' },
  dunsparce: { growthRate: 'medium-fast' },
  gligar: { growthRate: 'medium-slow' },
  steelix: { growthRate: 'medium-fast' },
  snubbull: {
    growthRate: 'fast',
    evolvesTo: { type: 'granbull', level: 23 },
  },
  granbull: { growthRate: 'fast' },
  qwilfish: { growthRate: 'medium-fast' },
  scizor: { growthRate: 'medium-fast' },
  shuckle: { growthRate: 'medium-slow' },
  heracross: { growthRate: 'slow' },
  sneasel: { growthRate: 'medium-slow' },
  teddiursa: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'ursaring', level: 30 },
  },
  ursaring: { growthRate: 'medium-fast' },
  slugma: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'magcargo', level: 38 },
  },
  magcargo: { growthRate: 'medium-fast' },
  swinub: { growthRate: 'slow', evolvesTo: { type: 'piloswine', level: 33 } },
  piloswine: { growthRate: 'slow' },
  corsola: { growthRate: 'fast' },
  remoraid: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'octillery', level: 25 },
  },
  octillery: { growthRate: 'medium-fast' },
  delibird: { growthRate: 'fast' },
  mantine: { growthRate: 'slow' },
  skarmory: { growthRate: 'slow' },
  houndour: {
    growthRate: 'slow',
    evolvesTo: { type: 'houndoom', level: 24 },
  },
  houndoom: { growthRate: 'slow' },
  kingdra: { growthRate: 'medium-fast' },
  phanpy: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'donphan', level: 25 },
  },
  donphan: { growthRate: 'medium-fast' },
  porygon2: { growthRate: 'medium-fast' },
  stantler: { growthRate: 'slow' },
  smeargle: { growthRate: 'fast' },
  tyrogue: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'hitmonlee', level: 20 },
  }, // stat-based, default
  hitmontop: { growthRate: 'medium-fast' },
  smoochum: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'jynx', level: 30 },
  },
  elekid: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'electabuzz', level: 30 },
  },
  magby: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'magmar', level: 30 },
  },
  miltank: { growthRate: 'slow' },
  blissey: { growthRate: 'fast' },
  raikou: { growthRate: 'slow' },
  entei: { growthRate: 'slow' },
  suicune: { growthRate: 'slow' },
  larvitar: { growthRate: 'slow', evolvesTo: { type: 'pupitar', level: 30 } },
  pupitar: {
    growthRate: 'slow',
    evolvesTo: { type: 'tyranitar', level: 55 },
  },
  tyranitar: { growthRate: 'slow' },
  lugia: { growthRate: 'slow' },
  hooh: { growthRate: 'slow' },

  // --- Gen 3 ---
  treecko: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'grovyle', level: 16 },
  },
  grovyle: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'sceptile', level: 36 },
  },
  sceptile: { growthRate: 'medium-slow' },
  torchic: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'combusken', level: 16 },
  },
  combusken: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'blaziken', level: 36 },
  },
  blaziken: { growthRate: 'medium-slow' },
  mudkip: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'marshtomp', level: 16 },
  },
  marshtomp: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'swampert', level: 36 },
  },
  swampert: { growthRate: 'medium-slow' },
  poochyena: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'mightyena', level: 18 },
  },
  mightyena: { growthRate: 'medium-fast' },
  zigzagoon: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'linoone', level: 20 },
  },
  linoone: { growthRate: 'medium-fast' },
  wurmple: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'silcoon', level: 7 },
  }, // branching; default Silcoon path
  silcoon: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'beautifly', level: 10 },
  },
  beautifly: { growthRate: 'medium-fast' },
  cascoon: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'dustox', level: 10 },
  },
  dustox: { growthRate: 'medium-fast' },
  lotad: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'lombre', level: 14 },
  },
  lombre: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'ludicolo', level: 30 },
  }, // water stone
  ludicolo: { growthRate: 'medium-slow' },
  seedot: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'nuzleaf', level: 14 },
  },
  nuzleaf: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'shiftry', level: 30 },
  }, // leaf stone
  shiftry: { growthRate: 'medium-slow' },
  taillow: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'swellow', level: 22 },
  },
  swellow: { growthRate: 'medium-slow' },
  wingull: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'pelipper', level: 25 },
  },
  pelipper: { growthRate: 'medium-fast' },
  ralts: {
    growthRate: 'slow',
    evolvesTo: { type: 'kirlia', level: 20 },
  },
  kirlia: {
    growthRate: 'slow',
    evolvesTo: { type: 'gardevoir', level: 30 },
  },
  gardevoir: { growthRate: 'slow' },
  surskit: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'masquerain', level: 22 },
  },
  masquerain: { growthRate: 'medium-fast' },
  shroomish: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'breloom', level: 23 },
  },
  breloom: { growthRate: 'medium-fast' },
  slakoth: {
    growthRate: 'slow',
    evolvesTo: { type: 'vigoroth', level: 18 },
  },
  vigoroth: {
    growthRate: 'slow',
    evolvesTo: { type: 'slaking', level: 36 },
  },
  slaking: { growthRate: 'slow' },
  nincada: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'ninjask', level: 20 },
  },
  ninjask: { growthRate: 'medium-fast' },
  shedinja: { growthRate: 'medium-fast' },
  whismur: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'loudred', level: 20 },
  },
  loudred: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'exploud', level: 40 },
  },
  exploud: { growthRate: 'medium-slow' },
  makuhita: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'hariyama', level: 24 },
  },
  hariyama: { growthRate: 'medium-fast' },
  azurill: {
    growthRate: 'fast',
    evolvesTo: { type: 'marill', level: 10 },
  }, // friendship
  nosepass: { growthRate: 'medium-fast' },
  skitty: {
    growthRate: 'fast',
    evolvesTo: { type: 'delcatty', level: 25 },
  }, // moon stone
  delcatty: { growthRate: 'fast' },
  sableye: { growthRate: 'medium-slow' },
  mawile: { growthRate: 'fast' },
  aron: {
    growthRate: 'slow',
    evolvesTo: { type: 'lairon', level: 32 },
  },
  lairon: {
    growthRate: 'slow',
    evolvesTo: { type: 'aggron', level: 42 },
  },
  aggron: { growthRate: 'slow' },
  meditite: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'medicham', level: 37 },
  },
  medicham: { growthRate: 'medium-fast' },
  electrike: {
    growthRate: 'slow',
    evolvesTo: { type: 'manectric', level: 26 },
  },
  manectric: { growthRate: 'slow' },
  plusle: { growthRate: 'medium-fast' },
  minun: { growthRate: 'medium-fast' },
  volbeat: { growthRate: 'medium-fast' },
  illumise: { growthRate: 'medium-fast' },
  roselia: { growthRate: 'medium-slow' },
  gulpin: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'swalot', level: 26 },
  },
  swalot: { growthRate: 'medium-fast' },
  carvanha: {
    growthRate: 'slow',
    evolvesTo: { type: 'sharpedo', level: 30 },
  },
  sharpedo: { growthRate: 'slow' },
  wailmer: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'wailord', level: 40 },
  },
  wailord: { growthRate: 'medium-fast' },
  numel: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'camerupt', level: 33 },
  },
  camerupt: { growthRate: 'medium-fast' },
  torkoal: { growthRate: 'medium-fast' },
  spoink: {
    growthRate: 'fast',
    evolvesTo: { type: 'grumpig', level: 32 },
  },
  grumpig: { growthRate: 'fast' },
  spinda: { growthRate: 'fast' },
  trapinch: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'vibrava', level: 35 },
  },
  vibrava: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'flygon', level: 45 },
  },
  flygon: { growthRate: 'medium-slow' },
  cacnea: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'cacturne', level: 32 },
  },
  cacturne: { growthRate: 'medium-slow' },
  swablu: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'altaria', level: 35 },
  },
  altaria: { growthRate: 'medium-fast' },
  zangoose: { growthRate: 'medium-fast' },
  seviper: { growthRate: 'medium-fast' },
  lunatone: { growthRate: 'fast' },
  solrock: { growthRate: 'fast' },
  barboach: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'whiscash', level: 30 },
  },
  whiscash: { growthRate: 'medium-fast' },
  corphish: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'crawdaunt', level: 30 },
  },
  crawdaunt: { growthRate: 'medium-fast' },
  baltoy: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'claydol', level: 36 },
  },
  claydol: { growthRate: 'medium-fast' },
  lileep: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'cradily', level: 40 },
  },
  cradily: { growthRate: 'medium-fast' },
  anorith: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'armaldo', level: 40 },
  },
  armaldo: { growthRate: 'medium-fast' },
  feebas: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'milotic', level: 22 },
  }, // beauty / prism scale
  milotic: { growthRate: 'medium-fast' },
  castform: { growthRate: 'medium-fast' },
  kecleon: { growthRate: 'medium-slow' },
  shuppet: {
    growthRate: 'fast',
    evolvesTo: { type: 'banette', level: 37 },
  },
  banette: { growthRate: 'fast' },
  duskull: {
    growthRate: 'fast',
    evolvesTo: { type: 'dusclops', level: 37 },
  },
  dusclops: { growthRate: 'fast' },
  tropius: { growthRate: 'slow' },
  chimecho: { growthRate: 'fast' },
  absol: { growthRate: 'medium-slow' },
  wynaut: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'wobbuffet_male', level: 15 },
  }, // POKEMON_DATA only carries gendered variants; pick male as the default branch
  snorunt: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'glalie', level: 42 },
  },
  glalie: { growthRate: 'medium-fast' },
  spheal: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'sealeo', level: 32 },
  },
  sealeo: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'walrein', level: 44 },
  },
  walrein: { growthRate: 'medium-slow' },
  clamperl: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'huntail', level: 30 },
  }, // trade w/ deepseatooth (default branch)
  huntail: { growthRate: 'medium-fast' },
  gorebyss: { growthRate: 'medium-fast' },
  relicanth: { growthRate: 'slow' },
  luvdisc: { growthRate: 'fast' },
  bagon: {
    growthRate: 'slow',
    evolvesTo: { type: 'shelgon', level: 30 },
  },
  shelgon: {
    growthRate: 'slow',
    evolvesTo: { type: 'salamence', level: 50 },
  },
  salamence: { growthRate: 'slow' },
  beldum: {
    growthRate: 'slow',
    evolvesTo: { type: 'metang', level: 20 },
  },
  metang: {
    growthRate: 'slow',
    evolvesTo: { type: 'metagross', level: 45 },
  },
  metagross: { growthRate: 'slow' },
  regirock: { growthRate: 'slow' },
  regice: { growthRate: 'slow' },
  registeel: { growthRate: 'slow' },
  latias: { growthRate: 'slow' },
  latios: { growthRate: 'slow' },
  kyogre: { growthRate: 'slow' },
  groudon: { growthRate: 'slow' },
  rayquaza: { growthRate: 'slow' },
  jirachi: { growthRate: 'slow' },
  deoxys: { growthRate: 'slow' },
  deoxys_speed: { growthRate: 'slow' },
  deoxys_attack: { growthRate: 'slow' },
  deoxys_defense: { growthRate: 'slow' },

  // --- Gen 4 ---
  turtwig: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'grotle', level: 18 },
  },
  grotle: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'torterra', level: 32 },
  },
  torterra: { growthRate: 'medium-slow' },
  chimchar: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'monferno', level: 14 },
  },
  monferno: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'infernape', level: 36 },
  },
  infernape: { growthRate: 'medium-slow' },
  piplup: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'prinplup', level: 16 },
  },
  prinplup: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'empoleon', level: 36 },
  },
  empoleon: { growthRate: 'medium-slow' },
  starly: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'staravia', level: 14 },
  },
  staravia: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'staraptor', level: 34 },
  },
  staraptor: { growthRate: 'medium-slow' },
  bidoof: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'bibarel', level: 15 },
  },
  bibarel: { growthRate: 'medium-fast' },
  kricketot: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'kricketune', level: 10 },
  },
  kricketune: { growthRate: 'medium-fast' },
  shinx: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'luxio', level: 15 },
  },
  luxio: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'luxray', level: 30 },
  },
  luxray: { growthRate: 'medium-slow' },
  budew: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'roselia', level: 10 },
  }, // friendship day
  roserade: { growthRate: 'medium-slow' },
  cranidos: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'rampardos', level: 30 },
  },
  rampardos: { growthRate: 'medium-fast' },
  shieldon: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'bastiodon', level: 30 },
  },
  bastiodon: { growthRate: 'medium-fast' },
  burmy_plant: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'wormadam_plant', level: 20 },
  },
  burmy_sandy: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'wormadam_sandy', level: 20 },
  },
  burmy_trash: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'wormadam_trash', level: 20 },
  },
  wormadam_plant: { growthRate: 'medium-fast' },
  wormadam_sandy: { growthRate: 'medium-fast' },
  wormadam_trash: { growthRate: 'medium-fast' },
  mothim: { growthRate: 'medium-fast' },
  combee_male: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'vespiquen', level: 21 },
  },
  combee_female: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'vespiquen', level: 21 },
  },
  vespiquen: { growthRate: 'medium-slow' },
  pachirisu: { growthRate: 'fast' },
  buizel: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'floatzel', level: 26 },
  },
  floatzel: { growthRate: 'medium-fast' },
  cherubi: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'cherrim', level: 25 },
  },
  cherrim: { growthRate: 'medium-fast' },
  shellos_west: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'gastrodon_west', level: 30 },
  },
  shellos_east: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'gastrodon_east', level: 30 },
  },
  gastrodon_west: { growthRate: 'medium-fast' },
  gastrodon_east: { growthRate: 'medium-fast' },
  ambipom: { growthRate: 'fast' },
  drifloon: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'drifblim', level: 28 },
  },
  drifblim: { growthRate: 'medium-fast' },
  buneary: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'lopunny', level: 10 },
  }, // friendship
  lopunny: { growthRate: 'medium-fast' },
  mismagius: { growthRate: 'fast' },
  honchkrow: { growthRate: 'medium-slow' },
  glameow: {
    growthRate: 'fast',
    evolvesTo: { type: 'purugly', level: 38 },
  },
  purugly: { growthRate: 'fast' },
  chingling: {
    growthRate: 'fast',
    evolvesTo: { type: 'chimecho', level: 20 },
  }, // friendship night
  stunky: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'skuntank', level: 34 },
  },
  skuntank: { growthRate: 'medium-fast' },
  bronzor: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'bronzong', level: 33 },
  },
  bronzong: { growthRate: 'medium-fast' },
  bonsly: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'sudowoodo', level: 10 },
  }, // move mimic
  mimeJr: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'mrmime', level: 10 },
  }, // move mimic
  happiny: {
    growthRate: 'fast',
    evolvesTo: { type: 'chansey', level: 10 },
  }, // oval stone day
  chatot: { growthRate: 'medium-slow' },
  spiritomb: { growthRate: 'medium-fast' },
  gible: {
    growthRate: 'slow',
    evolvesTo: { type: 'gabite', level: 24 },
  },
  gible_female: {
    growthRate: 'slow',
    evolvesTo: { type: 'gabite_female', level: 24 },
  },
  gabite: {
    growthRate: 'slow',
    evolvesTo: { type: 'garchomp', level: 48 },
  },
  gabite_female: {
    growthRate: 'slow',
    evolvesTo: { type: 'garchomp_female', level: 48 },
  },
  garchomp: { growthRate: 'slow' },
  garchomp_female: { growthRate: 'slow' },
  munchlax: {
    growthRate: 'slow',
    evolvesTo: { type: 'snorlax', level: 10 },
  }, // friendship
  riolu: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'lucario', level: 10 },
  }, // friendship day
  lucario: { growthRate: 'medium-slow' },
  hippopotas_male: {
    growthRate: 'slow',
    evolvesTo: { type: 'hippowdon_male', level: 34 },
  },
  hippopotas_female: {
    growthRate: 'slow',
    evolvesTo: { type: 'hippowdon_female', level: 34 },
  },
  hippowdon_male: { growthRate: 'slow' },
  hippowdon_female: { growthRate: 'slow' },
  skorupi: {
    growthRate: 'medium-slow',
    evolvesTo: { type: 'drapion', level: 40 },
  },
  drapion: { growthRate: 'medium-slow' },
  croagunk: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'toxicroak', level: 37 },
  },
  toxicroak: { growthRate: 'medium-fast' },
  carnivine: { growthRate: 'slow' },
  finneon: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'lumineon', level: 31 },
  },
  lumineon: { growthRate: 'medium-fast' },
  mantyke: {
    growthRate: 'slow',
    evolvesTo: { type: 'mantine', level: 10 },
  }, // with remoraid in party
  snover: {
    growthRate: 'slow',
    evolvesTo: { type: 'abomasnow', level: 40 },
  },
  abomasnow: { growthRate: 'slow' },
  weavile: { growthRate: 'medium-slow' },
  magnezone: { growthRate: 'medium-fast' },
  lickilicky: { growthRate: 'medium-fast' },
  rhyperior: { growthRate: 'slow' },
  tangrowth: { growthRate: 'medium-fast' },
  electivire: { growthRate: 'medium-fast' },
  magmortar: { growthRate: 'medium-fast' },
  togekiss: { growthRate: 'fast' },
  yanmega: { growthRate: 'medium-fast' },
  leafeon: { growthRate: 'medium-fast' },
  glaceon: { growthRate: 'medium-fast' },
  gliscor: { growthRate: 'medium-slow' },
  mamoswine: { growthRate: 'slow' },
  porygonZ: { growthRate: 'medium-fast' },
  gallade: { growthRate: 'slow' },
  probopass: { growthRate: 'medium-fast' },
  dusknoir: { growthRate: 'fast' },
  froslass: { growthRate: 'medium-fast' },
  rotom: { growthRate: 'medium-fast' },
  rotom_heat: { growthRate: 'medium-fast' },
  rotom_wash: { growthRate: 'medium-fast' },
  rotom_frost: { growthRate: 'medium-fast' },
  rotom_fan: { growthRate: 'medium-fast' },
  rotom_mow: { growthRate: 'medium-fast' },
  uxie: { growthRate: 'slow' },
  mesprit: { growthRate: 'slow' },
  azelf: { growthRate: 'slow' },
  dialga: { growthRate: 'slow' },
  palkia: { growthRate: 'slow' },
  heatran: { growthRate: 'slow' },
  regigigas: { growthRate: 'slow' },
  giratina: { growthRate: 'slow' },
  giratina_origin: { growthRate: 'slow' },
  cresselia: { growthRate: 'slow' },
  phione: { growthRate: 'slow' },
  manaphy: { growthRate: 'slow' },
  darkrai: { growthRate: 'slow' },
  shaymin: { growthRate: 'medium-slow' },
  shaymin_sky: { growthRate: 'medium-slow' },
  arceus: { growthRate: 'slow' },
  arceus_bug: { growthRate: 'slow' },
  arceus_dark: { growthRate: 'slow' },
  arceus_dragon: { growthRate: 'slow' },
  arceus_electric: { growthRate: 'slow' },
  arceus_fighting: { growthRate: 'slow' },
  arceus_fire: { growthRate: 'slow' },
  arceus_flying: { growthRate: 'slow' },
  arceus_ghost: { growthRate: 'slow' },
  arceus_grass: { growthRate: 'slow' },
  arceus_ground: { growthRate: 'slow' },
  arceus_ice: { growthRate: 'slow' },
  arceus_poison: { growthRate: 'slow' },
  arceus_psychic: { growthRate: 'slow' },
  arceus_rock: { growthRate: 'slow' },
  arceus_steel: { growthRate: 'slow' },
  arceus_water: { growthRate: 'slow' },

  // --- Gen 1-2 gender variants and special forms (added upstream after Gen 3-4 support) ---
  venusaur_female: { growthRate: 'medium-slow' },
  pikachu_female: {
    growthRate: 'medium-fast',
    evolvesTo: { type: 'raichu', level: 20 },
  },
  meganium_female: { growthRate: 'medium-slow' },
  pichu_spiky_eared: { growthRate: 'medium-fast' }, // event-only form, doesn't evolve
  wobbuffet_male: { growthRate: 'medium-fast' },
  wobbuffet_female: { growthRate: 'medium-fast' },
  steelix_female: { growthRate: 'medium-fast' },
  heracross_male: { growthRate: 'slow' },
  heracross_female: { growthRate: 'slow' },
  celebi: { growthRate: 'medium-slow' },
  // Unown has 28 forms (A-Z, !, ?); none evolve.
  unown_a: { growthRate: 'medium-fast' },
  unown_b: { growthRate: 'medium-fast' },
  unown_c: { growthRate: 'medium-fast' },
  unown_d: { growthRate: 'medium-fast' },
  unown_e: { growthRate: 'medium-fast' },
  unown_f: { growthRate: 'medium-fast' },
  unown_g: { growthRate: 'medium-fast' },
  unown_h: { growthRate: 'medium-fast' },
  unown_i: { growthRate: 'medium-fast' },
  unown_j: { growthRate: 'medium-fast' },
  unown_k: { growthRate: 'medium-fast' },
  unown_l: { growthRate: 'medium-fast' },
  unown_m: { growthRate: 'medium-fast' },
  unown_n: { growthRate: 'medium-fast' },
  unown_o: { growthRate: 'medium-fast' },
  unown_p: { growthRate: 'medium-fast' },
  unown_q: { growthRate: 'medium-fast' },
  unown_r: { growthRate: 'medium-fast' },
  unown_s: { growthRate: 'medium-fast' },
  unown_t: { growthRate: 'medium-fast' },
  unown_u: { growthRate: 'medium-fast' },
  unown_v: { growthRate: 'medium-fast' },
  unown_w: { growthRate: 'medium-fast' },
  unown_x: { growthRate: 'medium-fast' },
  unown_y: { growthRate: 'medium-fast' },
  unown_z: { growthRate: 'medium-fast' },
  unown_exclamation: { growthRate: 'medium-fast' },
  unown_question: { growthRate: 'medium-fast' },
};

// XP required to *reach* the given level. Level 1 = 0 XP. These formulas come from canon Pokemon games.
export function xpForLevel(growthRate: GrowthRate, level: number): number {
  if (level <= 1) {
    return 0;
  }
  const n = level;
  switch (growthRate) {
    case 'fast':
      return Math.floor((4 * n * n * n) / 5);
    case 'medium-fast':
      return n * n * n;
    case 'slow':
      return Math.floor((5 * n * n * n) / 4);
    case 'medium-slow':
      // (6/5)n^3 - 15n^2 + 100n - 140 ; clamp to 0 for n=1
      return Math.max(
        0,
        Math.floor((6 * n * n * n) / 5 - 15 * n * n + 100 * n - 140),
      );
  }
}

// Inverse: given total XP, return the highest level whose XP threshold is <= totalXp. Capped at 100.
export function levelForXp(growthRate: GrowthRate, totalXp: number): number {
  if (totalXp <= 0) {
    return 1;
  }
  let lo = 1;
  let hi = 100;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi + 1) / 2);
    if (xpForLevel(growthRate, mid) <= totalXp) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo;
}

// If `species` evolves and the current level meets the threshold, return the evolution. Otherwise null.
export function nextEvolution(
  species: string,
  currentLevel: number,
): { type: string; level: number } | null {
  const info = EVOLUTION_DATA[species];
  if (!info || !info.evolvesTo) {
    return null;
  }
  if (currentLevel >= info.evolvesTo.level) {
    return info.evolvesTo;
  }
  return null;
}

// Convenience: return the growth rate for a species, or 'medium-fast' as a safe default if unknown.
export function growthRateFor(species: string): GrowthRate {
  return EVOLUTION_DATA[species]?.growthRate ?? 'medium-fast';
}
