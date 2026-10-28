/**
 * Feeding: dropping an item into the panel and letting a Pokémon walk over and
 * eat it.
 *
 * The DOM-free parts (FeedState, applyItemEffect, chooseFeeder) are unit tested
 * in src/test/suite/feeding.test.ts; ItemDrop wraps the <img> element.
 */
import {
  DEFAULT_HAPPINESS,
  DEFAULT_LEVEL,
  ItemConfig,
  ItemEffect,
  MAX_HAPPINESS,
  MAX_LEVEL,
  MAX_SPEED_BOOST,
} from '../common/items';
import { PokemonSize } from '../common/types';
import {
  FrameResult,
  HorizontalDirection,
  IPokemonType,
  IState,
  States,
} from './states';

/** What FeedState needs to know about the thing on the floor. */
export interface IFoodItem {
  key: string;
  config: ItemConfig;
  /** Horizontal centre of the item (px from the left) */
  x: number;
  /** True once the item has finished falling and can be picked up */
  landed: boolean;
  /** True once a Pokémon has eaten it */
  consumed: boolean;
  /** Play the "eaten" animation and remove the element afterwards */
  consume(): void;
}

/** Persisted per-Pokémon feeding stats. */
export interface PokemonStats {
  level: number;
  happiness: number;
  /** Multiplier applied to the walking speed (1 = normal). */
  speedBoost: number;
}

export function defaultStats(): PokemonStats {
  return { level: DEFAULT_LEVEL, happiness: DEFAULT_HAPPINESS, speedBoost: 1 };
}

export interface ItemOutcome {
  stats: PokemonStats;
  /** Levels gained (0 when the item is not a candy) */
  levelsGained: number;
  happinessGained: number;
  /** Short description for the info toast, e.g. "grew to Lv. 6!" */
  summary: string;
}

/** Pure function: the stats after eating `item`. */
export function applyItemEffect(
  stats: PokemonStats,
  item: ItemConfig,
): ItemOutcome {
  const next: PokemonStats = { ...stats };
  let levelsGained = 0;
  let summary = '';

  switch (item.effect) {
    case ItemEffect.levelUp: {
      const target = Math.min(MAX_LEVEL, stats.level + item.amount);
      levelsGained = target - stats.level;
      next.level = target;
      summary =
        levelsGained > 0
          ? `grew to Lv. ${next.level}!`
          : `is already Lv. ${MAX_LEVEL}!`;
      break;
    }
    case ItemEffect.speed: {
      next.speedBoost = Math.min(
        MAX_SPEED_BOOST,
        Math.round((stats.speedBoost + item.amount / 100) * 100) / 100,
      );
      summary =
        next.speedBoost > stats.speedBoost
          ? `got faster (x${next.speedBoost.toFixed(1)})!`
          : `is already as fast as it gets!`;
      break;
    }
    case ItemEffect.heal:
      summary = 'feels refreshed!';
      break;
    case ItemEffect.stat:
      summary = `${item.floatText.replace('!', '').toLowerCase()}!`;
      break;
    case ItemEffect.happiness:
      summary = 'loves it!';
      break;
    case ItemEffect.evolve:
      // Handled before we get here when the Pokémon can evolve with the item;
      // otherwise the item has no effect (and is not eaten).
      return {
        stats: next,
        levelsGained: 0,
        happinessGained: 0,
        summary: 'looks at it, puzzled... it has no effect.',
      };
  }

  const happinessBefore = next.happiness;
  const happinessBonus =
    (item.effect === ItemEffect.happiness ? item.amount : 0) + item.happiness;
  next.happiness = Math.min(MAX_HAPPINESS, next.happiness + happinessBonus);
  const happinessGained = next.happiness - happinessBefore;
  if (item.effect === ItemEffect.happiness) {
    summary =
      happinessGained > 0
        ? `loves it! (happiness ${next.happiness})`
        : `is as happy as can be!`;
  }

  return { stats: next, levelsGained, happinessGained, summary };
}

/** Size of the item sprite on screen for a given Pokémon size (sprites are 30px). */
export function itemPixelSize(size: PokemonSize): number {
  switch (size) {
    case PokemonSize.nano:
      return 15;
    case PokemonSize.small:
      return 22;
    case PokemonSize.large:
      return 38;
    case PokemonSize.medium:
    default:
      return 30;
  }
}

export interface FeederCandidate<T> {
  pokemon: IPokemonType;
  /** Whatever the caller wants back (e.g. the PokemonElement) */
  payload: T;
}

/**
 * Pick the Pokémon that should go and eat an item dropped at `x`:
 * the closest one that is able to (on the ground, not already eating).
 */
export function chooseFeeder<T>(
  candidates: FeederCandidate<T>[],
  x: number,
): FeederCandidate<T> | undefined {
  let best: FeederCandidate<T> | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const p = candidate.pokemon;
    if (!p.canFeed) {
      continue;
    }
    const distance = Math.abs(p.left + p.width / 2 - x);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Walk to the item, then munch on it for a moment.
 * Completes with stateComplete once the item has been eaten; cancels when the
 * item disappeared (eaten by somebody else or removed).
 */
export class FeedState implements IState {
  label = States.feed;
  spriteLabel = 'walk';
  horizontalDirection = HorizontalDirection.natural;
  pokemon: IPokemonType;
  item: IFoodItem;
  /** Frames spent eating (100ms each) */
  eatFrames = 12;
  /** Walk a bit faster than usual - food! */
  speedMultiplier = 1.4;
  /** Give up after this many frames of walking */
  maxWalkFrames = 600;

  private eating = false;
  private eatCounter = 0;
  private walkCounter = 0;

  constructor(pokemon: IPokemonType, item: IFoodItem) {
    this.pokemon = pokemon;
    this.item = item;
  }

  /** The item is reached when the Pokémon's centre is within this many px. */
  private get reach(): number {
    return Math.max(6, this.pokemon.width * 0.25);
  }

  nextFrame(): FrameResult {
    if (this.item.consumed && !this.eating) {
      return FrameResult.stateCancel;
    }
    if (this.eating) {
      this.spriteLabel = 'idle';
      this.horizontalDirection = HorizontalDirection.natural;
      this.eatCounter++;
      if (this.eatCounter >= this.eatFrames) {
        return FrameResult.stateComplete;
      }
      return FrameResult.stateContinue;
    }

    if (!this.item.landed) {
      // wait for the item to hit the floor
      this.spriteLabel = 'idle';
      this.horizontalDirection = HorizontalDirection.natural;
      return FrameResult.stateContinue;
    }

    const centre = this.pokemon.left + this.pokemon.width / 2;
    const delta = this.item.x - centre;
    if (Math.abs(delta) <= this.reach) {
      this.eating = true;
      this.item.consume();
      this.spriteLabel = 'idle';
      return FrameResult.stateContinue;
    }

    this.walkCounter++;
    if (this.walkCounter > this.maxWalkFrames) {
      return FrameResult.stateCancel;
    }
    this.spriteLabel = 'walk';
    const step = Math.min(
      Math.abs(delta),
      this.pokemon.speed * this.speedMultiplier,
    );
    if (delta < 0) {
      this.horizontalDirection = HorizontalDirection.left;
      this.pokemon.positionLeft(this.pokemon.left - step);
    } else {
      this.horizontalDirection = HorizontalDirection.right;
      this.pokemon.positionLeft(this.pokemon.left + step);
    }
    return FrameResult.stateContinue;
  }
}

/**
 * DOM wrapper for a dropped item: an <img> that falls to the floor, waits to
 * be eaten, and animates away when consumed.
 */
export class ItemDrop implements IFoodItem {
  key: string;
  config: ItemConfig;
  x: number;
  landed = false;
  consumed = false;
  el: HTMLImageElement;
  private removed = false;

  constructor(
    key: string,
    config: ItemConfig,
    spriteUrl: string,
    x: number,
    startBottom: number,
    floor: number,
    sizePx: number,
    container: HTMLElement,
    fallMs: number = 450,
  ) {
    this.key = key;
    this.config = config;
    this.x = x;
    this.el = document.createElement('img');
    this.el.className = 'item item-falling';
    this.el.src = spriteUrl;
    this.el.title = config.name;
    this.el.style.width = `${sizePx}px`;
    this.el.style.height = `${sizePx}px`;
    this.el.style.left = `${Math.round(x - sizePx / 2)}px`;
    this.el.style.bottom = `${Math.max(floor, startBottom)}px`;
    this.el.style.transitionDuration = `${fallMs}ms`;
    container.appendChild(this.el);

    // next frame: transition to the floor
    const land = () => {
      this.el.classList.remove('item-falling');
      this.el.classList.add('item-landed');
      this.landed = true;
    };
    if (startBottom <= floor) {
      land();
    } else {
      // force style flush so the transition runs
      void this.el.offsetHeight;
      this.el.style.bottom = `${floor}px`;
      const onEnd = () => {
        this.el.removeEventListener('transitionend', onEnd);
        land();
      };
      this.el.addEventListener('transitionend', onEnd);
      setTimeout(land, fallMs + 50); // fallback (e.g. no transitions)
    }
  }

  consume(): void {
    if (this.consumed) {
      return;
    }
    this.consumed = true;
    this.el.classList.remove('item-landed');
    this.el.classList.add('item-eaten');
    setTimeout(() => this.remove(), 700);
  }

  remove(): void {
    if (this.removed) {
      return;
    }
    this.removed = true;
    this.consumed = true;
    this.el.remove();
  }
}

/** Float a short pixel-font text above a Pokémon and let it fade out. */
export function floatText(
  container: HTMLElement,
  text: string,
  left: number,
  bottom: number,
  width: number,
  kind: 'level' | 'heal' | 'love' | 'stat',
): HTMLDivElement {
  const el = document.createElement('div');
  el.className = `float-text float-${kind}`;
  el.textContent = text;
  el.style.left = `${left}px`;
  el.style.bottom = `${bottom}px`;
  el.style.width = `${width}px`;
  container.appendChild(el);
  const remove = () => el.remove();
  el.addEventListener('animationend', remove);
  setTimeout(remove, 1600);
  return el;
}

export function floatKindFor(
  effect: ItemEffect,
): 'level' | 'heal' | 'love' | 'stat' {
  switch (effect) {
    case ItemEffect.levelUp:
    case ItemEffect.evolve:
      return 'level';
    case ItemEffect.heal:
      return 'heal';
    case ItemEffect.happiness:
      return 'love';
    default:
      return 'stat';
  }
}
