import * as vscode from 'vscode';
import { VSCODE_POKEMON_EXPORT_LIST_COMMAND } from '../../constants/vscode-keys.constant';
import { CommandDeps } from './types/index';

export function registerExportPokemonListCommand(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    VSCODE_POKEMON_EXPORT_LIST_COMMAND,
    async () => {
      const pokemonCollection = deps.pokemonSpecification.collectionFromMemento(
        context,
        deps.getConfiguredSize(),
      );
      const pokemonJson = JSON.stringify(pokemonCollection, null, 2);
      const fileName = `pokemonCollection-${Date.now()}.json`;
      if (!vscode.workspace.workspaceFolders) {
        await vscode.window.showErrorMessage(
          vscode.l10n.t(
            'You must have a folder or workspace open to export pokemonCollection.',
          ),
        );
        return;
      }

      const filePath = vscode.Uri.joinPath(
        vscode.workspace.workspaceFolders[0].uri,
        fileName,
      );
      const newUri = vscode.Uri.file(fileName).with({
        scheme: 'untitled',
        path: filePath.fsPath,
      });

      await vscode.workspace.openTextDocument(newUri).then(async (doc) => {
        await vscode.window.showTextDocument(doc).then(async (editor) => {
          await editor.edit((edit) => {
            edit.insert(new vscode.Position(0, 0), pokemonJson);
          });
        });
      });
    },
  );
}
