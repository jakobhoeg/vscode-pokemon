export const enum PokemonColor {
    default = 'default',
    shiny = 'shiny',
    null = 'null',
}

export enum PokemonGeneration {
    Gen1 = 1,
    Gen2 = 2,
    Gen3 = 3,
}

export type PokemonTypeString = string & keyof typeof POKEMON_DATA;

export type PokemonType = PokemonTypeString | 'null';

export interface PokemonConfig {
    id: number;
    name: string;
    generation: PokemonGeneration;
    cry: string;
    possibleColors: PokemonColor[];
}

export const POKEMON_DATA: { [key: string]: PokemonConfig } = {
    bulbasaur: {
        id: 1,
        name: 'Bulbasaur',
        generation: PokemonGeneration.Gen1,
        cry: 'Bulba!',
        possibleColors: [PokemonColor.default]
    },
    ivysaur: {
        id: 2,
        name: 'Ivysaur',
        generation: PokemonGeneration.Gen1,
        cry: 'Ivy!',
        possibleColors: [PokemonColor.default]
    },
    venusaur: {
        id: 3,
        name: 'Venusaur',
        generation: PokemonGeneration.Gen1,
        cry: 'Venu!',
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

export const enum PokemonSpeed {
    still = 0,
    verySlow = 1,
    slow = 2,
    normal = 3,
    fast = 4,
    veryFast = 5,
}

export const enum PokemonSize {
    nano = 'nano',
    small = 'small',
    medium = 'medium',
    large = 'large',
}

export const enum ExtPosition {
    panel = 'panel',
    explorer = 'explorer',
}

export const enum Theme {
    none = 'none',
    forest = 'forest',
    castle = 'castle',
    beach = 'beach',
}

export const enum ColorThemeKind {
    light = 1,
    dark = 2,
    highContrast = 3,
}

export class WebviewMessage {
    text: string;
    command: string;

    constructor(text: string, command: string) {
        this.text = text;
        this.command = command;
    }
}

export const ALL_COLORS = [
    PokemonColor.default,
];
export const ALL_SCALES = [
    PokemonSize.nano,
    PokemonSize.small,
    PokemonSize.medium,
    PokemonSize.large,
];
export const ALL_THEMES = [Theme.none, Theme.forest, Theme.castle, Theme.beach];

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