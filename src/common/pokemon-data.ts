import { PokemonColor, PokemonConfig, PokemonGeneration, PokemonType } from "./types";

export const POKEMON_DATA: { [key: string]: PokemonConfig } = {
  bulbasaur: {
    id: 1,
    name: 'Bulbasaur',
    generation: PokemonGeneration.Gen1,
    cry: 'Bulbasaur!',
    possibleColors: [PokemonColor.default]
  },
  ivysaur: {
    id: 2,
    name: 'Ivysaur',
    generation: PokemonGeneration.Gen1,
    cry: 'Ivysaur!',
    possibleColors: [PokemonColor.default]
  },
  venusaur: {
    id: 3,
    name: 'Venusaur',
    generation: PokemonGeneration.Gen1,
    cry: 'Venusaur!',
    possibleColors: [PokemonColor.default]
  },
  charmander: {
    id: 4,
    name: 'Charmander',
    generation: PokemonGeneration.Gen1,
    cry: 'Charmander!',
    possibleColors: [PokemonColor.default]
  },
  charmeleon: {
    id: 5,
    name: 'Charmeleon',
    generation: PokemonGeneration.Gen1,
    cry: 'Charmeleon!',
    possibleColors: [PokemonColor.default]
  },
  charizard: {
    id: 6,
    name: 'Charizard',
    generation: PokemonGeneration.Gen1,
    cry: 'Charizard!',
    possibleColors: [PokemonColor.default]
  },
  squirtle: {
    id: 7,
    name: 'Squirtle',
    generation: PokemonGeneration.Gen1,
    cry: 'Squritle!',
    possibleColors: [PokemonColor.default]
  },
  wartortle: {
    id: 8,
    name: 'Wartortle',
    generation: PokemonGeneration.Gen1,
    cry: 'Wartortle!',
    possibleColors: [PokemonColor.default]
  },
  blastoise: {
    id: 9,
    name: 'Blastoise',
    generation: PokemonGeneration.Gen1,
    cry: 'Blastoise!',
    possibleColors: [PokemonColor.default]
  },
  dragonite: {
    id: 149,
    name: 'Dragonite',
    generation: PokemonGeneration.Gen1,
    cry: 'Draa!',
    possibleColors: [PokemonColor.default]
  },
};

export function getAllPokemon(): PokemonType[] {
  return Object.keys(POKEMON_DATA) as PokemonType[];
}

export function getPokemonByGeneration(generation: PokemonGeneration): PokemonType[] {
  return Object.entries(POKEMON_DATA)
    .filter(([_, config]) => config.generation === generation)
    .map(([key, _]) => key as PokemonType);
}

export function getDefaultPokemon(): PokemonType {
  return 'bulbasaur';
}