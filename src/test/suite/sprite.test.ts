import * as assert from 'assert';
import { PokemonColor, PokemonSize } from '../../common/types';
import { createPokemon, PokemonElement } from '../../panel/pokemon-collection';

const BASE = 'https://media.test';
const root = (type: string) => `${BASE}/gen1/${type}/default`;

function spawn(
  type: string,
  name = 'Bella',
  originalSpriteSize = 32,
  left = 100,
) {
  const el = document.createElement('img');
  const collision = document.createElement('div');
  const speech = document.createElement('img');
  speech.className = `bubble bubble-medium b-${originalSpriteSize}`;
  const pokemon = createPokemon(
    type,
    el,
    collision,
    speech,
    PokemonSize.medium, // 2x the original sprite size
    left,
    0,
    root(type),
    0,
    name,
    'gen1',
    originalSpriteSize,
  );
  return new PokemonElement(
    el,
    collision,
    speech,
    pokemon,
    PokemonColor.default,
    type,
    'gen1',
    originalSpriteSize,
  );
}

suite('Evolve in place', () => {
  let cleanupDom: () => void;
  suiteSetup(() => {
    cleanupDom = require('jsdom-global')();
  });
  suiteTeardown(() => cleanupDom());

  test('swaps the sprite even when the animation name is unchanged', () => {
    const bulbasaur = spawn('bulbasaur');
    bulbasaur.pokemon.nextFrame();
    assert.strictEqual(bulbasaur.el.src, `${root('bulbasaur')}_idle_8fps.gif`);

    bulbasaur.evolve(
      'ivysaur',
      PokemonColor.default,
      'gen1',
      32,
      root('ivysaur'),
    );
    bulbasaur.pokemon.nextFrame(); // still idle: same "_idle_8fps.gif" suffix
    assert.strictEqual(bulbasaur.el.src, `${root('ivysaur')}_idle_8fps.gif`);
  });

  test('keeps name, position and friend; updates what saveState persists', () => {
    const bella = spawn('bulbasaur', 'Bella');
    const milo = spawn('pikachu', 'Milo');
    bella.pokemon.makeFriendsWith(milo.pokemon);
    const { left, bottom } = bella.pokemon;

    bella.evolve('ivysaur', PokemonColor.shiny, 'gen1', 32, root('ivysaur'));

    assert.strictEqual(bella.pokemon.name, 'Bella');
    assert.strictEqual(bella.pokemon.left, left);
    assert.strictEqual(bella.pokemon.bottom, bottom);
    assert.strictEqual(bella.pokemon.friend, milo.pokemon);
    assert.strictEqual(bella.type, 'ivysaur');
    assert.strictEqual(bella.color, PokemonColor.shiny);
  });

  test('resizes sprite, hitbox and bubble for a bigger sprite sheet', () => {
    const small = spawn('bulbasaur', 'Bella', 32);
    assert.strictEqual(small.el.style.width, '64px');

    small.evolve('ivysaur', PokemonColor.default, 'gen1', 64, root('ivysaur'));

    assert.strictEqual(small.el.style.width, '128px');
    assert.strictEqual(small.el.style.height, '128px');
    assert.strictEqual(small.collision.style.width, '128px');
    assert.strictEqual(small.speech.style.bottom, '128px'); // sits on top of the sprite
    assert.ok(small.speech.classList.contains('b-64'));
    assert.ok(!small.speech.classList.contains('b-32'));
    assert.strictEqual(small.originalSpriteSize, 64);
  });
});

function setPane(width: number, height: number) {
  for (const [key, value] of [
    ['innerWidth', width],
    ['innerHeight', height],
  ] as const) {
    Object.defineProperty(window, key, { value, configurable: true });
  }
}

const px = (value: string) => parseFloat(value);

suite('Growing sprites', () => {
  let cleanupDom: () => void;
  suiteSetup(() => {
    cleanupDom = require('jsdom-global')();
  });
  suiteTeardown(() => cleanupDom());
  setup(() => setPane(1024, 768));

  test('the growth scale multiplies the normal size', () => {
    const p = spawn('bulbasaur'); // normal: 32px sheet x2 (medium) = 64px
    p.pokemon.setGrowthScale(1.5);
    assert.strictEqual(p.el.style.width, '96px');
    assert.strictEqual(p.collision.style.width, '96px');
    assert.strictEqual(p.speech.style.bottom, '96px');
  });

  test('never grows past a short pane, speech bubble included', () => {
    setPane(1024, 120);
    const p = spawn('bulbasaur');
    p.pokemon.setGrowthScale(3); // would be 192px
    const bubble = 30; // .bubble-medium
    assert.ok(px(p.el.style.width) + bubble <= 120, p.el.style.width);
    assert.ok(px(p.el.style.width) > 64, 'still grew as far as it fits');
  });

  test('never shrinks below the normal size', () => {
    setPane(1024, 50);
    const p = spawn('bulbasaur');
    p.pokemon.setGrowthScale(3);
    assert.strictEqual(p.el.style.width, '64px');
  });

  test('re-fits when the pane is resized', () => {
    setPane(1024, 120);
    const p = spawn('bulbasaur');
    p.pokemon.setGrowthScale(3);
    assert.strictEqual(p.el.style.width, '90px');

    setPane(1024, 768);
    p.pokemon.applySpriteSize();
    assert.strictEqual(p.el.style.width, '192px');
  });

  test('stays inside the right edge when it grows', () => {
    const p = spawn('bulbasaur', 'Bella', 32, 1000);
    p.pokemon.setGrowthScale(2);
    assert.ok(p.pokemon.left + px(p.el.style.width) <= 1024);
    assert.strictEqual(p.collision.style.left, p.el.style.left);
  });

  test('evolving keeps the growth', () => {
    const p = spawn('bulbasaur');
    p.pokemon.setGrowthScale(1.5);
    p.evolve('ivysaur', PokemonColor.default, 'gen1', 64, root('ivysaur'));
    assert.strictEqual(p.el.style.width, '192px'); // 64px sheet x2 x1.5
  });

  test('shows the requested speech bubble image', () => {
    const p = spawn('bulbasaur');
    p.pokemon.showSpeechBubble(1, 'hungry');
    assert.strictEqual(p.speech.src, `${BASE}/hungry.png`);
    assert.strictEqual(p.speech.style.display, 'block');
  });
});
