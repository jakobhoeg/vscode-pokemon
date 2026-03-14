import { POKEMON_DATA } from './dex/index';
import { PokemonConfig, PokemonGeneration, PokemonType } from './types';

export function getAllPokemon(): PokemonType[] {
  return Object.keys(POKEMON_DATA) as PokemonType[];
}

export function getPokemonByGeneration(
  generation: PokemonGeneration,
): PokemonType[] {
  return Object.entries(POKEMON_DATA)
    .filter(([, config]) => config.generation === generation)
    .map(([key]) => key as PokemonType);
}

export function getDefaultPokemon(): PokemonType {
  return 'bulbasaur';
}

export function getRandomPokemonConfig(): [PokemonType, PokemonConfig] {
  const keys = Object.keys(POKEMON_DATA);
  const randomKey = keys[Math.floor(Math.random() * keys.length)];
  return [randomKey as PokemonType, POKEMON_DATA[randomKey]];
}
