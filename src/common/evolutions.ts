import { EVOLUTION_DATA } from './evolution-data';
import { PokemonType } from './types';

/** The forms `type` can evolve into. Empty for final forms, or when the next form has no sprites yet. */
export function getEvolutions(type: PokemonType): PokemonType[] {
  return EVOLUTION_DATA[type] ?? [];
}

/** Picks one form at random. `random` is injectable so tests can choose deterministically. */
export function pickEvolution(
  targets: PokemonType[],
  random: () => number = Math.random,
): PokemonType | undefined {
  if (targets.length === 0) {
    return undefined;
  }
  // min() guards against a random() that returns exactly 1
  const index = Math.min(
    Math.floor(random() * targets.length),
    targets.length - 1,
  );
  return targets[index];
}
