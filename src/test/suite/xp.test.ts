import * as assert from 'assert';
import { computeXpGain } from '../../common/xp';

suite('xp: computeXpGain', () => {
    const base = {
        contentChangesTextLength: 10,
        hasReason: false,
        documentScheme: 'file',
        multiplier: 10,
        perEventCap: 200,
    };

    test('typing 10 chars at multiplier 10 yields 100 XP', () => {
        assert.strictEqual(computeXpGain(base), 100);
    });

    test('cap is honored — pasting 1000 chars yields perEventCap', () => {
        assert.strictEqual(
            computeXpGain({ ...base, contentChangesTextLength: 1000 }),
            200,
        );
    });

    test('undo/redo (hasReason=true) yields 0', () => {
        assert.strictEqual(computeXpGain({ ...base, hasReason: true }), 0);
    });

    test('non-editor schemes yield 0', () => {
        for (const scheme of [
            'output',
            'git',
            'vscode',
            'debug',
            'extension-output',
        ]) {
            assert.strictEqual(
                computeXpGain({ ...base, documentScheme: scheme }),
                0,
                `expected 0 for scheme ${scheme}`,
            );
        }
    });

    test('untitled scheme is allowed', () => {
        assert.strictEqual(
            computeXpGain({ ...base, documentScheme: 'untitled' }),
            100,
        );
    });

    test('zero-length change yields 0', () => {
        assert.strictEqual(
            computeXpGain({ ...base, contentChangesTextLength: 0 }),
            0,
        );
    });

    test('zero or negative multiplier yields 0', () => {
        assert.strictEqual(computeXpGain({ ...base, multiplier: 0 }), 0);
        assert.strictEqual(computeXpGain({ ...base, multiplier: -1 }), 0);
    });

    test('cap of 0 yields 0', () => {
        assert.strictEqual(computeXpGain({ ...base, perEventCap: 0 }), 0);
    });

    test('result is always an integer', () => {
        const r = computeXpGain({
            ...base,
            multiplier: 0.7,
            contentChangesTextLength: 3,
        });
        assert.strictEqual(r, Math.floor(r));
    });
});
