/**
 * Every Pokémon registered in pokemon-data.ts must have a localized name in
 * each locale that ships a file for its generation (l10n/pokemon/<locale>/gen<N>.json).
 *
 * Runs without VS Code:  npm run test:media
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { getAllPokemon, POKEMON_DATA } from '../../common/pokemon-data';

const L10N_ROOT = path.resolve(__dirname, '..', '..', '..', 'l10n', 'pokemon');

suite('pokemon l10n', () => {
  const locales = fs.existsSync(L10N_ROOT)
    ? fs
        .readdirSync(L10N_ROOT)
        .filter((d) => fs.statSync(path.join(L10N_ROOT, d)).isDirectory())
    : [];

  test('l10n folder exists with at least one locale', () => {
    assert.ok(locales.length > 0, `no locales found in ${L10N_ROOT}`);
  });

  for (const locale of locales) {
    test(`${locale}: every registered Pokémon of a translated generation has a name`, () => {
      const byGeneration: { [gen: number]: { [key: string]: string } } = {};
      for (const file of fs.readdirSync(path.join(L10N_ROOT, locale))) {
        const match = /^gen(\d+)\.json$/.exec(file);
        if (!match) {
          continue;
        }
        const data = JSON.parse(
          fs.readFileSync(path.join(L10N_ROOT, locale, file), 'utf8'),
        );
        byGeneration[Number(match[1])] = data;
      }
      assert.ok(
        Object.keys(byGeneration).length > 0,
        `${locale} has no gen*.json files`,
      );

      const missing: string[] = [];
      const empty: string[] = [];
      for (const key of getAllPokemon()) {
        const generation = POKEMON_DATA[key].generation;
        const names = byGeneration[generation];
        if (!names) {
          continue; // generation not translated (yet) -> English fallback, see US-05
        }
        if (!(key in names)) {
          missing.push(`gen${generation}/${key}`);
        } else if (typeof names[key] !== 'string' || names[key].trim() === '') {
          empty.push(`gen${generation}/${key}`);
        }
      }
      assert.deepStrictEqual(missing, [], `${locale}: missing translations`);
      assert.deepStrictEqual(empty, [], `${locale}: empty translations`);
    });

    test(`${locale}: translation files only contain registered keys`, () => {
      const unknown: string[] = [];
      for (const file of fs.readdirSync(path.join(L10N_ROOT, locale))) {
        const match = /^gen(\d+)\.json$/.exec(file);
        if (!match) {
          continue;
        }
        const data = JSON.parse(
          fs.readFileSync(path.join(L10N_ROOT, locale, file), 'utf8'),
        );
        for (const key of Object.keys(data)) {
          // Keys may be registered without assets (possibleColors: []) - only flag
          // keys that are not in the raw data at all, which indicates a typo.
          if (!(key in POKEMON_DATA) && !RAW_KEYS.has(key)) {
            unknown.push(`${file}/${key}`);
          }
        }
      }
      assert.deepStrictEqual(unknown, [], `${locale}: unknown keys`);
    });
  }
});

/** All keys in pokemon-data.ts including entries without assets (possibleColors: []). */
const RAW_KEYS: Set<string> = (() => {
  const source = fs.readFileSync(
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
  );
  return new Set(
    Array.from(source.matchAll(/^  ([A-Za-z0-9_]+): \{/gm), (m) => m[1]),
  );
})();
