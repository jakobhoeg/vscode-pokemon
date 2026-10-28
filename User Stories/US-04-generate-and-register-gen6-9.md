# US-04 – Generate & register Generations 6–9 (#650–#1025)

**Status: ✅ done.** `media/gen6` … `media/gen9` (499 folders) generated and
merged with `apply_to_pokemon_data.py`; `npm run test:media` passes for every
generated folder. Remaining: l10n files (US-05) and the package-size check
(US-08).

**As a** user
**I want** to spawn Kalos, Alola, Galar/Hisui and Paldea Pokémon
**so that** the whole national dex is available.

## Acceptance criteria

- [ ] `media/gen6` … `media/gen9` contain `<key>/{default,shiny}_{idle,walk}_8fps.gif`
      for every id 650–1025 (`possibleColors` may be `[default]` only where a
      shiny source is genuinely missing).
- [ ] `src/common/pokemon-data.ts` has `/* Generation 6 */` … `/* Generation 9 */`
      blocks with one entry per generated key, in Pokédex order, using the
      `--emit-ts` output (names as in `pokedex.json`, e.g. `Mr. Rime`,
      `Type: Null`, `Flabébé`, `Great Tusk`).
- [ ] Large canvas (`originalSpriteSize: 64`) is used for the ids marked
      `"sprite_size": 64` in `pokedex.json` (box legendaries: Xerneas, Yveltal,
      Zygarde, Solgaleo, Lunala, Necrozma, Celesteela, Guzzlord, Zacian,
      Zamazenta, Eternatus, Koraidon, Miraidon, Terapagos). Everything else is
      32 px unless US-07 adds an override.
- [ ] The "Spawn additional pokemon" quick-pick shows *Generation 6 … 9* with
      the new Pokémon; random spawn / `defaultPokemon` `pool` accept the new
      keys.
- [ ] `npm run test:media` passes (strict); `npm run compile` and
      `npm run lint` pass.
- [ ] Extension package size checked (`vsce package`): ~530 × 4 GIFs ≈ 2–8 KB
      each – confirm the `.vsix` stays acceptable; `.vscodeignore` already
      excludes `sprites/` and `scripts/`.

## Tasks

```bash
for g in 6 7 8 9; do
  python3 scripts/sprites/generate_pokemon_gifs.py --gen $g --download \
    --manifest scripts/sprites/out/gen$g.json
  python3 scripts/sprites/apply_to_pokemon_data.py --manifest scripts/sprites/out/gen$g.json
done
npm run test:media
```

1. `apply_to_pokemon_data.py` inserts the new entries with `/* Generation N */`
   headers and the right `originalSpriteSize`.
2. Review the contact sheets (US-07) – in particular any Pokémon that walks
   backwards needs `"facing": "right"` in `pokedex.json` and a `--force` rerun.
3. Update README (supported generations, language note) and CHANGELOG, run
   `fetch_l10n_names.py` (US-05).
