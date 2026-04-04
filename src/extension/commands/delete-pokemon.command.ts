import * as vscode from 'vscode';
import {
  PokemonColor,
  PokemonSize,
  PokemonType,
  WebviewMessage,
} from '../../common/types';
import { VSCODE_POKEMON_DELETE_POKEMON_COMMAND } from '../../constants/vscode-keys.constant';
import { CommandDeps, PokemonQuickPickItem } from './types/index';

interface IPokemonInfo {
  type: PokemonType;
  name: string;
  color: PokemonColor;
}

async function handleRemovePokemonMessage(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
  message: WebviewMessage,
) {
  const pokemonList: IPokemonInfo[] = [];
  switch (message.command) {
    case 'list-pokemon':
      message.text.split('\n').forEach((pokemon) => {
        if (!pokemon) {
          return;
        }
        const parts = pokemon.split(',');
        pokemonList.push({
          type: parts[0] as PokemonType,
          name: parts[1],
          color: parts[2] as PokemonColor,
        });
      });
      break;
    default:
      return;
  }

  if (!pokemonList.length) {
    await vscode.window.showErrorMessage(
      vscode.l10n.t('There are no pokemon to remove.'),
    );
    return;
  }

  await vscode.window
    .showQuickPick<PokemonQuickPickItem>(
      pokemonList.map((val) => {
        return new PokemonQuickPickItem(val.name, val.type, val.color);
      }),
      {
        placeHolder: vscode.l10n.t('Select the pokemon to remove.'),
      },
    )
    .then(async (pokemon: PokemonQuickPickItem | undefined) => {
      if (pokemon) {
        const panel = deps.getPokemonPanel();
        if (panel !== undefined) {
          panel.deletePokemon(pokemon.name);
          const collection = pokemonList
            .filter((item) => {
              return item.name !== pokemon.name;
            })
            .map((item) => {
              return new deps.pokemonSpecification(
                item.color,
                item.type,
                PokemonSize.medium,
                item.name,
              );
            });
          await deps.storeCollectionAsMemento(context, collection);
        }
      }
    });
}

export function registerDeletePokemonCommand(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    VSCODE_POKEMON_DELETE_POKEMON_COMMAND,
    async () => {
      const panel = deps.getPokemonPanel();
      if (panel !== undefined) {
        panel.listPokemon();
        deps.getWebview()?.onDidReceiveMessage((message: WebviewMessage) => {
          void handleRemovePokemonMessage(context, deps, message);
        });
      } else {
        await deps.createPokemonPlayground(context);
      }
    },
  );
}
