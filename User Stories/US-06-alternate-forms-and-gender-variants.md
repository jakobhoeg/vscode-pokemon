# US-06 – Alternate forms & gender variants

**Status: ✅ done.** Every `<id>-<form>.png` / `female/<id>.png` variant for
Gen 5–9 is shipped, plus these PokéAPI internal ids, which were copied to
`<dex>-<form>.png` (+ shiny) after verifying each image on a contact sheet:

10016→#550 blue-striped, 10017→#555 zen, 10018→#648 pirouette, 10019→#641 therian, 10020→#642 therian, 10021→#645 therian, 10022→#646 black, 10023→#646 white, 10024→#647 resolute, 10026→#681 blade, 10061→#670 eternal, 10075→#719 mega, 10087→#720 unbound, 10117→#658 ash, 10118→#718 10, 10119→#718 50-pc, 10120→#718 complete, 10123→#741 pom-pom, 10124→#741 pau, 10125→#741 sensu, 10126→#745 midnight, 10127→#746 school, 10143→#778 busted, 10147→#801 original, 10152→#745 dusk, 10155→#800 dusk-mane, 10156→#800 dawn-wings, 10157→#800 ultra, 10176→#554 galar, 10177→#555 galar, 10178→#555 galar-zen, 10179→#562 galar, 10180→#618 galar, 10182→#845 gulping, 10183→#845 gorging, 10184→#849 low-key, 10185→#875 noice, 10187→#877 hangry, 10188→#888 crowned, 10189→#889 crowned, 10190→#890 eternamax, 10191→#892 rapid-strike, 10192→#893 dada, 10193→#898 ice-rider, 10194→#898 shadow-rider, 10237→#503 hisui, 10238→#549 hisui, 10239→#570 hisui, 10240→#571 hisui, 10241→#628 hisui, 10242→#705 hisui, 10243→#706 hisui, 10244→#713 hisui, 10245→#724 hisui, 10248→#550 white-striped, 10249→#902 female, 10250→#905 therian, 10256→#982 three-segment, 10257→#964 hero, 10258→#925 family-of-three, 10259→#978 droopy, 10260→#978 stretchy, 10261→#931 blue, 10262→#931 yellow, 10263→#931 white, 10272→#1017 wellspring, 10273→#1017 hearthflame, 10274→#1017 cornerstone, 10275→#1024 terastal, 10276→#1024 stellar

Skipped on purpose: Greninja Battle Bond (identical to base), Pumpkaboo/
Gourgeist sizes, Minior colours, Totem forms, Gigantamax, Megas of Gen 1–4
species and regional forms of Gen 1–4 species (those live in the hand-made
generations – see note below). Gimmighoul Roaming and Ursaluna Bloodmoon were
not in the sprite set.

**As a** user
**I want** notable alternate forms (seasonal, regional, Therian, Drives, Vivillon
patterns, Alcremie flavours, female variants …)
**so that** the collection matches the variety Gen 1–4 already offer
(`unown_*`, `rotom_*`, `arceus_*`, `*_female`).

## Context

The generator handles two layouts automatically:

* `<id>-<form>.png` → key `<slug>_<form>` (e.g. `666-fancy.png` → `vivillon_fancy`)
* `female/<id>.png` → `<slug>_female`

PokéAPI stores many forms under internal ids (`10001+`, e.g. Therian Tornadus,
Alolan/Galarian/Hisuian forms, Megas, Kyurem Black/White, Zygarde 10%/Complete).
Those are **not** mapped automatically (the `forms.json` in `sprites/scripts`
only covers some of them).

## Acceptance criteria

- [ ] Decide the list of forms to ship (suggested: everything with a
      `<id>-<form>.png` source, all `female/` variants, plus the popular
      internal-id forms: Therian trio, Kyurem Black/White, Zygarde Complete,
      Lycanroc Midnight/Dusk, Necrozma Dusk Mane/Dawn Wings, Toxtricity Low
      Key, Urshifu Rapid Strike, Calyrex Ice/Shadow Rider, regional forms of
      Gen 1–4 species).
- [ ] For each internal-id form: copy `sprites/sprites/pokemon/<internal>.png`
      (and `shiny/<internal>.png`) to `<dex>-<form>.png` / `shiny/<dex>-<form>.png`,
      so the generator yields `<slug>_<form>`. Regional forms of Gen 1–4
      species (e.g. `19-alola.png`) are below #494 and therefore need to be
      generated with an explicit pokedex entry – extend `pokedex.json` with
      those ids or hand-make them like the rest of Gen 1–4.
- [ ] Keys are registered with a display name `"<Name> (<Form>)"` and a
      translated l10n entry (US-05).
- [ ] Very wide/large forms (e.g. Zygarde Complete, Eternamax) are checked for
      canvas size (US-07).
- [ ] `npm run test:media` passes.

## Notes

* Alcremie has 63 flavour×sweet combinations in the source set; shipping all
  of them is allowed but consider limiting to the 9 flavours with the
  strawberry sweet to keep the spawn list usable.
* Gender differences that are purely cosmetic in a few pixels (e.g. Pyroar,
  Meowstic, Indeedee are *not* minor – keep those) can be skipped with
  `--no-female` for a first pass.
