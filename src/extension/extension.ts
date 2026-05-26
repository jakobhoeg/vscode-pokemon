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
import { availableColors, normalizeColor } from '../panel/pokemon-collection';
import { ActivePokemonState, XpTracker, XpTrackerConfig } from './xp-tracker';

type EvolutionNotificationMode = 'silent' | 'info' | 'modal';

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

function getXpTrackerConfig(): XpTrackerConfig {
  const cfg = vscode.workspace.getConfiguration('vscode-pokemon');
  return {
    enabled: cfg.get<boolean>('enableXp', true),
    multiplier: cfg.get<number>('xpGainMultiplier', 10),
    perEventCap: cfg.get<number>('xpPerEventCap', 200),
  };
}

function getEvolutionNotificationMode(): EvolutionNotificationMode {
  const mode = vscode.workspace
    .getConfiguration('vscode-pokemon')
    .get<EvolutionNotificationMode>('evolutionNotifications', 'info');
  if (mode !== 'silent' && mode !== 'info' && mode !== 'modal') {
    return 'info';
  }
  return mode;
}

function getShowXpInStatusBar(): boolean {
  return vscode.workspace
    .getConfiguration('vscode-pokemon')
    .get<boolean>('showXpInStatusBar', true);
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
  shiny?: boolean;
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

      // If shiny is not specified, default to color to maybeShiny with the pokemon's available colors. If shiny is true, force shiny color. If shiny is false, force default color.
      let color: PokemonColor;
      if (config.shiny === undefined) {
        color = maybeMakeShiny(availableColors(config.type));
      } else if (config.shiny) {
        color = PokemonColor.shiny;
      } else {
        color = DEFAULT_COLOR;
      }

      result.push(new PokemonSpecification(color, config.type, size, name));
    } else {
      console.warn(
        `Invalid pokemon type in defaultPokemon config: ${config.type}`,
      );
    }
  }

  return result;
}

function getSessionPokemonCollection(
  context: vscode.ExtensionContext,
): PokemonSpecification[] {
  const savedCollection = PokemonSpecification.collectionFromMemento(
    context,
    getConfiguredSize(),
  );

  if (savedCollection.length > 0) {
    return savedCollection;
  }

  return getConfiguredDefaultPokemon();
}

function getDefaultPokemonForFreshSession(
  context: vscode.ExtensionContext,
): PokemonSpecification[] {
  const savedCollection = PokemonSpecification.collectionFromMemento(
    context,
    getConfiguredSize(),
  );

  if (savedCollection.length > 0) {
    return [];
  }

  return getConfiguredDefaultPokemon();
}

export function shouldSpawnInitialCollection(
  collection: PokemonSpecification[],
): boolean {
  return collection.length > 0;
}

async function spawnAndPersistCollection(
  context: vscode.ExtensionContext,
  panel: IPokemonPanel,
  collection: PokemonSpecification[],
): Promise<void> {
  collection.forEach((item) => {
    panel.spawnPokemon(item);
  });

  await storeCollectionAsMemento(context, collection);
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

  static fromConfiguration(typeOverride?: PokemonType): PokemonSpecification {
    var color = vscode.workspace
      .getConfiguration('vscode-pokemon')
      .get<PokemonColor>('pokemonColor', DEFAULT_COLOR);
    if (ALL_COLORS.lastIndexOf(color) === -1) {
      color = DEFAULT_COLOR;
    }
    var type =
      typeOverride ??
      vscode.workspace
        .getConfiguration('vscode-pokemon')
        .get<PokemonType>('pokemonType', DEFAULT_POKEMON_TYPE);

    // Use POKEMON_DATA to validate the type
    if (!POKEMON_DATA[type]) {
      type = DEFAULT_POKEMON_TYPE;
    }

    return new PokemonSpecification(color, type, getConfiguredSize());
  }

  /** Reads just the configured pokemonType setting (the base, pre-evolution species). */
  static getConfiguredBaseType(): PokemonType {
    var type = vscode.workspace
      .getConfiguration('vscode-pokemon')
      .get<PokemonType>('pokemonType', DEFAULT_POKEMON_TYPE);
    if (!POKEMON_DATA[type]) {
      type = DEFAULT_POKEMON_TYPE;
    }
    return type;
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

let spawnPokemonStatusBar: vscode.StatusBarItem;
let xpStatusBar: vscode.StatusBarItem;
let xpTracker: XpTracker | undefined;

interface IPokemonInfo {
  type: PokemonType;
  name: string;
  color: PokemonColor;
}

function waitForPokemonList(webview: vscode.Webview): Promise<IPokemonInfo[]> {
  return new Promise((resolve) => {
    const disposable = webview.onDidReceiveMessage(
      (message: WebviewMessage) => {
        if (message.command !== 'list-pokemon') {
          return;
        }
        disposable.dispose();
        const pokemonList: IPokemonInfo[] = [];
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
        resolve(pokemonList);
      },
    );
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
    vscode.commands.registerCommand('vscode-pokemon.start', async () => {
      if (
        getConfigurationPosition() === ExtPosition.explorer &&
        webviewViewProvider
      ) {
        await vscode.commands.executeCommand('pokemonView.focus');
      } else {
        const spec = PokemonSpecification.fromConfiguration(
          xpTracker?.getState().currentType,
        );
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
          const collection = getSessionPokemonCollection(context);
          await spawnAndPersistCollection(
            context,
            PokemonPanel.currentPanel,
            collection,
          );
        }
      }
    }),
  );

  spawnPokemonStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    100,
  );
  spawnPokemonStatusBar.command = 'vscode-pokemon.spawn-pokemon';
  context.subscriptions.push(spawnPokemonStatusBar);

  xpStatusBar = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    99,
  );
  xpStatusBar.command = 'vscode-pokemon.reset-xp';
  context.subscriptions.push(xpStatusBar);

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

  // Initialize the XP tracker before creating any pokemon spec — the tracker decides what
  // species the main pokemon should actually render as (post-evolution).
  xpTracker = new XpTracker(
    context,
    PokemonSpecification.getConfiguredBaseType(),
    getXpTrackerConfig,
    {
      onEvolve: (oldType, newType) => handlePokemonEvolved(oldType, newType),
      onUpdate: (state) => {
        updateXpStatusBar(state);
        const panel = getPokemonPanel();
        if (panel) {
          panel.updateXp(buildXpHudPayload(state));
        }
      },
    },
  );
  context.subscriptions.push(xpTracker.start());

  const spec = PokemonSpecification.fromConfiguration(
    xpTracker.getState().currentType,
  );
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
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-pokemon.delete-pokemon',
      async () => {
        const panel = getPokemonPanel();
        if (panel === undefined) {
          await createPokemonPlayground(context);
          return;
        }
        const webview = getWebview();
        if (!webview) {
          return;
        }
        const listPromise = waitForPokemonList(webview);
        panel.listPokemon();
        const pokemonList = await listPromise;

        if (!pokemonList.length) {
          await vscode.window.showErrorMessage(
            vscode.l10n.t('There are no pokemon to remove.'),
          );
          return;
        }
        const pokemon = await vscode.window.showQuickPick<PokemonQuickPickItem>(
          pokemonList.map((val) => {
            return new PokemonQuickPickItem(val.name, val.type, val.color);
          }),
          {
            placeHolder: vscode.l10n.t('Select the pokemon to remove.'),
          },
        );
        if (pokemon) {
          panel.deletePokemon(pokemon.name);
          xpTracker?.removePokemon(pokemon.name);
          const survivors = pokemonList.filter(
            (item) => item.name !== pokemon.name,
          );
          const collection = survivors.map<PokemonSpecification>((item) => {
            return new PokemonSpecification(
              item.color,
              item.type,
              PokemonSize.medium,
              item.name,
            );
          });
          await storeCollectionAsMemento(context, collection);
        }
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-pokemon.remove-all-pokemon',
      async () => {
        const panel = getPokemonPanel();
        if (panel !== undefined) {
          panel.resetPokemon();
          xpTracker?.removeAll();
          await storeCollectionAsMemento(context, []);
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

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-pokemon.roll-call', async () => {
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
      'vscode-pokemon.configure-keybindings',
      async () => {
        const items: Array<vscode.QuickPickItem & { commandId: string }> = [
          {
            label: vscode.l10n.t('Spawn additional pokemon'),
            description: 'vscode-pokemon.spawn-pokemon',
            commandId: 'vscode-pokemon.spawn-pokemon',
          },
          {
            label: vscode.l10n.t('Spawn random pokemon'),
            description: 'vscode-pokemon.spawn-random-pokemon',
            commandId: 'vscode-pokemon.spawn-random-pokemon',
          },
          {
            label: vscode.l10n.t('Remove pokemon'),
            description: 'vscode-pokemon.delete-pokemon',
            commandId: 'vscode-pokemon.delete-pokemon',
          },
          {
            label: vscode.l10n.t('Remove all pokemon'),
            description: 'vscode-pokemon.remove-all-pokemon',
            commandId: 'vscode-pokemon.remove-all-pokemon',
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
      'vscode-pokemon.change-pokemon-language',
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
      'vscode-pokemon.export-pokemon-list',
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
      'vscode-pokemon.import-pokemon-list',
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
              xpTracker?.addPokemon(pokemonSpec.name, pokemonSpec.type);
            }
            await storeCollectionAsMemento(context, collection);
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
    vscode.commands.registerCommand(
      'vscode-pokemon.spawn-pokemon',
      async () => {
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

                const picked = await vscode.window.showQuickPick(
                  pokemonOptions,
                  {
                    placeHolder: vscode.l10n.t('Select a Pokemon'),
                  },
                );
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
                  xpTracker?.addPokemon(spec.name, spec.type);
                  var collection = PokemonSpecification.collectionFromMemento(
                    context,
                    getConfiguredSize(),
                  );
                  collection.push(spec);
                  await storeCollectionAsMemento(context, collection);
                }
              } else {
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
          xpTracker?.addPokemon(spec.name, spec.type);
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
      },
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'vscode-pokemon.spawn-random-pokemon',
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
          xpTracker?.addPokemon(spec.name, spec.type);
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

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-pokemon.reset-xp', async () => {
      if (!xpTracker) {
        return;
      }
      const resetLabel = vscode.l10n.t('Reset');
      const choice = await vscode.window.showWarningMessage(
        vscode.l10n.t(
          'Reset XP for your active Pokémon? This reverts it to its base form.',
        ),
        { modal: true },
        resetLabel,
      );
      if (choice !== resetLabel) {
        return;
      }
      const beforeState = xpTracker.getState();
      const before = beforeState.currentType;
      const beforeName = beforeState.name;
      xpTracker.resetXp();
      const after = xpTracker.getState().currentType;
      if (before !== after) {
        const panel = getPokemonPanel();
        if (panel) {
          const config = POKEMON_DATA[after];
          panel.evolveActivePokemon(
            after,
            `gen${config.generation}`,
            config.originalSpriteSize ?? 32,
            before,
            beforeName,
          );
        }
      }
    }),
  );

  // Listening to configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(
      (e: vscode.ConfigurationChangeEvent): void => {
        // Note: changes to vscode-pokemon.pokemonType no longer touch XP. Each
        // pokemon owns its own XP keyed by name. The setting is only consulted as
        // the seed type on a fresh install. To change which pokemon the HUD follows,
        // use the spawn / delete commands.

        if (
          e.affectsConfiguration('vscode-pokemon.pokemonColor') ||
          e.affectsConfiguration('vscode-pokemon.pokemonSize') ||
          e.affectsConfiguration('vscode-pokemon.theme') ||
          e.affectsConfiguration('workbench.colorTheme')
        ) {
          const spec = PokemonSpecification.fromConfiguration(
            xpTracker?.getState().currentType,
          );
          const panel = getPokemonPanel();
          if (panel) {
            panel.updatePokemonColor(spec.color);
            panel.updatePokemonSize(spec.size);
            panel.updateTheme(getConfiguredTheme(), getConfiguredThemeKind());
            panel.updateConfig();
          }
        }

        if (e.affectsConfiguration('vscode-pokemon.position')) {
          void updateExtensionPositionContext();
        }

        if (e.affectsConfiguration('vscode-pokemon.throwBallWithMouse')) {
          updatePanelThrowWithMouse();
        }

        if (e.affectsConfiguration('vscode-pokemon.pokemonLanguage')) {
          localize.resetPokemonTranslationsCache();
          // Localization only affects extension-host UI (quick picks, menus) — no panel reload needed.
        }

        if (
          e.affectsConfiguration('vscode-pokemon.enableXp') ||
          e.affectsConfiguration('vscode-pokemon.showXpInStatusBar')
        ) {
          if (xpTracker) {
            updateXpStatusBar(xpTracker.getState());
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
        const spec = PokemonSpecification.fromConfiguration(
          xpTracker?.getState().currentType,
        );
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

        if (PokemonPanel.currentPanel) {
          const collection = getDefaultPokemonForFreshSession(context);
          if (shouldSpawnInitialCollection(collection)) {
            await spawnAndPersistCollection(
              context,
              PokemonPanel.currentPanel,
              collection,
            );
          }
        }
      },
    });
  }
}

function updateStatusBar(): void {
  spawnPokemonStatusBar.text = `$(squirrel)`;
  spawnPokemonStatusBar.tooltip = vscode.l10n.t('Spawn Pokemon');
  spawnPokemonStatusBar.show();
}

function buildXpHudPayload(state: ActivePokemonState): IXpHudPayload {
  const cfg = getXpTrackerConfig();
  if (!cfg.enabled || !state.hasActive) {
    return {
      visible: false,
      speciesName: '',
      level: 1,
      percent: 0,
      numbersText: '',
    };
  }
  const speciesName =
    POKEMON_DATA[state.currentType]?.name ?? state.currentType;
  if (state.level >= 100) {
    return {
      visible: true,
      speciesName,
      level: 100,
      percent: 100,
      numbersText: 'MAX',
    };
  }
  const percent =
    state.xpForThisLevel > 0
      ? Math.round((state.xpIntoLevel / state.xpForThisLevel) * 100)
      : 0;
  return {
    visible: true,
    speciesName,
    level: state.level,
    percent,
    numbersText: `${state.xpIntoLevel} / ${state.xpForThisLevel}`,
  };
}

function updateXpStatusBar(state: ActivePokemonState): void {
  if (!xpStatusBar) {
    return;
  }
  const cfg = getXpTrackerConfig();
  if (!cfg.enabled || !getShowXpInStatusBar() || !state.hasActive) {
    xpStatusBar.hide();
    return;
  }
  const speciesName =
    POKEMON_DATA[state.currentType]?.name ?? state.currentType;
  if (state.level >= 100) {
    xpStatusBar.text = `$(star-full) Lv 100 ${speciesName}`;
  } else {
    xpStatusBar.text = `$(star-full) Lv ${state.level} ${state.xpIntoLevel}/${state.xpForThisLevel}`;
  }
  xpStatusBar.tooltip = vscode.l10n.t(
    '{0} (Lv {1}) — {2} XP total. Click to reset XP.',
    speciesName,
    state.level.toString(),
    state.totalXp.toString(),
  );
  xpStatusBar.show();
}

function handlePokemonEvolved(
  oldType: PokemonType,
  newType: PokemonType,
): void {
  const newConfig = POKEMON_DATA[newType];
  if (!newConfig) {
    return;
  }
  const panel = getPokemonPanel();
  // The active pokemon is the one that evolved — pass its name so the panel can
  // find it unambiguously by name rather than guessing by type.
  const activeName = xpTracker?.getState().name;
  if (panel) {
    panel.evolveActivePokemon(
      newType,
      `gen${newConfig.generation}`,
      newConfig.originalSpriteSize ?? 32,
      oldType,
      activeName,
    );
  }
  const mode = getEvolutionNotificationMode();
  if (mode === 'silent') {
    return;
  }
  const oldName = POKEMON_DATA[oldType]?.name ?? oldType;
  const newName = newConfig.name;
  const message = vscode.l10n.t('Your {0} evolved into {1}!', oldName, newName);
  if (mode === 'modal') {
    void vscode.window.showInformationMessage(message, { modal: true });
  } else {
    void vscode.window.showInformationMessage(message);
  }
}

export function spawnPokemonDeactivate() {
  spawnPokemonStatusBar.dispose();
  if (xpStatusBar) {
    xpStatusBar.dispose();
  }
}

function getWebviewOptions(
  extensionUri: vscode.Uri,
): vscode.WebviewOptions & vscode.WebviewPanelOptions {
  return {
    enableScripts: true,
    localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
    retainContextWhenHidden: true,
  };
}

interface IPokemonPanel {
  pokemonType(): PokemonType;
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
  evolveActivePokemon(
    newType: PokemonType,
    newGeneration: string,
    newOriginalSpriteSize: number,
    prevType?: PokemonType,
    name?: string,
  ): void;
  updateXp(payload: IXpHudPayload): void;
  updateConfig(): void;
}

class PokemonWebviewContainer implements IPokemonPanel {
  protected _extensionUri: vscode.Uri;
  protected _disposables: vscode.Disposable[] = [];
  protected _pokemonColor: PokemonColor;
  protected _pokemonType: PokemonType;
  protected _prevPokemonType: PokemonType | undefined;
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

  public prevPokemonType(): PokemonType | undefined {
    return this._prevPokemonType;
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
    if (newType !== this._pokemonType) {
      this._prevPokemonType = this._pokemonType;
      this._pokemonType = newType;
    }
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

  public evolveActivePokemon(
    newType: PokemonType,
    newGeneration: string,
    newOriginalSpriteSize: number,
    prevType?: PokemonType,
    name?: string,
  ): void {
    // `name` is the canonical identifier: the panel finds pokemon by name. `prevType`
    // remains as a legacy fallback for cases where the caller doesn't know the name
    // (cross-restart recovery from old saved state).
    const resolvedPrevType = prevType ?? this._pokemonType;
    if (resolvedPrevType !== newType) {
      this._prevPokemonType = resolvedPrevType;
    }
    this._pokemonType = newType;
    this._pokemonGeneration = newGeneration;
    this._pokemonOriginalSpriteSize = newOriginalSpriteSize;
    try {
      void this.getWebview().postMessage({
        command: 'evolve-pokemon',
        type: newType,
        generation: newGeneration,
        originalSpriteSize: newOriginalSpriteSize,
        prevType: resolvedPrevType,
        name,
      });
    } catch {
      // View not currently visible.
    }
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

    // Initial XP HUD payload — embedded into the HTML so the bar renders correctly on the
    // very first paint, before any 'update-xp' message arrives from the extension.
    const initialXp = this.getInitialXpHud();
    const initialXpJson = JSON.stringify(initialXp);

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
                <div id="xp-hud"${initialXp.visible ? '' : ' hidden'}>
                    <span id="xp-hud-label">${initialXp.speciesName}</span>
                    <span id="xp-hud-level">Lv ${initialXp.level}</span>
                    <div id="xp-hud-bar"><div id="xp-hud-bar-fill" style="width: ${initialXp.percent}%"></div></div>
                    <span id="xp-hud-numbers">${initialXp.numbersText}</span>
                </div>
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
                        ${initialXpJson},
                        ${this.prevPokemonType() ? `"${this.prevPokemonType()}"` : 'undefined'}
                    );
                </script>
            </body>
			</html>`;
  }

  /**
   * Override in concrete subclasses to provide an initial XP HUD payload from the live
   * XpTracker. Default returns a hidden HUD so non-XP-aware contexts still work.
   */
  protected getInitialXpHud(): IXpHudPayload {
    if (!xpTracker) {
      return {
        visible: false,
        speciesName: '',
        level: 1,
        percent: 0,
        numbersText: '',
      };
    }
    return buildXpHudPayload(xpTracker.getState());
  }

  public updateXp(payload: IXpHudPayload): void {
    try {
      void this.getWebview().postMessage({
        command: 'update-xp',
        payload,
      });
    } catch {
      // View not currently visible; the HUD will pick up the latest state from
      // getInitialXpHud() when the view resolves next.
    }
  }

  public updateConfig(): void {
    try {
      void this.getWebview().postMessage({
        command: 'update-config',
        theme: this._theme,
        themeKind: this._themeKind,
        pokemonSize: this._pokemonSize,
        pokemonColor: this.pokemonColor(),
      });
    } catch {
      // View not yet visible; next HTML render will use the updated fields.
    }
  }
}

export interface IXpHudPayload {
  visible: boolean;
  speciesName: string;
  level: number;
  /** 0–100 for the bar fill width. */
  percent: number;
  /** Pre-formatted "xpIntoLevel / xpForThisLevel" or "MAX" for level 100. */
  numbersText: string;
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

  // HTML is generated once; all in-session changes go through postMessages.
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public update() {}

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

    const collection = getDefaultPokemonForFreshSession(this._context);
    if (shouldSpawnInitialCollection(collection)) {
      await spawnAndPersistCollection(this._context, this, collection);
    }
  }

  // HTML is generated once in resolveWebviewView; all in-session changes go through postMessages.
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  update() {}

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
  const spec = PokemonSpecification.fromConfiguration(
    xpTracker?.getState().currentType,
  );
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
