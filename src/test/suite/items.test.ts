/**
 * The item catalogue (src/common/items.ts) must match the sprites in
 * media/items and the `vscode-pokemon.feedItem` setting in package.json.
 *
 * Runs without VS Code:  npm run test:unit
 */
import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

import {
  DEFAULT_FEED_ITEM,
  getAllItemKeys,
  ITEM_CATEGORY_LABELS,
  ItemCategory,
  ITEMS,
  itemSpriteFile,
} from '../../common/items';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const MEDIA = path.join(ROOT, 'media');

function pngSize(file: string): [number, number] {
  const buf = fs.readFileSync(file);
  assert.strictEqual(
    buf.toString('ascii', 1, 4),
    'PNG',
    `${file} is not a PNG`,
  );
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

suite('feed items', () => {
  test('every item has a 30x30 sprite in media/items', () => {
    for (const key of getAllItemKeys()) {
      const file = path.join(MEDIA, itemSpriteFile(key));
      assert.ok(fs.existsSync(file), `missing sprite ${file}`);
      assert.deepStrictEqual(
        pngSize(file),
        [30, 30],
        `${file} should be 30x30`,
      );
    }
  });

  test('every sprite in media/items belongs to an item', () => {
    const stray = fs
      .readdirSync(path.join(MEDIA, 'items'))
      .filter((f) => f.endsWith('.png'))
      .map((f) => f.replace(/\.png$/, ''))
      .filter((key) => !(key in ITEMS));
    assert.deepStrictEqual(stray, []);
  });

  test('keys are snake_case and the default item exists', () => {
    for (const key of getAllItemKeys()) {
      assert.match(key, /^[a-z0-9]+(_[a-z0-9]+)*$/, `bad key ${key}`);
      const item = ITEMS[key];
      assert.ok(item.name.trim().length > 0, `${key}: empty name`);
      assert.ok(
        item.amount >= 0 && item.happiness >= 0,
        `${key}: negative amounts`,
      );
      assert.ok(item.floatText.length > 0, `${key}: empty floatText`);
      assert.ok(
        ITEM_CATEGORY_LABELS[item.category],
        `${key}: unknown category`,
      );
    }
    assert.ok(ITEMS[DEFAULT_FEED_ITEM], 'default item must exist');
    for (const category of Object.values(ItemCategory)) {
      assert.ok(
        getAllItemKeys().some((k) => ITEMS[k].category === category),
        `no items in category ${category}`,
      );
    }
  });

  test('package.json feedItem setting lists exactly the item keys', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'),
    );
    const config = Array.isArray(pkg.contributes.configuration)
      ? pkg.contributes.configuration[0]
      : pkg.contributes.configuration;
    const setting = config.properties['vscode-pokemon.feedItem'];
    assert.ok(setting, 'vscode-pokemon.feedItem setting missing');
    assert.deepStrictEqual(setting.enum, getAllItemKeys());
    assert.deepStrictEqual(
      setting.enumDescriptions,
      getAllItemKeys().map((k) => ITEMS[k].name),
    );
    assert.strictEqual(setting.default, DEFAULT_FEED_ITEM);
    const commands = pkg.contributes.commands.map(
      (c: { command: string }) => c.command,
    );
    assert.ok(commands.includes('vscode-pokemon.feed-pokemon'));
    assert.ok(commands.includes('vscode-pokemon.choose-feed-item'));
  });
});
