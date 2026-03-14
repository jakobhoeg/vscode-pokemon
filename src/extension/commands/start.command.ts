import * as vscode from 'vscode';
import { ExtPosition } from '../../common/types';
import {
  VSCODE_POKEMON_START_COMMAND,
  VSCODE_POKEMON_VIEW_ID,
} from '../../constants/vscode-keys.constant';
import { CommandDeps } from './types/index';

export function registerStartCommand(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    VSCODE_POKEMON_START_COMMAND,
    async () => {
      if (
        deps.getConfigurationPosition() === ExtPosition.explorer &&
        deps.hasWebviewViewProvider()
      ) {
        await vscode.commands.executeCommand(`${VSCODE_POKEMON_VIEW_ID}.focus`);
        return;
      }

      const spec = deps.pokemonSpecification.fromConfiguration();
      deps.createOrShowPokemonPanel(context.extensionUri, spec);

      const panel = deps.getPokemonPanel();
      if (panel !== undefined) {
        const collection = deps.getSessionPokemonCollection(context);
        await deps.spawnAndPersistCollection(context, panel, collection);
      }
    },
  );
}
