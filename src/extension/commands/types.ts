import * as vscode from 'vscode';
import { ColorThemeKind } from 'vscode';
import {
  ExtPosition,
  PokemonColor,
  PokemonSize,
  PokemonType,
  Theme,
} from '../../common/types';

export interface PokemonSpecificationLike {
  color: PokemonColor;
  type: PokemonType;
  size: PokemonSize;
  name: string;
  generation: string;
  originalSpriteSize: number;
}

export interface PokemonSpecificationClass {
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

export interface PokemonPanelLike {
  resetPokemon(): void;
  spawnPokemon(spec: PokemonSpecificationLike): void;
  deletePokemon(pokemonName: string): void;
  listPokemon(): void;
  rollCall(): void;
  updatePokemonColor(newColor: PokemonColor): void;
  updatePokemonType(newType: PokemonType): void;
  updatePokemonSize(newSize: PokemonSize): void;
  updateTheme(newTheme: Theme, themeKind: vscode.ColorThemeKind): void;
  update(): void;
  setThrowWithMouse(newThrowWithMouse: boolean): void;
}

export interface CommandDependencies {
  context: vscode.ExtensionContext;
  getConfigurationPosition(): ExtPosition;
  getConfiguredSize(): PokemonSize;
  getConfiguredTheme(): Theme;
  getConfiguredThemeKind(): ColorThemeKind;
  getThrowWithMouseConfiguration(): boolean;
  getConfiguredDefaultPokemon(): PokemonSpecificationLike[];
  getPokemonPanel(): PokemonPanelLike | undefined;
  getWebview(): vscode.Webview | undefined;
  hasWebviewViewProvider(): boolean;
  createOrShowPanel(spec: PokemonSpecificationLike): void;
  createPokemonPlayground(context: vscode.ExtensionContext): Promise<void>;
  storeCollectionAsMemento(
    context: vscode.ExtensionContext,
    collection: PokemonSpecificationLike[],
  ): Promise<void>;
  maybeMakeShiny(possibleColors: PokemonColor[]): PokemonColor;
  pokemonSpecification: PokemonSpecificationClass;
}
