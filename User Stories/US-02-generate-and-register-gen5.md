# US-02 – Generate & register Generation 5 (#494–#649)

**Status: ✅ done** – `python3 scripts/sprites/generate_pokemon_gifs.py --gen 5 --manifest scripts/sprites/out/gen5.json`
+ `python3 scripts/sprites/apply_to_pokemon_data.py --manifest scripts/sprites/out/gen5.json`.
See the progress log in `README.md` for the caveats (hand-made upstream
sprites, `extraSprites`, Basculin blue-striped).

**As a** user
**I want** every Unova Pokémon (with shinies) available in the spawn menu
**so that** Generation 5 is complete instead of "partial".

## Context

`pokemon-data.ts` already contains stubs for all Gen 5 Pokémon; many have
`possibleColors: []` (not spawnable) or `[PokemonColor.default]` (hand-made
default only, no shiny). Both default and shiny sources exist for the whole
generation in `sprites/sprites/pokemon`.

## Acceptance criteria

- [x] `media/gen5/<key>/` exists for every Gen 5 key with default + shiny,
      idle + walk GIFs.
- [ ] Hand-made Gen 5 GIFs that already exist upstream are kept (the generator
      only fills gaps – do **not** use `--force` for this story). Decide per
      Pokémon whether the hand-made default + generated shiny mismatch is
      acceptable; if not, regenerate that Pokémon with `--force --ids <id>`.
- [x] Every Gen 5 entry in `pokemon-data.ts` has `possibleColors` matching the
      files on disk and `originalSpriteSize: 64` where the generator chose the
      large canvas (Reshiram, Zekrom, Kyurem by default).
- [x] Form keys produced from the sources are registered: `deerling_*`,
      `sawsbuck_*` (spring/summer/autumn/winter), `genesect_*` (burn/chill/
      douse/shock), `frillish_female`, `jellicent_female`, `unfezant_female`.
- [x] `npm run test:media` passes (with `POKEMON_MEDIA_ALLOW_MISSING=1` on this
      stripped checkout – the only Gen 5 folder missing is `basculin_blue_striped`).
- [x] README "Features" paragraph no longer says Gen 5 is partial; CHANGELOG
      entry added.

## Tasks

```bash
python3 scripts/sprites/generate_pokemon_gifs.py --gen 5 -v \
  --manifest scripts/sprites/out/gen5-manifest.json \
  --emit-ts  scripts/sprites/out/gen5-entries.txt
```

1. Paste/merge `gen5-entries.txt` into the `/* Generation 5 */` block of
   `src/common/pokemon-data.ts` (keep existing `extraSprites` such as
   `leftFacing` for Pokémon that have a hand-made `default_walk_left_8fps.gif`).
2. `npm run test:media`, fix mismatches.
3. Spot-check ~10 Pokémon in VS Code at nano/small/medium/large.

## Out of scope

Basculin blue-striped (`550-blue-striped` is not in the source set – see US-06),
Darmanitan Zen, Therian forms, Kyurem Black/White, Keldeo Resolute, Meloetta
Pirouette (PokéAPI stores these under internal ids – US-06).
