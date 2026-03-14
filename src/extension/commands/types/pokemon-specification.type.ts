import * as vscode from 'vscode';
import { PokemonColor, PokemonSize, PokemonType } from '../../../common/types';

export interface PokemonSpecificationLike {
  color: PokemonColor;
  type: PokemonType;
  size: PokemonSize;
  name: string;
  generation: string;
  originalSpriteSize: number;
}

export interface PokemonSpecificationCtor {
  new (
    color: PokemonColor,
    type: PokemonType,
    size: PokemonSize,
    name?: string,
    generation?: string,
  ): PokemonSpecificationLike;
  fromConfiguration(): PokemonSpecificationLike;
  collectionFromMemento(
    context: vscode.ExtensionContext,
    size: PokemonSize,
  ): PokemonSpecificationLike[];
}
