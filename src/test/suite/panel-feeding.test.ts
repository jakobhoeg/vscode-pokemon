/**
 * Smoke test of the feeding feature inside the webview script, run in jsdom:
 * spawn a Pokémon, Ctrl+click, let it walk over and eat, check the effects.
 *
 * Runs without VS Code:  npm run test:unit
 */
import * as assert from 'assert';

import { WebviewMessage } from '../../common/types';

const jsdomCleanup = require('jsdom-global')(
  '<!doctype html><html><body><canvas id="pokemonCanvas"></canvas><div id="pokemonContainer"></div><div id="foreground"></div></body></html>',
  { pretendToBeVisual: true },
);

interface PostedMessage extends WebviewMessage {
  [key: string]: unknown;
}

class FakeStateApi {
  state: unknown = undefined;
  messages: PostedMessage[] = [];
  getState() {
    return this.state as never;
  }
  setState(state: unknown) {
    this.state = state;
  }
  postMessage(message: PostedMessage) {
    this.messages.push(message);
  }
}

function sendToPanel(data: Record<string, unknown>) {
  window.dispatchEvent(new window.MessageEvent('message', { data }));
}

/** Shared by both suites - the panel is initialised once with this api. */
const api = new FakeStateApi();

function flush(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

suite('panel feeding (jsdom)', function () {
  this.timeout(10000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let panel: any;

  suiteSetup(() => {
    (
      global as unknown as { acquireVsCodeApi: () => FakeStateApi }
    ).acquireVsCodeApi = () => api;
    panel = require('../../panel/main');
    panel.pokemonPanelApp(
      'vscode-resource://media',
      'none',
      2,
      'default',
      'medium',
      'bulbasaur',
      false,
      'gen1',
      32,
      'rare_candy',
      'true',
      api,
    );
  });

  test('shows the selected item in the HUD', () => {
    const hud = document.getElementById('itemHud') as HTMLDivElement;
    assert.ok(hud, 'item HUD missing');
    const img = hud.querySelector('img') as HTMLImageElement;
    assert.ok(img.src.endsWith('/items/rare_candy.png'), img.src);
    sendToPanel({ command: 'set-feed-item', item: 'oran_berry' });
    assert.ok(img.src.endsWith('/items/oran_berry.png'));
    sendToPanel({ command: 'set-feed-item', item: 'rare_candy' });
  });

  test('clicking the HUD asks the extension to open the item picker', () => {
    const hud = document.getElementById('itemHud') as HTMLDivElement;
    hud.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.ok(api.messages.some((m) => m.command === 'pick-feed-item'));
  });

  test('ctrl+click with no Pokémon explains what to do', () => {
    api.messages.length = 0;
    document.body.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        ctrlKey: true,
        clientX: 300,
        clientY: 100,
      }),
    );
    assert.ok(
      api.messages.some(
        (m) => m.command === 'info' && /spawn a Pokemon/.test(m.text),
      ),
    );
    assert.strictEqual(document.querySelectorAll('img.item').length, 0);
  });

  test('ctrl+click drops an item and the closest Pokémon eats it', async () => {
    sendToPanel({
      command: 'spawn-pokemon',
      type: 'bulbasaur',
      color: 'default',
      name: 'Bulby',
      generation: 'gen1',
      originalSpriteSize: 32,
    });
    await flush(20);
    const element = panel.allPokemon.pokemonCollection[0];
    assert.ok(element, 'pokemon not spawned');
    const pokemon = element.pokemon;
    const before = pokemon.stats;
    assert.deepStrictEqual(before, { level: 5, happiness: 70, speedBoost: 1 });

    api.messages.length = 0;
    const x = pokemon.left + 150;
    document.body.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        ctrlKey: true,
        clientX: x,
        clientY: 50,
      }),
    );
    const itemEl = document.querySelector('img.item') as HTMLImageElement;
    assert.ok(itemEl, 'item element not created');
    assert.ok(itemEl.src.endsWith('/items/rare_candy.png'));
    assert.ok(pokemon.isFeeding, 'pokemon should be heading for the snack');
    assert.ok(!pokemon.canSwipe, 'no swiping while eating');

    // jsdom does not run CSS transitions - the fallback timer lands the item
    await flush(600);
    assert.ok(itemEl.classList.contains('item-landed'));

    // drive the animation loop by hand until the candy is eaten
    for (let i = 0; i < 400 && pokemon.isFeeding; i++) {
      pokemon.nextFrame();
    }
    assert.ok(!pokemon.isFeeding, 'should have finished eating');
    assert.ok(itemEl.classList.contains('item-eaten'));
    assert.strictEqual(pokemon.stats.level, 6, 'rare candy = +1 level');
    assert.strictEqual(pokemon.stats.happiness, 75);

    const floatEl = document.querySelector('.float-text') as HTMLDivElement;
    assert.ok(
      floatEl && floatEl.textContent === 'LV UP!',
      'float text missing',
    );
    assert.ok(element.el.classList.contains('level-up'));
    assert.ok(
      document.querySelector('.shiny-overlay'),
      'level up sparkle missing',
    );
    const toast = api.messages.find((m) => m.command === 'info');
    assert.ok(
      toast && /Bulby ate the Rare Candy and grew to Lv\. 6!/.test(toast.text),
      toast?.text,
    );

    // stats are persisted in the webview state
    const saved = api.state as {
      pokemonStates: Array<{ pokemonLevel: number; pokemonHappiness: number }>;
    };
    assert.strictEqual(saved.pokemonStates[0].pokemonLevel, 6);
    assert.strictEqual(saved.pokemonStates[0].pokemonHappiness, 75);

    await flush(800);
    assert.strictEqual(
      document.querySelectorAll('img.item').length,
      0,
      'eaten item removed',
    );
  });

  test('the "feed" message drops an item for a named Pokémon', async () => {
    api.messages.length = 0;
    sendToPanel({ command: 'feed', item: 'carbos', name: 'Bulby' });
    const pokemon = panel.allPokemon.pokemonCollection[0].pokemon;
    assert.ok(pokemon.isFeeding);
    const item = document.querySelector('img.item') as HTMLImageElement;
    assert.ok(item.src.endsWith('/items/carbos.png'));
    await flush(600);
    for (let i = 0; i < 400 && pokemon.isFeeding; i++) {
      pokemon.nextFrame();
    }
    assert.strictEqual(pokemon.stats.speedBoost, 1.1);
    assert.ok(
      api.messages.some(
        (m) => m.command === 'info' && /got faster/.test(m.text),
      ),
    );
  });

  test('feed-with-mouse false hides the HUD and ignores ctrl+click', () => {
    sendToPanel({ command: 'feed-with-mouse', enabled: false });
    assert.strictEqual(
      (document.getElementById('itemHud') as HTMLDivElement).style.display,
      'none',
    );
    const count = document.querySelectorAll('img.item').length;
    document.body.dispatchEvent(
      new window.MouseEvent('click', {
        bubbles: true,
        ctrlKey: true,
        clientX: 10,
        clientY: 10,
      }),
    );
    assert.strictEqual(document.querySelectorAll('img.item').length, count);
    sendToPanel({ command: 'feed-with-mouse', enabled: true });
  });

  test('roll-call reports level and happiness', () => {
    api.messages.length = 0;
    sendToPanel({ command: 'roll-call' });
    const line = api.messages.find((m) => m.command === 'info');
    assert.ok(line && /Lv\. 6, ♥ 77/.test(line.text), line?.text);
  });
});

suite('panel evolution (jsdom)', function () {
  this.timeout(15000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let panel: any;

  suiteSetup(() => {
    (
      global as unknown as { acquireVsCodeApi: () => FakeStateApi }
    ).acquireVsCodeApi = () => api;
    panel = require('../../panel/main');
  });

  async function spawn(type: string, name: string, color = 'default') {
    sendToPanel({
      command: 'spawn-pokemon',
      type,
      color,
      name,
      generation: `gen${panel.POKEMON_DATA ? 1 : 1}`,
      originalSpriteSize: 32,
    });
    await flush(20);
    return panel.allPokemon.locate(name);
  }

  async function feedAndWait(name: string, item: string) {
    sendToPanel({ command: 'feed', item, name });
    const element = panel.allPokemon.locate(name);
    await flush(600); // item lands (fallback timer)
    for (let i = 0; i < 400 && element.pokemon.isFeeding; i++) {
      element.pokemon.nextFrame();
    }
    return element;
  }

  test('thunder stone evolves Pikachu into Raichu', async () => {
    const element = await spawn('pikachu', 'Sparky');
    assert.ok(element, 'pikachu not spawned');
    api.messages.length = 0;
    await feedAndWait('Sparky', 'thunder_stone');
    const pokemon = element.pokemon;
    assert.ok(pokemon.isEvolving, 'should be evolving');
    assert.ok(element.el.classList.contains('evolving'));
    assert.ok(!pokemon.canFeed && !pokemon.canSwipe, 'busy while evolving');
    assert.ok(
      api.messages.some(
        (m) => m.command === 'info' && /Sparky is evolving/.test(m.text),
      ),
    );

    await flush(panel.EVOLUTION_MS + 300);
    assert.ok(!pokemon.isEvolving, 'evolution should be over');
    assert.strictEqual(element.type, 'raichu');
    assert.strictEqual(element.generation, 'gen1');
    assert.strictEqual(pokemon.label, 'raichu');
    assert.ok(
      pokemon.pokemonRoot.endsWith('/gen1/raichu/default'),
      pokemon.pokemonRoot,
    );
    assert.ok(
      element.el.src.endsWith('/gen1/raichu/default_idle_8fps.gif'),
      element.el.src,
    );
    assert.ok(!element.el.classList.contains('evolving'));
    assert.strictEqual(pokemon.name, 'Sparky', 'nickname is kept');

    const congrats = api.messages.find(
      (m) => m.command === 'info' && /Congratulations/.test(m.text),
    );
    assert.ok(
      congrats &&
        /Your Pikachu Sparky evolved into Raichu!/.test(congrats.text),
      congrats?.text,
    );
    const evolved = api.messages.find((m) => m.command === 'pokemon-evolved');
    assert.ok(evolved, 'extension must be told about the evolution');
    assert.deepStrictEqual(JSON.parse(evolved!.text), {
      name: 'Sparky',
      from: 'pikachu',
      to: 'raichu',
      color: 'default',
    });
    const saved = api.state as {
      pokemonStates: Array<{ pokemonName: string; pokemonType: string }>;
    };
    assert.ok(
      saved.pokemonStates.some(
        (p) => p.pokemonName === 'Sparky' && p.pokemonType === 'raichu',
      ),
    );
    assert.ok(
      document.querySelector('.float-text')?.textContent === 'EVOLVED!',
    );
  });

  test('an evolution item the Pokémon cannot use has no effect', async () => {
    const element = await spawn('bulbasaur', 'Leafy');
    api.messages.length = 0;
    await feedAndWait('Leafy', 'thunder_stone');
    await flush(50);
    assert.ok(!element.pokemon.isEvolving);
    assert.strictEqual(element.type, 'bulbasaur');
    const toast = api.messages.find((m) => m.command === 'info');
    assert.ok(toast && /no effect/.test(toast.text), toast?.text);
    assert.deepStrictEqual(element.pokemon.stats, {
      level: 5,
      happiness: 70,
      speedBoost: 1,
    });
  });

  test('a shiny evolves into a shiny when the evolved form has shiny sprites', async () => {
    const element = await spawn('charmander', 'Ember', 'shiny');
    // charmander has no item evolution; use eevee instead
    assert.ok(element);
    const eevee = await spawn('eevee', 'Vee', 'shiny');
    await feedAndWait('Vee', 'water_stone');
    await flush(panel.EVOLUTION_MS + 300);
    assert.strictEqual(eevee.type, 'vaporeon');
    assert.strictEqual(eevee.color, 'shiny');
    assert.ok(eevee.pokemon.pokemonRoot.endsWith('/gen1/vaporeon/shiny'));
  });
});

// one jsdom for the whole file
suiteTeardown(() => {
  jsdomCleanup();
});
