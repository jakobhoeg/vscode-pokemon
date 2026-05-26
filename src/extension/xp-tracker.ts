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
const KEY_ACTIVE_NAME = 'vscode-pokemon.xp.active-name.v2';

// Legacy single-pokemon keys, kept for one-shot migration.
const LEGACY_KEY_BASE_TYPE = 'vscode-pokemon.active-pokemon.base-type';
const LEGACY_KEY_CURRENT_TYPE = 'vscode-pokemon.active-pokemon.current-type';
const LEGACY_KEY_TOTAL_XP = 'vscode-pokemon.active-pokemon.total-xp';

const SYNC_KEYS: readonly string[] = [KEY_RECORDS, KEY_ACTIVE_NAME];

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

/**
 * State for whichever pokemon the HUD is currently following.
 *
 * `hasActive=false` means there is no pokemon to display XP for — the HUD should hide.
 * When `hasActive=true`, the other fields describe the live state of that pokemon's record.
 */
export interface ActivePokemonState {
  hasActive: boolean;
  /** Identity of the active record (its display name in the panel). */
  name: string;
  /** Original species when the record was created (used for resetXp). */
  baseType: PokemonType;
  /** Current species — diverges from baseType after evolution. */
  currentType: PokemonType;
  totalXp: number;
  level: number;
  /** XP earned within the current level (0 to xpForThisLevel-1). */
  xpIntoLevel: number;
  /** Total XP span of the current level (next-threshold − this-threshold). 0 at max level. */
  xpForThisLevel: number;
}

export interface XpTrackerConfig {
  enabled: boolean;
  multiplier: number;
  perEventCap: number;
}

export interface XpTrackerCallbacks {
  onEvolve: (oldType: PokemonType, newType: PokemonType) => void;
  onUpdate: (state: ActivePokemonState) => void;
}

/**
 * Tracks XP **per pokemon**. Each spawned pokemon gets its own record keyed by name;
 * deleting a pokemon discards its XP. Only the "active" pokemon (the one the HUD is
 * pointing at) accumulates XP from editor activity.
 *
 * State persists in globalState; writes are debounced.
 */
export class XpTracker {
  private context: vscode.ExtensionContext;
  private callbacks: XpTrackerCallbacks;
  private getConfig: () => XpTrackerConfig;
  private records: Map<string, PokemonRecord>;
  private activeName: string | undefined;
  private state: ActivePokemonState;
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
    const loaded = this.loadRecords(configuredType);
    this.records = loaded.records;
    this.activeName = loaded.activeName;
    this.state = this.deriveState();
  }

  /**
   * Load persisted records. Migrates the legacy single-pokemon keys on first run.
   * If neither persisted records nor legacy state are present, seeds with one record
   * for `configuredType` (its name doubles as its identifier).
   */
  private loadRecords(configuredType: PokemonType): {
    records: Map<string, PokemonRecord>;
    activeName: string | undefined;
  } {
    const serialized =
      this.context.globalState.get<SerializedRecords>(KEY_RECORDS);
    const activeName =
      this.context.globalState.get<string>(KEY_ACTIVE_NAME) ?? undefined;
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
          // baseType is optional in older saved data; fall back to the current type.
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
      const resolvedActive =
        activeName && map.has(activeName) ? activeName : undefined;
      return { records: map, activeName: resolvedActive };
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
      return { records: map, activeName: configuredType };
    }

    // Fresh user, no legacy state: start empty. The HUD stays hidden until the user
    // actually spawns a pokemon — there's no implicit Bulbasaur conjured out of thin air.
    return { records: new Map(), activeName: undefined };
  }

  private deriveState(): ActivePokemonState {
    if (!this.activeName || !this.records.has(this.activeName)) {
      return {
        hasActive: false,
        name: '',
        baseType: 'bulbasaur',
        currentType: 'bulbasaur',
        totalXp: 0,
        level: 1,
        xpIntoLevel: 0,
        xpForThisLevel: 0,
      };
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rec = this.records.get(this.activeName)!;
    const growth = growthRateFor(rec.type);
    const level = levelForXp(growth, rec.totalXp);
    const thisLevelXp = xpForLevel(growth, level);
    const nextLevelXp =
      level >= 100 ? thisLevelXp : xpForLevel(growth, level + 1);
    return {
      hasActive: true,
      name: this.activeName,
      baseType: rec.baseType,
      currentType: rec.type,
      totalXp: rec.totalXp,
      level,
      xpIntoLevel: Math.max(0, rec.totalXp - thisLevelXp),
      xpForThisLevel: level >= 100 ? 0 : Math.max(0, nextLevelXp - thisLevelXp),
    };
  }

  private recomputeAndNotify(): void {
    this.state = this.deriveState();
    this.markDirty();
    this.callbacks.onUpdate(this.state);
  }

  /** Registers the onDidChangeTextDocument subscription. Returns a disposable. */
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
    const textLength = event.contentChanges.reduce(
      (sum, c) => sum + (c.text ? c.text.length : 0),
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
    if (!this.activeName || !this.records.has(this.activeName)) {
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

  private applyGain(gain: number): void {
    if (!this.activeName) {
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rec = this.records.get(this.activeName)!;
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
    this.recomputeAndNotify();
    if (evolved && oldType !== workingType) {
      this.callbacks.onEvolve(oldType, workingType);
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
    void this.context.globalState.update(
      KEY_ACTIVE_NAME,
      this.activeName ?? null,
    );
  }

  getState(): ActivePokemonState {
    return this.state;
  }

  /**
   * Add a fresh pokemon record (0 XP) and make it the active one.
   * If a record with this name already exists, its XP is preserved but it becomes active.
   */
  addPokemon(name: string, type: PokemonType): void {
    if (!this.records.has(name)) {
      this.records.set(name, { baseType: type, type, totalXp: 0 });
    }
    this.activeName = name;
    this.recomputeAndNotify();
  }

  /**
   * Drop a pokemon's record entirely. If it was the active one, switch the HUD to
   * the first remaining record, or empty if none remain.
   */
  removePokemon(name: string): void {
    if (!this.records.has(name)) {
      return;
    }
    this.records.delete(name);
    if (this.activeName === name) {
      const next = this.records.keys().next();
      this.activeName = next.done ? undefined : next.value;
    }
    this.recomputeAndNotify();
  }

  /** Drop every record. HUD hides. */
  removeAll(): void {
    if (this.records.size === 0 && this.activeName === undefined) {
      return;
    }
    this.records.clear();
    this.activeName = undefined;
    this.recomputeAndNotify();
  }

  /**
   * Called when the user changes the configured pokemonType. Clears all records and
   * seeds a single fresh one at the new type — this is "start over", which matches
   * the legacy semantics for the setting.
   */
  reset(newBaseType: PokemonType): void {
    this.records.clear();
    this.records.set(newBaseType, {
      baseType: newBaseType,
      type: newBaseType,
      totalXp: 0,
    });
    this.activeName = newBaseType;
    this.recomputeAndNotify();
  }

  /**
   * Zero the active pokemon's XP and revert its species to its base form.
   * No-op when there is no active pokemon.
   */
  resetXp(): void {
    if (!this.activeName) {
      return;
    }
    const rec = this.records.get(this.activeName);
    if (!rec) {
      return;
    }
    rec.type = rec.baseType;
    rec.totalXp = 0;
    this.recomputeAndNotify();
  }
}
