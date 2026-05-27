import * as vscode from 'vscode';
import {
  growthRateFor,
  levelForXp,
  nextEvolution,
  xpForLevel,
} from '../common/evolution-data';
import { POKEMON_DATA } from '../common/pokemon-data';
import { computeXpGain } from '../common/xp';
import { PokemonType } from '../common/types';

const KEY_RECORDS = 'vscode-pokemon.xp.records.v2';

// Legacy single-pokemon keys, kept for one-shot migration.
const LEGACY_KEY_BASE_TYPE = 'vscode-pokemon.active-pokemon.base-type';
const LEGACY_KEY_CURRENT_TYPE = 'vscode-pokemon.active-pokemon.current-type';
const LEGACY_KEY_TOTAL_XP = 'vscode-pokemon.active-pokemon.total-xp';

const SYNC_KEYS: readonly string[] = [KEY_RECORDS];

const FLUSH_DEBOUNCE_MS = 500;

/** Per-pokemon XP record. Each spawned pokemon owns its own XP; nothing is shared. */
interface PokemonRecord {
  /** Species when the record was created — what resetXp reverts to. */
  baseType: PokemonType;
  /** Current species; diverges from baseType after evolution. */
  type: PokemonType;
  totalXp: number;
}

type SerializedRecords = Record<string, PokemonRecord>;

/** Derived display state for a single tracked pokemon. */
export interface PokemonEntryState {
  name: string;
  baseType: PokemonType;
  currentType: PokemonType;
  totalXp: number;
  level: number;
  /** XP earned within the current level (0 to xpForThisLevel-1). */
  xpIntoLevel: number;
  /** Total XP span of the current level. 0 at max level. */
  xpForThisLevel: number;
}

/**
 * Full tracker state — every tracked pokemon. `entries` is empty when no pokemon
 * are being tracked; the HUD should hide.
 */
export interface TrackerState {
  entries: PokemonEntryState[];
}

export interface XpTrackerConfig {
  enabled: boolean;
  multiplier: number;
  perEventCap: number;
}

export interface XpTrackerCallbacks {
  /** Fires for every pokemon that evolves on a given XP gain (one call per evolution). */
  onEvolve: (name: string, oldType: PokemonType, newType: PokemonType) => void;
  onUpdate: (state: TrackerState) => void;
}

/**
 * Tracks XP **per pokemon**. Every spawned pokemon gets its own record keyed by
 * name, and they ALL accumulate XP from editor activity simultaneously. Typing is
 * training-camp for the whole team.
 *
 * Deleting a pokemon discards its XP. State persists in globalState.
 */
export class XpTracker {
  private context: vscode.ExtensionContext;
  private callbacks: XpTrackerCallbacks;
  private getConfig: () => XpTrackerConfig;
  private records: Map<string, PokemonRecord>;
  private state: TrackerState;
  private flushTimer: NodeJS.Timeout | undefined;
  private dirty = false;

  constructor(
    context: vscode.ExtensionContext,
    configuredType: PokemonType,
    getConfig: () => XpTrackerConfig,
    callbacks: XpTrackerCallbacks,
  ) {
    this.context = context;
    this.callbacks = callbacks;
    this.getConfig = getConfig;
    this.records = this.loadRecords(configuredType);
    this.state = this.deriveState();
  }

  private loadRecords(configuredType: PokemonType): Map<string, PokemonRecord> {
    const serialized =
      this.context.globalState.get<SerializedRecords>(KEY_RECORDS);
    if (serialized && typeof serialized === 'object') {
      const map = new Map<string, PokemonRecord>();
      for (const [name, rec] of Object.entries(serialized)) {
        if (
          rec &&
          typeof rec.type === 'string' &&
          POKEMON_DATA[rec.type] &&
          typeof rec.totalXp === 'number' &&
          Number.isFinite(rec.totalXp) &&
          rec.totalXp >= 0
        ) {
          const baseType =
            typeof rec.baseType === 'string' && POKEMON_DATA[rec.baseType]
              ? (rec.baseType as PokemonType)
              : (rec.type as PokemonType);
          map.set(name, {
            baseType,
            type: rec.type as PokemonType,
            totalXp: rec.totalXp,
          });
        }
      }
      return map;
    }

    // No v2 records — try migrating legacy single-pokemon state.
    const legacyBase =
      this.context.globalState.get<string>(LEGACY_KEY_BASE_TYPE);
    const legacyCurrent = this.context.globalState.get<string>(
      LEGACY_KEY_CURRENT_TYPE,
    );
    const legacyXp = this.context.globalState.get<number>(LEGACY_KEY_TOTAL_XP);
    if (
      legacyBase === configuredType &&
      typeof legacyCurrent === 'string' &&
      POKEMON_DATA[legacyCurrent] &&
      typeof legacyXp === 'number' &&
      Number.isFinite(legacyXp) &&
      legacyXp >= 0
    ) {
      const map = new Map<string, PokemonRecord>();
      map.set(configuredType, {
        baseType: legacyBase as PokemonType,
        type: legacyCurrent as PokemonType,
        totalXp: legacyXp,
      });
      return map;
    }

    return new Map();
  }

  private deriveEntry(name: string, rec: PokemonRecord): PokemonEntryState {
    const growth = growthRateFor(rec.type);
    const level = levelForXp(growth, rec.totalXp);
    const thisLevelXp = xpForLevel(growth, level);
    const nextLevelXp =
      level >= 100 ? thisLevelXp : xpForLevel(growth, level + 1);
    return {
      name,
      baseType: rec.baseType,
      currentType: rec.type,
      totalXp: rec.totalXp,
      level,
      xpIntoLevel: Math.max(0, rec.totalXp - thisLevelXp),
      xpForThisLevel: level >= 100 ? 0 : Math.max(0, nextLevelXp - thisLevelXp),
    };
  }

  private deriveState(): TrackerState {
    const entries: PokemonEntryState[] = [];
    for (const [name, rec] of this.records.entries()) {
      entries.push(this.deriveEntry(name, rec));
    }
    return { entries };
  }

  private recomputeAndNotify(): void {
    this.state = this.deriveState();
    this.markDirty();
    this.callbacks.onUpdate(this.state);
  }

  start(): vscode.Disposable {
    this.context.globalState.setKeysForSync(SYNC_KEYS as string[]);
    const sub = vscode.workspace.onDidChangeTextDocument((event) =>
      this.handleEdit(event),
    );
    this.callbacks.onUpdate(this.state);
    return {
      dispose: () => {
        sub.dispose();
        this.flushNow();
      },
    };
  }

  private handleEdit(event: vscode.TextDocumentChangeEvent): void {
    // Count only non-whitespace characters. Pressing Enter with auto-indent
    // inserts a newline plus a chunk of spaces, which would otherwise count as
    // a fat XP gain for a single keystroke. Words and symbols are the
    // meaningful signal that the user is actually writing code.
    const textLength = event.contentChanges.reduce(
      (sum, c) => sum + (c.text ? c.text.replace(/\s/g, '').length : 0),
      0,
    );
    this.ingestEdit(
      textLength,
      event.reason !== undefined,
      event.document.uri.scheme,
    );
  }

  /** @internal Test-only seam — drive ingestEdit without a real vscode event. */
  _processEditForTesting(
    textLength: number,
    hasReason: boolean,
    documentScheme: string,
  ): void {
    this.ingestEdit(textLength, hasReason, documentScheme);
  }

  private ingestEdit(
    textLength: number,
    hasReason: boolean,
    documentScheme: string,
  ): void {
    const cfg = this.getConfig();
    if (!cfg.enabled) {
      return;
    }
    if (this.records.size === 0) {
      return;
    }
    const gain = computeXpGain({
      contentChangesTextLength: textLength,
      hasReason,
      documentScheme,
      multiplier: cfg.multiplier,
      perEventCap: cfg.perEventCap,
    });
    if (gain <= 0) {
      return;
    }
    this.applyGain(gain);
  }

  /** Apply XP gain to **every** record. Each can evolve independently. */
  private applyGain(gain: number): void {
    const evolutions: Array<{
      name: string;
      from: PokemonType;
      to: PokemonType;
    }> = [];
    for (const [name, rec] of this.records.entries()) {
      const oldType = rec.type;
      const newTotal = rec.totalXp + gain;
      let workingType: PokemonType = rec.type;
      let evolved = false;
      for (;;) {
        const growth = growthRateFor(workingType);
        const newLevel = levelForXp(growth, newTotal);
        const evo = nextEvolution(workingType, newLevel);
        if (!evo) {
          break;
        }
        workingType = evo.type as PokemonType;
        evolved = true;
      }
      rec.type = workingType;
      rec.totalXp = newTotal;
      if (evolved && oldType !== workingType) {
        evolutions.push({ name, from: oldType, to: workingType });
      }
    }
    this.recomputeAndNotify();
    // Fire evolution callbacks AFTER state update so handlers see consistent state.
    // We swallow individual callback errors so a crash on one pokemon's onEvolve
    // doesn't prevent others from firing.
    for (const e of evolutions) {
      this.callbacks.onEvolve(e.name, e.from, e.to);
    }
  }

  private markDirty(): void {
    this.dirty = true;
    if (this.flushTimer) {
      return;
    }
    this.flushTimer = setTimeout(() => this.flushNow(), FLUSH_DEBOUNCE_MS);
  }

  private flushNow(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = undefined;
    }
    if (!this.dirty) {
      return;
    }
    this.dirty = false;
    const serialized: SerializedRecords = {};
    for (const [name, rec] of this.records.entries()) {
      serialized[name] = {
        baseType: rec.baseType,
        type: rec.type,
        totalXp: rec.totalXp,
      };
    }
    void this.context.globalState.update(KEY_RECORDS, serialized);
  }

  getState(): TrackerState {
    return this.state;
  }

  /** Add a fresh pokemon record (0 XP). If a record with this name exists it's left alone. */
  addPokemon(name: string, type: PokemonType): void {
    if (this.records.has(name)) {
      return;
    }
    this.records.set(name, { baseType: type, type, totalXp: 0 });
    this.recomputeAndNotify();
  }

  /** Drop a pokemon's record. Its XP is gone. */
  removePokemon(name: string): void {
    if (!this.records.has(name)) {
      return;
    }
    this.records.delete(name);
    this.recomputeAndNotify();
  }

  /** Drop every record. */
  removeAll(): void {
    if (this.records.size === 0) {
      return;
    }
    this.records.clear();
    this.recomputeAndNotify();
  }

  /** Clear all records and seed a single fresh one. Used by reset-xp on config change. */
  reset(newBaseType: PokemonType): void {
    this.records.clear();
    this.records.set(newBaseType, {
      baseType: newBaseType,
      type: newBaseType,
      totalXp: 0,
    });
    this.recomputeAndNotify();
  }

  /**
   * Zero every pokemon's XP and revert each to its baseType. Fires onEvolve for
   * every pokemon that had evolved past its base form so the panel can swap its
   * sprite back.
   */
  resetXp(): void {
    if (this.records.size === 0) {
      return;
    }
    const reversions: Array<{
      name: string;
      from: PokemonType;
      to: PokemonType;
    }> = [];
    for (const [name, rec] of this.records.entries()) {
      if (rec.type !== rec.baseType) {
        reversions.push({ name, from: rec.type, to: rec.baseType });
      }
      rec.type = rec.baseType;
      rec.totalXp = 0;
    }
    this.recomputeAndNotify();
    for (const r of reversions) {
      this.callbacks.onEvolve(r.name, r.from, r.to);
    }
  }

  /**
   * Reconcile records with the actual panel collection. Drops records whose names
   * aren't in the collection and adds 0-XP records for any pokemon in the collection
   * that aren't tracked yet.
   */
  syncWithCollection(
    collection: ReadonlyArray<{ name: string; type: PokemonType }>,
  ): void {
    const names = new Set(collection.map((c) => c.name));
    let changed = false;
    for (const name of Array.from(this.records.keys())) {
      if (!names.has(name)) {
        this.records.delete(name);
        changed = true;
      }
    }
    for (const item of collection) {
      if (!this.records.has(item.name)) {
        this.records.set(item.name, {
          baseType: item.type,
          type: item.type,
          totalXp: 0,
        });
        changed = true;
      }
    }
    if (changed) {
      this.recomputeAndNotify();
    }
  }
}
