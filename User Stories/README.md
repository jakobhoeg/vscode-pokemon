# Epic: Add Generations 5–9 to vscode-pokemon

Gen 1–4 sprites were hand-made from overworld sprites. Hand-making ~530 more
Pokémon (x2 colours x2 animations) is not realistic, so the remaining
generations are **generated** from the static battle sprites in
`sprites/sprites/pokemon` with `scripts/sprites/generate_pokemon_gifs.py`
(docs: `scripts/sprites/README.md`).

Everything from **#494 Victini** to **#1025 Pecharunt** is in scope.

| # | Story | Status | Depends on |
| --- | --- | --- | --- |
| [US-01](US-01-sprite-generation-tooling.md) | Sprite generation tooling + tests | ✅ done (this change) | – |
| [US-02](US-02-generate-and-register-gen5.md) | Generate & register Generation 5 (#494–#649) | ✅ done | US-01 |
| [US-03](US-03-source-default-sprites-gen6-9.md) | Source default sprites for Gen 6–9 (#650–#1025) | ✅ done (full PokéAPI sprite set checked in) | US-01 |
| [US-04](US-04-generate-and-register-gen6-9.md) | Generate & register Generations 6–9 | ✅ done | US-02, US-03 |
| [US-05](US-05-localized-names.md) | Localized names (de/fr/ja) for Gen 5–9 | 🟡 Gen 5 done (incl. all forms); Gen 6–9 = one online command | US-02, US-04 |
| [US-06](US-06-alternate-forms-and-gender-variants.md) | Alternate forms & gender variants | ✅ done (~150 forms, 70 internal-id forms verified visually) | US-04 |
| [US-07](US-07-visual-qa-and-size-overrides.md) | Visual QA & sprite size overrides | ✅ done for Gen 5–9 | US-02, US-04 |
| [US-08](US-08-ci-and-release.md) | CI, docs & release | 🟡 CI/docs/version done; `vsce package` smoke test pending | all |
| [US-09](US-09-feed-pokemon.md) | Feed your Pokémon (Ctrl/Cmd+click drops items) | ✅ implemented, in-editor pass pending | – |
| [US-10](US-10-item-evolution.md) | Evolve Pokémon with items (Thunder Stone, Auspicious Armor, …) | ✅ implemented, in-editor pass pending | US-09 |

## Definition of done (applies to every story)

* `npm run sprites:test` passes (Python unit tests of the tooling).
* `npm run test:media` passes without `POKEMON_MEDIA_ALLOW_MISSING` on a full
  checkout – every registered Pokémon has valid GIFs, every GIF folder is
  registered.
* `npm run lint` and `npm run compile` pass.
* New Pokémon can be spawned from *Spawn additional pokemon → Generation N* and
  walk/idle correctly at all four sizes (nano → large) in both the explorer
  view and the panel.

## Progress log

* **US-02** – all 169 Gen 5 sprite folders generated (156 species + 4 Deerling/
  4 Sawsbuck seasons + 5 Genesect + 3 female variants), `pokemon-data.ts`
  merged with `apply_to_pokemon_data.py`, l10n entries added. Seven entries
  lost `extraSprites: leftFacing` (Drilbur, Sawk, Garbodor, Klang, Litwick,
  Heatmor, Meloetta) because generated sprites have no `walk_left` GIF – if the
  upstream repo still has those hand-made files, keep them and the flag comes
  back automatically on the next merge. `basculin_blue_striped` is registered
  but has no source sprite here (PokéAPI keeps it under internal id 10016).
* **US-05/US-06/US-07 (Gen 5 part)** – female/form names translated by hand;
  contact sheets of every Gen 5 walk frame reviewed: all face right, none
  clipped, 64 px canvas only for Reshiram/Zekrom/Kyurem. While adding the
  l10n test, pre-existing gaps were found and fixed (Unown forms, spiky-eared
  Pichu, `corpish`→`corphish`, `porygon_z`→`porygonZ`, Mime Jr.).
* **US-03/US-04** – with the complete sprite set checked in, Gen 6–9 were
  generated (`--gen 6..9`) and merged: 449 new entries. Spawnable totals:
  Gen 5 189, Gen 6 129, Gen 7 117, Gen 8 119, Gen 9 134 → **1253** Pokémon.
  `media/` grows by ~13 MB (uncompressed).
* **US-06** – all `<id>-<form>.png` / `female/` variants plus 70 internal-id
  forms (copied to `<dex>-<form>.png`, mapping verified on contact sheets)
  are in. `form_filter` in `pokedex.json` trims Alcremie to 9 flavours and
  drops forms that are pixel-identical to their base sprite. Display names
  follow the official form names (`Kyurem (Black Kyurem)`, `Oricorio (Pa'u
  Style)`, `Zygarde (10% Forme)`, …).
* **US-07** – every generation reviewed on contact sheets (facing, clipping,
  size); Terapagos moved back to the 32 px canvas (its normal form is tiny).
  Walk cycle trimmed to 4 frames (one hop per loop – visually identical to the
  8-frame version, which was just the same hop twice) to halve GIF sizes.
* **US-08** – `.github/workflows/sprites.yml`, README/CHANGELOG, version 5.1.0,
  prettier error in `extension.ts` fixed, `npm run lint` clean.

## What is already in place (US-01)

* `scripts/sprites/generate_pokemon_gifs.py`, `pokedex.json` (#494–#1025),
  `fetch_l10n_names.py`, pytest suite, `scripts/sprites/README.md`.
* `PokemonGeneration.Gen6…Gen9` in `src/common/types.ts`; `gen6…gen9` in the
  l10n loader.
* `src/test/suite/media.test.ts` + `npm run test:media`.
* Sample output committed as proof: Snivy (#495), Zekrom (#644, 64 px canvas)
  and Genesect + its four Drive forms (#649) in `media/gen5`, registered in
  `pokemon-data.ts` and translated in the gen5 l10n files.
* `.vscodeignore` excludes `scripts/`, `sprites/` and `User Stories/` from the
  packaged extension; tsconfigs exclude them from compilation.
