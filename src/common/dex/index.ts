import { GEN_1_DEX } from './gen1';
import { GEN_2_DEX } from './gen2';
import { GEN_3_DEX } from './gen3';
import { GEN_4_DEX } from './gen4';
import { PokemonConfig } from '../types';

export const POKEMON_DATA: { [key: string]: PokemonConfig } = {
  ...GEN_1_DEX,
  ...GEN_2_DEX,
  ...GEN_3_DEX,
  ...GEN_4_DEX,
};
