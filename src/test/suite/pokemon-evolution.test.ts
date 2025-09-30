import { strict as assert } from 'assert';
import { getEvolution, canEvolve } from '../../common/pokemon-data';

describe('Pokemon Evolution Functions', function () {
    describe('getEvolution', function () {
        it('returns array of evolutions for single evolution Pokemon', function () {
            const evolutions = getEvolution('bulbasaur');
            assert.equal(Array.isArray(evolutions), true);
            assert.equal(evolutions.length, 1);
            assert.equal(evolutions[0], 'ivysaur');
        });

        it('returns array of multiple evolutions for Eevee', function () {
            const evolutions = getEvolution('eevee');
            assert.equal(Array.isArray(evolutions), true);
            assert.equal(evolutions.length, 5);
            assert.ok(evolutions.includes('vaporeon'));
            assert.ok(evolutions.includes('jolteon'));
            assert.ok(evolutions.includes('flareon'));
            assert.ok(evolutions.includes('espeon'));
            assert.ok(evolutions.includes('umbreon'));
        });

        it('returns array of branching evolutions for Wurmple', function () {
            const evolutions = getEvolution('wurmple');
            assert.equal(Array.isArray(evolutions), true);
            assert.equal(evolutions.length, 2);
            assert.ok(evolutions.includes('silcoon'));
            assert.ok(evolutions.includes('cascoon'));
        });

        it('returns array of branching evolutions for Clamperl', function () {
            const evolutions = getEvolution('clamperl');
            assert.equal(Array.isArray(evolutions), true);
            assert.equal(evolutions.length, 2);
            assert.ok(evolutions.includes('huntail'));
            assert.ok(evolutions.includes('gorebyss'));
        });

        it('returns array of branching evolutions for Gloom', function () {
            const evolutions = getEvolution('gloom');
            assert.equal(Array.isArray(evolutions), true);
            assert.equal(evolutions.length, 2);
            assert.ok(evolutions.includes('vileplume'));
            assert.ok(evolutions.includes('bellossom'));
        });

        it('returns empty array for Pokemon with no evolution', function () {
            const evolutions = getEvolution('venusaur');
            assert.equal(Array.isArray(evolutions), true);
            assert.equal(evolutions.length, 0);
        });

        it('returns empty array for legendary Pokemon', function () {
            const evolutions = getEvolution('articuno');
            assert.equal(Array.isArray(evolutions), true);
            assert.equal(evolutions.length, 0);
        });
    });

    describe('canEvolve', function () {
        it('returns true for Pokemon that can evolve', function () {
            assert.equal(canEvolve('bulbasaur'), true);
            assert.equal(canEvolve('eevee'), true);
            assert.equal(canEvolve('wurmple'), true);
            assert.equal(canEvolve('clamperl'), true);
        });

        it('returns false for Pokemon that cannot evolve', function () {
            assert.equal(canEvolve('venusaur'), false);
            assert.equal(canEvolve('articuno'), false);
            assert.equal(canEvolve('mew'), false);
        });
    });
});