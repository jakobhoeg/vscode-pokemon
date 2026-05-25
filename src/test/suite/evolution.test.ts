import * as assert from 'assert';
import {
  EVOLUTION_DATA,
  GrowthRate,
  growthRateFor,
  levelForXp,
  nextEvolution,
  xpForLevel,
} from '../../common/evolution-data';
import { POKEMON_DATA } from '../../common/pokemon-data';

suite('evolution-data: xpForLevel', () => {
  test('level 1 is always 0 XP', () => {
    const rates: GrowthRate[] = ['fast', 'medium-fast', 'medium-slow', 'slow'];
    for (const r of rates) {
      assert.strictEqual(
        xpForLevel(r, 1),
        0,
        `expected 0 XP at level 1 for ${r}`,
      );
    }
  });

  test('canonical medium-fast values', () => {
    // n^3 — these match canon (Bulbapedia).
    assert.strictEqual(xpForLevel('medium-fast', 5), 125);
    assert.strictEqual(xpForLevel('medium-fast', 10), 1000);
    assert.strictEqual(xpForLevel('medium-fast', 100), 1000000);
  });

  test('canonical fast values', () => {
    // (4/5) n^3
    assert.strictEqual(xpForLevel('fast', 10), 800);
    assert.strictEqual(xpForLevel('fast', 100), 800000);
  });

  test('canonical slow values', () => {
    // (5/4) n^3
    assert.strictEqual(xpForLevel('slow', 10), 1250);
    assert.strictEqual(xpForLevel('slow', 100), 1250000);
  });

  test('medium-slow is monotonically nondecreasing across all levels', () => {
    let prev = -1;
    for (let lvl = 1; lvl <= 100; lvl++) {
      const cur = xpForLevel('medium-slow', lvl);
      assert.ok(
        cur >= prev,
        `medium-slow lvl ${lvl} (${cur}) regressed from ${prev}`,
      );
      prev = cur;
    }
  });
});

suite('evolution-data: levelForXp', () => {
  test('round-trip across all four growth rates', () => {
    const rates: GrowthRate[] = ['fast', 'medium-fast', 'medium-slow', 'slow'];
    for (const r of rates) {
      for (const lvl of [1, 5, 16, 32, 36, 50, 99, 100]) {
        const xp = xpForLevel(r, lvl);
        const back = levelForXp(r, xp);
        assert.strictEqual(
          back,
          lvl,
          `round-trip ${r} lvl ${lvl} -> ${xp} -> ${back}`,
        );
      }
    }
  });

  test('zero or negative XP yields level 1', () => {
    assert.strictEqual(levelForXp('medium-fast', 0), 1);
    assert.strictEqual(levelForXp('medium-fast', -100), 1);
  });

  test('XP one below next-level threshold stays at current level', () => {
    const xpAt16 = xpForLevel('medium-slow', 16);
    const xpAt17 = xpForLevel('medium-slow', 17);
    assert.strictEqual(levelForXp('medium-slow', xpAt17 - 1), 16);
    assert.strictEqual(levelForXp('medium-slow', xpAt16), 16);
    assert.strictEqual(levelForXp('medium-slow', xpAt17), 17);
  });

  test('caps at level 100', () => {
    assert.strictEqual(levelForXp('medium-fast', 999_999_999), 100);
  });
});

suite('evolution-data: nextEvolution', () => {
  test('Bulbasaur evolves to Ivysaur at lvl 16', () => {
    const result = nextEvolution('bulbasaur', 16);
    assert.deepStrictEqual(result, { type: 'ivysaur', level: 16 });
  });

  test('Bulbasaur at lvl 15 does not evolve', () => {
    assert.strictEqual(nextEvolution('bulbasaur', 15), null);
  });

  test('Charizard has no further evolution', () => {
    assert.strictEqual(nextEvolution('charizard', 100), null);
  });

  test('Caterpie evolves at lvl 7 (canon)', () => {
    const result = nextEvolution('caterpie', 7);
    assert.deepStrictEqual(result, { type: 'metapod', level: 7 });
  });

  test('unknown species returns null safely', () => {
    assert.strictEqual(nextEvolution('not_a_real_pokemon', 50), null);
  });
});

suite('evolution-data: table consistency', () => {
  // EVOLUTION_DATA currently covers Gen 1 + Gen 2 (the original scope of this feature),
  // including the gender variants, Unown forms, and Celebi added by upstream. Newer
  // generations in POKEMON_DATA fall back to safe defaults at runtime (medium-fast curve,
  // no evolution); see `growthRateFor` and `nextEvolution`. Adding Gen 3+ evolution data
  // is a follow-up. The floor below is the count of Gen 1-2 species currently in upstream.
  const GEN_1_AND_2_FLOOR = 285;

  test('EVOLUTION_DATA covers at least the original Gen 1-2 species', () => {
    const covered = Object.keys(POKEMON_DATA).filter((k) => EVOLUTION_DATA[k]);
    assert.ok(
      covered.length >= GEN_1_AND_2_FLOOR,
      `expected >= ${GEN_1_AND_2_FLOOR} covered species, got ${covered.length}`,
    );
  });

  test('every evolvesTo target exists in POKEMON_DATA', () => {
    const broken: string[] = [];
    for (const [src, info] of Object.entries(EVOLUTION_DATA)) {
      if (info.evolvesTo && !POKEMON_DATA[info.evolvesTo.type]) {
        broken.push(`${src} -> ${info.evolvesTo.type}`);
      }
    }
    assert.deepStrictEqual(
      broken,
      [],
      `broken evolution targets: ${broken.join(', ')}`,
    );
  });

  test('every evolution level is a positive integer between 2 and 100', () => {
    const bad: string[] = [];
    for (const [src, info] of Object.entries(EVOLUTION_DATA)) {
      if (info.evolvesTo) {
        const lvl = info.evolvesTo.level;
        if (!Number.isInteger(lvl) || lvl < 2 || lvl > 100) {
          bad.push(`${src} -> ${info.evolvesTo.type} @ lvl ${lvl}`);
        }
      }
    }
    assert.deepStrictEqual(bad, [], `bad evolution levels: ${bad.join(', ')}`);
  });

  test('growthRateFor returns a known rate for every species (including fallbacks)', () => {
    const validRates = new Set<GrowthRate>([
      'fast',
      'medium-fast',
      'medium-slow',
      'slow',
    ]);
    for (const key of Object.keys(POKEMON_DATA)) {
      // Unknown species fall back to 'medium-fast'; the test asserts the fallback
      // path returns a sane value rather than crashing.
      assert.ok(
        validRates.has(growthRateFor(key)),
        `bad growth rate for ${key}`,
      );
    }
  });
});
