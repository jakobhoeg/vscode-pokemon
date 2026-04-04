import { POKEMON_DATA } from '../common/dex/index';
import {
  PokemonColor,
  PokemonConfig,
  PokemonGeneration,
  PokemonSize,
} from '../common/types';
import { BasePokemonType } from './base-pokemon-type';
import { States } from './states';

export class Pokemon extends BasePokemonType {
  private config: PokemonConfig;

  constructor(
    pokemonType: string,
    spriteElement: HTMLImageElement,
    collisionElement: HTMLDivElement,
    speechElement: HTMLImageElement,
    size: PokemonSize,
    left: number,
    bottom: number,
    pokemonRoot: string,
    floor: number,
    name: string,
    speed: number,
    generation: string,
    originalSpriteSize: number,
  ) {
    super(
      spriteElement,
      collisionElement,
      speechElement,
      size,
      left,
      bottom,
      pokemonRoot,
      floor,
      name,
      speed,
      generation,
      originalSpriteSize,
    );

    this.config = POKEMON_DATA[pokemonType] || POKEMON_DATA.bulbasaur;
    this.label = pokemonType;
  }

  static possibleColors = [PokemonColor.default];

  sequence = {
    startingState: States.sitIdle,
    sequenceStates: [
      {
        state: States.sitIdle,
        possibleNextStates: [States.walkLeft, States.walkRight],
      },
      {
        state: States.walkLeft,
        possibleNextStates: [States.sitIdle, States.walkRight],
      },
      {
        state: States.walkRight,
        possibleNextStates: [States.sitIdle, States.walkLeft],
      },
      {
        state: States.swipe,
        possibleNextStates: [States.sitIdle],
      },
    ],
  };

  get generation(): PokemonGeneration {
    return this.config.generation;
  }

  get pokedexNumber(): number {
    return this.config.id;
  }

  showSpeechBubble(duration: number = 3000, friend: boolean) {
    super.showSpeechBubble(duration, friend);
  }

  static getPokemonData(type: string): PokemonConfig | undefined {
    return POKEMON_DATA[type];
  }
}
