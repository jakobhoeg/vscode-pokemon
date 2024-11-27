import { PokemonColor, PokemonSize, PokemonSpeed, PokemonType } from '../common/types';
import { Pokemon } from './pokemon';
import { IPokemonType } from './states';

export class PetElement {
    el: HTMLImageElement;
    collision: HTMLDivElement;
    speech: HTMLDivElement;
    pet: IPokemonType;
    color: PokemonColor;
    type: PokemonType;
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
        pet: IPokemonType,
        color: PokemonColor,
        type: PokemonType,
    ) {
        this.el = el;
        this.collision = collision;
        this.speech = speech;
        this.pet = pet;
        this.color = color;
        this.type = type;
    }
}

export interface IPetCollection {
    pets: Array<PetElement>;
    push(pet: PetElement): void;
    reset(): void;
    seekNewFriends(): string[];
    locate(name: string): PetElement | undefined;
    remove(name: string): void;
}

export class PetCollection implements IPetCollection {
    private _pets: Array<PetElement>;

    constructor() {
        this._pets = new Array(0);
    }

    public get pets() {
        return this._pets;
    }

    push(pet: PetElement) {
        this._pets.push(pet);
    }

    reset() {
        this._pets.forEach((pet) => {
            pet.remove();
        });
        this._pets = [];
    }

    locate(name: string): PetElement | undefined {
        return this._pets.find((collection) => {
            return collection.pet.name === name;
        });
    }

    remove(name: string): any {
        this._pets.forEach((pet) => {
            if (pet.pet.name === name) {
                pet.remove();
            }
        });
        this._pets = this._pets.filter((pet) => {
            return pet.pet.name !== name;
        });
    }

    seekNewFriends(): string[] {
        if (this._pets.length <= 1) {
            return [];
        } // You can't be friends with yourself.
        var messages = new Array<string>(0);
        this._pets.forEach((petInCollection) => {
            if (petInCollection.pet.hasFriend) {
                return;
            } // I already have a friend!
            this._pets.forEach((potentialFriend) => {
                if (potentialFriend.pet.hasFriend) {
                    return;
                } // Already has a friend. sorry.
                if (!potentialFriend.pet.canChase) {
                    return;
                } // Pet is busy doing something else.
                if (
                    potentialFriend.pet.left > petInCollection.pet.left &&
                    potentialFriend.pet.left <
                    petInCollection.pet.left + petInCollection.pet.width
                ) {
                    // We found a possible new friend..
                    console.log(
                        petInCollection.pet.name,
                        ' wants to be friends with ',
                        potentialFriend.pet.name,
                        '.',
                    );
                    if (
                        petInCollection.pet.makeFriendsWith(potentialFriend.pet)
                    ) {
                        potentialFriend.pet.showSpeechBubble('❤️', 2000);
                        petInCollection.pet.showSpeechBubble('❤️', 2000);
                    }
                }
            });
        });
        return messages;
    }
}

export class InvalidPetException {
    message?: string;

    constructor(message?: string) {
        this.message = message;
    }
}

export function createPet(
    petType: string,
    el: HTMLImageElement,
    collision: HTMLDivElement,
    speech: HTMLDivElement,
    size: PokemonSize,
    left: number,
    bottom: number,
    petRoot: string,
    floor: number,
    name: string,
): IPokemonType {
    if (!name) {
        throw new InvalidPetException('name is undefined');
    }

    try {
        return new Pokemon(
            petType,
            el,
            collision,
            speech,
            size,
            left,
            bottom,
            petRoot,
            floor,
            name,
            PokemonSpeed.normal
        );
    } catch (error) {
        throw new InvalidPetException(`Invalid Pokemon type: ${petType}`);
    }
}

export function availableColors(petType: PokemonType): PokemonColor[] {
    const pokemon = Pokemon.getPokemonData(petType);
    return pokemon ? pokemon.possibleColors : [PokemonColor.default];
}

export function normalizeColor(petColor: PokemonColor, petType: PokemonType): PokemonColor {
    const colors = availableColors(petType);
    return colors.includes(petColor) ? petColor : colors[0];
}
