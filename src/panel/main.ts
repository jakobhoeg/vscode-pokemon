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
import { BallState, PokemonElementState, PokemonPanelState } from './states';
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

function calculateBallRadius(size: PokemonSize): number {
    if (size === PokemonSize.nano) {
        return 2;
    } else if (size === PokemonSize.small) {
        return 3;
    } else if (size === PokemonSize.medium) {
        return 4;
    } else if (size === PokemonSize.large) {
        return 8;
    } else {
        return 1; // Shrug
    }
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
    incrementCounter: boolean = true
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
    console.log('Creating new pokemon : ', pokemonType, root, pokemonColor, pokemonSize, name, originalSpriteSize);
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
            originalSpriteSize
        );
        if (incrementCounter) {
            pokemonCounter++;
        }
        startAnimations(collisionElement, newPokemon, stateApi);
    } catch (e: any) {
        // Remove elements
        pokemonSpriteElement.remove();
        collisionElement.remove();
        speechBubbleElement.remove();
        throw e;
    }

    pokemonSpriteElement.style.opacity = '0';

    const throwEl = document.createElement('div');
    throwEl.classList.add('pokeball-throw');

    // final pos = Pokémon size / 2
    throwEl.style.setProperty('--target-x', `${left+16}px`);
    throwEl.style.setProperty('--target-y', `${bottom+16}px`);

    const pokeballEl = document.createElement('div');
    pokeballEl.classList.add('pokeball-sprite');

    
    throwEl.appendChild(pokeballEl);

    const container = document.getElementById('pokemonContainer') as HTMLDivElement;
    container.appendChild(throwEl);

    throwEl.addEventListener(
    'animationend',
    () => {
        pokeballEl.classList.add('pokeball-open');
    },
    { once: true }
    );

    pokeballEl.addEventListener('animationend', (e) => {
    if (e.animationName !== 'pokeball-open') {
        return;
    }

    throwEl.remove();
    pokemonSpriteElement.classList.add('spawn-pop');
    pokemonSpriteElement.style.opacity = '1';
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

export function saveState(stateApi?: VscodeStateApi) {
    if (!stateApi) {
        stateApi = acquireVsCodeApi();
    }
    var state = new PokemonPanelState();
    state.pokemonStates = new Array();

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
    state.pokemonCounter = pokemonCounter;
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
        pokemonCounter = 1;
    } else {
        if (state.pokemonCounter === undefined || isNaN(state.pokemonCounter)) {
            pokemonCounter = 1;
        } else {
            pokemonCounter = state.pokemonCounter ?? 1;
        }
    }

    var recoveryMap: Map<IPokemonType, PokemonElementState> = new Map();
    console.log('recoverState: saved pokemon count =', state?.pokemonStates?.length ?? 0);
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
                p.pokemonName ?? randomName(p.pokemonType ?? 'bulbasaur'),
                stateApi,
                false
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
    stateApi?: VscodeStateApi,
) {
    const ballRadius: number = calculateBallRadius(pokemonSize);
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
    if (!state) {
        console.log('No state, starting a new session.');
        pokemonCounter = 1;
        console.log('adding pokemon to panel for new session');
        allPokemon.push(
            addPokemonToPanel(
                pokemonType,
                basePokemonUri,
                gen,
                originalSpriteSize,
                pokemonColor,
                pokemonSize,
                randomStartPosition(),
                floor,
                floor,
                randomName(pokemonType),
                stateApi,
            ),
        );
        saveState(stateApi);
    } else {
        console.log('Recovering state - ', state);
        recoverState(basePokemonUri, gen, pokemonSize, floor, stateApi);
    }

    initCanvas();

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
                        message.name ?? randomName(message.type),
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
                        randomName(randomPokemonConfig.name),
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
                            (pokemon) => `${pokemon.type},${pokemon.pokemon.name},${pokemon.color}`,
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
            case 'delete-pokemon':
                var pokemon = allPokemon.locate(message.name);
                if (pokemon) {
                    allPokemon.remove(message.name);
                    saveState(stateApi);
                    stateApi?.postMessage({
                        command: 'info',
                        text: '👋 Removed pokemon ' + message.name,
                    });
                    pokemonCounter--;
                } else {
                    stateApi?.postMessage({
                        command: 'error',
                        text: `Could not find pokemon ${message.name}`,
                    });
                }
                break;
            case 'reset-pokemon':
                allPokemon.reset();
                pokemonCounter = 0;
                saveState(stateApi);
                break;
            case 'pause-pokemon':
                pokemonCounter = 1;
                saveState(stateApi);
                break;
        }
    });
}
window.addEventListener('resize', function () {
    initCanvas();
});
