import * as assert from 'assert';
import {
  afterEvolution,
  cooldownRemaining,
  DEFAULT_GROWTH_RULES,
  feed,
  FRESH_GROWTH,
  GrowthState,
  growthRulesFromSettings,
  growthScale,
  HUNGRY_AFTER_MS,
  isHungry,
} from '../../common/growth';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const NOW = Date.UTC(2026, 10, 22, 12);
const RULES = DEFAULT_GROWTH_RULES; // 30 min cooldown, 5 feeds

// Frozen so any accidental mutation throws (compiled output runs in strict mode).
function growth(overrides: Partial<GrowthState> = {}): GrowthState {
  return Object.freeze({ ...FRESH_GROWTH, ...overrides });
}

suite('Growth: feed', () => {
  test('a never-fed pokemon eats and gains 1 XP', () => {
    const result = feed(growth(), NOW, RULES);
    assert.strictEqual(result.outcome, 'fed');
    assert.deepStrictEqual(result.state, {
      xp: 1,
      lastFedAt: NOW,
      timesEvolved: 0,
    });
  });

  test('is full inside the cooldown and leaves the state unchanged', () => {
    const state = growth({ xp: 2, lastFedAt: NOW - 10 * MINUTE });
    const result = feed(state, NOW, RULES);
    assert.strictEqual(result.outcome, 'full');
    assert.deepStrictEqual(result.state, state);
    assert.strictEqual(cooldownRemaining(state, NOW, RULES), 20 * MINUTE);
  });

  test('can eat again exactly when the cooldown ends', () => {
    const state = growth({ xp: 2, lastFedAt: NOW - 30 * MINUTE });
    assert.strictEqual(cooldownRemaining(state, NOW, RULES), 0);
    assert.strictEqual(feed(state, NOW, RULES).outcome, 'fed');
  });

  test('a cooldown of 0 allows back-to-back feeds', () => {
    const rules = { ...RULES, cooldownMs: 0 };
    const first = feed(growth(), NOW, rules);
    assert.strictEqual(feed(first.state, NOW, rules).state.xp, 2);
  });

  test('the feed that reaches feedsToEvolve is ready', () => {
    const result = feed(growth({ xp: 4 }), NOW, RULES);
    assert.strictEqual(result.outcome, 'ready');
    assert.strictEqual(result.state.xp, 5);
  });

  test('a final form stays ready with XP capped, but still gets fed', () => {
    const state = growth({ xp: 5, lastFedAt: NOW - HOUR });
    const result = feed(state, NOW, RULES);
    assert.strictEqual(result.outcome, 'ready');
    assert.strictEqual(result.state.xp, 5);
    assert.strictEqual(result.state.lastFedAt, NOW);
  });

  test('lowering feedsToEvolve below current XP still evolves', () => {
    const result = feed(growth({ xp: 7 }), NOW, {
      ...RULES,
      feedsToEvolve: 5,
    });
    assert.strictEqual(result.outcome, 'ready');
    assert.strictEqual(result.state.xp, 5);
  });

  test('a lastFedAt in the future (clock skew) does not block feeding', () => {
    const state = growth({ lastFedAt: NOW + 3 * 24 * HOUR });
    assert.strictEqual(cooldownRemaining(state, NOW, RULES), 0);
    assert.strictEqual(feed(state, NOW, RULES).outcome, 'fed');
  });
});

suite('Growth: hunger', () => {
  test('a never-fed pokemon is hungry', () => {
    assert.strictEqual(isHungry(growth(), NOW, RULES), true);
  });

  test('becomes hungry exactly HUNGRY_AFTER_MS after a feed', () => {
    const fedAt = NOW - HUNGRY_AFTER_MS;
    assert.strictEqual(
      isHungry(growth({ lastFedAt: fedAt + 1 }), NOW, RULES),
      false,
    );
    assert.strictEqual(
      isHungry(growth({ lastFedAt: fedAt }), NOW, RULES),
      true,
    );
  });

  test('is never hungry while a long cooldown is still running', () => {
    const rules = { ...RULES, cooldownMs: 3 * HOUR };
    const state = growth({ lastFedAt: NOW - 2.5 * HOUR });
    assert.ok(cooldownRemaining(state, NOW, rules) > 0);
    assert.strictEqual(isHungry(state, NOW, rules), false);
    assert.strictEqual(isHungry(state, NOW + 0.5 * HOUR, rules), true);
  });
});

suite('Growth: scale', () => {
  test('a fresh pokemon is normal size', () => {
    assert.strictEqual(growthScale(growth(), RULES), 1);
  });

  test('grows with every feed', () => {
    let previous = growthScale(growth(), RULES);
    for (let xp = 1; xp <= RULES.feedsToEvolve; xp++) {
      const scale = growthScale(growth({ xp }), RULES);
      assert.ok(scale > previous, `xp ${xp}: ${scale} <= ${previous}`);
      previous = scale;
    }
  });

  test('does not jump when it evolves', () => {
    const ready = growth({ xp: 5, timesEvolved: 1 });
    const evolved = afterEvolution(ready);
    assert.deepStrictEqual(evolved, { xp: 0, lastFedAt: 0, timesEvolved: 2 });
    assert.strictEqual(growthScale(evolved, RULES), growthScale(ready, RULES));
  });

  test('caps when XP is above the threshold', () => {
    assert.strictEqual(
      growthScale(growth({ xp: 50 }), RULES),
      growthScale(growth({ xp: 5 }), RULES),
    );
  });
});

suite('Growth: rules from settings', () => {
  test('reads valid settings', () => {
    assert.deepStrictEqual(growthRulesFromSettings(30, 5), {
      cooldownMs: 30 * MINUTE,
      feedsToEvolve: 5,
    });
    assert.deepStrictEqual(growthRulesFromSettings(0, 1), {
      cooldownMs: 0,
      feedsToEvolve: 1,
    });
  });

  test('clamps out-of-range numbers', () => {
    assert.deepStrictEqual(growthRulesFromSettings(-5, 0), {
      cooldownMs: 0,
      feedsToEvolve: 1,
    });
    assert.strictEqual(growthRulesFromSettings(30, 2.7).feedsToEvolve, 2);
  });

  test('falls back to defaults for anything that is not a finite number', () => {
    for (const bad of ['abc', '10', null, undefined, NaN, Infinity, {}, []]) {
      assert.deepStrictEqual(
        growthRulesFromSettings(bad, bad),
        DEFAULT_GROWTH_RULES,
        `input ${String(bad)}`,
      );
    }
  });
});
