import * as vscode from 'vscode';
import { ColorThemeKind } from 'vscode';
import {
  PokemonSize,
  PokemonColor,
  PokemonType,
  ExtPosition,
  Theme,
  WebviewMessage,
  ALL_COLORS,
  ALL_SCALES,
  ALL_THEMES,
} from '../common/types';
import { randomName } from '../common/names';
import { normalizeColor } from '../panel/pokemon-collection';
import {
  getDefaultPokemon as getDefaultPokemonType,
  POKEMON_DATA,
} from '../common/pokemon-data';
import {
  CommandDependencies,
  registerCollectionCommands,
  registerRemovalCommands,
  registerSpawnCommands,
  registerStartCommand,
  registerUtilityCommands,
} from './commands/index';
import { VSCODE_SPAWN_POKEMON_KEY } from '../constants/vscode-keys.constant';

const EXTRA_POKEMON_KEY = 'vscode-pokemon.extra-pokemon';
const EXTRA_POKEMON_KEY_TYPES = EXTRA_POKEMON_KEY + '.types';
const EXTRA_POKEMON_KEY_COLORS = EXTRA_POKEMON_KEY + '.colors';
const EXTRA_POKEMON_KEY_NAMES = EXTRA_POKEMON_KEY + '.names';
const DEFAULT_POKEMON_SCALE = PokemonSize.medium;
const DEFAULT_COLOR = PokemonColor.default;
const DEFAULT_POKEMON_TYPE = getDefaultPokemonType();
const DEFAULT_POSITION = ExtPosition.panel;
const DEFAULT_THEME = Theme.none;

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

export function maybeMakeShiny(possibleColors: PokemonColor[]): PokemonColor {
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

let spawnPokemonStatusBar: vscode.StatusBarItem;

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

  const commandDependencies: CommandDependencies = {
    context,
    getConfigurationPosition,
    getConfiguredSize,
    getConfiguredTheme,
    getConfiguredThemeKind,
    getThrowWithMouseConfiguration,
    getConfiguredDefaultPokemon,
    getPokemonPanel,
    getWebview,
    hasWebviewViewProvider: () =>
      getConfigurationPosition() === ExtPosition.explorer &&
      Boolean(webviewViewProvider),
    createOrShowPanel: (spec) => {
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
    },
    createPokemonPlayground,
    storeCollectionAsMemento,
    pokemonSpecification: PokemonSpecification,
    maybeMakeShiny: maybeMakeShiny,
  };
  registerStartCommand(commandDependencies);
  registerSpawnCommands(commandDependencies);
  registerCollectionCommands(commandDependencies);
  registerRemovalCommands(commandDependencies);
  registerUtilityCommands(commandDependencies);

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
