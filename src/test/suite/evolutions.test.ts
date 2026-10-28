/**
 * Item evolution table (src/common/evolutions.ts) sanity checks.
 *
 * Runs without VS Code:  npm run test:unit
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import {
  evolutionsFor,
  evolutionsWith,
  findEvolution,
  ITEM_EVOLUTIONS,
} from '../../common/evolutions';
import { ItemEffect, ITEMS } from '../../common/items';
import { POKEMON_DATA } from '../../common/pokemon-data';

const RAW_KEYS: Set<string> = new Set(
  Array.from(
    fs
      .readFileSync(
        path.resolve(
          __dirname,
          '..',
          '..',
          '..',
          'src',
          'common',
          'pokemon-data.ts',
        ),
        'utf8',
      )
      .matchAll(/^  ([A-Za-z0-9_]+): \{/gm),
    (m) => m[1],
  ),
);

suite('item evolutions', () => {
  test('every evolution references registered, spawnable Pokémon and a known item', () => {
    for (const evo of ITEM_EVOLUTIONS) {
      assert.ok(RAW_KEYS.has(evo.from), `unknown source ${evo.from}`);
      assert.ok(RAW_KEYS.has(evo.to), `unknown target ${evo.to}`);
      assert.ok(
        POKEMON_DATA[evo.to],
        `${evo.to} has no sprites (possibleColors empty)`,
      );
      assert.ok(ITEMS[evo.item], `${evo.item} is not in the item catalogue`);
      assert.notStrictEqual(evo.from, evo.to);
    }
  });

  test('one target per (pokemon, item)', () => {
    const seen = new Set<string>();
    for (const evo of ITEM_EVOLUTIONS) {
      const key = `${evo.from}+${evo.item}`;
      assert.ok(!seen.has(key), `duplicate evolution for ${key}`);
      seen.add(key);
    }
  });

  test('every evolution-only item evolves at least one Pokémon', () => {
    for (const key of Object.keys(ITEMS)) {
      if (ITEMS[key].effect === ItemEffect.evolve) {
        assert.ok(evolutionsWith(key).length > 0, `${key} evolves nobody`);
      }
    }
  });

  test('the examples from the feature request work', () => {
    assert.strictEqual(findEvolution('pikachu', 'thunder_stone'), 'raichu');
    assert.strictEqual(
      findEvolution('charcadet', 'auspicious_armor'),
      'armarouge',
    );
    assert.strictEqual(
      findEvolution('charcadet', 'malicious_armor'),
      'ceruledge',
    );
    assert.strictEqual(findEvolution('bulbasaur', 'thunder_stone'), undefined);
    assert.strictEqual(findEvolution('pikachu', 'oran_berry'), undefined);
    assert.deepStrictEqual(
      evolutionsFor('eevee')
        .map((e) => `${e.item}>${e.to}`)
        .sort(),
      [
        'fire_stone>flareon',
        'ice_stone>glaceon',
        'leaf_stone>leafeon',
        'thunder_stone>jolteon',
        'water_stone>vaporeon',
      ],
    );
    // a treat that doubles as an evolution item
    assert.strictEqual(findEvolution('applin', 'sweet_apple'), 'appletun');
    assert.strictEqual(ITEMS.sweet_apple.effect, ItemEffect.happiness);
  });
});
