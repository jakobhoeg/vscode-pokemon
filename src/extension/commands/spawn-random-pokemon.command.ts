import * as vscode from 'vscode';
import { getRandomPokemonConfig } from '../../common/pokemon-data';
import { ExtPosition } from '../../common/types';
import {
  VSCODE_POKEMON_SPAWN_RANDOM_POKEMON_COMMAND,
  VSCODE_POKEMON_VIEW_ID,
} from '../../constants/vscode-keys.constant';
import { CommandDeps } from './types/index';

export function registerSpawnRandomPokemonCommand(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    VSCODE_POKEMON_SPAWN_RANDOM_POKEMON_COMMAND,
    async () => {
      const panel = deps.getPokemonPanel();
      if (
        deps.getConfigurationPosition() === ExtPosition.explorer &&
        deps.hasWebviewViewProvider()
      ) {
        await vscode.commands.executeCommand(`${VSCODE_POKEMON_VIEW_ID}.focus`);
      }

      if (panel) {
        const [randomPokemonType, randomPokemonConfig] =
          getRandomPokemonConfig();
        const spec = new deps.pokemonSpecification(
          deps.maybeMakeShiny(randomPokemonConfig.possibleColors),
          randomPokemonType,
          deps.getConfiguredSize(),
          randomPokemonConfig.name,
        );

        panel.spawnPokemon(spec);
        const collection = deps.pokemonSpecification.collectionFromMemento(
          context,
          deps.getConfiguredSize(),
        );
        collection.push(spec);
        await deps.storeCollectionAsMemento(context, collection);
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
