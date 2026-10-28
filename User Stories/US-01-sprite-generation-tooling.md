# US-01 – Sprite generation tooling

**As a** maintainer
**I want** a repeatable script that turns the static PNG sprites into the
`default/shiny` × `idle/walk` GIFs the extension loads
**so that** adding a generation is a command, not days of pixel editing.

## Acceptance criteria

- [x] `python3 scripts/sprites/generate_pokemon_gifs.py --ids 495` writes
      `media/gen5/snivy/{default,shiny}_{idle,walk}_8fps.gif` from
      `sprites/sprites/pokemon/495.png` and `shiny/495.png`.
- [x] Selection by `--ids` (list/ranges), `--start/--end`, `--gen`; ids < 494 are
      ignored (Gen 1–4 stay hand-made).
- [x] Output matches the existing asset contract: 32×32 canvas (64×64 for
      giants), transparent background, bottom-centre anchored, looping,
      `<color>_<state>_8fps.gif` naming, `media/gen<N>/<key>/` folders, keys
      following `pokemon-data.ts` conventions (`mrrime`, `deerling_autumn`,
      `frillish_female`).
- [x] Alternate forms (`<id>-<form>.png`) and female variants (`female/<id>.png`)
      are discovered automatically; `--no-forms` / `--no-female` opt out.
- [x] Existing GIFs are not overwritten unless `--force`.
- [x] Missing sources are reported (`SKIPPED …`), exit code 1, and can be
      fetched with `--download` (PokéAPI by default, any URL template).
- [x] `--manifest` JSON report and `--emit-ts` ready-to-paste
      `POKEMON_DATA_RAW` entries (`possibleColors` derived from produced files,
      `originalSpriteSize: 64` when applicable).
- [x] Output is deterministic (re-running produces identical bytes).
- [x] `pytest scripts/sprites/tests` covers naming, discovery, sizing, frame
      construction, GIF round-trip/transparency/cropping, CLI, download fallback
      and a smoke test on the real Gen 5 assets.
- [x] `npm run test:media` validates `media/` against `pokemon-data.ts`
      (GIF header, size vs `originalSpriteSize`, frame count, transparency,
      colours vs `possibleColors`, generation folder).
- [x] Documentation in `scripts/sprites/README.md`.

## Verification performed

```bash
python3 -m pip install -r scripts/sprites/requirements.txt
npm run sprites:test                                   # 41 passed
python3 scripts/sprites/generate_pokemon_gifs.py --ids 495,644,649 -v
POKEMON_MEDIA_ALLOW_MISSING=1 npm run test:media       # 4 passing (stripped checkout)
```

## Notes

* The sample run deliberately used Pokémon that had `possibleColors: []`
  upstream (Snivy, Zekrom, Genesect) so no hand-made asset is shadowed.
* Generated animations are synthetic (idle: breathe; walk: 8-frame bouncy
  gait with squash & stretch and a forward lean). Sprites face right so the
  extension's mirror-when-walking-left works. They are a solid
  baseline; any Pokémon can still be replaced by a hand-made GIF later – the
  generator will not touch existing files.
