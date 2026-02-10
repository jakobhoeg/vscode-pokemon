import * as vscode from 'vscode';
import {
  PokemonColor,
  PokemonSize,
  PokemonType,
  WebviewMessage,
} from '../../common/types';
import { CommandDependencies } from './types';
import {
  VSCODE_DELETE_POKEMON_KEY,
  VSCODE_REMOVE_ALL_POKEMON_KEY,
} from '../../constants/vscode-keys.constant';

class PokemonQuickPickItem implements vscode.QuickPickItem {
  constructor(
    public readonly name_: string,
    public readonly type: string,
    public readonly color: string,
  ) {
    this.name = name_;
    this.label = name_;
    this.description = `${color} ${type}`;
  }

  name: string;
  label: string;
  kind?: vscode.QuickPickItemKind | undefined;
  description?: string | undefined;
  detail?: string | undefined;
  picked?: boolean | undefined;
  alwaysShow?: boolean | undefined;
  buttons?: readonly vscode.QuickInputButton[] | undefined;
}

interface IPokemonInfo {
  type: PokemonType;
  name: string;
  color: PokemonColor;
}

async function handleRemovePokemonMessage(
  deps: CommandDependencies,
  message: WebviewMessage,
) {
  var pokemonList: IPokemonInfo[] = [];
  switch (message.command) {
    case 'list-pokemon':
      message.text.split('\n').forEach((pokemon) => {
        if (!pokemon) {
          return;
        }
        var parts = pokemon.split(',');
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
  if (!pokemonList) {
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
          await deps.storeCollectionAsMemento(deps.context, collection);
        }
      }
    });
}

export function registerRemovalCommands(deps: CommandDependencies): void {
  const { context, getPokemonPanel, getWebview, createPokemonPlayground } =
    deps;

  context.subscriptions.push(
    vscode.commands.registerCommand(VSCODE_DELETE_POKEMON_KEY, async () => {
      const panel = getPokemonPanel();
      if (panel !== undefined) {
        panel.listPokemon();
        getWebview()?.onDidReceiveMessage((message) => {
          void handleRemovePokemonMessage(deps, message);
        });
      } else {
        await createPokemonPlayground(context);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(VSCODE_REMOVE_ALL_POKEMON_KEY, async () => {
      const panel = getPokemonPanel();
      if (panel !== undefined) {
        panel.resetPokemon();
        await deps.storeCollectionAsMemento(context, []);
      } else {
        await createPokemonPlayground(context);
        await vscode.window.showInformationMessage(
          vscode.l10n.t(
            "A Pokemon Playground has been created. You can now use the 'Remove All Pokemon' Command to remove all Pokemon.",
          ),
        );
      }
    }),
  );
}
