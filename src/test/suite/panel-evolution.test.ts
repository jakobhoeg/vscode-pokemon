// Lightweight panel-side test for the evolve-pokemon message. The vscode-pokemon webview is
// renderer-side code that talks to the DOM and the vscode webview API. We use JSDOM (the same
// pattern as panel.test.ts) and stub the webview API. The goal is to verify that posting an
// evolve-pokemon message causes the active pokemon's DOM elements to be replaced and the new
// pokemon to be inserted at the head of the collection (so it remains the "active" one).

import * as assert from 'assert';

function setupWindow(): void {
    const html = `<!doctype html><html><body>
        <canvas id="pokemonCanvas"></canvas>
        <div id="pokemonContainer"></div>
        <div id="foreground"></div>
    </body></html>`;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const jsdom = require('jsdom');
    const dom = new jsdom.JSDOM(html, { url: 'http://localhost/' });
    (global as any).document = dom.window.document;
    (global as any).window = dom.window;
    (global as any).HTMLImageElement = dom.window.HTMLImageElement;
    (global as any).HTMLDivElement = dom.window.HTMLDivElement;
    (global as any).HTMLCanvasElement = dom.window.HTMLCanvasElement;
    (global as any).MouseEvent = dom.window.MouseEvent;
    dom.window.console = global.console;
    // Provide a sized "viewport" so randomStartPosition has a sensible window.innerWidth.
    Object.defineProperty(dom.window, 'innerWidth', {
        value: 800,
        configurable: true,
    });
    Object.defineProperty(dom.window, 'innerHeight', {
        value: 200,
        configurable: true,
    });

    // Stub acquireVsCodeApi — webview script calls this.
    (global as any).acquireVsCodeApi = () => ({
        getState: () => undefined,
        setState: () => undefined,
        postMessage: () => undefined,
    });
    (dom.window as any).acquireVsCodeApi = (global as any).acquireVsCodeApi;
}

suite('panel: evolve-pokemon message', () => {
    suiteSetup(() => {
        setupWindow();
    });

    test('replaces the active pokemon in-place, preserving its name', () => {
        // Defer the import until JSDOM is set up — the webview module touches `document` at load
        // for some types, and importing earlier could fail under bare Node.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const main = require('../../panel/main');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const collection = require('../../panel/pokemon-collection');

        // Boot the panel app with Bulbasaur.
        main.pokemonPanelApp(
            'media',
            'none',
            2, // dark
            'default',
            'nano',
            'bulbasaur',
            'false',
            '1',
            32,
        );

        const allPokemon = main.allPokemon;
        assert.strictEqual(allPokemon.pokemonCollection.length, 1);
        const originalName = allPokemon.pokemonCollection[0].pokemon.name;
        assert.strictEqual(allPokemon.pokemonCollection[0].type, 'bulbasaur');

        // Simulate the extension posting an evolve-pokemon message.
        const event = new (global as any).window.MessageEvent('message', {
            data: {
                command: 'evolve-pokemon',
                type: 'ivysaur',
                generation: '1',
                originalSpriteSize: 32,
            },
        });
        (global as any).window.dispatchEvent(event);

        assert.strictEqual(
            allPokemon.pokemonCollection.length,
            1,
            'collection should still hold one pokemon',
        );
        assert.strictEqual(
            allPokemon.pokemonCollection[0].type,
            'ivysaur',
            'type should switch to ivysaur',
        );
        assert.strictEqual(
            allPokemon.pokemonCollection[0].pokemon.name,
            originalName,
            'evolved pokemon should keep its original name',
        );

        // Sanity: confirm collection module API is intact (not strictly needed, but catches accidental breakage).
        assert.ok(collection.PokemonCollection);
    });
});
