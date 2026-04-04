import * as vscode from 'vscode';
import { VSCODE_POKEMON_REMOVE_ALL_POKEMON_COMMAND } from '../../constants/vscode-keys.constant';
import { CommandDeps } from './types/index';

export function registerRemoveAllPokemonCommand(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    VSCODE_POKEMON_REMOVE_ALL_POKEMON_COMMAND,
    async () => {
      const panel = deps.getPokemonPanel();
      if (panel !== undefined) {
        panel.resetPokemon();
        await deps.storeCollectionAsMemento(context, []);
      } else {
        await deps.createPokemonPlayground(context);
        await vscode.window.showInformationMessage(
          vscode.l10n.t(
            "A Pokemon Playground has been created. You can now use the 'Remove All Pokemon' Command to remove all Pokemon.",
          ),
        );
      }
    },
  );
}
