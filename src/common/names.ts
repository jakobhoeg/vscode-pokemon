import { POKEMON_NAMES } from '../panel/pokemon';
import { PokemonType } from './types';

export function randomName(type: PokemonType | null): string {
    const collection: ReadonlyArray<string> = type
        ? POKEMON_NAMES.filter(name => name.includes(type))
        : POKEMON_NAMES;

    return (
        collection[Math.floor(Math.random() * collection.length)] ?? 'Unknown'
    );
}
