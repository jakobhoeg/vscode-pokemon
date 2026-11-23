import * as assert from 'assert';
import { EVOLUTION_DATA } from '../../common/evolution-data';
import { getEvolutions, pickEvolution } from '../../common/evolutions';
import { POKEMON_DATA } from '../../common/pokemon-data';

suite('Evolutions', () => {
  test('follows a linear chain to its final form', () => {
    assert.deepStrictEqual(getEvolutions('bulbasaur'), ['ivysaur']);
    assert.deepStrictEqual(getEvolutions('ivysaur'), ['venusaur']);
    assert.deepStrictEqual(getEvolutions('venusaur'), []);
  });

  test('lists every sprite-backed branch', () => {
    assert.deepStrictEqual([...getEvolutions('eevee')].sort(), [
      'espeon',
      'flareon',
      'glaceon',
      'jolteon',
      'leafeon',
      'umbreon',
      'vaporeon',
    ]);
  });

  test('variants evolve into the matching variant', () => {
    assert.deepStrictEqual(getEvolutions('gible_female'), ['gabite_female']);
    assert.deepStrictEqual(getEvolutions('shellos_east'), ['gastrodon_east']);
    assert.deepStrictEqual(getEvolutions('burmy_sandy'), [
      'wormadam_sandy',
      'mothim',
    ]);
    // No plain wobbuffet key exists, so either gender is a valid outcome
    assert.deepStrictEqual(getEvolutions('wynaut'), [
      'wobbuffet_male',
      'wobbuffet_female',
    ]);
    assert.deepStrictEqual(getEvolutions('onix'), ['steelix']);
  });

  test('variants that cannot evolve in the games have no evolution', () => {
    assert.deepStrictEqual(getEvolutions('combee_male'), []);
    assert.deepStrictEqual(getEvolutions('pichu_spiky_eared'), []);
  });

  test('every source and target has sprites', () => {
    for (const [source, targets] of Object.entries(EVOLUTION_DATA)) {
      assert.ok(POKEMON_DATA[source], `unknown source ${source}`);
      for (const target of targets) {
        assert.ok(POKEMON_DATA[target], `${source} -> unknown ${target}`);
      }
    }
  });

  test('pickEvolution uses the injected random source', () => {
    const forms = ['a', 'b', 'c'];
    assert.strictEqual(
      pickEvolution(forms, () => 0),
      'a',
    );
    assert.strictEqual(
      pickEvolution(forms, () => 0.99),
      'c',
    );
    assert.strictEqual(
      pickEvolution(forms, () => 1),
      'c',
    );
    assert.strictEqual(pickEvolution([]), undefined);
  });
});
