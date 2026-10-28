# US-03 – Source default (non-shiny) sprites for Gen 6–9

**Status: ✅ done.** The complete PokéAPI front-sprite set (defaults, shinies,
females, form suffixes and internal ids 10001+) is now checked in under
`sprites/sprites/pokemon/`; `--dry-run --start 650 --end 1025` reports no
missing defaults.

**As a** maintainer
**I want** the default front sprites for #650–#1025 in
`sprites/sprites/pokemon/<id>.png`
**so that** the generator can produce Gen 6–9 (currently only the shinies are
checked in, so every Gen 6–9 Pokémon is reported as `SKIPPED … missing default
sprite`).

## Acceptance criteria

- [ ] `sprites/sprites/pokemon/<id>.png` exists for every id 650–1025 (and for
      the form files whose shiny counterpart exists, e.g. `666-*.png`,
      `669-*.png`, `676-*.png`, `716-*.png`, `773-*.png`, `869-*.png`,
      `1012-artisan.png`, `1013-masterpiece.png`).
- [ ] Sprites are transparent PNGs in the same style/scale as the shinies
      (96×96 PokéAPI front sprites) so default and shiny line up – the
      generator derives canvas and scale from the **default** sprite.
- [ ] `python3 scripts/sprites/generate_pokemon_gifs.py --start 650 --end 1025 --dry-run`
      reports `skipped: 0`.
- [ ] Licensing note in README "Credits" covers the source used.

## Tasks

Option A – PokéAPI (same origin as the shinies, recommended):

```bash
python3 scripts/sprites/generate_pokemon_gifs.py --start 650 --end 1025 --download --dry-run
```

Option B – pokemondb.net (https://pokemondb.net/sprites): download the PNGs
manually or via a URL template, e.g.

```bash
python3 scripts/sprites/generate_pokemon_gifs.py --start 650 --end 1025 --download \
  --download-url "https://img.pokemondb.net/sprites/<game>/normal/{slug}.png" --dry-run
```

(`{slug}` is the lowercase key, e.g. `sylveon`; pokemondb uses hyphenated
names for some species such as `mr-rime`, `type-null`, `tapu-koko` – rename or
map those by hand.)

Commit the PNGs under `sprites/sprites/pokemon/`.
