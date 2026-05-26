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
  test('fresh state has no active pokemon', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    const s = tracker.getState();
    assert.strictEqual(
      s.hasActive,
      false,
      'fresh tracker should have no active pokemon — HUD should hide',
    );
  });

  test('addPokemon creates an active record at level 1, zero XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
    const s = tracker.getState();
    assert.strictEqual(s.hasActive, true);
    assert.strictEqual(s.name, 'Sparky');
    assert.strictEqual(s.baseType, 'bulbasaur');
    assert.strictEqual(s.currentType, 'bulbasaur');
    assert.strictEqual(s.totalXp, 0);
    assert.strictEqual(s.level, 1);
    assert.ok(s.xpForThisLevel > 0);
  });

  test('typing in a file accrues XP on the active pokemon', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
    tracker._processEditForTesting(15, false, 'file');
    assert.strictEqual(tracker.getState().totalXp, 150);
  });

  test('typing when no pokemon is active accrues no XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker._processEditForTesting(100, false, 'file');
    assert.strictEqual(tracker.getState().hasActive, false);
  });

  test('undo events do not grant XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
    tracker._processEditForTesting(50, true, 'file');
    assert.strictEqual(tracker.getState().totalXp, 0);
  });

  test('output scheme does not grant XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
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
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
    // Bulbasaur is medium-slow; lvl 16 = xpForLevel('medium-slow', 16) = 3752
    const targetXp = xpForLevel('medium-slow', 16);
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
    assert.strictEqual(s.baseType, 'bulbasaur', 'base type stays at original');
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
    tracker.addPokemon('Wiggly', 'caterpie' as any);
    tracker._processEditForTesting(1500, false, 'file');
    const s = tracker.getState();
    assert.strictEqual(s.currentType, 'butterfree');
    assert.strictEqual(evolveCalls.length, 1);
    assert.strictEqual(evolveCalls[0].from, 'caterpie');
    assert.strictEqual(evolveCalls[0].to, 'butterfree');
  });

  test('reset(newType) clears all records and seeds a fresh one', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
    tracker._processEditForTesting(50, false, 'file');
    assert.strictEqual(tracker.getState().totalXp, 200);
    tracker.reset('charmander' as any);
    const s = tracker.getState();
    assert.strictEqual(s.hasActive, true);
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
    tracker.addPokemon('Wiggly', 'caterpie' as any);
    tracker._processEditForTesting(1500, false, 'file');
    assert.strictEqual(tracker.getState().currentType, 'butterfree');
    tracker.resetXp();
    const s = tracker.getState();
    assert.strictEqual(s.baseType, 'caterpie');
    assert.strictEqual(s.currentType, 'caterpie');
    assert.strictEqual(s.totalXp, 0);
  });

  test('removePokemon drops the active record; HUD falls back to a survivor', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('A', 'bulbasaur' as any);
    tracker._processEditForTesting(10, false, 'file');
    assert.strictEqual(tracker.getState().totalXp, 100);
    tracker.addPokemon('B', 'charmander' as any);
    assert.strictEqual(tracker.getState().name, 'B');
    assert.strictEqual(tracker.getState().totalXp, 0, 'B starts fresh');
    tracker.removePokemon('B');
    const s = tracker.getState();
    assert.strictEqual(s.hasActive, true);
    assert.strictEqual(s.name, 'A');
    assert.strictEqual(
      s.totalXp,
      100,
      "A's XP was preserved while B was active",
    );
  });

  test('removePokemon of the last record leaves no active', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('Only', 'bulbasaur' as any);
    tracker.removePokemon('Only');
    assert.strictEqual(tracker.getState().hasActive, false);
  });

  test('removeAll clears every record and hides the HUD', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('A', 'bulbasaur' as any);
    tracker.addPokemon('B', 'charmander' as any);
    tracker.removeAll();
    assert.strictEqual(tracker.getState().hasActive, false);
  });

  test("each pokemon's XP is independent (deleting active discards its XP)", () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('A', 'bulbasaur' as any);
    tracker._processEditForTesting(10, false, 'file');
    tracker.addPokemon('B', 'charmander' as any);
    tracker._processEditForTesting(20, false, 'file');
    assert.strictEqual(tracker.getState().totalXp, 200, 'B has its own XP');
    tracker.removePokemon('B');
    const s = tracker.getState();
    assert.strictEqual(s.totalXp, 100, "A's XP unchanged when B got deleted");
  });

  test('persistence: legacy single-pokemon state migrates into a v2 record', () => {
    const ctx = makeContext();
    ctx.globalState.update(
      'vscode-pokemon.active-pokemon.base-type',
      'bulbasaur',
    );
    ctx.globalState.update(
      'vscode-pokemon.active-pokemon.current-type',
      'ivysaur',
    );
    ctx.globalState.update(
      'vscode-pokemon.active-pokemon.total-xp',
      xpForLevel('medium-slow', 20),
    );
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    const s = tracker.getState();
    assert.strictEqual(s.hasActive, true);
    assert.strictEqual(s.baseType, 'bulbasaur');
    assert.strictEqual(s.currentType, 'ivysaur');
    assert.strictEqual(s.level, 20);
  });

  test('persistence: legacy state is ignored when configured base type differs', () => {
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
    assert.strictEqual(
      tracker.getState().hasActive,
      false,
      'mismatched legacy state should be discarded, not silently converted',
    );
  });

  test('persistence: legacy state with unknown current-type is discarded', () => {
    const ctx = makeContext();
    ctx.globalState.update(
      'vscode-pokemon.active-pokemon.base-type',
      'bulbasaur',
    );
    ctx.globalState.update(
      'vscode-pokemon.active-pokemon.current-type',
      'mega-bulbasaur-xyz',
    );
    ctx.globalState.update('vscode-pokemon.active-pokemon.total-xp', 5000);
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    assert.strictEqual(tracker.getState().hasActive, false);
  });

  test('persistence: legacy state with non-finite XP is discarded', () => {
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
    assert.strictEqual(tracker.getState().hasActive, false);
  });

  test('onEvolve callback exceptions do not corrupt state', () => {
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
    tracker.addPokemon('Wiggly', 'caterpie' as any);
    assert.throws(() => tracker._processEditForTesting(1500, false, 'file'));
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
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
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

  test('onUpdate fires on start, on addPokemon, and on each XP gain', () => {
    const ctx = makeContext();
    const updates: ActivePokemonState[] = [];
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: (s) => updates.push(s),
    });
    const disposable = tracker.start();
    // start() fires once with the empty initial state.
    assert.strictEqual(updates.length, 1);
    assert.strictEqual(updates[0].hasActive, false);
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
    assert.strictEqual(updates.length, 2);
    assert.strictEqual(updates[1].hasActive, true);
    tracker._processEditForTesting(10, false, 'file');
    assert.strictEqual(updates.length, 3);
    assert.strictEqual(updates[2].totalXp, 100);
    disposable.dispose();
  });
});
