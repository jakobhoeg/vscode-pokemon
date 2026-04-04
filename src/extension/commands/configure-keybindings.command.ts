import * as vscode from 'vscode';
import {
  VSCODE_POKEMON_CONFIGURE_KEYBINDINGS_COMMAND,
  VSCODE_POKEMON_DELETE_POKEMON_COMMAND,
  VSCODE_POKEMON_REMOVE_ALL_POKEMON_COMMAND,
  VSCODE_POKEMON_SPAWN_POKEMON_COMMAND,
  VSCODE_POKEMON_SPAWN_RANDOM_POKEMON_COMMAND,
} from '../../constants/vscode-keys.constant';

export function registerConfigureKeybindingsCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(
    VSCODE_POKEMON_CONFIGURE_KEYBINDINGS_COMMAND,
    async () => {
      const items: Array<vscode.QuickPickItem & { commandId: string }> = [
        {
          label: vscode.l10n.t('Spawn additional pokemon'),
          description: VSCODE_POKEMON_SPAWN_POKEMON_COMMAND,
          commandId: VSCODE_POKEMON_SPAWN_POKEMON_COMMAND,
        },
        {
          label: vscode.l10n.t('Spawn random pokemon'),
          description: VSCODE_POKEMON_SPAWN_RANDOM_POKEMON_COMMAND,
          commandId: VSCODE_POKEMON_SPAWN_RANDOM_POKEMON_COMMAND,
        },
        {
          label: vscode.l10n.t('Remove pokemon'),
          description: VSCODE_POKEMON_DELETE_POKEMON_COMMAND,
          commandId: VSCODE_POKEMON_DELETE_POKEMON_COMMAND,
        },
        {
          label: vscode.l10n.t('Remove all pokemon'),
          description: VSCODE_POKEMON_REMOVE_ALL_POKEMON_COMMAND,
          commandId: VSCODE_POKEMON_REMOVE_ALL_POKEMON_COMMAND,
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
  );
}
