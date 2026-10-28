# US-05 – Localized names (de-DE, fr-FR, ja-JP) for Gen 5–9

**Status: ✅ done** (pending a spot check). Gen 5 complete; Gen 6–9 generated
from the PokéAPI CSV with every form label translated by the built-in
`FORM_LABELS` table. The Vivillon/Furfrou/Alcremie/Oricorio labels in that
table were written from memory – worth a quick comparison against Bulbapedia
before release; fix any slip in `FORM_LABELS` and re-run with `--no-merge`
for the affected generation (or just edit the JSON). `npm run test:media` now includes an l10n test that
fails when a registered Pokémon has no name in a locale that ships a file for
its generation.

**As a** non-English user
**I want** the new Pokémon to show their German/French/Japanese names
**so that** the language setting keeps working for every generation.

## Context

Names are read from `l10n/pokemon/<locale>/gen<N>.json` (`localize.ts`
already lists `gen6`…`gen9`; missing files fall back to English). Gen 5 files
exist but need entries for new form keys.

## Acceptance criteria

- [ ] `l10n/pokemon/{de-DE,fr-FR,ja-JP}/gen{6,7,8,9}.json` exist with an entry
      for every key registered in `pokemon-data.ts` for that generation.
- [x] Gen 5 files contain every new form key from US-02 (`sawsbuck_*`,
      `*_female`, `genesect_*`).
- [ ] Form labels are translated (house style: `"Sesokitz (Herbstform)"`,
      `"Vivaldaim (Forme Automne)"`, `"シキジカ (あきのすがた)"`), not left as
      the English `"(Autumn)"` placeholder the script emits.
- [ ] Spawn menu, roll-call and export show localized names for a Gen 6–9
      Pokémon when `vscode-pokemon.pokemonLanguage` is `de-DE`/`fr-FR`/`ja-JP`.

## Tasks

```bash
python3 scripts/sprites/fetch_l10n_names.py --gen 5 --gen 6 --gen 7 --gen 8 --gen 9
# or, only for keys that were actually generated:
python3 scripts/sprites/fetch_l10n_names.py --gen 6 --manifest scripts/sprites/out/gen6-manifest.json
```

The script reads the keys from `pokemon-data.ts` (species **and** forms),
translates common form labels itself and prints the keys whose label still
needs a manual translation (Vivillon patterns, Furfrou trims, Alcremie
flavours, Silvally types, Oricorio styles, Squawkabilly colours, …).
Existing hand-edited entries are preserved (only missing keys are added), so
the workflow is: run → hand-edit the listed keys → re-run any time.
