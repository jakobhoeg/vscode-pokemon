import * as assert from 'assert';
import {
  TrackerState,
  XpTracker,
  XpTrackerConfig,
} from '../../extension/xp-tracker';
import { xpForLevel } from '../../common/evolution-data';

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
    // no-op
  }
}

function makeContext(): any {
  return { globalState: new FakeMemento() };
}

function defaultConfig(): XpTrackerConfig {
  return { enabled: true, multiplier: 10, perEventCap: 200 };
}

function findEntry(state: TrackerState, name: string) {
  const e = state.entries.find((x) => x.name === name);
  if (!e) {
    throw new Error(`expected entry "${name}" in state`);
  }
  return e;
}

suite('XpTracker', () => {
  test('fresh state has no entries', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    assert.strictEqual(tracker.getState().entries.length, 0);
  });

  test('addPokemon adds an entry at level 1, zero XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
    const e = findEntry(tracker.getState(), 'Sparky');
    assert.strictEqual(e.currentType, 'bulbasaur');
    assert.strictEqual(e.baseType, 'bulbasaur');
    assert.strictEqual(e.totalXp, 0);
    assert.strictEqual(e.level, 1);
    assert.ok(e.xpForThisLevel > 0);
  });

  test('typing in a file accrues XP on every tracked pokemon', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('A', 'bulbasaur' as any);
    tracker.addPokemon('B', 'charmander' as any);
    tracker._processEditForTesting(15, false, 'file');
    assert.strictEqual(findEntry(tracker.getState(), 'A').totalXp, 150);
    assert.strictEqual(findEntry(tracker.getState(), 'B').totalXp, 150);
  });

  test('typing when no pokemon are tracked accrues nothing', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker._processEditForTesting(100, false, 'file');
    assert.strictEqual(tracker.getState().entries.length, 0);
  });

  test('undo events do not grant XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
    tracker._processEditForTesting(50, true, 'file');
    assert.strictEqual(findEntry(tracker.getState(), 'Sparky').totalXp, 0);
  });

  test('output scheme does not grant XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
    tracker._processEditForTesting(50, false, 'output');
    assert.strictEqual(findEntry(tracker.getState(), 'Sparky').totalXp, 0);
  });

  test('crossing evolution threshold fires onEvolve with name + types', () => {
    const ctx = makeContext();
    const evolveCalls: Array<{ name: string; from: string; to: string }> = [];
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: (name, from, to) => evolveCalls.push({ name, from, to }),
      onUpdate: () => undefined,
    });
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
    const targetXp = xpForLevel('medium-slow', 16);
    const eventsNeeded = Math.ceil(targetXp / 200);
    for (let i = 0; i < eventsNeeded; i++) {
      tracker._processEditForTesting(100, false, 'file');
    }
    const e = findEntry(tracker.getState(), 'Sparky');
    assert.strictEqual(e.currentType, 'ivysaur');
    assert.strictEqual(e.baseType, 'bulbasaur');
    assert.strictEqual(evolveCalls.length, 1);
    assert.deepStrictEqual(evolveCalls[0], {
      name: 'Sparky',
      from: 'bulbasaur',
      to: 'ivysaur',
    });
  });

  test('multiple pokemon can evolve in the same XP gain', () => {
    const ctx = makeContext();
    const evolveCalls: Array<{ name: string; from: string; to: string }> = [];
    const tracker = new XpTracker(
      ctx,
      'caterpie' as any,
      () => ({ enabled: true, multiplier: 1, perEventCap: 10_000_000 }),
      {
        onEvolve: (name, from, to) => evolveCalls.push({ name, from, to }),
        onUpdate: () => undefined,
      },
    );
    tracker.addPokemon('A', 'caterpie' as any);
    tracker.addPokemon('B', 'weedle' as any);
    tracker._processEditForTesting(1500, false, 'file');
    assert.strictEqual(
      findEntry(tracker.getState(), 'A').currentType,
      'butterfree',
    );
    assert.strictEqual(
      findEntry(tracker.getState(), 'B').currentType,
      'beedrill',
    );
    assert.strictEqual(evolveCalls.length, 2);
  });

  test('reset(newType) clears everything and seeds a fresh record', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('A', 'bulbasaur' as any);
    tracker.addPokemon('B', 'pikachu' as any);
    tracker._processEditForTesting(50, false, 'file');
    tracker.reset('charmander' as any);
    const state = tracker.getState();
    assert.strictEqual(state.entries.length, 1);
    assert.strictEqual(state.entries[0].currentType, 'charmander');
    assert.strictEqual(state.entries[0].totalXp, 0);
  });

  test('resetXp zeros every entry and reverts to baseType', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(
      ctx,
      'caterpie' as any,
      () => ({ enabled: true, multiplier: 1, perEventCap: 10_000_000 }),
      { onEvolve: () => undefined, onUpdate: () => undefined },
    );
    tracker.addPokemon('Wiggly', 'caterpie' as any);
    tracker._processEditForTesting(1500, false, 'file');
    assert.strictEqual(
      findEntry(tracker.getState(), 'Wiggly').currentType,
      'butterfree',
    );
    tracker.resetXp();
    const e = findEntry(tracker.getState(), 'Wiggly');
    assert.strictEqual(e.currentType, 'caterpie');
    assert.strictEqual(e.totalXp, 0);
  });

  test('removePokemon drops just that record; the rest keep their XP', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('A', 'bulbasaur' as any);
    tracker.addPokemon('B', 'charmander' as any);
    tracker._processEditForTesting(10, false, 'file');
    tracker.removePokemon('A');
    const state = tracker.getState();
    assert.strictEqual(state.entries.length, 1);
    assert.strictEqual(state.entries[0].name, 'B');
    assert.strictEqual(state.entries[0].totalXp, 100);
  });

  test('removeAll empties the tracker', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('A', 'bulbasaur' as any);
    tracker.addPokemon('B', 'charmander' as any);
    tracker.removeAll();
    assert.strictEqual(tracker.getState().entries.length, 0);
  });

  test('persistence: legacy single-pokemon state migrates into a record', () => {
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
    const state = tracker.getState();
    assert.strictEqual(state.entries.length, 1);
    assert.strictEqual(state.entries[0].currentType, 'ivysaur');
    assert.strictEqual(state.entries[0].level, 20);
  });

  test('persistence: legacy state ignored when configured base differs', () => {
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
    assert.strictEqual(tracker.getState().entries.length, 0);
  });

  test('disabling via config halts XP gain on all entries', () => {
    const ctx = makeContext();
    let enabled = true;
    const tracker = new XpTracker(
      ctx,
      'bulbasaur' as any,
      () => ({ enabled, multiplier: 10, perEventCap: 200 }),
      { onEvolve: () => undefined, onUpdate: () => undefined },
    );
    tracker.addPokemon('A', 'bulbasaur' as any);
    tracker._processEditForTesting(10, false, 'file');
    assert.strictEqual(findEntry(tracker.getState(), 'A').totalXp, 100);
    enabled = false;
    tracker._processEditForTesting(10, false, 'file');
    assert.strictEqual(findEntry(tracker.getState(), 'A').totalXp, 100);
  });

  test('onUpdate fires on start, addPokemon, and each XP gain', () => {
    const ctx = makeContext();
    const updates: TrackerState[] = [];
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: (s) => updates.push(s),
    });
    const disposable = tracker.start();
    assert.strictEqual(updates.length, 1);
    assert.strictEqual(updates[0].entries.length, 0);
    tracker.addPokemon('Sparky', 'bulbasaur' as any);
    assert.strictEqual(updates.length, 2);
    assert.strictEqual(updates[1].entries.length, 1);
    tracker._processEditForTesting(10, false, 'file');
    assert.strictEqual(updates.length, 3);
    assert.strictEqual(updates[2].entries[0].totalXp, 100);
    disposable.dispose();
  });

  test('syncWithCollection drops records not in collection, adds missing ones', () => {
    const ctx = makeContext();
    const tracker = new XpTracker(ctx, 'bulbasaur' as any, defaultConfig, {
      onEvolve: () => undefined,
      onUpdate: () => undefined,
    });
    tracker.addPokemon('Ghost', 'bulbasaur' as any);
    tracker.syncWithCollection([{ name: 'Real', type: 'charmander' as any }]);
    const state = tracker.getState();
    assert.strictEqual(state.entries.length, 1);
    assert.strictEqual(state.entries[0].name, 'Real');
  });
});
