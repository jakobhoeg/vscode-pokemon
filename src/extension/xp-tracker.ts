import * as vscode from 'vscode';
import {
    growthRateFor,
    levelForXp,
    nextEvolution,
    xpForLevel,
} from '../common/evolution-data';
import { computeXpGain } from '../common/xp';
import { PokemonType } from '../common/types';

const KEY_BASE_TYPE = 'vscode-pokemon.active-pokemon.base-type';
const KEY_CURRENT_TYPE = 'vscode-pokemon.active-pokemon.current-type';
const KEY_TOTAL_XP = 'vscode-pokemon.active-pokemon.total-xp';

const FLUSH_DEBOUNCE_MS = 500;

export interface ActivePokemonState {
    baseType: PokemonType;
    currentType: PokemonType;
    totalXp: number;
    level: number;
    xpIntoLevel: number;
    xpToNextLevel: number; // 0 when at max level (100)
}

export type EvolutionNotificationMode = 'silent' | 'info' | 'modal';

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
 * Tracks XP for the configured "active" Pokemon (the one bound to vscode-pokemon.pokemonType).
 * Listens to onDidChangeTextDocument and accumulates XP via a faithful Pokemon growth curve.
 * State persists in globalState; writes are debounced.
 */
export class XpTracker {
    private context: vscode.ExtensionContext;
    private callbacks: XpTrackerCallbacks;
    private getConfig: () => XpTrackerConfig;
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
        this.state = this.loadOrInitState(configuredType);
    }

    private loadOrInitState(configuredType: PokemonType): ActivePokemonState {
        const savedBase = this.context.globalState.get<string>(KEY_BASE_TYPE);
        const savedCurrent =
            this.context.globalState.get<string>(KEY_CURRENT_TYPE);
        const savedXp = this.context.globalState.get<number>(KEY_TOTAL_XP);

        if (
            savedBase === configuredType &&
            typeof savedCurrent === 'string' &&
            typeof savedXp === 'number'
        ) {
            // Same base species as configured — restore evolved form and XP.
            return this.deriveState(
                configuredType,
                savedCurrent as PokemonType,
                savedXp,
            );
        }
        // First run, or user changed pokemonType — reset.
        return this.deriveState(configuredType, configuredType, 0);
    }

    private deriveState(
        baseType: PokemonType,
        currentType: PokemonType,
        totalXp: number,
    ): ActivePokemonState {
        const growth = growthRateFor(currentType);
        const level = levelForXp(growth, totalXp);
        const thisLevelXp = xpForLevel(growth, level);
        const nextLevelXp =
            level >= 100 ? thisLevelXp : xpForLevel(growth, level + 1);
        return {
            baseType,
            currentType,
            totalXp,
            level,
            xpIntoLevel: Math.max(0, totalXp - thisLevelXp),
            xpToNextLevel:
                level >= 100 ? 0 : Math.max(0, nextLevelXp - thisLevelXp),
        };
    }

    /** Registers the onDidChangeTextDocument subscription. Returns a disposable. */
    start(): vscode.Disposable {
        const sub = vscode.workspace.onDidChangeTextDocument((event) =>
            this.handleEdit(event),
        );
        // Push initial state to listeners so the status bar populates on startup.
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
        this.processEdit(
            textLength,
            event.reason !== undefined,
            event.document.uri.scheme,
        );
    }

    /**
     * Processes a synthesised edit. Exposed for unit testing so callers don't need a real
     * vscode.TextDocumentChangeEvent. Production code routes through {@link handleEdit}.
     */
    processEdit(
        textLength: number,
        hasReason: boolean,
        documentScheme: string,
    ): void {
        const cfg = this.getConfig();
        if (!cfg.enabled) {
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
        const oldType = this.state.currentType;
        const newTotal = this.state.totalXp + gain;
        let workingType = this.state.currentType;
        let evolved = false;

        // Evolve as many times as thresholds allow (rare but possible on a single large paste).
        // We re-derive level under the *current* species' growth rate at each step.
        // We deliberately do NOT reset XP on evolution: the canonical Pokemon mechanic preserves total XP
        // and the evolved species' curve is the same growth group, so the level carries over naturally.
        // (When growth rates differ between forms, levelForXp under the new growth rate produces the
        // closest legal level — acceptable for this UX-level approximation.)
        // eslint-disable-next-line no-constant-condition
        while (true) {
            const growth = growthRateFor(workingType);
            const newLevel = levelForXp(growth, newTotal);
            const evo = nextEvolution(workingType, newLevel);
            if (!evo) {
                break;
            }
            workingType = evo.type as PokemonType;
            evolved = true;
        }

        this.state = this.deriveState(
            this.state.baseType,
            workingType,
            newTotal,
        );
        this.markDirty();
        this.callbacks.onUpdate(this.state);
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
        void this.context.globalState.update(
            KEY_BASE_TYPE,
            this.state.baseType,
        );
        void this.context.globalState.update(
            KEY_CURRENT_TYPE,
            this.state.currentType,
        );
        void this.context.globalState.update(KEY_TOTAL_XP, this.state.totalXp);
        this.context.globalState.setKeysForSync([
            KEY_BASE_TYPE,
            KEY_CURRENT_TYPE,
            KEY_TOTAL_XP,
        ]);
    }

    getState(): ActivePokemonState {
        return this.state;
    }

    /** Called when the user changes their pokemonType setting. Resets XP and form. */
    reset(newBaseType: PokemonType): void {
        this.state = this.deriveState(newBaseType, newBaseType, 0);
        this.dirty = true;
        this.flushNow();
        this.callbacks.onUpdate(this.state);
    }

    /** Manual reset (for the reset-xp command). Keeps base type, reverts current to base, zeros XP. */
    resetXp(): void {
        this.state = this.deriveState(
            this.state.baseType,
            this.state.baseType,
            0,
        );
        this.dirty = true;
        this.flushNow();
        this.callbacks.onUpdate(this.state);
    }
}
