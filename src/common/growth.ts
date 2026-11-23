// Pure rules for feeding, hunger and growth. Callers pass in time and settings,
// so the extension host owns the state and tests control the clock.

export interface GrowthState {
  xp: number;
  /** Epoch ms of the last feed; 0 = never fed. */
  lastFedAt: number;
  /** How many times this individual pokemon has evolved. */
  timesEvolved: number;
}

/** Assumed already validated: cooldownMs >= 0, feedsToEvolve an integer >= 1. */
export interface GrowthRules {
  cooldownMs: number;
  feedsToEvolve: number;
}

export type FeedOutcome = 'fed' | 'full' | 'ready';

/** One pokemon's entry in the extension → webview 'growth-sync' message. */
export interface GrowthSyncEntry {
  name: string;
  hungry: boolean;
  scale: number;
  xp: number;
  feedsToEvolve: number;
}

const MINUTE_MS = 60 * 1000;

export const FRESH_GROWTH: Readonly<GrowthState> = {
  xp: 0,
  lastFedAt: 0,
  timesEvolved: 0,
};

export const DEFAULT_GROWTH_RULES: Readonly<GrowthRules> = {
  cooldownMs: 30 * MINUTE_MS,
  feedsToEvolve: 5,
};

/**
 * Turns raw settings values into valid rules. Hand edits to settings.json skip the
 * schema's `minimum`, so wrong types fall back to the defaults and out-of-range numbers are clamped.
 */
export function growthRulesFromSettings(
  cooldownMinutes: unknown,
  feedsToEvolve: unknown,
): GrowthRules {
  const isNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value);
  return {
    cooldownMs: isNumber(cooldownMinutes)
      ? Math.max(0, cooldownMinutes) * MINUTE_MS
      : DEFAULT_GROWTH_RULES.cooldownMs,
    feedsToEvolve: isNumber(feedsToEvolve)
      ? Math.max(1, Math.floor(feedsToEvolve))
      : DEFAULT_GROWTH_RULES.feedsToEvolve,
  };
}

/** Hunger never shows sooner than this, so a short cooldown doesn't turn into constant nagging. */
export const HUNGRY_AFTER_MS = 2 * 60 * MINUTE_MS;

/** Size gained per completed stage (one evolution = feedsToEvolve feeds). */
export const SCALE_STEP = 0.25;

function msSinceFed(state: Readonly<GrowthState>, now: number): number {
  const elapsed = now - state.lastFedAt;
  // A timestamp from the future (clock skew between synced machines) would
  // otherwise block feeding until that moment arrives.
  return elapsed < 0 ? Infinity : elapsed;
}

/** Ms until the pokemon can be fed again; 0 means it can eat now. */
export function cooldownRemaining(
  state: Readonly<GrowthState>,
  now: number,
  rules: Readonly<GrowthRules>,
): number {
  return Math.max(0, rules.cooldownMs - msSinceFed(state, now));
}

export function feed(
  state: Readonly<GrowthState>,
  now: number,
  rules: Readonly<GrowthRules>,
): { state: GrowthState; outcome: FeedOutcome } {
  if (cooldownRemaining(state, now, rules) > 0) {
    return { state: { ...state }, outcome: 'full' };
  }
  // Capped so a final form (nothing to evolve into) can't grow XP forever.
  const xp = Math.min(state.xp + 1, rules.feedsToEvolve);
  return {
    state: { ...state, xp, lastFedAt: now },
    outcome: xp >= rules.feedsToEvolve ? 'ready' : 'fed',
  };
}

/** The growth state right after evolving: XP restarts and the evolution counts toward size. */
export function afterEvolution(state: Readonly<GrowthState>): GrowthState {
  return { ...state, xp: 0, timesEvolved: state.timesEvolved + 1 };
}

export function isHungry(
  state: Readonly<GrowthState>,
  now: number,
  rules: Readonly<GrowthRules>,
): boolean {
  // max() means it can never be hungry while still on cooldown.
  return msSinceFed(state, now) >= Math.max(rules.cooldownMs, HUNGRY_AFTER_MS);
}

/** Sprite size multiplier before the pane cap: 1 for a fresh pokemon, +SCALE_STEP per stage. */
export function growthScale(
  state: Readonly<GrowthState>,
  rules: Readonly<GrowthRules>,
): number {
  const stageProgress = Math.min(state.xp / rules.feedsToEvolve, 1);
  return 1 + SCALE_STEP * (state.timesEvolved + stageProgress);
}
