import { PokemonType } from './types';
import { DRAGONITE_NAMES } from '../panel/pets/dragonite';
import { BULBASAUR_NAMES } from '../panel/pets/bulbasaur';
import { IVYSAUR_NAMES } from '../panel/pets/ivysaur';

export function randomName(type: PokemonType): string {
    const collection: ReadonlyArray<string> =
        (
            {
                [PokemonType.dragonite]: DRAGONITE_NAMES,
                [PokemonType.bulbasaur]: BULBASAUR_NAMES,
                [PokemonType.ivysaur]: IVYSAUR_NAMES,
            } as Record<PokemonType, ReadonlyArray<string>>
        )[type] ?? DRAGONITE_NAMES;

    return (
        collection[Math.floor(Math.random() * collection.length)] ?? 'Unknown'
    );
}
