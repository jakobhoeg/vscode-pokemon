import { PokemonType } from './types';
import { DRAGONITE_NAMES } from '../panel/pets/dragonite';

export function randomName(type: PokemonType): string {
    const collection: ReadonlyArray<string> =
        (
            {
                [PokemonType.dragonite]: DRAGONITE_NAMES,
            } as Record<PokemonType, ReadonlyArray<string>>
        )[type] ?? DRAGONITE_NAMES;

    return (
        collection[Math.floor(Math.random() * collection.length)] ?? 'Unknown'
    );
}
