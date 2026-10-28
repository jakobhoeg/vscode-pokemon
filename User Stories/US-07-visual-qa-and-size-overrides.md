# US-07 – Visual QA & sprite size overrides

**Status: ✅ done.** Gen 5–9 reviewed on contact sheets (688 folders: facing,
clipping, relative size). Outcome: Terapagos back to 32 px; pixel-identical
forms filtered (`form_filter`); everything faces right. In-editor checks at
the four sizes / both views remain a good idea before publishing.

**As a** maintainer
**I want** every generated sprite reviewed in the editor once
**so that** sizing, anchoring and animation look consistent with Gen 1–4.

## Acceptance criteria

- [ ] A contact sheet / roll-call of each new generation has been reviewed at
      `medium` size in the explorer view and the panel (dark + light theme,
      and with a background theme such as `forest`).
- [ ] Giants are on the 64 px canvas and everyday Pokémon on 32 px. Overrides
      live in `scripts/sprites/pokedex.json` (`"sprite_size": 32|64`) and the
      matching `originalSpriteSize` in `pokemon-data.ts`; after changing an
      override regenerate that id with `--force --ids <id>`.
- [ ] No sprite is clipped (content touching the canvas edge) or floating
      (feet not on the floor). The generator anchors bottom-centre with a 1 px
      margin – report exceptions as bugs in the script with the id.
- [ ] Shiny and default of the same Pokémon have identical size/position
      (both are scaled from the default sprite's bounding box – if a shiny
      source has a different crop it will show; fix the source PNG).
- [ ] Walk animation direction looks right when flipped (the extension mirrors
      the GIF with `scaleX(-1)` for walking left). Asymmetric designs that look
      wrong mirrored can get a hand-made `default_walk_left_8fps.gif` +
      `extraSprites: [PokemonExtraSprite.leftFacing]` like Heatmor/Meloetta.
- [ ] Any globally better defaults found during review (`--scale`,
      `--large-threshold`, `--walk-bounce/--walk-squash/--walk-lean`,
      `--idle-style`, `--resample`) are
      made the script defaults and documented in `scripts/sprites/README.md`.

## Tasks

```bash
# which Pokémon would land on the 64px canvas if the size heuristic were enabled
# (content >= 88px in the 96px source) – a good list of candidates to review
python3 scripts/sprites/generate_pokemon_gifs.py --start 494 --end 1025 --dry-run \
  --large-threshold 88 --manifest scripts/sprites/out/size-review.json
python3 -c "import json; m=json.load(open('scripts/sprites/out/size-review.json')); \
  print([r['key'] for r in m['generated'] if r['sprite_size']==64])"
```
