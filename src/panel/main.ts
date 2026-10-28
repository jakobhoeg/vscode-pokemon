// This script will be run within the webview itself
import { randomName } from '../common/names';
import {
  PokemonSize,
  PokemonColor,
  PokemonType,
  Theme,
  ColorThemeKind,
  WebviewMessage,
} from '../common/types';
import { IPokemonType } from './states';
import {
  createPokemon,
  PokemonCollection,
  PokemonElement,
  IPokemonCollection,
  availableColors,
  InvalidPokemonException,
} from './pokemon-collection';
import { PokemonElementState, PokemonPanelState } from './states';
import { getRandomPokemonConfig, POKEMON_DATA } from '../common/pokemon-data';
import {
  DEFAULT_FEED_ITEM,
  getItem,
  ItemEffect,
  itemSpriteFile,
} from '../common/items';
import {
  chooseFeeder,
  floatKindFor,
  floatText,
  IFoodItem,
  ItemDrop,
  itemPixelSize,
  ItemOutcome,
} from './feeding';

/* This is how the VS Code API can be invoked from the panel */
declare global {
  interface VscodeStateApi {
    getState(): PokemonPanelState | undefined; // API is actually Any, but we want it to be typed.
    setState(state: PokemonPanelState): void;
    postMessage(message: WebviewMessage): void;
  }
  function acquireVsCodeApi(): VscodeStateApi;
}

export var allPokemon: IPokemonCollection = new PokemonCollection();
var pokemonCounter: number;

// ---------------------------------------------------------------------------
// Feeding
// ---------------------------------------------------------------------------

/** Item dropped by Ctrl/Cmd+click or the "Feed pokemon" command. */
let selectedFeedItem: string = DEFAULT_FEED_ITEM;
let feedWithMouse = true;
let itemHud: HTMLDivElement | undefined;

function container(): HTMLDivElement {
  return document.getElementById('pokemonContainer') as HTMLDivElement;
}

function updateItemHud(basePokemonUri: string) {
  const config = getItem(selectedFeedItem);
  if (!itemHud) {
    itemHud = document.createElement('div');
    itemHud.id = 'itemHud';
    const img = document.createElement('img');
    img.className = 'item-hud-icon';
    itemHud.appendChild(img);
    document.body.appendChild(itemHud);
  }
  const img = itemHud.querySelector('img') as HTMLImageElement;
  if (!config) {
    itemHud.style.display = 'none';
    return;
  }
  itemHud.style.display = feedWithMouse ? 'block' : 'none';
  img.src = `${basePokemonUri}/${itemSpriteFile(selectedFeedItem)}`;
  img.alt = config.name;
  itemHud.title = `${config.name} - Ctrl/Cmd+click anywhere to drop one (click here to choose another item)`;
}

/**
 * Drop an item at `x` and send the closest Pokémon (or `target`) to eat it.
 * Returns the item, or undefined when nobody can eat it.
 */
export function dropItem(
  basePokemonUri: string,
  itemKey: string,
  x: number,
  startBottom: number,
  floor: number,
  pokemonSize: PokemonSize,
  target?: PokemonElement,
  stateApi?: VscodeStateApi,
): IFoodItem | undefined {
  const config = getItem(itemKey);
  if (!config) {
    stateApi?.postMessage({
      command: 'error',
      text: `Unknown item ${itemKey}`,
    });
    return undefined;
  }
  const candidates = allPokemon.pokemonCollection.map((element) => ({
    pokemon: element.pokemon,
    payload: element,
  }));
  const feeder =
    target && target.pokemon.canFeed
      ? { pokemon: target.pokemon, payload: target }
      : chooseFeeder(candidates, x);
  if (!feeder) {
    stateApi?.postMessage({
      command: 'info',
      text:
        allPokemon.pokemonCollection.length === 0
          ? 'There is nobody here to feed - spawn a Pokemon first!'
          : 'Everybody is busy right now, try again in a moment.',
    });
    return undefined;
  }

  const sizePx = itemPixelSize(pokemonSize);
  const maxX = Math.max(sizePx, window.innerWidth - sizePx);
  const item = new ItemDrop(
    itemKey,
    config,
    `${basePokemonUri}/${itemSpriteFile(itemKey)}`,
    Math.min(maxX, Math.max(sizePx, x)),
    startBottom,
    floor,
    sizePx,
    container(),
  );
  const element = feeder.payload;
  element.pokemon.onItemEaten = (eaten, outcome) =>
    renderEatEffects(basePokemonUri, element, eaten, outcome, stateApi);
  element.pokemon.onEvolve = (eaten, toType) =>
    evolvePokemon(
      basePokemonUri,
      element,
      eaten,
      toType,
      pokemonSize,
      stateApi,
    );
  element.pokemon.feed(item);
  return item;
}

/** How long the white-flash evolution animation runs (keep in sync with pokemon.css). */
export const EVOLUTION_MS = 2600;

/**
 * "What? Bulby is evolving!" - flash, swap the sprites for the evolved species,
 * update the element/state and tell the extension so the saved collection follows.
 */
export function evolvePokemon(
  basePokemonUri: string,
  element: PokemonElement,
  item: IFoodItem,
  toType: string,
  pokemonSize: PokemonSize,
  stateApi?: VscodeStateApi,
) {
  const config = POKEMON_DATA[toType];
  if (!config) {
    stateApi?.postMessage({
      command: 'error',
      text: `Unknown Pokemon ${toType}`,
    });
    return;
  }
  const pokemon = element.pokemon;
  const fromType = element.type;
  const fromName = POKEMON_DATA[fromType]?.name ?? fromType;
  pokemon.beginEvolution();
  const sprite = element.el;
  sprite.classList.remove('level-up', 'healed', 'munch');
  sprite.classList.add('evolving');
  stateApi?.postMessage({
    command: 'info',
    text: `${pokemon.emoji} What? ${pokemon.name} is evolving!`,
  });

  // Halfway through the flash the silhouette changes
  setTimeout(() => {
    const color = config.possibleColors.includes(element.color)
      ? element.color
      : PokemonColor.default;
    const generation = `gen${config.generation}`;
    const originalSpriteSize = config.originalSpriteSize ?? 32;
    pokemon.changeForm(
      toType,
      `${basePokemonUri}/${generation}/${toType}/${color}`,
      originalSpriteSize,
    );
    element.type = toType;
    element.color = color;
    element.generation = generation;
    element.originalSpriteSize = originalSpriteSize;
    element.speech.className = `bubble bubble-${pokemonSize} b-${originalSpriteSize}`;
    saveState(stateApi);
  }, EVOLUTION_MS / 2);

  const finish = () => {
    if (!pokemon.isEvolving) {
      return;
    }
    sprite.classList.remove('evolving');
    pokemon.endEvolution();
    const width = parseFloat(sprite.style.width) || 32;
    const bottom = parseFloat(sprite.style.bottom) || 0;
    const left = parseFloat(sprite.style.left) || 0;
    floatText(
      container(),
      item.config.floatText,
      left,
      bottom + width + 4,
      width,
      'level',
    );
    const sparkle = document.createElement('img');
    sparkle.src = `${basePokemonUri}/shiny-anim.gif?t=${Date.now()}`;
    sparkle.className = 'shiny-overlay';
    sparkle.style.left = sprite.style.left;
    sparkle.style.bottom = sprite.style.bottom;
    sparkle.style.width = sprite.style.width;
    sparkle.style.height = sprite.style.height;
    container().appendChild(sparkle);
    const removeOverlay = () => sparkle.remove();
    sparkle.addEventListener('animationend', removeOverlay);
    setTimeout(removeOverlay, 1500);
    pokemon.showSpeechBubble(3000, true);
    stateApi?.postMessage({
      command: 'info',
      text: `${pokemon.emoji} Congratulations! Your ${fromName} ${pokemon.name} evolved into ${config.name}!`,
    });
    stateApi?.postMessage({
      command: 'pokemon-evolved',
      text: JSON.stringify({
        name: pokemon.name,
        from: fromType,
        to: toType,
        color: element.color,
      }),
    });
    saveState(stateApi);
  };
  sprite.addEventListener(
    'animationend',
    (e) => {
      if (e.animationName === 'evolution-flash') {
        finish();
      }
    },
    { once: true },
  );
  setTimeout(finish, EVOLUTION_MS + 100); // fallback when animations don't run
}

function renderEatEffects(
  basePokemonUri: string,
  element: PokemonElement,
  item: IFoodItem,
  outcome: ItemOutcome,
  stateApi?: VscodeStateApi,
) {
  const sprite = element.el;
  const width = parseFloat(sprite.style.width) || 32;
  const bottom = parseFloat(sprite.style.bottom) || 0;
  const left = parseFloat(sprite.style.left) || 0;
  floatText(
    container(),
    item.config.effect === ItemEffect.evolve ? '?' : item.config.floatText,
    left,
    bottom + width + 4,
    width,
    floatKindFor(item.config.effect),
  );

  const effectClass =
    item.config.effect === ItemEffect.levelUp
      ? 'level-up'
      : item.config.effect === ItemEffect.heal
        ? 'healed'
        : 'munch';
  sprite.classList.remove('level-up', 'healed', 'munch');
  void sprite.offsetWidth; // restart the animation
  sprite.classList.add(effectClass);
  sprite.addEventListener(
    'animationend',
    () => sprite.classList.remove(effectClass),
    { once: true },
  );

  if (item.config.effect === ItemEffect.levelUp && outcome.levelsGained > 0) {
    const sparkle = document.createElement('img');
    sparkle.src = `${basePokemonUri}/shiny-anim.gif?t=${Date.now()}`;
    sparkle.className = 'shiny-overlay';
    sparkle.style.left = sprite.style.left;
    sparkle.style.bottom = sprite.style.bottom;
    sparkle.style.width = sprite.style.width;
    sparkle.style.height = sprite.style.height;
    container().appendChild(sparkle);
    const removeOverlay = () => sparkle.remove();
    sparkle.addEventListener('animationend', removeOverlay);
    setTimeout(removeOverlay, 1500);
  }

  stateApi?.postMessage({
    command: 'info',
    text: `${element.pokemon.emoji} ${element.pokemon.name} ate the ${item.config.name} and ${outcome.summary}`,
  });
  saveState(stateApi);
}

function normalizePokemonCounter(counter: number | undefined): number {
  if (counter === undefined || Number.isNaN(counter)) {
    return 0;
  }

  return Math.max(0, counter);
}

function calculateFloor(size: PokemonSize, theme: Theme): number {
  switch (theme) {
    case Theme.forest:
      switch (size) {
        case PokemonSize.small:
          return 30;
        case PokemonSize.medium:
          return 40;
        case PokemonSize.large:
          return 65;
        case PokemonSize.nano:
        default:
          return 23;
      }
    case Theme.castle:
      switch (size) {
        case PokemonSize.small:
          return 60;
        case PokemonSize.medium:
          return 80;
        case PokemonSize.large:
          return 120;
        case PokemonSize.nano:
        default:
          return 45;
      }
    case Theme.beach:
      switch (size) {
        case PokemonSize.small:
          return 60;
        case PokemonSize.medium:
          return 80;
        case PokemonSize.large:
          return 120;
        case PokemonSize.nano:
        default:
          return 45;
      }
  }
  return 0;
}

function handleMouseOver(e: MouseEvent) {
  var el = e.currentTarget as HTMLDivElement;
  allPokemon.pokemonCollection.forEach((element) => {
    if (element.collision === el) {
      if (!element.pokemon.canSwipe) {
        return;
      }
      element.pokemon.swipe();
    }
  });
}

function startAnimations(
  collision: HTMLDivElement,
  pokemon: IPokemonType,
  stateApi?: VscodeStateApi,
) {
  if (!stateApi) {
    stateApi = acquireVsCodeApi();
  }

  collision.addEventListener('mouseover', handleMouseOver);
  setInterval(() => {
    var updates = allPokemon.seekNewFriends();
    updates.forEach((message) => {
      stateApi?.postMessage({
        text: message,
        command: 'info',
      });
    });
    pokemon.nextFrame();
    saveState(stateApi);
  }, 100);
}

function addPokemonToPanel(
  pokemonType: PokemonType,
  basePokemonUri: string,
  gen: string,
  originalSpriteSize: number,
  pokemonColor: PokemonColor,
  pokemonSize: PokemonSize,
  left: number,
  bottom: number,
  floor: number,
  name: string,
  stateApi?: VscodeStateApi,
  incrementCounter: boolean = true,
): PokemonElement {
  var pokemonSpriteElement: HTMLImageElement = document.createElement('img');
  pokemonSpriteElement.className = 'pokemon';
  (document.getElementById('pokemonContainer') as HTMLDivElement).appendChild(
    pokemonSpriteElement,
  );

  var collisionElement: HTMLDivElement = document.createElement('div');
  collisionElement.className = 'collision';
  (document.getElementById('pokemonContainer') as HTMLDivElement).appendChild(
    collisionElement,
  );

  var speechBubbleElement: HTMLImageElement = document.createElement('img');
  speechBubbleElement.className = `bubble bubble-${pokemonSize} b-${originalSpriteSize}`;
  speechBubbleElement.src = `${basePokemonUri}/heart.png`;
  (document.getElementById('pokemonContainer') as HTMLDivElement).appendChild(
    speechBubbleElement,
  );

  const root = `${basePokemonUri}/${gen}/${pokemonType}/${pokemonColor}`;
  console.log(
    'Creating new pokemon : ',
    pokemonType,
    root,
    pokemonColor,
    pokemonSize,
    name,
    originalSpriteSize,
  );
  try {
    if (!availableColors(pokemonType).includes(pokemonColor)) {
      throw new InvalidPokemonException('Invalid color for pokemon type');
    }
    var newPokemon = createPokemon(
      pokemonType,
      pokemonSpriteElement,
      collisionElement,
      speechBubbleElement,
      pokemonSize,
      left,
      bottom,
      root,
      floor,
      name,
      gen,
      originalSpriteSize,
    );
    if (incrementCounter) {
      pokemonCounter++;
    }
    startAnimations(collisionElement, newPokemon, stateApi);
  } catch (e: unknown) {
    // Remove elements
    pokemonSpriteElement.remove();
    collisionElement.remove();
    speechBubbleElement.remove();
    throw e;
  }

  pokemonSpriteElement.style.opacity = '0';

  const pokeballEl = document.createElement('div');
  pokeballEl.classList.add('pokeball-sprite');

  // Position pokeball at pokemon location + pokemon center offset
  pokeballEl.style.left = `${left}px`;
  pokeballEl.style.bottom = `${bottom}px`;

  (document.getElementById('pokemonContainer') as HTMLDivElement).appendChild(
    pokeballEl,
  );

  pokeballEl.offsetHeight;
  pokeballEl.classList.add('pokeball-open');

  // show pokemon earlier while pokeball animation is still running
  const computed = window.getComputedStyle(pokeballEl);
  const durationStr = (computed.animationDuration || '0s').split(',')[0].trim();
  const durationMs = durationStr.endsWith('ms')
    ? parseFloat(durationStr)
    : parseFloat(durationStr) * 1000;

  const spawnRatio = 0.7;
  const spawnDelay = Math.max(0, durationMs * spawnRatio);

  let spawned = false;
  const showPokemon = () => {
    if (spawned) {
      return;
    }
    spawned = true;
    pokemonSpriteElement.classList.add('spawn-pop');
    pokemonSpriteElement.style.opacity = '1';

    if (pokemonColor === PokemonColor.shiny) {
      const shinyOverlay = document.createElement('img');
      shinyOverlay.src = `${basePokemonUri}/shiny-anim.gif?t=${Date.now()}`;
      shinyOverlay.className = 'shiny-overlay';
      shinyOverlay.style.left = pokemonSpriteElement.style.left;
      shinyOverlay.style.bottom = pokemonSpriteElement.style.bottom;
      shinyOverlay.style.width = pokemonSpriteElement.style.width;
      shinyOverlay.style.height = pokemonSpriteElement.style.height;
      (
        document.getElementById('pokemonContainer') as HTMLDivElement
      ).appendChild(shinyOverlay);
      const removeOverlay = () => shinyOverlay.remove();
      shinyOverlay.addEventListener('animationend', removeOverlay);
      setTimeout(removeOverlay, 1500);
    }

    saveState(stateApi);
  };

  const spawnTimeout = setTimeout(showPokemon, spawnDelay);

  pokeballEl.addEventListener('animationend', (e) => {
    if (e.animationName !== 'pokeball-open') {
      return;
    }
    pokeballEl.remove();
    clearTimeout(spawnTimeout);
    showPokemon();
  });

  return new PokemonElement(
    pokemonSpriteElement,
    collisionElement,
    speechBubbleElement,
    newPokemon,
    pokemonColor,
    pokemonType,
    gen,
    originalSpriteSize,
  );
}

function removePokemonFromPanel(
  message: { name: string },
  stateApi?: VscodeStateApi,
) {
  if (!stateApi) {
    stateApi = acquireVsCodeApi();
  }
  // Remove elements
  var pokemon = allPokemon.locate(message.name);

  if (!pokemon) {
    stateApi?.postMessage({
      command: 'error',
      text: `Could not find pokemon ${message.name}`,
    });
    return;
  }

  var pokemonSpriteElement = pokemon.el;
  console.log('Removing pokemon ', message.name);
  console.log('pokemon:', pokemon);

  // Remove from collection immediately so rapid deletes of Pokemon don't interfere with each other
  allPokemon.removeFromCollection(message.name);
  pokemon.collision.remove();
  pokemon.speech.remove();
  pokemonCounter = normalizePokemonCounter(pokemonCounter - 1);
  saveState(stateApi);

  stateApi?.postMessage({
    command: 'info',
    text: '👋 Removed pokemon ' + message.name,
  });

  // pokemon fade out
  pokemonSpriteElement.classList.add('fade-out');

  const pokeballEl = document.createElement('div');
  pokeballEl.classList.add('pokeball-sprite');

  pokeballEl.style.left = `${pokemon.pokemon.left}px`;
  pokeballEl.style.bottom = `${pokemon.pokemon.bottom}px`;

  const container = document.getElementById(
    'pokemonContainer',
  ) as HTMLDivElement;
  container.appendChild(pokeballEl);

  pokeballEl.offsetHeight;
  pokeballEl.classList.add('pokeball-close');

  pokemonSpriteElement.addEventListener(
    'animationend',
    (e) => {
      if (e.animationName !== 'pokemon-fade-out') {
        return;
      }
      pokemonSpriteElement.remove();
    },
    { once: true },
  );

  pokeballEl.addEventListener(
    'animationend',
    (e) => {
      if (e.animationName !== 'pokeball-close') {
        return;
      }
      pokeballEl.remove();
    },
    { once: true },
  );
}

export function saveState(stateApi?: VscodeStateApi) {
  if (!stateApi) {
    stateApi = acquireVsCodeApi();
  }
  var state = new PokemonPanelState();
  state.pokemonStates = [];

  allPokemon.pokemonCollection.forEach((pokemonItem) => {
    state.pokemonStates?.push({
      pokemonName: pokemonItem.pokemon.name,
      pokemonColor: pokemonItem.color,
      pokemonType: pokemonItem.type,
      pokemonState: pokemonItem.pokemon.getState(),
      pokemonGeneration: pokemonItem.generation,
      originalSpriteSize: pokemonItem.originalSpriteSize,
      pokemonFriend: pokemonItem.pokemon.friend?.name ?? undefined,
      elLeft: pokemonItem.el.style.left,
      elBottom: pokemonItem.el.style.bottom,
      pokemonLevel: pokemonItem.pokemon.stats.level,
      pokemonHappiness: pokemonItem.pokemon.stats.happiness,
      pokemonSpeedBoost: pokemonItem.pokemon.stats.speedBoost,
    });
  });
  state.pokemonCounter = normalizePokemonCounter(pokemonCounter);
  stateApi?.setState(state);
}

function recoverState(
  basePokemonUri: string,
  gen: string,
  pokemonSize: PokemonSize,
  floor: number,
  stateApi?: VscodeStateApi,
) {
  if (!stateApi) {
    stateApi = acquireVsCodeApi();
  }
  var state = stateApi?.getState();
  if (!state) {
    pokemonCounter = 0;
  } else {
    pokemonCounter = normalizePokemonCounter(state.pokemonCounter);
  }

  var recoveryMap: Map<IPokemonType, PokemonElementState> = new Map();
  console.log(
    'recoverState: saved pokemon count =',
    state?.pokemonStates?.length ?? 0,
  );
  state?.pokemonStates?.forEach((p) => {
    console.log('Recovering pokemon ', p.pokemonType, p.pokemonName);
    try {
      console.log('Adding pokemon to panel for recovery');
      var newPokemon = addPokemonToPanel(
        p.pokemonType ?? 'bulbasaur',
        basePokemonUri,
        p.pokemonGeneration ?? 'gen1',
        p.originalSpriteSize ?? 32,
        p.pokemonColor ?? PokemonColor.default,
        pokemonSize,
        parseInt(p.elLeft ?? '0'),
        parseInt(p.elBottom ?? '0'),
        floor,
        p.pokemonName ?? randomName(),
        stateApi,
        false,
      );
      allPokemon.push(newPokemon);
      recoveryMap.set(newPokemon.pokemon, p);
    } catch (InvalidPokemonException) {
      console.log(
        'State had invalid pokemon (' + p.pokemonType + '), discarding.',
      );
    }
  });
  recoveryMap.forEach((state, pokemon) => {
    // Recover previous state.
    if (state.pokemonState !== undefined) {
      pokemon.recoverState(state.pokemonState);
    }
    pokemon.recoverStats({
      level: state.pokemonLevel,
      happiness: state.pokemonHappiness,
      speedBoost: state.pokemonSpeedBoost,
    });

    // Resolve friend relationships
    var friend = undefined;
    if (state.pokemonFriend) {
      friend = allPokemon.locate(state.pokemonFriend);
      if (friend) {
        pokemon.recoverFriend(friend.pokemon);
      }
    }
  });
}

function randomStartPosition(): number {
  return Math.floor(Math.random() * (window.innerWidth * 0.7));
}

let canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D;

function initCanvas() {
  canvas = document.getElementById('pokemonCanvas') as HTMLCanvasElement;
  if (!canvas) {
    console.log('Canvas not ready');
    return;
  }
  ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  if (!ctx) {
    console.log('Canvas context not ready');
    return;
  }
  ctx.canvas.width = window.innerWidth;
  ctx.canvas.height = window.innerHeight;
}

// It cannot access the main VS Code APIs directly.
export function pokemonPanelApp(
  basePokemonUri: string,
  theme: Theme,
  themeKind: ColorThemeKind,
  pokemonColor: PokemonColor,
  pokemonSize: PokemonSize,
  pokemonType: PokemonType,
  throwBallWithMouse: boolean,
  gen: string,
  originalSpriteSize: number,
  feedItem: string = DEFAULT_FEED_ITEM,
  feedWithMouseEnabled: boolean | string = true,
  stateApi?: VscodeStateApi,
) {
  var floor = 0;
  if (!stateApi) {
    stateApi = acquireVsCodeApi();
  }
  // Apply Theme backgrounds
  const foregroundEl = document.getElementById('foreground');
  if (theme !== Theme.none) {
    var _themeKind = '';
    switch (themeKind) {
      case ColorThemeKind.dark:
        _themeKind = 'dark';
        break;
      case ColorThemeKind.light:
        _themeKind = 'light';
        break;
      case ColorThemeKind.highContrast:
      default:
        _themeKind = 'light';
        break;
    }

    document.body.style.backgroundImage = `url('${basePokemonUri}/backgrounds/${theme}/background-${_themeKind}-${pokemonSize}.png')`;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    foregroundEl!.style.backgroundImage = `url('${basePokemonUri}/backgrounds/${theme}/foreground-${_themeKind}-${pokemonSize}.png')`;

    floor = calculateFloor(pokemonSize, theme); // Themes have pokemonCollection at a specified height from the ground
  } else {
    document.body.style.backgroundImage = '';
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    foregroundEl!.style.backgroundImage = '';
  }

  console.log(
    'Starting pokemon session',
    pokemonColor,
    basePokemonUri,
    pokemonType,
    throwBallWithMouse,
  );

  // New session
  var state = stateApi?.getState();

  const hasRecoverableState =
    state !== undefined &&
    Array.isArray(state.pokemonStates) &&
    state.pokemonStates.length > 0;

  if (hasRecoverableState) {
    console.log('Recovering state - ', state);
    recoverState(basePokemonUri, gen, pokemonSize, floor, stateApi);
  } else {
    console.log('No recoverable pokemon state, starting an empty session.');
    pokemonCounter = normalizePokemonCounter(state?.pokemonCounter);
    saveState(stateApi);
  }

  initCanvas();

  // Feeding: HUD with the selected item + Ctrl/Cmd+click to drop it
  selectedFeedItem = getItem(feedItem) ? feedItem : DEFAULT_FEED_ITEM;
  feedWithMouse = String(feedWithMouseEnabled) !== 'false';
  updateItemHud(basePokemonUri);
  itemHud?.addEventListener('click', () => {
    stateApi?.postMessage({ command: 'pick-feed-item', text: '' });
  });
  document.addEventListener('click', (e: MouseEvent) => {
    if (!feedWithMouse || !(e.ctrlKey || e.metaKey)) {
      return;
    }
    if (itemHud && itemHud.contains(e.target as Node)) {
      return;
    }
    e.preventDefault();
    const collision = (e.target as HTMLElement | null)?.closest?.('.collision');
    const target = collision
      ? allPokemon.pokemonCollection.find((p) => p.collision === collision)
      : undefined;
    dropItem(
      basePokemonUri,
      selectedFeedItem,
      e.clientX,
      window.innerHeight - e.clientY,
      floor,
      pokemonSize,
      target,
      stateApi,
    );
  });

  // Handle messages sent from the extension to the webview
  window.addEventListener('message', (event): void => {
    const message = event.data; // The json data that the extension sent
    console.log('Received message in panel:', message);
    switch (message.command) {
      case 'spawn-pokemon':
        console.log('adding pokemon to panel from message', message);
        allPokemon.push(
          addPokemonToPanel(
            message.type,
            basePokemonUri,
            message.generation,
            message.originalSpriteSize,
            message.color,
            pokemonSize,
            randomStartPosition(),
            floor,
            floor,
            message.name ?? randomName(),
            stateApi,
          ),
        );
        saveState(stateApi);
        break;

      case 'spawn-random-pokemon':
        var [randomPokemonType, randomPokemonConfig] = getRandomPokemonConfig();
        console.log('adding random pokemon to panel from message');
        allPokemon.push(
          addPokemonToPanel(
            randomPokemonType,
            basePokemonUri,
            randomPokemonConfig.generation.toString(),
            randomPokemonConfig.originalSpriteSize ?? 32,
            PokemonColor.default,
            pokemonSize,
            randomStartPosition(),
            floor,
            floor,
            randomName(),
            stateApi,
          ),
        );
        saveState(stateApi);
        break;

      case 'list-pokemon':
        var pokemonCollection = allPokemon.pokemonCollection;
        stateApi?.postMessage({
          command: 'list-pokemon',
          text: pokemonCollection
            .map(
              (pokemon) =>
                `${pokemon.type},${pokemon.pokemon.name},${pokemon.color}`,
            )
            .join('\n'),
        });
        break;

      case 'roll-call':
        var pokemonCollection = allPokemon.pokemonCollection;
        // go through every single
        // pokemon and then print out their name
        pokemonCollection.forEach((pokemon) => {
          stateApi?.postMessage({
            command: 'info',
            text: `${pokemon.pokemon.emoji} ${pokemon.pokemon.name} (${pokemon.color} ${pokemon.type}, Lv. ${pokemon.pokemon.stats.level}, ♥ ${pokemon.pokemon.stats.happiness}): ${pokemon.pokemon.hello}`,
          });
        });
        break;
      case 'delete-pokemon':
        removePokemonFromPanel(message, stateApi);
        break;
      case 'reset-pokemon':
        var pokemonToRemove = [...allPokemon.pokemonCollection];
        pokemonToRemove.forEach((pokemon) => {
          removePokemonFromPanel({ name: pokemon.pokemon.name }, stateApi);
        });
        // Wait for animations to complete before resetting
        setTimeout(() => {
          allPokemon.reset();
          pokemonCounter = 0;
          saveState(stateApi);
        }, 500);
        break;
      case 'pause-pokemon':
        pokemonCounter = 1;
        saveState(stateApi);
        break;
      case 'set-feed-item':
        if (getItem(message.item)) {
          selectedFeedItem = message.item;
        }
        updateItemHud(basePokemonUri);
        break;
      case 'feed-with-mouse':
        feedWithMouse = Boolean(message.enabled);
        updateItemHud(basePokemonUri);
        break;
      case 'feed': {
        // Drop the item from the top of the panel, near the target (or a random Pokémon)
        const itemKey: string = message.item ?? selectedFeedItem;
        const collection = allPokemon.pokemonCollection;
        const target: PokemonElement | undefined = message.name
          ? allPokemon.locate(message.name)
          : collection[Math.floor(Math.random() * collection.length)];
        const sizePx = itemPixelSize(pokemonSize);
        const x = target
          ? target.pokemon.left +
            target.pokemon.width / 2 +
            (Math.random() < 0.5 ? -1 : 1) * (target.pokemon.width + sizePx)
          : randomStartPosition();
        dropItem(
          basePokemonUri,
          itemKey,
          x,
          window.innerHeight,
          floor,
          pokemonSize,
          target,
          stateApi,
        );
        break;
      }
    }
  });
}
window.addEventListener('resize', function () {
  initCanvas();
});
