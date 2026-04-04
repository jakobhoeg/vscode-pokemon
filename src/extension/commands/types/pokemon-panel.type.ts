import { PokemonSpecificationLike } from './pokemon-specification.type';

export interface PokemonPanelLike {
  resetPokemon(): void;
  spawnPokemon(spec: PokemonSpecificationLike): void;
  deletePokemon(pokemonName: string): void;
  listPokemon(): void;
  rollCall(): void;
}
