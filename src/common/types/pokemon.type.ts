import { POKEMON_DATA } from '../dex/index';
import { Theme } from './theme.type';

export const enum PokemonColor {
  default = 'default',
  shiny = 'shiny',
  null = 'null',
}

/* eslint-disable @typescript-eslint/naming-convention */
export enum PokemonGeneration {
  Gen1 = 1,
  Gen2 = 2,
  Gen3 = 3,
  Gen4 = 4,
}

export type PokemonTypeString = string & keyof typeof POKEMON_DATA;

export type PokemonType = PokemonTypeString;

export const enum PokemonExtraSprite {
  leftFacing = 'left_facing',
}

export interface PokemonConfig {
  id: number;
  name: string;
  generation: PokemonGeneration;
  cry: string;
  possibleColors: PokemonColor[];
  originalSpriteSize?: number;
  extraSprites?: PokemonExtraSprite[];
}

export const enum PokemonSpeed {
  still = 0,
  verySlow = 1,
  slow = 2,
  normal = 3,
  fast = 4,
  veryFast = 5,
}

export const enum PokemonSize {
  nano = 'nano',
  small = 'small',
  medium = 'medium',
  large = 'large',
}

export const ALL_COLORS = [PokemonColor.default];
export const ALL_SCALES = [
  PokemonSize.nano,
  PokemonSize.small,
  PokemonSize.medium,
  PokemonSize.large,
];
export const ALL_THEMES = [Theme.none, Theme.forest, Theme.castle, Theme.beach];
