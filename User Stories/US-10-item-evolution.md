# US-10 – Evolve Pokémon with items

**As a** user
**I want** to hand an evolution item to a Pokémon (Thunder Stone → Pikachu,
Auspicious Armor → Charcadet, …) and watch it evolve
**so that** raising my Pokémon feels like the games.

**Status: ✅ implemented** (in-editor pass pending).

## Acceptance criteria

- [x] `src/common/evolutions.ts` lists every "use item" evolution plus the
      trade-with-held-item ones (Metal Coat, King's Rock, Linking Cord, …):
      42 items, 91 evolutions, all between registered Pokémon
      (`evolutions.test.ts` verifies keys, uniqueness and that every
      evolution item evolves somebody).
- [x] Feeding flow: the Pokémon walks to the item as usual; if
      `findEvolution(type, item)` matches it freezes, flashes white
      (`evolution-flash`, 2.6 s), the sprites are swapped at the midpoint
      (`changeForm`: new `media/gen<N>/<key>/<color>` root, new
      `originalSpriteSize`, speech-bubble size class) and a sparkle + `EVOLVED!`
      text finish it off. Toasts: "What? Sparky is evolving!" →
      "Congratulations! Your Pikachu Sparky evolved into Raichu!".
- [x] Nickname, level, happiness and speed boost are kept; a shiny stays shiny
      when the evolved form has shiny sprites, otherwise it becomes default.
- [x] Persistence: the webview state stores the new type, and the webview posts
      `pokemon-evolved` so the extension rewrites the saved collection
      (`handlePokemonEvolved`) – the evolved Pokémon is what respawns in a new
      window.
- [x] An evolution item the Pokémon cannot use: `?` float text, toast "looks
      at it, puzzled... it has no effect.", no stat change.
- [x] Sweet Apple is both a treat (happiness) and Applin's evolution item;
      evolution wins when it applies.
- [x] `Feed pokemon` command: evolution items show which Pokémon they evolve;
      Pokémon that can evolve with the chosen item are listed first with
      `→ <evolution>`.
- [x] jsdom tests: Pikachu + Thunder Stone → Raichu (type, root, sprite src,
      state, messages), Bulbasaur + Thunder Stone → no effect, shiny Eevee +
      Water Stone → shiny Vaporeon.

## To verify in VS Code

1. Spawn Pikachu, choose Thunder Stone, Ctrl+click near it – flash, Raichu.
2. Reload the window: still Raichu (webview state) and, after "Remove all" +
   restart, the default collection respawns Raichu (memento).
3. Evolve into a 64 px species (Onix + Metal Coat → Steelix) and check the
   sprite size / speech bubble.
4. Spawn Eevee, give it each stone.

## Not covered (ideas)

* Level-based evolutions via Rare Candy (needs the level table).
* Regional evolutions that need a form not registered yet (Alolan Raichu,
  Galarian Slowbro/Slowking with the Galarica items).
* Gender-locked evolutions (Kirlia ♂ → Gallade, Snorunt ♀ → Froslass are
  allowed for everyone).
