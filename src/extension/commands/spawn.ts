import * as vscode from 'vscode';
import {
  ExtPosition,
  PokemonColor,
  PokemonGeneration,
  PokemonType,
} from '../../common/types';
import { randomName } from '../../common/names';
import * as localize from '../../common/localize';
import {
  getPokemonByGeneration,
  getRandomPokemonConfig,
  POKEMON_DATA,
} from '../../common/pokemon-data';
import { availableColors } from '../../panel/pokemon-collection';
import { CommandDependencies } from './types';
import {
  VSCODE_SPAWN_POKEMON_KEY,
  VSCODE_SPAWN_RANDOM_POKEMON_KEY,
} from '../../constants/vscode-keys.constant';

const DEFAULT_COLOR = PokemonColor.default;

type GenerationQuickPickItem = vscode.QuickPickItem & {
  isGeneration: true;
  gen: PokemonGeneration;
};

type PokemonQuickPickItem = vscode.QuickPickItem & {
  value: PokemonType;
  isGeneration: false;
};

type SpawnQuickPickItem =
  | GenerationQuickPickItem
  | PokemonQuickPickItem
  | vscode.QuickPickItem;

const isGenerationItem = (
  item: vscode.QuickPickItem,
): item is GenerationQuickPickItem =>
  (item as GenerationQuickPickItem).isGeneration === true;

const isPokemonItem = (
  item: vscode.QuickPickItem,
): item is PokemonQuickPickItem =>
  (item as PokemonQuickPickItem).isGeneration === false &&
  (item as PokemonQuickPickItem).value !== undefined;

export function registerSpawnCommands(deps: CommandDependencies): void {
  const {
    context,
    getConfigurationPosition,
    hasWebviewViewProvider,
    getConfiguredSize,
    getPokemonPanel,
    createPokemonPlayground,
    storeCollectionAsMemento,
    pokemonSpecification,
  } = deps;

  context.subscriptions.push(
    vscode.commands.registerCommand(VSCODE_SPAWN_POKEMON_KEY, async () => {
      const panel = getPokemonPanel();
      if (
        getConfigurationPosition() === ExtPosition.explorer &&
        hasWebviewViewProvider()
      ) {
        await vscode.commands.executeCommand('pokemonView.focus');
      }

      if (panel) {
        const generationItems: GenerationQuickPickItem[] = Object.values(
          PokemonGeneration,
        )
          .filter((gen) => typeof gen === 'number')
          .map((gen) => ({
            label: `$(folder) Generation ${gen}`,
            description: `Browse Gen ${gen} Pokémon`,
            isGeneration: true as const,
            gen: gen as PokemonGeneration,
          }));

        const allPokemonOptions: PokemonQuickPickItem[] = Object.entries(
          POKEMON_DATA,
        ).map(([type, config]) => ({
          label: config.name,
          value: type as PokemonType,
          description: `#${config.id.toString().padStart(4, '0')} - Gen ${
            config.generation
          }`,
          isGeneration: false as const,
        }));

        const qp = vscode.window.createQuickPick<SpawnQuickPickItem>();
        qp.placeholder = vscode.l10n.t(
          'Select a generation or start typing to search for a Pokémon...',
        );
        qp.matchOnDescription = true;

        const setGenerationOnlyItems = () => {
          qp.items = [
            {
              label: 'Generations',
              kind: vscode.QuickPickItemKind.Separator,
            },
            ...generationItems,
          ];
        };

        const setWithSearchResults = (query: string) => {
          const q = query.toLowerCase().trim();
          const results = allPokemonOptions.filter(
            (opt) =>
              opt.label.toLowerCase().includes(q) ||
              (opt.description?.toLowerCase().includes(q) ?? false),
          );
          qp.items = [
            {
              label: 'Generations',
              kind: vscode.QuickPickItemKind.Separator,
            },
            ...generationItems,
            {
              label: 'Results',
              kind: vscode.QuickPickItemKind.Separator,
            },
            ...results,
          ];
        };

        setGenerationOnlyItems();

        let selectedPokemonType: PokemonQuickPickItem | undefined;

        const disposables: vscode.Disposable[] = [];

        disposables.push(
          qp.onDidChangeValue((val) => {
            if (val && val.trim().length > 0) {
              setWithSearchResults(val);
            } else {
              setGenerationOnlyItems();
            }
          }),
        );

        disposables.push(
          qp.onDidAccept(async () => {
            const sel = qp.selectedItems[0];
            if (!sel) {
              qp.hide();
              return;
            }
            if (isGenerationItem(sel)) {
              const pokemonInGeneration = getPokemonByGeneration(
                sel.gen as PokemonGeneration,
              );
              const pokemonOptions: PokemonQuickPickItem[] =
                pokemonInGeneration.map((type) => ({
                  label: POKEMON_DATA[type].name,
                  value: type,
                  description: `#${POKEMON_DATA[type].id
                    .toString()
                    .padStart(4, '0')}`,
                  isGeneration: false as const,
                }));

              disposables.forEach((d) => d.dispose());
              qp.dispose();

              const picked = await vscode.window.showQuickPick(pokemonOptions, {
                placeHolder: vscode.l10n.t('Select a Pokémon'),
              });
              if (picked) {
                const chosenPokemon = picked;
                selectedPokemonType = chosenPokemon;

                var pokemonColor: PokemonColor = DEFAULT_COLOR;
                const possibleColors = availableColors(chosenPokemon.value);

                if (possibleColors.length > 1) {
                  var selectedColor = await vscode.window.showQuickPick(
                    localize.stringListAsQuickPickItemList<PokemonColor>(
                      possibleColors,
                    ),
                    {
                      placeHolder: vscode.l10n.t('Select a color'),
                    },
                  );
                  if (!selectedColor) {
                    console.log(
                      'Cancelled Spawning Pokemon - No Color Selected',
                    );
                    return;
                  }
                  pokemonColor = selectedColor.value;
                } else {
                  pokemonColor = possibleColors[0];
                }

                const name = await vscode.window.showInputBox({
                  placeHolder: vscode.l10n.t('Leave blank for a random name'),
                  prompt: vscode.l10n.t('Name your Pokémon'),
                  value: randomName(),
                });

                if (name === undefined) {
                  console.log('Cancelled Spawning Pokemon - No Name Entered');
                  return;
                }

                const spec = new pokemonSpecification(
                  pokemonColor,
                  chosenPokemon.value,
                  getConfiguredSize(),
                  name,
                );

                panel.spawnPokemon(spec);
                var collection = pokemonSpecification.collectionFromMemento(
                  context,
                  getConfiguredSize(),
                );
                collection.push(spec);
                await storeCollectionAsMemento(context, collection);
              }
            } else if (isPokemonItem(sel)) {
              selectedPokemonType = sel;
              qp.hide();
            } else {
              qp.hide();
              return;
            }
          }),
        );

        const closed = new Promise<void>((resolve) => {
          disposables.push(
            qp.onDidHide(() => {
              disposables.forEach((d) => d.dispose());
              qp.dispose();
              resolve();
            }),
          );
        });

        qp.show();
        await closed;

        if (!selectedPokemonType) {
          console.log('Cancelled Spawning Pokemon - No Selection');
          return;
        }

        if (!selectedPokemonType) {
          console.log('Cancelled Spawning Pokemon - No Pokémon Selected');
          return;
        }

        var pokemonColor: PokemonColor = DEFAULT_COLOR;
        const possibleColors = availableColors(selectedPokemonType.value);

        if (possibleColors.length > 1) {
          var selectedColor = await vscode.window.showQuickPick(
            localize.stringListAsQuickPickItemList<PokemonColor>(
              possibleColors,
            ),
            {
              placeHolder: vscode.l10n.t('Select a color'),
            },
          );
          if (!selectedColor) {
            console.log('Cancelled Spawning Pokemon - No Color Selected');
            return;
          }
          pokemonColor = selectedColor.value;
        } else {
          pokemonColor = possibleColors[0];
        }

        const name = await vscode.window.showInputBox({
          placeHolder: vscode.l10n.t('Leave blank for a random name'),
          prompt: vscode.l10n.t('Name your Pokémon'),
          value: randomName(),
        });

        if (name === undefined) {
          console.log('Cancelled Spawning Pokemon - No Name Entered');
          return;
        }

        const spec = new pokemonSpecification(
          pokemonColor,
          selectedPokemonType.value,
          getConfiguredSize(),
          name,
        );

        panel.spawnPokemon(spec);
        var collection = pokemonSpecification.collectionFromMemento(
          context,
          getConfiguredSize(),
        );
        collection.push(spec);
        await storeCollectionAsMemento(context, collection);
      } else {
        await createPokemonPlayground(context);
        await vscode.window.showInformationMessage(
          vscode.l10n.t(
            "A Pokemon Playground has been created. You can now use the 'Spawn Additional Pokemon' Command to add more Pokemon.",
          ),
        );
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      VSCODE_SPAWN_RANDOM_POKEMON_KEY,
      async () => {
        const panel = getPokemonPanel();
        if (
          getConfigurationPosition() === ExtPosition.explorer &&
          hasWebviewViewProvider()
        ) {
          await vscode.commands.executeCommand('pokemonView.focus');
        }
        if (panel) {
          var [randomPokemonType, randomPokemonConfig] =
            getRandomPokemonConfig();
          const spec = new pokemonSpecification(
            randomPokemonConfig.possibleColors[0],
            randomPokemonType,
            getConfiguredSize(),
            randomPokemonConfig.name,
          );

          panel.spawnPokemon(spec);
          var collection = pokemonSpecification.collectionFromMemento(
            context,
            getConfiguredSize(),
          );
          collection.push(spec);
          await storeCollectionAsMemento(context, collection);
        } else {
          await createPokemonPlayground(context);
          await vscode.window.showInformationMessage(
            vscode.l10n.t(
              "A Pokemon Playground has been created. You can now use the 'Remove All Pokemon' Command to remove all Pokemon.",
            ),
          );
        }
      },
    ),
  );
}
