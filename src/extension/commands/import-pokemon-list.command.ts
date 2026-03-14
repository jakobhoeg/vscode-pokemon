import * as vscode from 'vscode';
import { normalizeColor } from '../../panel/pokemon-collection';
import { VSCODE_POKEMON_IMPORT_LIST_COMMAND } from '../../constants/vscode-keys.constant';
import { CommandDeps } from './types/index';

export function registerImportPokemonListCommand(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    VSCODE_POKEMON_IMPORT_LIST_COMMAND,
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

          const collection = deps.pokemonSpecification.collectionFromMemento(
            context,
            deps.getConfiguredSize(),
          );
          const panel = deps.getPokemonPanel();

          for (let i = 0; i < pokemonToLoad.length; i++) {
            const pokemon = pokemonToLoad[i];
            const pokemonSpec = new deps.pokemonSpecification(
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

          await deps.storeCollectionAsMemento(context, collection);
        } catch (e: unknown) {
          await vscode.window.showErrorMessage(
            vscode.l10n.t(
              'Failed to import pokemon: {0}',
              e instanceof Error ? e.message : String(e),
            ),
          );
        }
      }
    },
  );
}
