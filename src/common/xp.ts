// Pure XP-gain calculation. Extracted from VSCode-aware code so it can be unit-tested in isolation.

export interface XpGainInput {
    // Sum of inserted text lengths across all content changes in a single onDidChangeTextDocument event.
    contentChangesTextLength: number;
    // True when event.reason !== undefined (undo, redo, programmatic edit). We skip these.
    hasReason: boolean;
    // The document's URI scheme. We only count typing in 'file' or 'untitled' documents.
    documentScheme: string;
    // User-configurable multiplier (XP per character typed).
    multiplier: number;
    // Hard cap on XP awarded for a single event (prevents large pastes from instant-evolving).
    perEventCap: number;
}

const ALLOWED_SCHEMES = new Set(['file', 'untitled', 'vscode-userdata']);

export function computeXpGain(input: XpGainInput): number {
    if (input.hasReason) {
        return 0;
    }
    if (!ALLOWED_SCHEMES.has(input.documentScheme)) {
        return 0;
    }
    if (input.contentChangesTextLength <= 0) {
        return 0;
    }
    if (input.multiplier <= 0 || input.perEventCap <= 0) {
        return 0;
    }
    const raw = input.contentChangesTextLength * input.multiplier;
    return Math.min(Math.floor(raw), Math.floor(input.perEventCap));
}
