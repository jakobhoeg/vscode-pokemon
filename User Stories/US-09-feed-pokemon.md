# US-09 – Feed your Pokémon

**As a** user
**I want** to drop items (berries, potions, Rare Candy, …) into the Pokémon view
with Ctrl/Cmd+click and watch my Pokémon run over and eat them
**so that** interacting with them is more fun than just watching them walk.

**Status: ✅ implemented** (needs an in-editor pass – see below).

## Acceptance criteria

- [x] Ctrl+click (Cmd+click on macOS) anywhere in the Pokémon view drops the
      held item at the cursor; it falls to the floor and the closest Pokémon
      that is free walks (a bit faster than usual) to it, stops, and "eats" it
      (item shrinks away, heart bubble, floating pixel-font text).
- [x] Ctrl+click directly on a Pokémon feeds that Pokémon.
- [x] A small HUD in the top-right corner shows the held item; clicking it
      opens the item picker. `vscode-pokemon.feedWithMouse: false` disables
      Ctrl+click and hides the HUD.
- [x] `Pokemon Coding: Choose item to feed` – quick pick grouped by category,
      stored in `vscode-pokemon.feedItem` (synced setting).
- [x] `Pokemon Coding: Feed pokemon` (`Alt+Shift+F`) – pick an item, then a
      Pokémon (or "whoever is closest"); works for the explorer view too.
- [x] Effects: candy = level up (+1 / +3, capped at 100) with sparkle;
      medicine = green healing flash; berries/treats = happiness (capped at
      255); Carbos = permanent speed boost (+10 % each, max 1.5×); other
      vitamins = stat-up text. Every snack adds a little happiness.
- [x] Level / happiness / speed boost are persisted in the webview state and
      reported by Roll-call (`Lv. 6, ♥ 77`); an info toast summarises each
      meal ("Bulby ate the Rare Candy and grew to Lv. 6!").
- [x] Item sprites (39, 30×30) live in `media/items/`; `src/common/items.ts`
      is the catalogue; `npm run test:unit` checks catalogue ↔ sprites ↔
      `package.json` enum.
- [x] Unit tests: `applyItemEffect`, `chooseFeeder`, `FeedState` (DOM-free) and
      a jsdom smoke test of the whole flow (`panel-feeding.test.ts`).
- [x] New strings translated in `l10n/bundle.l10n.{de-DE,fr-FR,ja-JP}.json`.

## To verify in VS Code

1. Spawn 2–3 Pokémon, Ctrl+click between them: the closest one should go.
2. Ctrl+click on a specific Pokémon while another is closer to the cursor.
3. Switch size to nano/large and check the item size and float text position.
4. Themes: the item must land on the theme floor (forest/castle/beach).
5. Reload the window: Roll-call still shows the levels.

## Ideas for later

* Pokémon with a full belly refuse food for a while (happiness decays).
* Evolution at a level threshold (needs the evolution table from PokéAPI).
* Favourite flavours per species (Pokéblock-style likes/dislikes).
