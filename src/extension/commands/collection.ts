import * as vscode from 'vscode';
import { normalizeColor } from '../../panel/pokemon-collection';
import { CommandDependencies } from './types';
import {
  VSCODE_EXPORT_POKEMON_LIST_KEY,
  VSCODE_IMPORT_POKEMON_LIST_KEY,
} from '../../constants/vscode-keys.constant';

export function registerCollectionCommands(deps: CommandDependencies): void {
  const {
    context,
    getConfiguredSize,
    getPokemonPanel,
    storeCollectionAsMemento,
    pokemonSpecification,
  } = deps;

  context.subscriptions.push(
    vscode.commands.registerCommand(
      VSCODE_EXPORT_POKEMON_LIST_KEY,
      async () => {
        const pokemonCollection = pokemonSpecification.collectionFromMemento(
          context,
          getConfiguredSize(),
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
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      VSCODE_IMPORT_POKEMON_LIST_KEY,
      async () => {
        const options: vscode.OpenDialogOptions = {
          canSelectMany: false,
          openLabel: 'Open pokemonCollection.json',
          filters: {
            json: ['json'],
          },
        };
        const fileUri = await vscode.window.showOpenDialog(options);

        if (fileUri && fileUri[0]) {
          console.log('Selected file: ' + fileUri[0].fsPath);
          try {
            const fileContents = await vscode.workspace.fs.readFile(fileUri[0]);
            const pokemonToLoad = JSON.parse(
              String.fromCharCode.apply(null, Array.from(fileContents)),
            );

            var collection = pokemonSpecification.collectionFromMemento(
              context,
              getConfiguredSize(),
            );
            const panel = getPokemonPanel();
            for (let i = 0; i < pokemonToLoad.length; i++) {
              const pokemon = pokemonToLoad[i];
              const pokemonSpec = new pokemonSpecification(
                normalizeColor(pokemon.color, pokemon.type),
                pokemon.type,
                pokemon.size,
                pokemon.name,
              );
              collection.push(pokemonSpec);
              if (panel !== undefined) {
                panel.spawnPokemon(pokemonSpec);
              }
            }
            await storeCollectionAsMemento(context, collection);
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            await vscode.window.showErrorMessage(
              vscode.l10n.t('Failed to import pokemon: {0}', message),
            );
          }
        }
      },
    ),
  );
}
