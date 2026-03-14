import * as vscode from 'vscode';
import * as localize from '../../common/localize';
import { randomName } from '../../common/names';
import { getPokemonByGeneration } from '../../common/pokemon-data';
import {
  ExtPosition,
  PokemonGeneration,
  PokemonType,
} from '../../common/types';
import { POKEMON_DATA } from '../../common/dex/index';
import { availableColors } from '../../panel/pokemon-collection';
import {
  VSCODE_POKEMON_SPAWN_POKEMON_COMMAND,
  VSCODE_POKEMON_VIEW_ID,
} from '../../constants/vscode-keys.constant';
import { CommandDeps, GenerationQuickPickItem } from './types/index';

export function registerSpawnPokemonCommand(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): vscode.Disposable {
  return vscode.commands.registerCommand(
    VSCODE_POKEMON_SPAWN_POKEMON_COMMAND,
    async () => {
      const panel = deps.getPokemonPanel();
      if (
        deps.getConfigurationPosition() === ExtPosition.explorer &&
        deps.hasWebviewViewProvider()
      ) {
        await vscode.commands.executeCommand(`${VSCODE_POKEMON_VIEW_ID}.focus`);
      }

      if (!panel) {
        await deps.createPokemonPlayground(context);
        await vscode.window.showInformationMessage(
          vscode.l10n.t(
            "A Pokemon Playground has been created. You can now use the 'Spawn Additional Pokemon' Command to add more Pokemon.",
          ),
        );
        return;
      }

      const generationItems: Array<
        vscode.QuickPickItem & {
          isGeneration: true;
          gen: PokemonGeneration;
        }
      > = Object.values(PokemonGeneration)
        .filter((gen) => typeof gen === 'number')
        .map((gen) => ({
          label: `$(folder) ${vscode.l10n.t('Generation {0}', gen)}`,
          description: vscode.l10n.t('Browse Gen {0} Pokemon', gen),
          isGeneration: true as const,
          gen: gen as PokemonGeneration,
        }));

      const allPokemonOptions: Array<
        vscode.QuickPickItem & { value: PokemonType; isGeneration: false }
      > = Object.entries(POKEMON_DATA).map(([type, config]) => ({
        label: localize.getLocalizedPokemonName(type as PokemonType),
        value: type as PokemonType,
        description: `#${config.id.toString().padStart(4, '0')} - Gen ${config.generation}`,
        isGeneration: false as const,
      }));

      const qp = vscode.window.createQuickPick<GenerationQuickPickItem>();
      qp.placeholder = vscode.l10n.t(
        'Select a generation or start typing to search for a Pokemon...',
      );
      qp.matchOnDescription = true;

      const setGenerationOnlyItems = () => {
        qp.items = [
          {
            label: vscode.l10n.t('Generations'),
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
            label: vscode.l10n.t('Generations'),
            kind: vscode.QuickPickItemKind.Separator,
          },
          ...generationItems,
          {
            label: vscode.l10n.t('Results'),
            kind: vscode.QuickPickItemKind.Separator,
          },
          ...results,
        ];
      };

      setGenerationOnlyItems();

      let selectedPokemonType:
        | { label: string; value: PokemonType }
        | undefined;
      const disposables: vscode.Disposable[] = [];

      const spawnSelectedPokemon = async (pokemonType: PokemonType) => {
        const possibleColors = availableColors(pokemonType);

        const name = await vscode.window.showInputBox({
          placeHolder: vscode.l10n.t('Leave blank for a random name'),
          prompt: vscode.l10n.t('Name your Pokemon'),
          value: randomName(),
        });

        if (name === undefined) {
          console.log('Cancelled Spawning Pokemon - No Name Entered');
          return;
        }

        const spec = new deps.pokemonSpecification(
          deps.maybeMakeShiny(possibleColors),
          pokemonType,
          deps.getConfiguredSize(),
          name,
        );

        panel.spawnPokemon(spec);
        const collection = deps.pokemonSpecification.collectionFromMemento(
          context,
          deps.getConfiguredSize(),
        );
        collection.push(spec);
        await deps.storeCollectionAsMemento(context, collection);
      };

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
          const sel = qp.selectedItems[0] as
            | GenerationQuickPickItem
            | undefined;
          if (!sel) {
            qp.hide();
            return;
          }

          if (sel.isGeneration) {
            const pokemonInGeneration = getPokemonByGeneration(
              sel.gen as PokemonGeneration,
            );
            const pokemonOptions = pokemonInGeneration.map((type) => ({
              label: localize.getLocalizedPokemonName(type),
              value: type,
              description: `#${POKEMON_DATA[type].id.toString().padStart(4, '0')}`,
            }));

            disposables.forEach((d) => d.dispose());
            qp.dispose();

            const picked = await vscode.window.showQuickPick(pokemonOptions, {
              placeHolder: vscode.l10n.t('Select a Pokemon'),
            });
            if (picked) {
              await spawnSelectedPokemon(picked.value);
            }
          } else {
            selectedPokemonType = sel as { label: string; value: PokemonType };
            qp.hide();
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

      await spawnSelectedPokemon(selectedPokemonType.value);
    },
  );
}
