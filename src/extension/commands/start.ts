import * as vscode from 'vscode';
import { ExtPosition } from '../../common/types';
import { CommandDependencies } from './types';
import { VSCODE_START_KEY } from '../../constants/vscode-keys.constant';

export function registerStartCommand(deps: CommandDependencies): void {
  const {
    context,
    getConfigurationPosition,
    hasWebviewViewProvider,
    getConfiguredSize,
    getConfiguredDefaultPokemon,
    getPokemonPanel,
    storeCollectionAsMemento,
    createOrShowPanel,
    pokemonSpecification,
  } = deps;

  context.subscriptions.push(
    vscode.commands.registerCommand(VSCODE_START_KEY, async () => {
      if (
        getConfigurationPosition() === ExtPosition.explorer &&
        hasWebviewViewProvider()
      ) {
        await vscode.commands.executeCommand('pokemonView.focus');
        return;
      }

      const spec = pokemonSpecification.fromConfiguration();
      createOrShowPanel(spec);

      const panel = getPokemonPanel();
      if (!panel) {
        return;
      }

      let collection = pokemonSpecification.collectionFromMemento(
        context,
        getConfiguredSize(),
      );

      if (collection.length === 0) {
        collection = getConfiguredDefaultPokemon();
      }

      collection.forEach((item) => {
        panel.spawnPokemon(item);
      });

      await storeCollectionAsMemento(context, collection);
    }),
  );
}
