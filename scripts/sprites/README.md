# Sprite generation (Gen 5+)

Generations 1–4 of `media/` were hand-made from overworld sprites. From **#494
Victini** onwards the animated GIFs are *generated* from static battle sprites
by the tooling in this folder.

| File | Purpose |
| --- | --- |
| `generate_pokemon_gifs.py` | Turns static PNGs into the `default/shiny` × `idle/walk` GIFs the extension loads |
| `apply_to_pokemon_data.py` | Merges a generation manifest into `src/common/pokemon-data.ts` (updates colours/sizes, inserts new keys in Pokédex order) |
| `pokedex.json` | #494–#1025: display name, key (`slug`), generation, optional `sprite_size` / `base_form` / `facing` |
| `fetch_l10n_names.py` | Builds `l10n/pokemon/<locale>/gen<N>.json` from the PokéAPI name export |
| `copy_items.py` | Copies the item sprites referenced by `src/common/items.ts` into `media/items/` (normalised to 30×30) |
| `tests/` | `pytest` suite for both scripts |
| `requirements.txt` | Python dependencies (`Pillow`, `pytest`) |

The TypeScript side is verified by `npm run test:media`
(`src/test/suite/media.test.ts`), which checks that every registered Pokémon has
valid GIFs and every GIF folder is registered.

## 1. Prerequisites

```bash
python3 -m pip install -r scripts/sprites/requirements.txt   # Pillow + pytest
```

Python 3.9+ and Pillow 9.1+ are required. Nothing else (no ImageMagick/ffmpeg).
The examples below use `python3`; on Windows use `py -3` or `python` instead
(the `npm run sprites:*` shortcuts assume `python3` is on the PATH).

## 2. Source assets

The script reads the PokéAPI sprite layout that is checked in under
`sprites/sprites/pokemon/` (this is the "compressed" PokéAPI `sprites` repo –
only the front sprites are kept):

```
sprites/sprites/pokemon/<id>.png                default front sprite, 96×96, transparent
sprites/sprites/pokemon/<id>-<form>.png         alternate form   (585-autumn.png, 649-burn.png …)
sprites/sprites/pokemon/shiny/<id>.png          shiny
sprites/sprites/pokemon/shiny/<id>-<form>.png   shiny alternate form
sprites/sprites/pokemon/female/<id>.png         female variant
sprites/sprites/pokemon/shiny/female/<id>.png   shiny female variant
```

`<id>` is the **national Pokédex number**. Files with PokéAPI-internal ids
(`10001.png` and up: megas, regional forms, …) are ignored – see "Alternate
forms" below.

What is currently available in the repo:

| Range | default | shiny |
| --- | --- | --- |
| #494–#1025 (Gen 5–9) | ✅ | ✅ |
| alternate forms (`<id>-<form>.png`) | ✅ | ✅ |
| PokéAPI internal ids (`10001.png` …) | ✅ | ✅ |

Should a sprite be missing it can be fetched on the fly with `--download` (PokéAPI GitHub
by default). Any 96×96-ish transparent PNG works as input, so
[pokemondb.net/sprites](https://pokemondb.net/sprites) is a valid alternative
source – download the PNG into the path above and the script will pick it up, or
point `--download-url` at it, e.g.

```bash
--download-url "https://img.pokemondb.net/sprites/black-white/normal/{slug}.png"
```

Template placeholders: `{relpath}` (e.g. `shiny/650.png`), `{id}`, `{slug}`.

## 3. Generating GIFs

```bash
# a few Pokémon (ids and/or ranges)
python3 scripts/sprites/generate_pokemon_gifs.py --ids 495,644,649 -v

# one whole generation, with a report and the TypeScript entries to paste
python3 scripts/sprites/generate_pokemon_gifs.py --gen 5 \
    --manifest scripts/sprites/out/gen5-manifest.json \
    --emit-ts  scripts/sprites/out/gen5-entries.txt

# everything from Victini to Pecharunt, fetching missing sources first
python3 scripts/sprites/generate_pokemon_gifs.py --start 494 --end 1025 --download

# see what would happen without writing anything
python3 scripts/sprites/generate_pokemon_gifs.py --gen 6 --dry-run
```

`npm run sprites:generate -- --ids 495` is a shortcut for the same command.

Output goes to `media/gen<N>/<key>/`:

```
media/gen5/snivy/default_idle_8fps.gif   2 frames  @ 300 ms  (breathing)
media/gen5/snivy/default_walk_8fps.gif   4 frames  @ 70 ms   (bouncy gait: one hop per loop,
                                                              squash on landing / stretch at the
                                                              apex, 4° forward lean)
media/gen5/snivy/shiny_idle_8fps.gif     (only when a shiny source exists)
media/gen5/snivy/shiny_walk_8fps.gif
```

Rules the generator follows:

* **Existing GIFs are never overwritten** unless `--force` is given, so
  hand-made sprites (e.g. the partial Gen 5 set) are preserved.
* Ids below 494 are ignored – Gen 1–4 stay hand-made.
* Canvas size is **32×32** (like Gen 1–4) or **64×64** for giants. Like
  Gen 1–4 (Lugia, Groudon, Dialga, …) only Pokémon explicitly marked
  `"sprite_size": 64` in `pokedex.json` get the big canvas (box legendaries:
  Reshiram, Zekrom, Kyurem, Xerneas, … Koraidon, Miraidon, Terapagos). Pass
  `--large-threshold 88` to *also* promote any sprite whose content is ≥ 88 px
  in the 96 px source. The TypeScript entry then needs `originalSpriteSize: 64`.
* Content is scaled by `--scale` (default 0.5 → 96 px becomes 48 px) and then
  shrunk further if it would not fit the canvas, so relative sizes stay
  sensible (Joltik small, Haxorus big).
* **Sprites face right.** The extension mirrors the GIF (`scaleX(-1)`) when a
  Pokémon walks left, so – like the hand-made Gen 1–4 assets – every generated
  sprite must face right. PokéAPI front battle sprites face *left* (towards the
  player), so sources are mirrored by default (`--source-facing left`). For a
  sprite that already faces right, or is symmetric, set `"facing": "right"` /
  `"front"` for that id in `pokedex.json`.
* Alpha is thresholded (GIF has 1-bit transparency), the palette is global and
  ≤ 255 colours, frames loop forever, output is byte-for-byte deterministic.
* The exit code is `1` when at least one Pokémon was skipped (no default
  sprite), `0` otherwise – handy in CI.

### Keys and forms

Keys follow `src/common/pokemon-data.ts`: lowercase, punctuation stripped
(`mrrime`, `typenull`, `tapukoko`, `flabebe`), forms/gender appended with `_`:

| Source | Key |
| --- | --- |
| `585.png` (base_form `spring` in pokedex.json) | `deerling_spring` |
| `585-autumn.png` | `deerling_autumn` |
| `649-burn.png` | `genesect_burn` |
| `female/592.png` | `frillish_female` |
| `550.png` (base_form `red_striped`) | `basculin_red_striped` |

Forms that PokéAPI stores under internal ids (`10001+`) are not mapped
automatically. To add one, copy/rename the PNG to `<id>-<form>.png` (and
`shiny/<id>-<form>.png`) and re-run; the key becomes `<slug>_<form>`. This has
been done for ~70 popular forms (Therian trio, Kyurem Black/White, Hisuian and
Galarian forms of Gen 5+ species, Zygarde, Necrozma, Calyrex riders, Ogerpon
masks, …) – see `User Stories/US-06-*.md` for the list and the internal-id
mapping that was verified visually.

`"form_filter"` (a regex on the form suffix) in `pokedex.json` drops variants
that are pointless as separate sprites – e.g. Alcremie is limited to the nine
flavours with the strawberry sweet, and forms that are pixel-identical to the
base sprite (Xerneas Active, Silvally Normal, Sinistea/Polteageist Antique,
Poltchageist Artisan, Sinistcha Masterpiece) are skipped.

Use `--no-forms` / `--no-female` to only produce base sprites.

### Registering the result in the extension

1. Generate with `--manifest FILE`, then merge it:

   ```bash
   python3 scripts/sprites/generate_pokemon_gifs.py --gen 6 --manifest scripts/sprites/out/gen6.json
   python3 scripts/sprites/apply_to_pokemon_data.py --manifest scripts/sprites/out/gen6.json
   ```

   `apply_to_pokemon_data.py` updates existing entries in place (keeps their
   `name`/`cry`, rewrites `possibleColors` and `originalSpriteSize` to match
   the GIFs, drops `extraSprites: leftFacing` unless a hand-made
   `default_walk_left_8fps.gif` is present) and inserts new keys in Pokédex
   order with a `/* Generation N */` header for a new generation. It is
   idempotent and keeps the file's line endings. `--emit-ts FILE` is still
   available if you prefer to paste entries by hand.
2. Make sure `PokemonGeneration` in `src/common/types.ts` and `GENERATIONS` in
   `src/common/localize.ts` include the generation (Gen 6–9 are already there).
3. Translations: `python3 scripts/sprites/fetch_l10n_names.py --gen 6`
   (see below).
4. Verify: `npm run sprites:test` and `npm run test:media`.

## 4. Localized names

```bash
# online – downloads pokemon_species_names.csv from PokéAPI
python3 scripts/sprites/fetch_l10n_names.py --gen 6 --gen 7 --gen 8 --gen 9

# restrict to the keys actually generated, using the manifest from step 3
python3 scripts/sprites/fetch_l10n_names.py --gen 6 --manifest scripts/sprites/out/gen6-manifest.json

# offline – with a local copy of the CSV
python3 scripts/sprites/fetch_l10n_names.py --gen 6 --csv ~/Downloads/pokemon_species_names.csv
```

The keys come from `src/common/pokemon-data.ts` (every registered key of the
generation, forms included; `--manifest` restricts to one generator run).
Writes/merges `l10n/pokemon/{de-DE,fr-FR,ja-JP}/gen<N>.json`. Existing
(hand-edited) entries are kept; only missing keys are added (`--no-merge` to
overwrite). Common form labels (Female, Hisuian, Galarian, Therian, seasons,
Flabébé colours, Necrozma/Calyrex/Ogerpon forms, …) are translated from the
built-in `FORM_LABELS` table; anything else is emitted in English
(`"Vivillon (Fancy)"`) and listed at the end of the run so it can be
translated by hand – or add it to `FORM_LABELS` and re-run. The CSV is cached
in `scripts/sprites/out/` so re-runs work offline (`--refresh` re-downloads).

## 5. Tests

```bash
npm run sprites:test        # python -m pytest scripts/sprites/tests -q
npm run test:media          # compiles src/test and validates media/ <-> pokemon-data.ts
```

`test:media` is strict: every registered Pokémon must have its GIFs. On a
checkout that only contains some generations of `media/`, run it with
`POKEMON_MEDIA_ALLOW_MISSING=1` to turn "folder missing entirely" into a
warning (GIFs that *are* present are still fully validated).

## 6. Tuning / troubleshooting

| Symptom | Fix |
| --- | --- |
| Sprite looks too small/large next to its neighbours | set `"sprite_size": 32/64` for that id in `pokedex.json` (then `--force --ids <id>`), or tweak `--scale` / `--large-threshold` |
| Walk looks too bouncy / too static | `--walk-bounce 1` (px hop on 32 px canvas, default 2), `--walk-squash 0` (default 0.06), `--walk-lean 0` (degrees, default 4), `--walk-frames 8 --walk-frame-ms 50` for a smoother (but ~2× larger) loop |
| Pokémon walks backwards (faces away from its direction of travel) | the source faces right: set `"facing": "right"` for that id in `pokedex.json` and regenerate with `--force --ids <id>` |
| Prefer the old "hop" idle instead of breathing | `--idle-style shift` |
| Blurry outlines | `--resample nearest` (crisper, noisier) – default `box` |
| `SKIPPED #700 sylveon missing default sprite (700.png)` | add the PNG under `sprites/sprites/pokemon/` or run with `--download` |
| `test:media` fails with `exists but "shiny" is not in possibleColors` | the TypeScript entry is out of date – re-run with `--emit-ts` and update it |
