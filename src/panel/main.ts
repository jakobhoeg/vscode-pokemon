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
import { getRandomPokemonConfig } from '../common/pokemon-data';

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

function updateXpHud(payload: {
  visible: boolean;
  speciesName: string;
  level: number;
  percent: number;
  numbersText: string;
}): void {
  const hud = document.getElementById('xp-hud');
  if (!hud) {
    return;
  }
  if (!payload.visible) {
    hud.setAttribute('hidden', '');
    return;
  }
  hud.removeAttribute('hidden');
  const labelEl = document.getElementById('xp-hud-label');
  const levelEl = document.getElementById('xp-hud-level');
  const fillEl = document.getElementById(
    'xp-hud-bar-fill',
  ) as HTMLDivElement | null;
  const numbersEl = document.getElementById('xp-hud-numbers');
  if (labelEl) {
    labelEl.textContent = payload.speciesName;
  }
  if (levelEl) {
    levelEl.textContent = `Lv ${payload.level}`;
  }
  if (fillEl) {
    fillEl.style.width = `${payload.percent}%`;
    if (payload.numbersText === 'MAX') {
      fillEl.classList.add('maxed');
    } else {
      fillEl.classList.remove('maxed');
    }
  }
  if (numbersEl) {
    numbersEl.textContent = payload.numbersText;
  }
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
  initialXpPayload?: {
    visible: boolean;
    speciesName: string;
    level: number;
    percent: number;
    numbersText: string;
  },
  prevPokemonType?: PokemonType,
  stateApi?: VscodeStateApi,
) {
  // Mutable config — updated in-place by update-config messages without an HTML reload.
  var currentTheme = theme;
  var currentThemeKind = themeKind;
  var currentPokemonSize = pokemonSize;

  var floor = 0;
  if (!stateApi) {
    stateApi = acquireVsCodeApi();
  }

  function applyTheme(t: Theme, tk: ColorThemeKind, sz: PokemonSize) {
    const foregroundEl = document.getElementById('foreground');
    if (t !== Theme.none) {
      var _themeKind = '';
      switch (tk) {
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
      document.body.style.backgroundImage = `url('${basePokemonUri}/backgrounds/${t}/background-${_themeKind}-${sz}.png')`;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      foregroundEl!.style.backgroundImage = `url('${basePokemonUri}/backgrounds/${t}/foreground-${_themeKind}-${sz}.png')`;
      floor = calculateFloor(sz, t);
    } else {
      document.body.style.backgroundImage = '';
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      foregroundEl!.style.backgroundImage = '';
      floor = 0;
    }
  }

  // Apply Theme backgrounds
  applyTheme(currentTheme, currentThemeKind, currentPokemonSize);

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
    recoverState(basePokemonUri, gen, currentPokemonSize, floor, stateApi);
    // Sync the active pokemon's species when the type changed since the webview last saved
    // state (hidden evolution or pokemonType setting change).  We identify the stale pokemon
    // by its previous type (prevPokemonType) rather than by collection index so that
    // unrelated extra-spawned pokemon are never accidentally overwritten.
    if (
      prevPokemonType &&
      prevPokemonType !== pokemonType &&
      allPokemon.pokemonCollection.length > 0
    ) {
      const staleIdx = allPokemon.pokemonCollection.findIndex(
        (p) => p.type === prevPokemonType,
      );
      if (staleIdx !== -1) {
        const stale = allPokemon.pokemonCollection[staleIdx];
        const preservedName = stale.pokemon.name;
        const preservedLeft = stale.el.style.left;
        const preservedBottom = stale.el.style.bottom;
        const preservedColor = stale.color;
        allPokemon.remove(stale.pokemon.name);
        try {
          const evolved = addPokemonToPanel(
            pokemonType,
            basePokemonUri,
            gen,
            originalSpriteSize,
            preservedColor,
            currentPokemonSize,
            parseInt(preservedLeft || '0') || randomStartPosition(),
            parseInt(preservedBottom || '0') || floor,
            floor,
            preservedName,
            stateApi,
            false,
          );
          allPokemon.pokemonCollection.splice(staleIdx, 0, evolved);
          saveState(stateApi);
        } catch (e: any) {
          console.error(
            'Failed to sync active pokemon type on view restore:',
            e,
          );
        }
      }
    }
  } else {
    console.log('No recoverable pokemon state, starting an empty session.');
    pokemonCounter = normalizePokemonCounter(state?.pokemonCounter);
    saveState(stateApi);
  }

  initCanvas();

  // Apply the initial XP HUD state provided by the extension host.
  if (initialXpPayload) {
    updateXpHud(initialXpPayload);
  }

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
            currentPokemonSize,
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
            currentPokemonSize,
            randomStartPosition(),
            floor,
            floor,
            randomName(),
            stateApi,
          ),
        );
        saveState(stateApi);
        break;

      case 'update-config':
        if (message.theme !== undefined) {
          currentTheme = message.theme;
        }
        if (message.themeKind !== undefined) {
          currentThemeKind = message.themeKind;
        }
        if (message.pokemonSize !== undefined) {
          currentPokemonSize = message.pokemonSize;
        }
        applyTheme(currentTheme, currentThemeKind, currentPokemonSize);
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
            text: `${pokemon.pokemon.emoji} ${pokemon.pokemon.name} (${pokemon.color} ${pokemon.type}): ${pokemon.pokemon.hello}`,
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
      case 'update-xp':
        updateXpHud(message.payload);
        break;
      case 'evolve-pokemon': {
        // Find the pokemon by name (canonical identifier when known). Fall back to
        // pre-evolution type for older saved-state recovery paths, then to index 0.
        var evolveIdx = -1;
        if (message.name) {
          evolveIdx = allPokemon.pokemonCollection.findIndex(
            (p) => p.pokemon.name === message.name,
          );
        }
        if (evolveIdx === -1 && message.prevType) {
          evolveIdx = allPokemon.pokemonCollection.findIndex(
            (p) => p.type === message.prevType,
          );
        }
        if (evolveIdx === -1) {
          evolveIdx = 0;
        }
        var first = allPokemon.pokemonCollection[evolveIdx];
        if (!first) {
          break;
        }
        var preservedName = first.pokemon.name;
        var preservedLeft = first.el.style.left;
        var preservedBottom = first.el.style.bottom;
        var preservedColor = first.color;
        allPokemon.remove(first.pokemon.name);
        try {
          var evolved = addPokemonToPanel(
            message.type,
            basePokemonUri,
            message.generation,
            message.originalSpriteSize,
            preservedColor,
            currentPokemonSize,
            parseInt(preservedLeft || '0') || randomStartPosition(),
            parseInt(preservedBottom || '0') || floor,
            floor,
            preservedName,
            stateApi,
            false,
          );
          // Re-insert at the same slot so the collection order is preserved.
          allPokemon.pokemonCollection.splice(evolveIdx, 0, evolved);
          saveState(stateApi);
        } catch (e: any) {
          stateApi?.postMessage({
            command: 'alert',
            text: `Failed to evolve pokemon: ${e?.message ?? e}`,
          });
        }
        break;
      }
    }
  });
}
window.addEventListener('resize', function () {
  initCanvas();
});
