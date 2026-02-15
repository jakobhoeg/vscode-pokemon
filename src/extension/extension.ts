import * as vscode from 'vscode';
import { ColorThemeKind } from 'vscode';
import * as localize from '../common/localize';
import { randomName } from '../common/names';
import {
  getDefaultPokemon as getDefaultPokemonType,
  getPokemonByGeneration,
  getRandomPokemonConfig,
  POKEMON_DATA,
} from '../common/pokemon-data';
import {
  ALL_COLORS,
  ALL_SCALES,
  ALL_THEMES,
  ExtPosition,
  PokemonColor,
  PokemonGeneration,
  PokemonSize,
  PokemonType,
  Theme,
  WebviewMessage,
} from '../common/types';
import {
  VSCODE_CHANGE_POKEMON_LANGUAGE_KEY,
  VSCODE_CONFIGURE_KEYBINDINGS_KEY,
  VSCODE_DELETE_POKEMON_KEY,
  VSCODE_EXPORT_POKEMON_LIST_KEY,
  VSCODE_IMPORT_POKEMON_LIST_KEY,
  VSCODE_MANAGE_PRESETS_KEY,
  VSCODE_PRESETS_KEY,
  VSCODE_REMOVE_ALL_POKEMON_KEY,
  VSCODE_ROLL_CALL_KEY,
  VSCODE_SPAWN_POKEMON_KEY,
  VSCODE_SPAWN_RANDOM_POKEMON_KEY,
  VSCODE_START_KEY,
} from '../constants/vscode-keys';
import { availableColors, normalizeColor } from '../panel/pokemon-collection';

const EXTRA_POKEMON_KEY = 'vscode-pokemon.extra-pokemon';
const EXTRA_POKEMON_KEY_TYPES = EXTRA_POKEMON_KEY + '.types';
const EXTRA_POKEMON_KEY_COLORS = EXTRA_POKEMON_KEY + '.colors';
const EXTRA_POKEMON_KEY_NAMES = EXTRA_POKEMON_KEY + '.names';
const DEFAULT_POKEMON_SCALE = PokemonSize.medium;
const DEFAULT_COLOR = PokemonColor.default;
const DEFAULT_POKEMON_TYPE = getDefaultPokemonType();
const DEFAULT_POSITION = ExtPosition.panel;
const DEFAULT_THEME = Theme.none;

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

let webviewViewProvider: PokemonWebviewViewProvider;

function getConfiguredSize(): PokemonSize {
  var size = vscode.workspace
    .getConfiguration('vscode-pokemon')
    .get<PokemonSize>('pokemonSize', DEFAULT_POKEMON_SCALE);
  if (ALL_SCALES.lastIndexOf(size) === -1) {
    size = DEFAULT_POKEMON_SCALE;
  }
  return size;
}

function getConfiguredTheme(): Theme {
  var theme = vscode.workspace
    .getConfiguration('vscode-pokemon')
    .get<Theme>('theme', DEFAULT_THEME);
  if (ALL_THEMES.lastIndexOf(theme) === -1) {
    theme = DEFAULT_THEME;
  }
  return theme;
}

function getConfiguredThemeKind(): ColorThemeKind {
  return vscode.window.activeColorTheme.kind;
}

function getConfigurationPosition() {
  return vscode.workspace
    .getConfiguration('vscode-pokemon')
    .get<ExtPosition>('position', DEFAULT_POSITION);
}

function getThrowWithMouseConfiguration(): boolean {
  return vscode.workspace
    .getConfiguration('vscode-pokemon')
    .get<boolean>('throwBallWithMouse', true);
}

function getConfiguredShinyOdds(): number {
  return vscode.workspace
    .getConfiguration('vscode-pokemon')
    .get<number>('shinyOdds', 8192);
}

function maybeMakeShiny(possibleColors: PokemonColor[]): PokemonColor {
  if (possibleColors.includes(PokemonColor.shiny)) {
    const shinyOdds = getConfiguredShinyOdds();
    if (Math.floor(Math.random() * shinyOdds) === 0) {
      return PokemonColor.shiny;
    }
  }
  return possibleColors[0];
}

interface IDefaultPokemonConfig {
  type: PokemonType;
  name?: string;
}

interface IPresetPokemon {
  color: PokemonColor;
  type: PokemonType;
  size: PokemonSize;
  name: string;
  generation?: string;
  originalSpriteSize?: number;
}

interface IPreset {
  name: string;
  pokemon: IPresetPokemon[];
}

function getConfiguredDefaultPokemon(): PokemonSpecification[] {
  const defaultConfig = vscode.workspace
    .getConfiguration('vscode-pokemon')
    .get<IDefaultPokemonConfig[]>('defaultPokemon', []);

  const size = getConfiguredSize();
  const result: PokemonSpecification[] = [];

  for (const config of defaultConfig) {
    // Validate that the pokemon type exists
    if (POKEMON_DATA[config.type]) {
      const name = config.name || randomName();
      result.push(
        new PokemonSpecification(DEFAULT_COLOR, config.type, size, name),
      );
    } else {
      console.warn(
        `Invalid pokemon type in defaultPokemon config: ${config.type}`,
      );
    }
  }

  return result;
}

function updatePanelThrowWithMouse(): void {
  const panel = getPokemonPanel();
  if (panel !== undefined) {
    panel.setThrowWithMouse(getThrowWithMouseConfiguration());
  }
}

async function updateExtensionPositionContext() {
  await vscode.commands.executeCommand(
    'setContext',
    'vscode-pokemon.position',
    getConfigurationPosition(),
  );
}

export class PokemonSpecification {
  color: PokemonColor;
  type: PokemonType;
  size: PokemonSize;
  name: string;
  generation: string;
  originalSpriteSize: number;

  constructor(
    color: PokemonColor,
    type: PokemonType,
    size: PokemonSize,
    name?: string,
    generation?: string,
  ) {
    this.color = color;
    this.type = type;
    this.size = size;
    if (!name) {
      this.name = randomName();
    } else {
      this.name = name;
    }
    this.generation = generation || `gen${POKEMON_DATA[type].generation}`;
    this.originalSpriteSize = POKEMON_DATA[type].originalSpriteSize || 32;
  }

  static fromConfiguration(): PokemonSpecification {
    var color = vscode.workspace
      .getConfiguration('vscode-pokemon')
      .get<PokemonColor>('pokemonColor', DEFAULT_COLOR);
    if (ALL_COLORS.lastIndexOf(color) === -1) {
      color = DEFAULT_COLOR;
    }
    var type = vscode.workspace
      .getConfiguration('vscode-pokemon')
      .get<PokemonType>('pokemonType', DEFAULT_POKEMON_TYPE);

    // Use POKEMON_DATA to validate the type
    if (!POKEMON_DATA[type]) {
      type = DEFAULT_POKEMON_TYPE;
    }

    return new PokemonSpecification(color, type, getConfiguredSize());
  }

  static collectionFromMemento(
    context: vscode.ExtensionContext,
    size: PokemonSize,
  ): PokemonSpecification[] {
    var contextTypes = context.globalState.get<PokemonType[]>(
      EXTRA_POKEMON_KEY_TYPES,
      [],
    );
    var contextColors = context.globalState.get<PokemonColor[]>(
      EXTRA_POKEMON_KEY_COLORS,
      [],
    );
    var contextNames = context.globalState.get<string[]>(
      EXTRA_POKEMON_KEY_NAMES,
      [],
    );
    var result: PokemonSpecification[] = [];
    for (let index = 0; index < contextTypes.length; index++) {
      result.push(
        new PokemonSpecification(
          contextColors?.[index] ?? DEFAULT_COLOR,
          contextTypes[index],
          size,
          contextNames[index],
        ),
      );
    }
    return result;
  }
}

export async function storeCollectionAsMemento(
  context: vscode.ExtensionContext,
  collection: PokemonSpecification[],
) {
  var contextTypes = new Array(collection.length);
  var contextColors = new Array(collection.length);
  var contextNames = new Array(collection.length);
  for (let index = 0; index < collection.length; index++) {
    contextTypes[index] = collection[index].type;
    contextColors[index] = collection[index].color;
    contextNames[index] = collection[index].name;
  }
  await context.globalState.update(EXTRA_POKEMON_KEY_TYPES, contextTypes);
  await context.globalState.update(EXTRA_POKEMON_KEY_COLORS, contextColors);
  await context.globalState.update(EXTRA_POKEMON_KEY_NAMES, contextNames);
  context.globalState.setKeysForSync([
    EXTRA_POKEMON_KEY_TYPES,
    EXTRA_POKEMON_KEY_COLORS,
    EXTRA_POKEMON_KEY_NAMES,
  ]);
}

function loadPresets(context: vscode.ExtensionContext): IPreset[] {
  return context.globalState.get<IPreset[]>(VSCODE_PRESETS_KEY, []);
}

async function storePresets(
  context: vscode.ExtensionContext,
  presets: IPreset[],
) {
  await context.globalState.update(VSCODE_PRESETS_KEY, presets);
}

let spawnPokemonStatusBar: vscode.StatusBarItem;

interface IPokemonInfo {
  type: PokemonType;
  name: string;
  color: PokemonColor;
}

async function handleRemovePokemonMessage(
  this: vscode.ExtensionContext,
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
        const panel = getPokemonPanel();
        if (panel !== undefined) {
          panel.deletePokemon(pokemon.name);
          const collection = pokemonList
            .filter((item) => {
              return item.name !== pokemon.name;
            })
            .map<PokemonSpecification>((item) => {
              return new PokemonSpecification(
                item.color,
                item.type,
                PokemonSize.medium,
                item.name,
              );
            });
          await storeCollectionAsMemento(this, collection);
        }
      }
    });
}

function getPokemonPanel(): IPokemonPanel | undefined {
  if (
    getConfigurationPosition() === ExtPosition.explorer &&
    webviewViewProvider
  ) {
    return webviewViewProvider;
  } else if (PokemonPanel.currentPanel) {
    return PokemonPanel.currentPanel;
  } else {
    return undefined;
  }
}

function getWebview(): vscode.Webview | undefined {
  if (
    getConfigurationPosition() === ExtPosition.explorer &&
    webviewViewProvider
  ) {
    return webviewViewProvider.getWebview();
  } else if (PokemonPanel.currentPanel) {
    return PokemonPanel.currentPanel.getWebview();
  }
}

export function activate(context: vscode.ExtensionContext) {
  // Reset the Pokemon translations cache at startup to load the correct language
  localize.resetPokemonTranslationsCache();

  context.subscriptions.push(
    vscode.commands.registerCommand(VSCODE_MANAGE_PRESETS_KEY, async () => {
      const presets = loadPresets(context);
      const CREATE_ACTION = '__create__';
      const DELETE_ACTION = '__delete__';

      const items: Array<vscode.QuickPickItem & { action?: string }> = [
        ...presets.map((p) => ({
          label: p.name,
          description: `${p.pokemon.length} Pokémon`,
        })),
        {
          label: `$(plus) ${vscode.l10n.t('Create preset from current collection')}`,
          description: vscode.l10n.t(
            'Create a named preset from your saved collection',
          ),
          action: CREATE_ACTION,
        },
        {
          label: `$(trash) ${vscode.l10n.t('Delete a preset')}`,
          description: vscode.l10n.t('Remove an existing preset'),
          action: DELETE_ACTION,
        },
      ];

      const pick = await vscode.window.showQuickPick(items, {
        placeHolder: vscode.l10n.t('Select a preset to spawn or an action'),
      });
      if (!pick) {
        return;
      }

      if (pick.action === CREATE_ACTION) {
        const collection = PokemonSpecification.collectionFromMemento(
          context,
          getConfiguredSize(),
        );
        if (collection.length === 0) {
          await vscode.window.showInformationMessage(
            vscode.l10n.t('No Pokémon in saved collection to create a preset.'),
          );
          return;
        }
        const name = await vscode.window.showInputBox({
          prompt: vscode.l10n.t('Preset name'),
        });
        if (!name) {
          return;
        }
        const preset: IPreset = {
          name,
          pokemon: collection.map((spec) => ({
            color: spec.color,
            type: spec.type,
            size: spec.size,
            name: spec.name,
            generation: spec.generation,
            originalSpriteSize: spec.originalSpriteSize,
          })),
        };
        presets.push(preset);
        await storePresets(context, presets);
        await vscode.window.showInformationMessage(
          vscode.l10n.t('Preset saved.'),
        );
        return;
      }

      if (pick.action === DELETE_ACTION) {
        if (presets.length === 0) {
          await vscode.window.showInformationMessage(
            vscode.l10n.t('No presets to delete.'),
          );
          return;
        }
        const toDelete = await vscode.window.showQuickPick(
          presets.map((p) => p.name),
          { placeHolder: vscode.l10n.t('Select preset to delete') },
        );
        if (!toDelete) {
          return;
        }
        const updated = presets.filter((p) => p.name !== toDelete);
        await storePresets(context, updated);
        await vscode.window.showInformationMessage(
          vscode.l10n.t('Preset deleted.'),
        );
        return;
      }

      const preset = presets.find((p) => p.name === pick.label);
      if (!preset) {
        return;
      }

      const panel = getPokemonPanel();
      if (!panel) {
        await createPokemonPlayground(context);
      }

      const spawnSpecs: PokemonSpecification[] = [];
      for (const p of preset.pokemon) {
        const spec = new PokemonSpecification(
          p.color,
          p.type,
          p.size,
          p.name,
          p.generation,
        );
        spec.originalSpriteSize =
          p.originalSpriteSize ?? spec.originalSpriteSize;
        spawnSpecs.push(spec);
        getPokemonPanel()?.spawnPokemon(spec);
      }

      // Merge into saved collection and persist
      const existing = PokemonSpecification.collectionFromMemento(
        context,
        getConfiguredSize(),
      );
      for (const s of spawnSpecs) {
        existing.push(s);
      }
      await storeCollectionAsMemento(context, existing);
    }),

    vscode.commands.registerCommand(VSCODE_START_KEY, async () => {
      if (
        getConfigurationPosition() === ExtPosition.explorer &&
        webviewViewProvider
      ) {
        await vscode.commands.executeCommand('pokemonView.focus');
      } else {
        const spec = PokemonSpecification.fromConfiguration();
        PokemonPanel.createOrShow(
          context.extensionUri,
          spec.color,
          spec.type,
          spec.size,
          spec.generation,
          spec.originalSpriteSize,
          getConfiguredTheme(),
          getConfiguredThemeKind(),
          getThrowWithMouseConfiguration(),
        );

        if (PokemonPanel.currentPanel) {
          // First, check if there are saved pokemon from previous session
          let collection = PokemonSpecification.collectionFromMemento(
            context,
            getConfiguredSize(),
          );

          if (collection.length === 0) {
            // Fall back to configured default pokemon if no saved session
            collection = getConfiguredDefaultPokemon();
          }

          collection.forEach((item) => {
            PokemonPanel.currentPanel?.spawnPokemon(item);
          });
          // Store the collection in the memento, incase any of the null values (e.g. name) have been set
          await storeCollectionAsMemento(context, collection);
        }
      }
    }),
  );

  spawnPokemonStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  spawnPokemonStatusBar.command = VSCODE_SPAWN_POKEMON_KEY;
  context.subscriptions.push(spawnPokemonStatusBar);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateStatusBar),
  );
  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection(updateStatusBar),
  );
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(updateExtensionPositionContext),
  );
  updateStatusBar();

  const spec = PokemonSpecification.fromConfiguration();
  webviewViewProvider = new PokemonWebviewViewProvider(
    context,
    context.extensionUri,
    spec.color,
    spec.type,
    spec.size,
    spec.generation,
    spec.originalSpriteSize,
    getConfiguredTheme(),
    getConfiguredThemeKind(),
    getThrowWithMouseConfiguration(),
  );
  updateExtensionPositionContext().catch((e) => {
    console.error(e);
  });

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      PokemonWebviewViewProvider.viewType,
      webviewViewProvider,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(VSCODE_DELETE_POKEMON_KEY, async () => {
      const panel = getPokemonPanel();
      if (panel !== undefined) {
        panel.listPokemon();
        getWebview()?.onDidReceiveMessage(handleRemovePokemonMessage, context);
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
        await storeCollectionAsMemento(context, []);
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

  context.subscriptions.push(
    vscode.commands.registerCommand(VSCODE_ROLL_CALL_KEY, async () => {
      const panel = getPokemonPanel();
      if (panel !== undefined) {
        panel.rollCall();
      } else {
        await createPokemonPlayground(context);
      }
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      VSCODE_CONFIGURE_KEYBINDINGS_KEY,
      async () => {
        const items: Array<vscode.QuickPickItem & { commandId: string }> = [
          {
            label: vscode.l10n.t('Spawn additional pokemon'),
            description: VSCODE_SPAWN_POKEMON_KEY,
            commandId: VSCODE_SPAWN_POKEMON_KEY,
          },
          {
            label: vscode.l10n.t('Spawn random pokemon'),
            description: VSCODE_SPAWN_RANDOM_POKEMON_KEY,
            commandId: VSCODE_SPAWN_RANDOM_POKEMON_KEY,
          },
          {
            label: vscode.l10n.t('Remove pokemon'),
            description: VSCODE_DELETE_POKEMON_KEY,
            commandId: VSCODE_DELETE_POKEMON_KEY,
          },
          {
            label: vscode.l10n.t('Remove all pokemon'),
            description: VSCODE_REMOVE_ALL_POKEMON_KEY,
            commandId: VSCODE_REMOVE_ALL_POKEMON_KEY,
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
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      VSCODE_CHANGE_POKEMON_LANGUAGE_KEY,
      async () => {
        const config = vscode.workspace.getConfiguration('vscode-pokemon');
        const currentLanguage = config.get<string>('pokemonLanguage', 'auto');

        // Language display names and flags (official Pokemon languages only)
        /* eslint-disable @typescript-eslint/naming-convention */
        const languageLabels: {
          [key: string]: { label: string; description: string };
        } = {
          auto: {
            label: '$(globe) Auto',
            description: vscode.l10n.t('Use VS Code language'),
          },
          'en-US': {
            label: '🇺🇸 English (US)',
            description: vscode.l10n.t('English names'),
          },
          'fr-FR': {
            label: '🇫🇷 Français (FR)',
            description: vscode.l10n.t('French names'),
          },
          'de-DE': {
            label: '🇩🇪 Deutsch (DE)',
            description: vscode.l10n.t('German names'),
          },
          'ja-JP': {
            label: '🇯🇵 日本語 (JP)',
            description: vscode.l10n.t('Japanese names'),
          },
        } as { [key: string]: { label: string; description: string } };
        /* eslint-enable @typescript-eslint/naming-convention */

        const languageOptions: Array<vscode.QuickPickItem & { value: string }> =
          [
            {
              label: languageLabels['auto'].label,
              description: languageLabels['auto'].description,
              detail:
                currentLanguage === 'auto'
                  ? vscode.l10n.t('Current')
                  : undefined,
              value: 'auto',
            },
            ...localize.SUPPORTED_LOCALES.map((locale) => ({
              label: languageLabels[locale]?.label || locale,
              description: languageLabels[locale]?.description || locale,
              detail:
                currentLanguage === locale
                  ? vscode.l10n.t('Current')
                  : undefined,
              value: locale,
            })),
          ];

        const picked = await vscode.window.showQuickPick(languageOptions, {
          placeHolder: vscode.l10n.t('Select language for Pokemon names'),
        });

        if (!picked) {
          return;
        }

        // Update configuration persistently
        await config.update(
          'pokemonLanguage',
          picked.value,
          vscode.ConfigurationTarget.Global,
        );

        // Reset translation cache to force reload
        localize.resetPokemonTranslationsCache();

        // Preload translations with the new language
        // This ensures the cache is immediately available
        const testPokemon: PokemonType = 'bulbasaur';
        localize.getLocalizedPokemonName(testPokemon);

        await vscode.window.showInformationMessage(
          vscode.l10n.t(
            'Pokemon language changed to {0}. The change will persist after restart.',
            picked.label,
          ),
        );
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      VSCODE_EXPORT_POKEMON_LIST_KEY,
      async () => {
        const pokemonCollection = PokemonSpecification.collectionFromMemento(
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

            // load the pokemon into the collection
            var collection = PokemonSpecification.collectionFromMemento(
              context,
              getConfiguredSize(),
            );
            // fetch just the pokemon types
            const panel = getPokemonPanel();
            for (let i = 0; i < pokemonToLoad.length; i++) {
              const pokemon = pokemonToLoad[i];
              const pokemonSpec = new PokemonSpecification(
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } catch (e: any) {
            await vscode.window.showErrorMessage(
              vscode.l10n.t('Failed to import pokemon: {0}', e?.message),
            );
          }
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(VSCODE_SPAWN_POKEMON_KEY, async () => {
      const panel = getPokemonPanel();
      if (
        getConfigurationPosition() === ExtPosition.explorer &&
        webviewViewProvider
      ) {
        await vscode.commands.executeCommand('pokemonView.focus');
      }
      if (panel) {
        // Dynamic QuickPick: show only generations by default; reveal Pokémon matches when typing
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

        const qp = vscode.window.createQuickPick<
          vscode.QuickPickItem & {
            isGeneration?: boolean;
            gen?: PokemonGeneration;
            value?: PokemonType;
          }
        >();
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sel = qp.selectedItems[0] as any;
            if (!sel) {
              qp.hide();
              return;
            }
            if (sel.isGeneration) {
              // Don't hide the first quick pick yet - dispose it manually
              const pokemonInGeneration = getPokemonByGeneration(
                sel.gen as PokemonGeneration,
              );
              const pokemonOptions = pokemonInGeneration.map((type) => ({
                label: localize.getLocalizedPokemonName(type),
                value: type,
                description: `#${POKEMON_DATA[type].id
                  .toString()
                  .padStart(4, '0')}`,
              }));

              // Manually dispose the first quick pick to prevent race condition
              disposables.forEach((d) => d.dispose());
              qp.dispose();

              const picked = await vscode.window.showQuickPick(pokemonOptions, {
                placeHolder: vscode.l10n.t('Select a Pokemon'),
              });
              if (picked) {
                selectedPokemonType = picked;

                // Handle the rest of the flow
                const possibleColors = availableColors(
                  selectedPokemonType.value,
                );

                const name = await vscode.window.showInputBox({
                  placeHolder: vscode.l10n.t('Leave blank for a random name'),
                  prompt: vscode.l10n.t('Name your Pokemon'),
                  value: randomName(),
                });

                if (name === undefined) {
                  console.log('Cancelled Spawning Pokemon - No Name Entered');
                  return;
                }

                const spec = new PokemonSpecification(
                  maybeMakeShiny(possibleColors),
                  selectedPokemonType.value,
                  getConfiguredSize(),
                  name,
                );

                panel.spawnPokemon(spec);
                var collection = PokemonSpecification.collectionFromMemento(
                  context,
                  getConfiguredSize(),
                );
                collection.push(spec);
                await storeCollectionAsMemento(context, collection);
              }
            } else {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              selectedPokemonType = sel as any;
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

        if (!selectedPokemonType) {
          console.log('Cancelled Spawning Pokemon - No Pokemon Selected');
          return;
        }

        // Rest of the existing code
        const possibleColors = availableColors(selectedPokemonType.value);

        const name = await vscode.window.showInputBox({
          placeHolder: vscode.l10n.t('Leave blank for a random name'),
          prompt: vscode.l10n.t('Name your Pokemon'),
          value: randomName(),
        });

        if (name === undefined) {
          console.log('Cancelled Spawning Pokemon - No Name Entered');
          return;
        }

        const spec = new PokemonSpecification(
          maybeMakeShiny(possibleColors),
          selectedPokemonType.value,
          getConfiguredSize(),
          name,
        );

        panel.spawnPokemon(spec);
        var collection = PokemonSpecification.collectionFromMemento(
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
          webviewViewProvider
        ) {
          await vscode.commands.executeCommand('pokemonView.focus');
        }
        if (panel) {
          var [randomPokemonType, randomPokemonConfig] =
            getRandomPokemonConfig();
          const spec = new PokemonSpecification(
            maybeMakeShiny(randomPokemonConfig.possibleColors),
            randomPokemonType,
            getConfiguredSize(),
            randomPokemonConfig.name,
          );

          panel.spawnPokemon(spec);
          var collection = PokemonSpecification.collectionFromMemento(
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

  // Listening to configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(
      (e: vscode.ConfigurationChangeEvent): void => {
        if (
          e.affectsConfiguration('vscode-pokemon.pokemonColor') ||
          e.affectsConfiguration('vscode-pokemon.pokemonType') ||
          e.affectsConfiguration('vscode-pokemon.pokemonSize') ||
          e.affectsConfiguration('vscode-pokemon.theme') ||
          e.affectsConfiguration('workbench.colorTheme')
        ) {
          const spec = PokemonSpecification.fromConfiguration();
          const panel = getPokemonPanel();
          if (panel) {
            panel.updatePokemonColor(spec.color);
            panel.updatePokemonSize(spec.size);
            panel.updatePokemonType(spec.type);
            panel.updateTheme(getConfiguredTheme(), getConfiguredThemeKind());
            panel.update();
          }
        }

        if (e.affectsConfiguration('vscode-pokemon.position')) {
          void updateExtensionPositionContext();
        }

        if (e.affectsConfiguration('vscode-pokemon.throwBallWithMouse')) {
          updatePanelThrowWithMouse();
        }

        if (e.affectsConfiguration('vscode-pokemon.pokemonLanguage')) {
          // Reset the Pokemon translations cache when the language changes
          localize.resetPokemonTranslationsCache();
          // Update the panel to reflect the new language
          const panel = getPokemonPanel();
          if (panel) {
            panel.update();
          }
        }
      },
    ),
  );

  if (vscode.window.registerWebviewPanelSerializer) {
    // Make sure we register a serializer in activation event
    vscode.window.registerWebviewPanelSerializer(PokemonPanel.viewType, {
      async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel) {
        // Reset the webview options so we use latest uri for `localResourceRoots`.
        webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
        const spec = PokemonSpecification.fromConfiguration();
        PokemonPanel.revive(
          webviewPanel,
          context.extensionUri,
          spec.color,
          spec.type,
          spec.size,
          spec.generation,
          spec.originalSpriteSize,
          getConfiguredTheme(),
          getConfiguredThemeKind(),
          getThrowWithMouseConfiguration(),
        );
      },
    });
  }
}

function updateStatusBar(): void {
  spawnPokemonStatusBar.text = `$(squirrel)`;
  spawnPokemonStatusBar.tooltip = vscode.l10n.t('Spawn Pokemon');
  spawnPokemonStatusBar.show();
}

export function spawnPokemonDeactivate() {
  spawnPokemonStatusBar.dispose();
}

function getWebviewOptions(
  extensionUri: vscode.Uri,
): vscode.WebviewOptions & vscode.WebviewPanelOptions {
  return {
    // Enable javascript in the webview
    enableScripts: true,
    // And restrict the webview to only loading content from our extension's `media` directory.
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
  };
}

interface IPokemonPanel {
  // throwBall(): void;
  resetPokemon(): void;
  spawnPokemon(spec: PokemonSpecification): void;
  deletePokemon(pokemonName: string): void;
  listPokemon(): void;
  rollCall(): void;
  themeKind(): vscode.ColorThemeKind;
  throwBallWithMouse(): boolean;
  updatePokemonColor(newColor: PokemonColor): void;
  updatePokemonType(newType: PokemonType): void;
  updatePokemonSize(newSize: PokemonSize): void;
  updateTheme(newTheme: Theme, themeKind: vscode.ColorThemeKind): void;
  update(): void;
  setThrowWithMouse(newThrowWithMouse: boolean): void;
}

class PokemonWebviewContainer implements IPokemonPanel {
  protected _extensionUri: vscode.Uri;
  protected _disposables: vscode.Disposable[] = [];
  protected _pokemonColor: PokemonColor;
  protected _pokemonType: PokemonType;
  protected _pokemonSize: PokemonSize;
  protected _pokemonGeneration: string;
  protected _pokemonOriginalSpriteSize: number;
  protected _theme: Theme;
  protected _themeKind: vscode.ColorThemeKind;
  protected _throwBallWithMouse: boolean;

  constructor(
    extensionUri: vscode.Uri,
    color: PokemonColor,
    type: PokemonType,
    size: PokemonSize,
    generation: string,
    originalSpriteSize: number,
    theme: Theme,
    themeKind: ColorThemeKind,
    throwBallWithMouse: boolean,
  ) {
    this._extensionUri = extensionUri;
    this._pokemonColor = color;
    this._pokemonType = type;
    this._pokemonSize = size;
    this._pokemonGeneration = generation;
    this._pokemonOriginalSpriteSize = originalSpriteSize;
    this._theme = theme;
    this._themeKind = themeKind;
    this._throwBallWithMouse = throwBallWithMouse;
  }

  public pokemonColor(): PokemonColor {
    return normalizeColor(this._pokemonColor, this._pokemonType);
  }

  public pokemonType(): PokemonType {
    return this._pokemonType;
  }

  public pokemonSize(): PokemonSize {
    return this._pokemonSize;
  }

  public pokemonGeneration(): string {
    return this._pokemonGeneration;
  }

  public pokemonOriginalSpriteSize(): number {
    return this._pokemonOriginalSpriteSize;
  }

  public theme(): Theme {
    return this._theme;
  }

  public themeKind(): vscode.ColorThemeKind {
    return this._themeKind;
  }

  public throwBallWithMouse(): boolean {
    return this._throwBallWithMouse;
  }

  public updatePokemonColor(newColor: PokemonColor) {
    this._pokemonColor = newColor;
  }

  public updatePokemonType(newType: PokemonType) {
    this._pokemonType = newType;
  }

  public updatePokemonSize(newSize: PokemonSize) {
    this._pokemonSize = newSize;
  }

  public updatePokemonGeneration(newGeneration: string) {
    this._pokemonGeneration = newGeneration;
  }

  public updateTheme(newTheme: Theme, themeKind: vscode.ColorThemeKind) {
    this._theme = newTheme;
    this._themeKind = themeKind;
  }

  public setThrowWithMouse(newThrowWithMouse: boolean): void {
    this._throwBallWithMouse = newThrowWithMouse;
    void this.getWebview().postMessage({
      command: 'throw-with-mouse',
      enabled: newThrowWithMouse,
    });
  }

  public throwBall() {
    void this.getWebview().postMessage({
      command: 'throw-ball',
    });
  }

  public resetPokemon(): void {
    void this.getWebview().postMessage({
      command: 'reset-pokemon',
    });
  }

  public spawnPokemon(spec: PokemonSpecification) {
    void this.getWebview().postMessage({
      command: 'spawn-pokemon',
      type: spec.type,
      color: spec.color,
      name: spec.name,
      generation: spec.generation,
      originalSpriteSize: spec.originalSpriteSize,
    });
    void this.getWebview().postMessage({
      command: 'set-size',
      size: spec.size,
    });
  }

  public listPokemon() {
    void this.getWebview().postMessage({ command: 'list-pokemon' });
  }

  public rollCall(): void {
    void this.getWebview().postMessage({ command: 'roll-call' });
  }

  public deletePokemon(pokemonName: string) {
    void this.getWebview().postMessage({
      command: 'delete-pokemon',
      name: pokemonName,
    });
  }

  protected getWebview(): vscode.Webview {
    throw new Error('Not implemented');
  }

  protected _update() {
    const webview = this.getWebview();
    webview.html = this._getHtmlForWebview(webview);
  }

  // #TODO: verify if this is needed
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public update() {}

  protected _getHtmlForWebview(webview: vscode.Webview) {
    // Local path to main script run in the webview
    const scriptPathOnDisk = vscode.Uri.joinPath(
      this._extensionUri,
      'media',
      'main-bundle.js',
    );

    // And the uri we use to load this script in the webview
    const scriptUri = webview.asWebviewUri(scriptPathOnDisk);

    // Local path to css styles
    const styleResetPath = vscode.Uri.joinPath(
      this._extensionUri,
      'media',
      'reset.css',
    );
    const stylesPathMainPath = vscode.Uri.joinPath(
      this._extensionUri,
      'media',
      'pokemon.css',
    );
    const silkScreenFontPath = webview.asWebviewUri(
      vscode.Uri.joinPath(
        this._extensionUri,
        'media',
        'Silkscreen-Regular.ttf',
      ),
    );

    // Uri to load styles into webview
    const stylesResetUri = webview.asWebviewUri(styleResetPath);
    const stylesMainUri = webview.asWebviewUri(stylesPathMainPath);

    // Get path to resource on disk
    const basePokemonUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media'),
    );

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${
          webview.cspSource
        } 'nonce-${nonce}'; img-src ${
          webview.cspSource
        } https:; script-src 'nonce-${nonce}';
                font-src ${webview.cspSource};">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${stylesResetUri}" rel="stylesheet" nonce="${nonce}">
				<link href="${stylesMainUri}" rel="stylesheet" nonce="${nonce}">
                <style nonce="${nonce}">
                @font-face {
                    font-family: 'silkscreen';
                    src: url('${silkScreenFontPath}') format('truetype');
                }
                </style>
				<title>VS Code Pokemon</title>
			</head>
			<body>
                <canvas id="pokemonCanvas"></canvas>
                <div id="pokemonContainer"></div>
                <div id="foreground"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
                <script nonce="${nonce}">
                    pokemonApp.pokemonPanelApp(
                        "${basePokemonUri}",
                        "${this.theme()}",
                        ${this.themeKind()},
                        "${this.pokemonColor()}",
                        "${this.pokemonSize()}",
                        "${this.pokemonType()}",
                        "${this.throwBallWithMouse()}",
                        "${this.pokemonGeneration()}",
                        "${this.pokemonOriginalSpriteSize()}",
                    );
                </script>
            </body>
			</html>`;
  }
}

function handleWebviewMessage(message: WebviewMessage) {
  switch (message.command) {
    case 'alert':
      void vscode.window.showErrorMessage(message.text);
      return;
    case 'info':
      void vscode.window.showInformationMessage(message.text);
      return;
  }
}

/**
 * Manages pokemon coding webview panels
 */
class PokemonPanel extends PokemonWebviewContainer implements IPokemonPanel {
  /**
   * Track the currently panel. Only allow a single panel to exist at a time.
   */
  public static currentPanel: PokemonPanel | undefined;

  public static readonly viewType = 'pokemonCoding';

  private readonly _panel: vscode.WebviewPanel;

  public static createOrShow(
    extensionUri: vscode.Uri,
    pokemonColor: PokemonColor,
    pokemonType: PokemonType,
    pokemonSize: PokemonSize,
    pokemonGeneration: string,
    pokemonOriginalSpriteSize: number,
    theme: Theme,
    themeKind: ColorThemeKind,
    throwBallWithMouse: boolean,
  ) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;
    // If we already have a panel, show it.
    if (PokemonPanel.currentPanel) {
      if (
        pokemonColor === PokemonPanel.currentPanel.pokemonColor() &&
        pokemonType === PokemonPanel.currentPanel.pokemonType() &&
        pokemonSize === PokemonPanel.currentPanel.pokemonSize() &&
        pokemonGeneration === PokemonPanel.currentPanel.pokemonGeneration()
      ) {
        PokemonPanel.currentPanel._panel.reveal(column);
        return;
      } else {
        PokemonPanel.currentPanel.updatePokemonColor(pokemonColor);
        PokemonPanel.currentPanel.updatePokemonType(pokemonType);
        PokemonPanel.currentPanel.updatePokemonSize(pokemonSize);
        PokemonPanel.currentPanel.update();
      }
    }

    // Otherwise, create a new panel.
    const panel = vscode.window.createWebviewPanel(
      PokemonPanel.viewType,
      vscode.l10n.t('Pokemon Panel'),
      vscode.ViewColumn.Two,
      getWebviewOptions(extensionUri),
    );

    PokemonPanel.currentPanel = new PokemonPanel(
      panel,
      extensionUri,
      pokemonColor,
      pokemonType,
      pokemonSize,
      pokemonGeneration,
      pokemonOriginalSpriteSize,
      theme,
      themeKind,
      throwBallWithMouse,
    );
  }

  public resetPokemon() {
    void this.getWebview().postMessage({ command: 'reset-pokemon' });
  }

  public listPokemon() {
    void this.getWebview().postMessage({ command: 'list-pokemon' });
  }

  public rollCall(): void {
    void this.getWebview().postMessage({ command: 'roll-call' });
  }

  public deletePokemon(pokemonName: string): void {
    void this.getWebview().postMessage({
      command: 'delete-pokemon',
      name: pokemonName,
    });
  }

  public static revive(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    pokemonColor: PokemonColor,
    pokemonType: PokemonType,
    pokemonSize: PokemonSize,
    pokemonGeneration: string,
    pokemonOriginalSpriteSize: number,
    theme: Theme,
    themeKind: ColorThemeKind,
    throwBallWithMouse: boolean,
  ) {
    PokemonPanel.currentPanel = new PokemonPanel(
      panel,
      extensionUri,
      pokemonColor,
      pokemonType,
      pokemonSize,
      pokemonGeneration,
      pokemonOriginalSpriteSize,
      theme,
      themeKind,
      throwBallWithMouse,
    );
  }

  private constructor(
    panel: vscode.WebviewPanel,
    extensionUri: vscode.Uri,
    color: PokemonColor,
    type: PokemonType,
    size: PokemonSize,
    generation: string,
    originalSpriteSize: number,
    theme: Theme,
    themeKind: ColorThemeKind,
    throwBallWithMouse: boolean,
  ) {
    super(
      extensionUri,
      color,
      type,
      size,
      generation,
      originalSpriteSize,
      theme,
      themeKind,
      throwBallWithMouse,
    );

    this._panel = panel;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    // Update the content based on view changes
    this._panel.onDidChangeViewState(
      () => {
        this.update();
      },
      null,
      this._disposables,
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      handleWebviewMessage,
      null,
      this._disposables,
    );
  }

  public dispose() {
    PokemonPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  public update() {
    if (this._panel.visible) {
      this._update();
    }
  }

  getWebview(): vscode.Webview {
    return this._panel.webview;
  }
}

class PokemonWebviewViewProvider extends PokemonWebviewContainer {
  public static readonly viewType = 'pokemonView';

  private _webviewView?: vscode.WebviewView;
  private _context: vscode.ExtensionContext;

  constructor(
    context: vscode.ExtensionContext,
    extensionUri: vscode.Uri,
    color: PokemonColor,
    type: PokemonType,
    size: PokemonSize,
    generation: string,
    originalSpriteSize: number,
    theme: Theme,
    themeKind: ColorThemeKind,
    throwBallWithMouse: boolean,
  ) {
    super(
      extensionUri,
      color,
      type,
      size,
      generation,
      originalSpriteSize,
      theme,
      themeKind,
      throwBallWithMouse,
    );
    this._context = context;
  }

  async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this._webviewView = webviewView;

    webviewView.webview.options = getWebviewOptions(this._extensionUri);
    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      handleWebviewMessage,
      null,
      this._disposables,
    );

    // Load pokemon after the webview is ready
    // First check if there are saved pokemon from previous session
    let collection = PokemonSpecification.collectionFromMemento(
      this._context,
      getConfiguredSize(),
    );

    if (collection.length === 0) {
      // Fall back to configured default pokemon if no saved session
      collection = getConfiguredDefaultPokemon();
    }

    // Small delay to ensure webview is fully loaded
    // setTimeout(() => {
    //     // Reset any existing pokemon before spawning new ones
    //     this.resetPokemon();

    //     collection.forEach((item) => {
    //         this.spawnPokemon(item);
    //     });
    // }, 100);

    // Store the collection in the memento
    await storeCollectionAsMemento(this._context, collection);
  }

  update() {
    this._update();
  }

  getWebview(): vscode.Webview {
    if (this._webviewView === undefined) {
      throw new Error(
        vscode.l10n.t(
          'Panel not active, make sure the pokemon view is visible before running this command.',
        ),
      );
    } else {
      return this._webviewView.webview;
    }
  }
}

function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function createPokemonPlayground(context: vscode.ExtensionContext) {
  const spec = PokemonSpecification.fromConfiguration();
  PokemonPanel.createOrShow(
    context.extensionUri,
    spec.color,
    spec.type,
    spec.size,
    spec.generation,
    spec.originalSpriteSize,
    getConfiguredTheme(),
    getConfiguredThemeKind(),
    getThrowWithMouseConfiguration(),
  );
  if (PokemonPanel.currentPanel) {
    var collection = PokemonSpecification.collectionFromMemento(
      context,
      getConfiguredSize(),
    );
    collection.forEach((item) => {
      PokemonPanel.currentPanel?.spawnPokemon(item);
    });
    await storeCollectionAsMemento(context, collection);
  } else {
    var collection = PokemonSpecification.collectionFromMemento(
      context,
      getConfiguredSize(),
    );
    collection.push(spec);
    await storeCollectionAsMemento(context, collection);
  }
}
