/**
 * DOM-free unit tests for the feeding logic (src/panel/feeding.ts).
 *
 * Runs without VS Code:  npm run test:unit
 */
import * as assert from 'assert';

import {
  ItemConfig,
  ITEMS,
  MAX_HAPPINESS,
  MAX_LEVEL,
  MAX_SPEED_BOOST,
} from '../../common/items';
import {
  applyItemEffect,
  chooseFeeder,
  defaultStats,
  FeedState,
  IFoodItem,
  PokemonStats,
} from '../../panel/feeding';
import {
  FrameResult,
  HorizontalDirection,
  IPokemonType,
} from '../../panel/states';

function fakePokemon(left: number, width = 32, canFeed = true): IPokemonType {
  const p = {
    left,
    width,
    speed: 4,
    canFeed,
    positionLeft(x: number) {
      p.left = x;
    },
  };
  return p as unknown as IPokemonType;
}

function fakeItem(
  x: number,
  config: ItemConfig = ITEMS.oran_berry,
): IFoodItem & { consumeCalls: number } {
  const item = {
    key: 'oran_berry',
    config,
    x,
    landed: true,
    consumed: false,
    consumeCalls: 0,
    consume() {
      item.consumed = true;
      item.consumeCalls++;
    },
  };
  return item;
}

suite('applyItemEffect', () => {
  test('candy levels up and is capped at MAX_LEVEL', () => {
    const out = applyItemEffect(defaultStats(), ITEMS.rare_candy);
    assert.strictEqual(out.stats.level, 6);
    assert.strictEqual(out.levelsGained, 1);
    assert.match(out.summary, /Lv\. 6/);
    const big = applyItemEffect(
      { ...defaultStats(), level: 99 },
      ITEMS.exp_candy_l,
    );
    assert.strictEqual(big.stats.level, MAX_LEVEL);
    assert.strictEqual(big.levelsGained, 1);
    const capped = applyItemEffect(
      { ...defaultStats(), level: MAX_LEVEL },
      ITEMS.rare_candy,
    );
    assert.strictEqual(capped.levelsGained, 0);
    assert.match(capped.summary, /already/);
  });

  test('berries and treats raise happiness up to MAX_HAPPINESS', () => {
    const out = applyItemEffect(defaultStats(), ITEMS.sitrus_berry);
    assert.strictEqual(out.stats.happiness, 70 + 15);
    assert.strictEqual(out.happinessGained, 15);
    assert.match(out.summary, /happiness 85/);
    const full = applyItemEffect(
      { ...defaultStats(), happiness: MAX_HAPPINESS },
      ITEMS.sweet_heart,
    );
    assert.strictEqual(full.stats.happiness, MAX_HAPPINESS);
    assert.strictEqual(full.happinessGained, 0);
    assert.match(full.summary, /as happy/);
  });

  test('carbos boosts speed up to MAX_SPEED_BOOST', () => {
    let stats: PokemonStats = defaultStats();
    for (let i = 0; i < 10; i++) {
      stats = applyItemEffect(stats, ITEMS.carbos).stats;
    }
    assert.strictEqual(stats.speedBoost, MAX_SPEED_BOOST);
    assert.strictEqual(
      applyItemEffect(defaultStats(), ITEMS.carbos).stats.speedBoost,
      1.1,
    );
  });

  test('medicine and vitamins never change level or speed but add a little happiness', () => {
    for (const key of ['potion', 'max_revive', 'protein', 'hp_up']) {
      const out = applyItemEffect(defaultStats(), ITEMS[key]);
      assert.strictEqual(out.stats.level, 5, key);
      assert.strictEqual(out.stats.speedBoost, 1, key);
      assert.ok(out.stats.happiness > 70, key);
      assert.ok(out.summary.length > 0, key);
    }
  });

  test('does not mutate the input stats', () => {
    const stats = defaultStats();
    applyItemEffect(stats, ITEMS.rare_candy);
    assert.deepStrictEqual(stats, defaultStats());
  });
});

suite('chooseFeeder', () => {
  test('picks the closest Pokémon that can feed', () => {
    const a = { pokemon: fakePokemon(10), payload: 'a' };
    const b = { pokemon: fakePokemon(200), payload: 'b' };
    const busy = { pokemon: fakePokemon(150, 32, false), payload: 'busy' };
    assert.strictEqual(chooseFeeder([a, b, busy], 160)?.payload, 'b');
    assert.strictEqual(chooseFeeder([a, b, busy], 30)?.payload, 'a');
    assert.strictEqual(chooseFeeder([busy], 150), undefined);
    assert.strictEqual(chooseFeeder([], 0), undefined);
  });
});

suite('FeedState', () => {
  test('waits for the item to land, walks to it, eats, then completes', () => {
    const pokemon = fakePokemon(0);
    const item = fakeItem(100);
    item.landed = false;
    const state = new FeedState(pokemon, item);

    assert.strictEqual(state.nextFrame(), FrameResult.stateContinue);
    assert.strictEqual(pokemon.left, 0, 'must not move before the item lands');
    assert.strictEqual(state.spriteLabel, 'idle');

    item.landed = true;
    let frames = 0;
    while (!item.consumed && frames < 200) {
      assert.strictEqual(state.nextFrame(), FrameResult.stateContinue);
      frames++;
      if (!item.consumed) {
        assert.strictEqual(state.spriteLabel, 'walk');
        assert.strictEqual(
          state.horizontalDirection,
          HorizontalDirection.right,
        );
      }
    }
    assert.strictEqual(item.consumeCalls, 1);
    // reached: centre (left + 16) within reach of x=100
    assert.ok(Math.abs(pokemon.left + 16 - 100) <= Math.max(6, 32 * 0.25));

    // eating takes eatFrames frames, idle sprite
    let result = FrameResult.stateContinue;
    let eating = 0;
    while (result === FrameResult.stateContinue) {
      result = state.nextFrame();
      eating++;
      assert.strictEqual(state.spriteLabel, 'idle');
    }
    assert.strictEqual(result, FrameResult.stateComplete);
    assert.strictEqual(eating, state.eatFrames);
  });

  test('walks left when the item is on the left and uses the speed multiplier', () => {
    const pokemon = fakePokemon(300);
    const state = new FeedState(pokemon, fakeItem(50));
    state.nextFrame();
    assert.strictEqual(state.horizontalDirection, HorizontalDirection.left);
    assert.strictEqual(pokemon.left, 300 - 4 * state.speedMultiplier);
  });

  test('cancels when somebody else ate the item first', () => {
    const pokemon = fakePokemon(0);
    const item = fakeItem(500);
    const state = new FeedState(pokemon, item);
    state.nextFrame();
    item.consumed = true; // eaten by another Pokémon
    assert.strictEqual(state.nextFrame(), FrameResult.stateCancel);
  });

  test('gives up after maxWalkFrames', () => {
    const pokemon = fakePokemon(0);
    pokemon.positionLeft = () => undefined; // stuck
    const state = new FeedState(pokemon, fakeItem(1000));
    state.maxWalkFrames = 5;
    let result = FrameResult.stateContinue;
    for (let i = 0; i < 10 && result === FrameResult.stateContinue; i++) {
      result = state.nextFrame();
    }
    assert.strictEqual(result, FrameResult.stateCancel);
  });
});
