import * as vscode from 'vscode';
import {
  ExtPosition,
  PokemonColor,
  PokemonSize,
  Theme,
} from '../../../common/types';
import {
  PokemonSpecificationCtor,
  PokemonSpecificationLike,
} from './pokemon-specification.type';
import { PokemonPanelLike } from './pokemon-panel.type';

export interface CommandDeps {
  pokemonSpecification: PokemonSpecificationCtor;
  createOrShowPokemonPanel(
    extensionUri: vscode.Uri,
    spec: PokemonSpecificationLike,
  ): void;
  createPokemonPlayground(context: vscode.ExtensionContext): Promise<void>;
  getConfiguredSize(): PokemonSize;
  getConfiguredTheme(): Theme;
  getConfiguredThemeKind(): vscode.ColorThemeKind;
  getConfigurationPosition(): ExtPosition;
  getPokemonPanel(): PokemonPanelLike | undefined;
  getSessionPokemonCollection(
    context: vscode.ExtensionContext,
  ): PokemonSpecificationLike[];
  getThrowWithMouseConfiguration(): boolean;
  getWebview(): vscode.Webview | undefined;
  hasWebviewViewProvider(): boolean;
  maybeMakeShiny(possibleColors: PokemonColor[]): PokemonColor;
  spawnAndPersistCollection(
    context: vscode.ExtensionContext,
    panel: PokemonPanelLike,
    collection: PokemonSpecificationLike[],
  ): Promise<void>;
  storeCollectionAsMemento(
    context: vscode.ExtensionContext,
    collection: PokemonSpecificationLike[],
  ): Promise<void>;
}
