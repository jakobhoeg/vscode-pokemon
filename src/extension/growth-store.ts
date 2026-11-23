// Persists each pokemon's GrowthState in the global memento, keyed by name.
// Keyed by name (not index-aligned like the type/color/name arrays) so an older
// extension version rewriting those arrays on a synced machine can't shift XP
// onto the wrong pokemon.
import type { Memento } from 'vscode';
import { FRESH_GROWTH, GrowthState } from '../common/growth';

export const GROWTH_KEY = 'vscode-pokemon.extra-pokemon.growth';

type GrowthMap = Record<string, unknown>;

// Stored data is untrusted: it may come from Settings Sync, an older version, or a hand edit.
function readMap(memento: Memento): GrowthMap {
  const raw = memento.get<unknown>(GROWTH_KEY);
  return typeof raw === 'object' && raw !== null && !Array.isArray(raw)
    ? (raw as GrowthMap)
    : {};
}

function nonNegative(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

/** Turns untrusted data (storage, an imported file) into a valid GrowthState. */
export function sanitizeGrowth(value: unknown): GrowthState {
  const entry = (typeof value === 'object' && value !== null ? value : {}) as {
    [field: string]: unknown;
  };
  return {
    xp: nonNegative(entry.xp),
    lastFedAt: nonNegative(entry.lastFedAt),
    timesEvolved: nonNegative(entry.timesEvolved),
  };
}

export function loadGrowth(memento: Memento, name: string): GrowthState {
  const map = readMap(memento);
  // hasOwnProperty, not `map[name]`: names are user-typed, and "constructor"
  // or "__proto__" would otherwise read Object.prototype members.
  return Object.prototype.hasOwnProperty.call(map, name)
    ? sanitizeGrowth(map[name])
    : { ...FRESH_GROWTH };
}

export function saveGrowth(
  memento: Memento,
  name: string,
  state: GrowthState,
): Thenable<void> {
  const { xp, lastFedAt, timesEvolved } = state;
  // A computed key in a literal defines an own property, even for "__proto__".
  return memento.update(GROWTH_KEY, {
    ...readMap(memento),
    [name]: { xp, lastFedAt, timesEvolved },
  });
}

/** Drops growth for every name not in keepNames, so a new pokemon reusing a deleted one's name starts fresh. */
export function pruneGrowth(
  memento: Memento,
  keepNames: readonly string[],
): Thenable<void> {
  const keep = new Set(keepNames);
  return memento.update(
    GROWTH_KEY,
    Object.fromEntries(
      Object.entries(readMap(memento)).filter(([name]) => keep.has(name)),
    ),
  );
}
