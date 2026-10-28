# US-08 – CI, docs & release

**Status: 🟡** `.github/workflows/sprites.yml` (pytest + lint + `test:media`),
README/CHANGELOG/version 5.1.0 and the prettier fix are done; the `vsce
package` size check and the post-publish smoke test remain.

**As a** maintainer
**I want** the sprite tooling and asset checks to run automatically
**so that** a missing or mis-registered GIF can never reach the marketplace.

## Acceptance criteria

- [x] CI workflow runs `npm run sprites:test` (Python 3.x + `pip install -r
      scripts/sprites/requirements.txt`) and `npm run test:media` on every PR.
- [x] `npm run pretest` (compile + lint) still passes; the pre-existing prettier
      error in `src/extension/extension.ts` is fixed.
- [x] README:
  - "Features" paragraph updated (Gen 1–9 supported; Gen 5+ sprites are
    generated from static sprites, link to `scripts/sprites/README.md`).
  - Language note updated ("Translations are available for Generations 1–9").
  - Credits list PokéAPI/sprites (and pokemondb if used) as sprite sources.
- [x] CHANGELOG entry, `package.json` version bump (5.1.0).
- [ ] `vsce package` produces a `.vsix` without `sprites/`, `scripts/`,
      `User Stories/` (already in `.vscodeignore`) and the size increase is
      acceptable; `vscode-pokemon.gif` demo optionally refreshed with new
      Pokémon.
- [ ] Smoke test of the published build: spawn one Pokémon from each new
      generation, restart VS Code, confirm they are restored.
