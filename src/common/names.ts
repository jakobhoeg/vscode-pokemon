import { POKEMON_NAMES } from '../panel/pokemon';
import { PokemonType } from './types';

export function randomName(type: PokemonType): string {
    const collection: ReadonlyArray<string> = POKEMON_NAMES;

    return (
        collection[Math.floor(Math.random() * collection.length)] ?? 'Unknown'
    );
}
