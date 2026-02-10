import * as vscode from 'vscode';
import { CommandDependencies } from './types';
import {
  VSCODE_ROLL_CALL_KEY,
  VSCODE_CONFIGURE_KEYBINDINGS_KEY,
  VSCODE_SPAWN_POKEMON_KEY,
  VSCODE_SPAWN_RANDOM_POKEMON_KEY,
  VSCODE_DELETE_POKEMON_KEY,
  VSCODE_REMOVE_ALL_POKEMON_KEY,
} from '../../constants/vscode-keys.constant';

export function registerUtilityCommands(deps: CommandDependencies): void {
  const { context, getPokemonPanel, createPokemonPlayground } = deps;

  context.subscriptions.push(
    vscode.commands.registerCommand(VSCODE_ROLL_CALL_KEY, async () => {
      const panel = getPokemonPanel();
      if (panel !== undefined) {
        panel.rollCall();
      } else {
        await createPokemonPlayground(context);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      VSCODE_CONFIGURE_KEYBINDINGS_KEY,
      async () => {
        const items: Array<vscode.QuickPickItem & { commandId: string }> = [
          {
            label: vscode.l10n.t('Spawn additional pokemon'),
            description: VSCODE_SPAWN_POKEMON_KEY,
            commandId: VSCODE_SPAWN_POKEMON_KEY,
          },
          {
            label: vscode.l10n.t('Spawn random pokemon'),
            description: VSCODE_SPAWN_RANDOM_POKEMON_KEY,
            commandId: VSCODE_SPAWN_RANDOM_POKEMON_KEY,
          },
          {
            label: vscode.l10n.t('Remove pokemon'),
            description: VSCODE_DELETE_POKEMON_KEY,
            commandId: VSCODE_DELETE_POKEMON_KEY,
          },
          {
            label: vscode.l10n.t('Remove all pokemon'),
            description: VSCODE_REMOVE_ALL_POKEMON_KEY,
            commandId: VSCODE_REMOVE_ALL_POKEMON_KEY,
          },
        ];

        const picked = await vscode.window.showQuickPick(items, {
          placeHolder: vscode.l10n.t(
            'Select a command to configure its keybinding',
          ),
          matchOnDescription: true,
        });
        if (!picked) {
          return;
        }
        await vscode.commands.executeCommand(
          'workbench.action.openGlobalKeybindings',
          picked.commandId,
        );
      },
    ),
  );
}
