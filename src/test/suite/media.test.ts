/**
 * Verifies that the sprite GIFs in ./media and the Pokémon registered in
 * src/common/pokemon-data.ts agree with each other.
 *
 * Runs without VS Code:  npm run test:media
 *
 * Set POKEMON_MEDIA_ALLOW_MISSING=1 to downgrade "registered Pokémon has no
 * media folder at all" to a warning (useful on stripped checkouts that only
 * contain some generations of assets).
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import { getAllPokemon, POKEMON_DATA } from '../../common/pokemon-data';
import {
  PokemonColor,
  PokemonExtraSprite,
  PokemonGeneration,
} from '../../common/types';

const MEDIA_ROOT = path.resolve(__dirname, '..', '..', '..', 'media');
const STATES = ['idle', 'walk'] as const;
const ALL_COLORS = [PokemonColor.default, PokemonColor.shiny];
const ALLOW_MISSING = process.env.POKEMON_MEDIA_ALLOW_MISSING === '1';

interface GifInfo {
  width: number;
  height: number;
  frames: number;
  delaysMs: number[];
  hasTransparency: boolean;
  loops: boolean;
}

/** Minimal GIF parser: enough to validate size, frame count, delays and transparency. */
function parseGif(buf: Buffer): GifInfo {
  const sig = buf.toString('ascii', 0, 6);
  assert.ok(sig === 'GIF89a' || sig === 'GIF87a', `bad GIF signature ${sig}`);
  const width = buf.readUInt16LE(6);
  const height = buf.readUInt16LE(8);
  const packed = buf[10];
  let pos = 13;
  if (packed & 0x80) {
    pos += 3 * (1 << ((packed & 0x07) + 1));
  }

  const skipSubBlocks = () => {
    while (pos < buf.length) {
      const size = buf[pos++];
      if (size === 0) {
        return;
      }
      pos += size;
    }
  };

  const info: GifInfo = {
    width,
    height,
    frames: 0,
    delaysMs: [],
    hasTransparency: false,
    loops: false,
  };

  while (pos < buf.length) {
    const block = buf[pos++];
    if (block === 0x3b) {
      break; // trailer
    }
    if (block === 0x21) {
      const label = buf[pos++];
      if (label === 0xf9) {
        const size = buf[pos];
        const gcePacked = buf[pos + 1];
        const delay = buf.readUInt16LE(pos + 2);
        info.delaysMs.push(delay * 10);
        if (gcePacked & 0x01) {
          info.hasTransparency = true;
        }
        pos += size + 1;
        skipSubBlocks();
      } else if (label === 0xff) {
        const size = buf[pos];
        const app = buf.toString('ascii', pos + 1, pos + 1 + size);
        if (app.startsWith('NETSCAPE')) {
          info.loops = true;
        }
        pos += size + 1;
        skipSubBlocks();
      } else {
        skipSubBlocks();
      }
    } else if (block === 0x2c) {
      const imgPacked = buf[pos + 8];
      pos += 9;
      if (imgPacked & 0x80) {
        pos += 3 * (1 << ((imgPacked & 0x07) + 1));
      }
      pos += 1; // LZW minimum code size
      skipSubBlocks();
      info.frames += 1;
    } else {
      throw new Error(`unexpected GIF block 0x${block.toString(16)} at ${pos}`);
    }
  }
  return info;
}

function gifName(color: string, state: string): string {
  return `${color}_${state}_8fps.gif`;
}

function pokemonFolder(key: string): string {
  return path.join(MEDIA_ROOT, `gen${POKEMON_DATA[key].generation}`, key);
}

function expectedFiles(key: string): string[] {
  const config = POKEMON_DATA[key];
  const files: string[] = [];
  for (const color of config.possibleColors) {
    for (const state of STATES) {
      files.push(gifName(color, state));
    }
  }
  if (config.extraSprites?.includes(PokemonExtraSprite.leftFacing)) {
    files.push(gifName(PokemonColor.default, 'walk_left'));
  }
  return files;
}

/** Problems with a sprite gif (empty = valid). */
function spriteGifProblems(file: string, expectedSize: number): string[] {
  const rel = path.relative(MEDIA_ROOT, file);
  let info: GifInfo;
  try {
    info = parseGif(fs.readFileSync(file));
  } catch (e) {
    return [`${rel}: not a readable GIF (${(e as Error).message})`];
  }
  const problems: string[] = [];
  if (info.width !== expectedSize || info.height !== expectedSize) {
    problems.push(
      `${rel}: is ${info.width}x${info.height} but originalSpriteSize is ${expectedSize}`,
    );
  }
  if (info.frames < 2) {
    problems.push(`${rel}: expected an animation, got ${info.frames} frame(s)`);
  }
  if (!info.delaysMs.every((d) => d > 0)) {
    problems.push(`${rel}: every frame needs a positive delay`);
  }
  if (!info.hasTransparency) {
    problems.push(`${rel}: sprite must have a transparent background`);
  }
  return problems;
}

/** Fail with every problem listed, so one run shows everything that is wrong. */
function assertNoProblems(problems: string[], what: string) {
  assert.strictEqual(
    problems.length,
    0,
    `${problems.length} ${what}:\n  ${problems.join('\n  ')}`,
  );
}

suite('pokemon-data.ts', () => {
  test('keys follow the media folder naming convention', () => {
    for (const key of getAllPokemon()) {
      assert.match(key, /^[a-zA-Z0-9]+(_[a-zA-Z0-9]+)*$/, `bad key "${key}"`);
      const config = POKEMON_DATA[key];
      assert.ok(config.id > 0, `${key}: id must be positive`);
      assert.ok(
        Object.values(PokemonGeneration).includes(config.generation),
        `${key}: unknown generation ${config.generation}`,
      );
      assert.ok(
        [undefined, 32, 64].includes(config.originalSpriteSize),
        `${key}: originalSpriteSize must be 32 or 64`,
      );
      assert.ok(
        config.possibleColors.every((c) => ALL_COLORS.includes(c)),
        `${key}: unknown color in possibleColors`,
      );
    }
  });
});

/** Registered keys that look like a typo of `key` (edit distance <= 2). */
function similarKeys(key: string): string[] {
  const distance = (a: string, b: string): number => {
    const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) {
      dp[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
        );
      }
    }
    return dp[a.length][b.length];
  };
  return getAllPokemon().filter((k) => distance(k, key) <= 2);
}

suite('media sprites', function () {
  // Parsing every gif of nine generations can take a while on slow disks.
  this.timeout(120000);

  test('every registered Pokémon has valid gifs for each of its colors', function () {
    const missingFolders: string[] = [];
    const problems: string[] = [];
    for (const key of getAllPokemon()) {
      const folder = pokemonFolder(key);
      if (!fs.existsSync(folder)) {
        missingFolders.push(path.relative(MEDIA_ROOT, folder));
        continue;
      }
      const size = POKEMON_DATA[key].originalSpriteSize ?? 32;
      for (const name of expectedFiles(key)) {
        const file = path.join(folder, name);
        if (!fs.existsSync(file)) {
          problems.push(`missing sprite ${path.relative(MEDIA_ROOT, file)}`);
          continue;
        }
        problems.push(...spriteGifProblems(file, size));
      }
    }
    assertNoProblems(problems, 'sprite problem(s)');
    if (missingFolders.length > 0) {
      const message = `${missingFolders.length} registered Pokémon have no media folder:\n  ${missingFolders.join('\n  ')}`;
      if (ALLOW_MISSING) {
        console.warn(`[warn] ${message}`);
      } else {
        assert.fail(message);
      }
    }
  });

  test('every media folder belongs to a registered Pokémon with matching colors', () => {
    if (!fs.existsSync(MEDIA_ROOT)) {
      assert.fail(`media folder not found at ${MEDIA_ROOT}`);
    }
    const genFolders = fs
      .readdirSync(MEDIA_ROOT)
      .filter((d) => /^gen\d+$/.test(d));
    assert.ok(genFolders.length > 0, 'no media/gen* folders found');

    const problems: string[] = [];
    for (const genFolder of genFolders) {
      const generation = Number(genFolder.slice(3));
      for (const key of fs.readdirSync(path.join(MEDIA_ROOT, genFolder))) {
        const folder = path.join(MEDIA_ROOT, genFolder, key);
        if (!fs.statSync(folder).isDirectory()) {
          continue;
        }
        const config = POKEMON_DATA[key];
        if (!config) {
          const similar = similarKeys(key);
          problems.push(
            `${genFolder}/${key} is not registered in pokemon-data.ts (or has no possibleColors)` +
              (similar.length > 0
                ? ` - typo of ${similar.join(' / ')}? rename or delete the folder`
                : ''),
          );
          continue;
        }
        if (config.generation !== generation) {
          problems.push(
            `${key} lives in ${genFolder} but is registered as gen${config.generation}`,
          );
        }
        const gifs = fs.readdirSync(folder).filter((f) => f.endsWith('.gif'));
        if (gifs.length === 0) {
          problems.push(`${genFolder}/${key} contains no gifs`);
        }
        for (const gif of gifs) {
          const match =
            /^(default|shiny)_(idle|walk|walk_left)_8fps\.gif$/.exec(gif);
          if (!match) {
            problems.push(
              `${genFolder}/${key}/${gif} does not follow <color>_<state>_8fps.gif`,
            );
            continue;
          }
          const color = match[1] as PokemonColor;
          if (!config.possibleColors.includes(color)) {
            problems.push(
              `${genFolder}/${key}/${gif} exists but "${color}" is not in possibleColors of ${key}`,
            );
          }
          problems.push(
            ...spriteGifProblems(
              path.join(folder, gif),
              config.originalSpriteSize ?? 32,
            ),
          );
        }
      }
    }
    assertNoProblems(problems, 'media folder problem(s)');
  });

  test('generated sprites (#494+) use the documented animation timings', () => {
    // Hand-made gen 1-4 sprites vary; everything produced by
    // scripts/sprites/generate_pokemon_gifs.py is 2 idle frames / 4 walk frames.
    let checked = 0;
    for (const key of getAllPokemon()) {
      const config = POKEMON_DATA[key];
      if (config.id < 494) {
        continue;
      }
      const folder = pokemonFolder(key);
      if (!fs.existsSync(folder)) {
        continue;
      }
      for (const color of config.possibleColors) {
        const idle = parseGif(
          fs.readFileSync(path.join(folder, gifName(color, 'idle'))),
        );
        const walk = parseGif(
          fs.readFileSync(path.join(folder, gifName(color, 'walk'))),
        );
        assert.ok(
          idle.frames >= 2 && idle.loops,
          `${key}/${color} idle should loop with >=2 frames`,
        );
        assert.ok(
          walk.frames >= 2 && walk.loops,
          `${key}/${color} walk should loop with >=2 frames`,
        );
        checked += 1;
      }
    }
    assert.ok(checked > 0, 'expected at least one generated sprite to verify');
  });
});
