import * as vscode from 'vscode';
import { PokemonGeneration, PokemonType } from '../../../common/types';

export interface GenerationQuickPickItem extends vscode.QuickPickItem {
  isGeneration?: boolean;
  gen?: PokemonGeneration;
  value?: PokemonType;
}

export class PokemonQuickPickItem implements vscode.QuickPickItem {
  constructor(
    public readonly name_: string,
    public readonly type: string,
    public readonly color: string,
  ) {
    this.name = name_;
    this.label = name_;
    this.description = `${color} ${type}`;
  }

  name: string;
  label: string;
  kind?: vscode.QuickPickItemKind;
  description?: string;
  detail?: string;
  picked?: boolean;
  alwaysShow?: boolean;
  buttons?: readonly vscode.QuickInputButton[];
}
