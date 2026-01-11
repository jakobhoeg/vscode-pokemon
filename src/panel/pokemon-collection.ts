import { PokemonColor, PokemonSize, PokemonSpeed, PokemonType } from '../common/types';
import { Pokemon } from './pokemon';
import { IPokemonType } from './states';

export class PokemonElement {
    el: HTMLImageElement;
    collision: HTMLDivElement;
    speech: HTMLDivElement;
    pokemon: IPokemonType;
    color: PokemonColor;
    type: PokemonType;
    generation: string;
    originalSpriteSize: number;
    remove() {
        this.el.remove();
        this.collision.remove();
        this.speech.remove();
        this.color = PokemonColor.null;
    }

    constructor(
        el: HTMLImageElement,
        collision: HTMLDivElement,
        speech: HTMLDivElement,
        pokemon: IPokemonType,
        color: PokemonColor,
        type: PokemonType,
        generation: string,
        originalSpriteSize: number,
    ) {
        this.el = el;
        this.collision = collision;
        this.speech = speech;
        this.pokemon = pokemon;
        this.color = color;
        this.type = type;
        this.generation = generation;
        this.originalSpriteSize = originalSpriteSize;
    }
}

export interface IPokemonCollection {
    pokemonCollection: Array<PokemonElement>;
    push(pokemon: PokemonElement): void;
    reset(): void;
    seekNewFriends(): string[];
    locate(name: string): PokemonElement | undefined;
    remove(name: string): void;
}

export class PokemonCollection implements IPokemonCollection {
    private _pokemonCollection: Array<PokemonElement>;

    constructor() {
        this._pokemonCollection = new Array(0);
    }

    public get pokemonCollection() {
        return this._pokemonCollection;
    }

    push(pokemon: PokemonElement) {
        this._pokemonCollection.push(pokemon);
    }

    reset() {
        this._pokemonCollection.forEach((pokemon) => {
            pokemon.remove();
        });
        this._pokemonCollection = [];
    }

    locate(name: string): PokemonElement | undefined {
        return this._pokemonCollection.find((collection) => {
            return collection.pokemon.name === name;
        });
    }

    remove(name: string): any {
        this._pokemonCollection.forEach((pokemon) => {
            if (pokemon.pokemon.name === name) {
                pokemon.remove();
            }
        });
        this._pokemonCollection = this._pokemonCollection.filter((pokemon) => {
            return pokemon.pokemon.name !== name;
        });
    }

    seekNewFriends(): string[] {
        if (this._pokemonCollection.length <= 1) {
            return [];
        } // You can't be friends with yourself.
        var messages = new Array<string>(0);
        this._pokemonCollection.forEach((pokemonInCollection) => {
            if (pokemonInCollection.pokemon.hasFriend) {
                return;
            } // I already have a friend!
            this._pokemonCollection.forEach((potentialFriend) => {
                if (potentialFriend.pokemon.hasFriend) {
                    return;
                } // Already has a friend. sorry.
                if (!potentialFriend.pokemon.canChase) {
                    return;
                } // Pokemon is busy doing something else.
                if (
                    potentialFriend.pokemon.left > pokemonInCollection.pokemon.left &&
                    potentialFriend.pokemon.left <
                    pokemonInCollection.pokemon.left + pokemonInCollection.pokemon.width
                ) {
                    // We found a possible new friend..
                    console.log(
                        pokemonInCollection.pokemon.name,
                        ' wants to be friends with ',
                        potentialFriend.pokemon.name,
                        '.',
                    );
                    if (
                        pokemonInCollection.pokemon.makeFriendsWith(potentialFriend.pokemon)
                    ) {
                        potentialFriend.pokemon.showSpeechBubble(2000, true);
                        pokemonInCollection.pokemon.showSpeechBubble(2000, true);
                    }
                }
            });
        });
        return messages;
    }
}

export class InvalidPokemonException {
    message?: string;

    constructor(message?: string) {
        this.message = message;
    }
}

export function createPokemon(
    pokemonType: string,
    el: HTMLImageElement,
    collision: HTMLDivElement,
    speech: HTMLImageElement,
    size: PokemonSize,
    left: number,
    bottom: number,
    pokemonRoot: string,
    floor: number,
    name: string,
    generation: string,
    originalSpriteSize: number,
): IPokemonType {
    if (!name) {
        throw new InvalidPokemonException('name is undefined');
    }

    try {
        return new Pokemon(
            pokemonType,
            el,
            collision,
            speech,
            size,
            left,
            bottom,
            pokemonRoot,
            floor,
            name,
            PokemonSpeed.normal,
            generation,
            originalSpriteSize 
        );
    } catch (error) {
        throw new InvalidPokemonException(`Invalid Pokemon type: ${pokemonType}`);
    }
}

export function availableColors(pokemonType: PokemonType): PokemonColor[] {
    const pokemon = Pokemon.getPokemonData(pokemonType);
    return pokemon ? pokemon.possibleColors : [PokemonColor.default];
}

export function normalizeColor(pokemonColor: PokemonColor, pokemonType: PokemonType): PokemonColor {
    const colors = availableColors(pokemonType);
    return colors.includes(pokemonColor) ? pokemonColor : colors[0];
}
