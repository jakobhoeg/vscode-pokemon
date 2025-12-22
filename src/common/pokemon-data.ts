import { POKEMON_DATA_GEN1 } from "./pokemon-generations/gen1";
import { POKEMON_DATA_GEN2 } from "./pokemon-generations/gen2";
import { POKEMON_DATA_GEN3 } from "./pokemon-generations/gen3";
import { PokemonConfig, PokemonGeneration, PokemonType } from "./types";

// All Pokemon data is now organized by generation in pokemon-generations/gen*.ts
export const POKEMON_DATA: { [key: string]: PokemonConfig } = {
  ...POKEMON_DATA_GEN1,
  ...POKEMON_DATA_GEN2,
  ...POKEMON_DATA_GEN3,
};

export function getAllPokemon(): PokemonType[] {
  return Object.keys(POKEMON_DATA) as PokemonType[];
}

export function getPokemonByGeneration(generation: PokemonGeneration): PokemonType[] {
  return Object.entries(POKEMON_DATA)
    .filter(([, config]) => config.generation === generation)
    .map(([key]) => key as PokemonType);
}

export function getDefaultPokemon(): PokemonType {
  return 'bulbasaur';
}

export function getRandomPokemonConfig(): [PokemonType, PokemonConfig] {
  var keys = Object.keys(POKEMON_DATA);
  var randomKey = keys[Math.floor(Math.random() * keys.length)];
  return [randomKey as PokemonType, POKEMON_DATA[randomKey]];
}
