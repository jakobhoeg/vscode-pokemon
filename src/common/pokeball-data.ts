export const POKEBALL_DATA = {
  poke: 'pokeball',
  great: 'greatball',
  ultra: 'ultraball',
  master: 'masterball',
  premier: 'premierball',
  cherish: 'cherishball',
  luxury: 'luxeryball',
  nest: 'nestball',
  net: 'netball',
  dive: 'diveball',
  repeat: 'repeatball',
  timer: 'timerball',
  safari: 'saferiball',
  quick: 'quickball',
  dusk: 'duskball',
  heal: 'healball',
  beast: 'beastball',
  gs: 'gsball',
  fast: 'fastball',
  lure: 'lureball',
  level: 'levelball',
  heavy: 'heavyball',
  love: 'loveball',
  friend: 'friendball',
  moon: 'moonball',
  park: 'parkball',
  sport: 'sportball',
  dream: 'dreamball',
} as const;

export type Pokeball = keyof typeof POKEBALL_DATA;

export const DEFAULT_POKEBALL: Pokeball = 'poke';

export function normalizePokeball(value: string | undefined): Pokeball {
  if (value && value in POKEBALL_DATA) {
    return value as Pokeball;
  }

  return DEFAULT_POKEBALL;
}

export function getPokeballSpriteSheet(value: string | undefined): string {
  return `${POKEBALL_DATA[normalizePokeball(value)]}_sprite_sheet.png`;
}
