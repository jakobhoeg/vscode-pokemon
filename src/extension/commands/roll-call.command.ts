import * as vscode from 'vscode';
import { VSCODE_POKEMON_ROLL_CALL_COMMAND } from '../../constants/vscode-keys.constant';
import { CommandDeps } from './types/index';

export function registerRollCallCommand(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    VSCODE_POKEMON_ROLL_CALL_COMMAND,
    async () => {
      const panel = deps.getPokemonPanel();
      if (panel !== undefined) {
        panel.rollCall();
      } else {
        await deps.createPokemonPlayground(context);
      }
    },
  );
}
