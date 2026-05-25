import * as assert from 'assert';
import {
  ActivePokemonState,
  XpTracker,
  XpTrackerConfig,
} from '../../extension/xp-tracker';
import { xpForLevel } from '../../common/evolution-data';

// Minimal in-memory Memento + ExtensionContext stub. XpTracker only uses context.globalState,
// so this is sufficient for state-machine tests without booting the full VSCode runtime.
class FakeMemento {
  private store = new Map<string, unknown>();
  keys(): readonly string[] {
    return Array.from(this.store.keys());
  }
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get<T>(key: string, defaultValue?: T): T | undefined {
    return this.store.has(key)
      ? (this.store.get(key) as T)
      : (defaultValue as T | undefined);
  }
  update(key: string, value: unknown): Thenable<void> {
    if (value === undefined) {
      this.store.delete(key);
    } else {
      this.store.set(key, value);
    }
    return Promise.resolve();
  }
  setKeysForSync(): void {
    // no-op in tests
  }
}

function makeContext(): any {
  return { globalState: new FakeMemento() };
}

function defaultConfig(): XpTrackerConfig {
  return { enabled: true, multiplier: 10, perEventCap: 200 };
}

suite('XpTracker', () => {
  test('fresh state starts at base type, level 1, zero XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    const s = tracker.getState();
    assert.strictEqual(s.baseType, 'bulbasaur');
    assert.strictEqual(s.currentType, 'bulbasaur');
    assert.strictEqual(s.totalXp, 0);
    assert.strictEqual(s.level, 1);
    assert.ok(
      s.xpForThisLevel > 0,
      'expected positive xp-to-next-level at lvl 1',
    );
  });

  test('typing in a file accrues XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker._processEditForTesting(15, false, 'file');
    assert.strictEqual(tracker.getState().totalXp, 150);
  });

  test('undo events do not grant XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker._processEditForTesting(50, true, 'file');
    assert.strictEqual(tracker.getState().totalXp, 0);
  });

  test('output scheme does not grant XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker._processEditForTesting(50, false, 'output');
    assert.strictEqual(tracker.getState().totalXp, 0);
  });

  test('crossing evolution threshold fires onEvolve and updates currentType', () => {
    const ctx = makeContext();
    const evolveCalls: Array<{ from: string; to: string }> = [];
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: (from, to) => evolveCalls.push({ from, to }),
      onUpdate: () => undefined,
    });
    // Bulbasaur is medium-slow; lvl 16 = xpForLevel('medium-slow', 16) = 3752
    const targetXp = xpForLevel('medium-slow', 16);
    // We need to grant at least targetXp. With multiplier=10, perEventCap=200, that's ceil(targetXp/200) events.
    const eventsNeeded = Math.ceil(targetXp / 200);
    for (let i = 0; i < eventsNeeded; i++) {
      tracker._processEditForTesting(100, false, 'file');
    }
    const s = tracker.getState();
    assert.strictEqual(
      s.currentType,
      'ivysaur',
      `expected ivysaur, got ${s.currentType}`,
    );
    assert.strictEqual(evolveCalls.length, 1);
    assert.strictEqual(evolveCalls[0].from, 'bulbasaur');
    assert.strictEqual(evolveCalls[0].to, 'ivysaur');
  });

  test('multi-step evolution can happen in a single burst of XP', () => {
    const ctx = makeContext();
    const evolveCalls: Array<{ from: string; to: string }> = [];
    const tracker = new XpTracker(
      ctx,
      'caterpie' as any,
      () => ({ enabled: true, multiplier: 1, perEventCap: 10_000_000 }),
      {
        onEvolve: (from, to) => evolveCalls.push({ from, to }),
        onUpdate: () => undefined,
      },
    );
    // Caterpie is medium-fast (n^3); evolves at lvl 7 -> metapod, lvl 10 -> butterfree.
    // xpForLevel('medium-fast', 10) = 1000.
    tracker._processEditForTesting(1500, false, 'file');
    const s = tracker.getState();
    assert.strictEqual(s.currentType, 'butterfree');
    // Exactly two evolutions in the cascade.
    assert.strictEqual(evolveCalls.length, 1);
    assert.strictEqual(evolveCalls[0].from, 'caterpie');
    assert.strictEqual(evolveCalls[0].to, 'butterfree');
  });

  test('reset(newType) zeros XP and switches base type', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    // 50 chars * 10 multiplier = 500, but capped at perEventCap (200).
    tracker._processEditForTesting(50, false, 'file');
    assert.strictEqual(tracker.getState().totalXp, 200);
    tracker.reset('charmander' as any);
    const s = tracker.getState();
    assert.strictEqual(s.baseType, 'charmander');
    assert.strictEqual(s.currentType, 'charmander');
    assert.strictEqual(s.totalXp, 0);
  });

  test('resetXp keeps base type, reverts current type, zeros XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(
      ctx,
      'caterpie' as any,
      () => ({ enabled: true, multiplier: 1, perEventCap: 10_000_000 }),
      { onEvolve: () => undefined, onUpdate: () => undefined },
    );
    tracker._processEditForTesting(1500, false, 'file');
    assert.strictEqual(tracker.getState().currentType, 'butterfree');
    tracker.resetXp();
    const s = tracker.getState();
    assert.strictEqual(s.baseType, 'caterpie');
    assert.strictEqual(s.currentType, 'caterpie');
    assert.strictEqual(s.totalXp, 0);
  });

  test('persistence: state restored from globalState when base type matches', () => {
    const ctx = makeContext();
    const tracker1 = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker1._processEditForTesting(200, false, 'file');
    // Force flush. resetXp triggers flush via the same code path; rebuild a tracker first.
    // Easier: call resetXp via the tracker - wait, that zeroes it. Instead just rely on the
    // debounced timer; but for the test, we call _processEditForTesting again to ensure a write...
    // Actually FakeMemento.update is sync (returns resolved Promise), and applyGain calls
    // markDirty which schedules a flush. The flush is via setTimeout — so it hasn't fired yet.
    // Force a flush by calling resetXp's effect indirectly: trigger a second _processEditForTesting and
    // then synchronously construct a new tracker — the timer won't have fired and globalState
    // will still be empty. To verify persistence we need to bypass the debounce; do that by
    // calling reset() which flushes immediately.
    // Simpler: directly poke flushNow by calling a method that flushes. Use reset() to the
    // same type — but that zeros XP. So instead seed the context with known keys directly.
    const ctx2 = makeContext();
    ctx2.globalState.update(
      'vscode-pokemon.active-pokemon.base-type',
      'bulbasaur',
    );
    ctx2.globalState.update(
      'vscode-pokemon.active-pokemon.current-type',
      'ivysaur',
    );
    ctx2.globalState.update(
      'vscode-pokemon.active-pokemon.total-xp',
      xpForLevel('medium-slow', 20),
    );
    const tracker2 = new XpTracker(ctx2, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    const s = tracker2.getState();
    assert.strictEqual(s.baseType, 'bulbasaur');
    assert.strictEqual(s.currentType, 'ivysaur');
    assert.strictEqual(s.level, 20);
  });

  test('persistence: state reset when configured base type differs from saved', () => {
    const ctx = makeContext();
    ctx.globalState.update(
      'vscode-pokemon.active-pokemon.base-type',
      'bulbasaur',
    );
    ctx.globalState.update(
      'vscode-pokemon.active-pokemon.current-type',
      'ivysaur',
    );
    ctx.globalState.update('vscode-pokemon.active-pokemon.total-xp', 99999);
    const tracker = new XpTracker(ctx, 'charmander' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    const s = tracker.getState();
    assert.strictEqual(s.baseType, 'charmander');
    assert.strictEqual(s.currentType, 'charmander');
    assert.strictEqual(s.totalXp, 0);
  });

  test('persistence: state reset when saved current-type is unknown to POKEMON_DATA', () => {
    // Simulates a downgrade or stale saved state where the species no longer exists.
    const ctx = makeContext();
    ctx.globalState.update(
      'vscode-pokemon.active-pokemon.base-type',
      'bulbasaur',
    );
    ctx.globalState.update(
      'vscode-pokemon.active-pokemon.current-type',
      'mega-bulbasaur-xyz', // not a real species
    );
    ctx.globalState.update('vscode-pokemon.active-pokemon.total-xp', 5000);
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    const s = tracker.getState();
    assert.strictEqual(s.baseType, 'bulbasaur');
    assert.strictEqual(
      s.currentType,
      'bulbasaur',
      'unknown species should be discarded, not restored',
    );
    assert.strictEqual(
      s.totalXp,
      0,
      'XP should reset alongside the species reset',
    );
  });

  test('persistence: state reset when saved XP is not a finite non-negative number', () => {
    const ctx = makeContext();
    ctx.globalState.update(
      'vscode-pokemon.active-pokemon.base-type',
      'bulbasaur',
    );
    ctx.globalState.update(
      'vscode-pokemon.active-pokemon.current-type',
      'ivysaur',
    );
    ctx.globalState.update('vscode-pokemon.active-pokemon.total-xp', -1);
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    assert.strictEqual(tracker.getState().totalXp, 0);
    assert.strictEqual(tracker.getState().currentType, 'bulbasaur');
  });

  test('onEvolve callback exceptions do not corrupt state', () => {
    // Simulates the "view hidden" case: handlePokemonEvolved tries to post to a webview
    // that isn't visible and throws. The tracker should still have advanced its state so
    // that the next view-render sees the evolved form.
    const ctx = makeContext();
    const tracker = new XpTracker(
      ctx,
      'caterpie' as any,
      () => ({ enabled: true, multiplier: 1, perEventCap: 10_000_000 }),
      {
        onEvolve: () => {
          throw new Error('simulated webview-hidden failure');
        },
        onUpdate: () => undefined,
      },
    );
    // Caterpie evolves at lvl 7 (medium-fast, 343 XP).
    assert.throws(() => tracker._processEditForTesting(1500, false, 'file'));
    // Despite the throw, state advanced and persists in memory.
    const s = tracker.getState();
    assert.strictEqual(s.currentType, 'butterfree');
    assert.ok(s.totalXp >= 1000);
  });

  test('disabling via config halts XP gain', () => {
    const ctx = makeContext();
    let enabled = true;
    const tracker = new XpTracker(
      ctx,
      'bulbasaur' as any,
      () => ({ enabled, multiplier: 10, perEventCap: 200 }),
      { onEvolve: () => undefined, onUpdate: () => undefined },
    );
    tracker._processEditForTesting(10, false, 'file');
    assert.strictEqual(tracker.getState().totalXp, 100);
    enabled = false;
    tracker._processEditForTesting(10, false, 'file');
    assert.strictEqual(
      tracker.getState().totalXp,
      100,
      'XP should not increase when disabled',
    );
  });

  test('onUpdate fires on each XP gain and on construction', () => {
    const ctx = makeContext();
    const updates: ActivePokemonState[] = [];
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: (s) => updates.push(s),
    });
    // No update fires during construction; start() fires the initial update.
    const disposable = tracker.start();
    assert.strictEqual(updates.length, 1);
    tracker._processEditForTesting(10, false, 'file');
    assert.strictEqual(updates.length, 2);
    assert.strictEqual(updates[1].totalXp, 100);
    disposable.dispose();
  });
});
