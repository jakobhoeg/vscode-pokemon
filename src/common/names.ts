import { POKEMON_NAMES } from '../panel/pokemon';

export function randomName(): string {
	const collection: ReadonlyArray<string> = POKEMON_NAMES;

	return (
		collection[Math.floor(Math.random() * collection.length)] ?? 'Unknown'
	);
}
