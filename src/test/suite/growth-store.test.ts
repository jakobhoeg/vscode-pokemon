import * as assert from 'assert';
import type { Memento } from 'vscode';
import { FRESH_GROWTH } from '../../common/growth';
import {
  GROWTH_KEY,
  loadGrowth,
  pruneGrowth,
  saveGrowth,
} from '../../extension/growth-store';

// In-memory Memento that round-trips through JSON, like VS Code's real storage.
class FakeMemento implements Memento {
  private store = new Map<string, string>();

  keys(): readonly string[] {
    return [...this.store.keys()];
  }

  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  get<T>(key: string, defaultValue?: T): T | undefined {
    const json = this.store.get(key);
    return json === undefined ? defaultValue : JSON.parse(json);
  }

  update(key: string, value: unknown): Thenable<void> {
    this.store.set(key, JSON.stringify(value));
    return Promise.resolve();
  }
}

const BELLA = { xp: 3, lastFedAt: 1_700_000_000_000, timesEvolved: 1 };
const MILO = { xp: 1, lastFedAt: 1_700_000_500_000, timesEvolved: 0 };

suite('Growth store', () => {
  test('round-trips a saved state', async () => {
    const memento = new FakeMemento();
    await saveGrowth(memento, 'Bella', BELLA);
    assert.deepStrictEqual(loadGrowth(memento, 'Bella'), BELLA);
  });

  test('an unknown name loads as a fresh copy, not the shared default', () => {
    const memento = new FakeMemento();
    loadGrowth(memento, 'Nobody').xp = 99;
    assert.strictEqual(FRESH_GROWTH.xp, 0, 'mutated the shared default');
    assert.deepStrictEqual(loadGrowth(memento, 'Nobody'), FRESH_GROWTH);
  });

  test('saving one pokemon keeps the others', async () => {
    const memento = new FakeMemento();
    await saveGrowth(memento, 'Bella', BELLA);
    await saveGrowth(memento, 'Milo', MILO);
    assert.deepStrictEqual(loadGrowth(memento, 'Bella'), BELLA);
    assert.deepStrictEqual(loadGrowth(memento, 'Milo'), MILO);
  });

  test('prune keeps only the listed names', async () => {
    const memento = new FakeMemento();
    await saveGrowth(memento, 'Bella', BELLA);
    await saveGrowth(memento, 'Milo', MILO);

    await pruneGrowth(memento, ['Milo']); // Bella was deleted
    assert.deepStrictEqual(loadGrowth(memento, 'Bella'), FRESH_GROWTH);
    assert.deepStrictEqual(loadGrowth(memento, 'Milo'), MILO);

    await pruneGrowth(memento, []); // remove all
    assert.deepStrictEqual(memento.get(GROWTH_KEY), {});
  });

  test('old installs with no growth key load fresh', () => {
    assert.deepStrictEqual(
      loadGrowth(new FakeMemento(), 'Bella'),
      FRESH_GROWTH,
    );
  });

  test('corrupt stored data loads as safe values', async () => {
    for (const garbage of ['oops', 42, null, ['Bella']]) {
      const memento = new FakeMemento();
      await memento.update(GROWTH_KEY, garbage);
      assert.deepStrictEqual(loadGrowth(memento, 'Bella'), FRESH_GROWTH);
    }

    const memento = new FakeMemento();
    await memento.update(GROWTH_KEY, {
      Bella: { xp: -3, lastFedAt: 'yesterday', timesEvolved: NaN },
      Milo: null,
      Coco: { xp: 2 },
    });
    assert.deepStrictEqual(loadGrowth(memento, 'Bella'), FRESH_GROWTH);
    assert.deepStrictEqual(loadGrowth(memento, 'Milo'), FRESH_GROWTH);
    assert.deepStrictEqual(loadGrowth(memento, 'Coco'), {
      ...FRESH_GROWTH,
      xp: 2,
    });
  });

  test('names that clash with Object.prototype work like any other', async () => {
    const memento = new FakeMemento();
    assert.deepStrictEqual(loadGrowth(memento, 'constructor'), FRESH_GROWTH);
    assert.deepStrictEqual(loadGrowth(memento, '__proto__'), FRESH_GROWTH);

    await saveGrowth(memento, '__proto__', BELLA);
    await saveGrowth(memento, 'constructor', MILO);
    assert.deepStrictEqual(loadGrowth(memento, '__proto__'), BELLA);
    assert.deepStrictEqual(loadGrowth(memento, 'constructor'), MILO);

    await pruneGrowth(memento, ['__proto__']);
    assert.deepStrictEqual(loadGrowth(memento, '__proto__'), BELLA);
    assert.deepStrictEqual(loadGrowth(memento, 'constructor'), FRESH_GROWTH);
  });
});
