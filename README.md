<div align='center'>

# VS Code Pokémon

![icon](https://github.com/jakobhoeg/vscode-pokemon/raw/main/icon.png)
</div>

<p align="center">
    Puts cute Pokémon in your code editor to boost productivity ✨
    <br>
    <br>
    <a href="https://github.com/jakobhoeg/vscode-pokemon/issues/new?assignees=&labels=feature&template=bug_report.md&title=">Report a Bug</a>
    ·
    <a href="https://github.com/jakobhoeg/vscode-pokemon/issues/new?assignees=&labels=feature&template=feature_request.md&title=">Request feature</a>
</p>

<div align="center">

![Visual Studio Marketplace Version](https://vsmarketplacebadges.dev/version-short/jakobhoeg.vscode-pokemon.png)
![Visual Studio Marketplace Installs](https://vsmarketplacebadges.dev/installs-short/jakobhoeg.vscode-pokemon.png)
![Visual Studio Marketplace Downloads](https://vsmarketplacebadges.dev/downloads-short/jakobhoeg.vscode-pokemon.png)

</div>

<div align="center">
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://github.com/jakobhoeg/vscode-pokemon/raw/main/vscode-pokemon.gif">
  <source media="(prefers-color-scheme: light)" srcset="https://github.com/jakobhoeg/vscode-pokemon/raw/main/vscode-pokemon-light.gif">
  <img alt="Shows gif in dark or light mode" src="https://github.com/jakobhoeg/vscode-pokemon/raw/main/vscode-pokemon-light.gif">
</picture>
</div>

<div align="center">

Seen used by engineers at [Microsoft](https://code.visualstudio.com/updates/v1_101#_chat-ux-improvements)!

</div>

## Installation

Install this extension from the [VS Code marketplace](https://marketplace.visualstudio.com/items?itemName=jakobhoeg.vscode-pokemon) or the [Open VSX Registry](https://open-vsx.org/extension/jakobhoeg/vscode-pokemon).

![Default view](https://github.com/jakobhoeg/vscode-pokemon/raw/main/install.png)

OR

With VS Code open, search for `vscode-pokemon` in the extension panel (`Ctrl+Shift+X` on Windows/Linux or `Cmd(⌘)+Shift+X` on MacOS) and click install.

OR

With VS Code open, launch VS Code Quick Open (`Ctrl+P` on Windows/Linux or `Cmd(⌘)+P` on MacOS), paste the following command, and press enter.

`ext install jakobhoeg.vscode-pokemon`

## Using VS Code Pokémon

After installing, open the command palette with `Ctrl+Shift+P` on Windows/Linux or `Cmd(⌘)+Shift+P` on MacOS.

Run the "Start Pokemon coding session" command (`vscode-pokemon.start`) to see a Bulbasaur in VS Code:

![Default view](https://github.com/jakobhoeg/vscode-pokemon/raw/main/usage.png)

Enjoy interacting with your favourite Pokémon!

## Keyboard Shortcuts

VS Code Pokémon comes with default keyboard shortcuts to make managing your Pokémon quick and easy:

![Keybindings](https://github.com/jakobhoeg/vscode-pokemon/raw/main/keybindings.png)

### Configuring Keyboard Shortcuts

You can customize these shortcuts to match your preferences:

1. Open the command palette (`Ctrl+Shift+P` on Windows/Linux or `Cmd(⌘)+Shift+P` on MacOS)
2. Run the **`Pokemon Coding: Configure keybindings`** command
3. Select the command you want to customize
4. VS Code will open the Keyboard Shortcuts editor filtered to that command
5. Click the pencil icon next to the command and press your desired key combination

## Changing settings

Open the setting panel with Ctrl+, on Windows/Linux or Cmd(⌘)+, on MacOS. In the search bar, enter “vscode-pokemon" to see all available options.

Set the size and position of the extension.

### Default Pokémon

You can configure specific Pokémon to automatically appear when you first start using the extension. This is useful for setting up your preferred team without having to manually spawn them when you open new windows.

To configure default Pokémon, add the following to your `settings.json`:

```json
{
  "vscode-pokemon.defaultPokemon": [
    {
      "type": "pikachu",
      "name": "Sparky"
    },
    {
      "type": "charizard",
      "name": "Flame"
    },
    {
      "type": "articuno"
    },
    {
      "type": "mewtwo",
      "shiny": true
    },
    {
      "type": "random"
    },
    {
      "type": "random",
      "pool": ["pikachu", "eevee", "gengar", "snorlax"]
    }
  ]
}
```

- **`type`** (required): The Pokémon species (e.g., `"pikachu"`, `"charizard"`, `"mewtwo"`), or `"random"` to spawn a random species
- **`name`** (optional): A custom name for your Pokémon. If not provided, a random name will be assigned
- **`shiny`** (optional): Determines if the Pokémon is shiny, if not set will use `vscode-pokemon.shinyOdds` setting.
- **`pool`** (optional): Only used when `type` is `"random"`. Restricts the random selection to this list of species. Invalid entries are dropped with a warning; if none are valid, selection falls back to any Pokémon.

**Note:** The extension automatically saves your current Pokémon between sessions. The `defaultPokemon` setting is only used when:
- You start the extension for the first time
- You open a new windows/repository
- You have removed all Pokémon (no saved session exists)

A `"random"` entry is resolved to a specific species the first time it's applied, then saved like any other Pokémon — reopening the window won't re-roll it, only removing all Pokémon will.

To reset to your default Pokémon, use the "Remove all pokemon" command and restart VS Code.

### Feeding your Pokémon

Your Pokémon get hungry! **Ctrl+click** (**Cmd+click** on macOS) anywhere in the Pokémon view to drop the selected item – it falls to the floor and the closest Pokémon runs over to eat it. Ctrl+click directly on a Pokémon to feed that one.

The item in the top-right corner of the view is what you're currently holding; click it (or run **`Pokemon Coding: Choose item to feed`**) to pick something else from the bag:

| Category | Items | Effect |
| --- | --- | --- |
| Candy | Rare Candy, Exp. Candy XS / L | Level up (+1 / +1 / +3) with a sparkle |
| Medicine | Potion … Full Restore, Revive, Max Revive | A healing flash |
| Berries | Oran, Sitrus, Pecha, Cheri, Lum, Leppa, Razz, Pinap | Happiness up |
| Treats | Lava Cookie, Old Gateau, Casteliacone, Lumiose Galette, Shalour Sable, Big Malasada, Pewter Crunchies, Rage Candy Bar, Sweet Heart, Moomoo Milk, Lemonade, Soda Pop, Fresh Water, Honey, Sweet Apple | Happiness up (more) |
| Vitamins | Carbos, Protein, Iron, Calcium, Zinc, HP Up | Carbos makes them permanently faster (up to 1.5×); the rest are a stat-up cheer |
| Evolution items | Fire/Water/Thunder/Leaf/Moon/Sun/Shiny/Dusk/Dawn/Ice Stone, Auspicious & Malicious Armor, Sweet/Tart/Syrupy Apple, Cracked/Chipped Pot, teacups, Black Augurite, Peat Block, Leader's Crest, Scrolls, Metal Coat, King's Rock, Dragon Scale, Up-Grade, Dubious Disc, Protector, Electirizer, Magmarizer, Reaper Cloth, Deep Sea Tooth/Scale, Razor Claw/Fang, Prism Scale, Whipped Dream, Sachet, Linking Cord, Strawberry Sweet | **Evolution!** |

#### Evolution

Give a Pokémon the right item and it evolves, right there in the view: a Thunder Stone turns Pikachu into Raichu, Auspicious Armor turns Charcadet into Armarouge (Malicious Armor → Ceruledge), a Water Stone makes Eevee a Vaporeon, a Linking Cord evolves Kadabra/Machoke/Graveler/Haunter, and so on – 90+ item evolutions are covered (`src/common/evolutions.ts`). The Pokémon keeps its nickname, level, happiness and shininess; the evolved form is saved so it's still evolved next time you open VS Code. Items a Pokémon can't use have no effect. In the **Feed pokemon** command, Pokémon that can evolve with the chosen item are listed first with their evolution.

Level, happiness and speed are remembered between sessions and shown in the **Roll-call**. You can also feed from the keyboard with **`Pokemon Coding: Feed pokemon`** (`Alt+Shift+F`), which lets you pick the item and the Pokémon. Settings: `vscode-pokemon.feedItem` (the held item) and `vscode-pokemon.feedWithMouse` (turn Ctrl+click off).

### Pokémon Language

You can customize the language used for Pokémon names. The extension supports official Pokémon languages: English (US), French, German, and Japanese.

#### Using the Command

1. Open the command palette (`Ctrl+Shift+P` on Windows/Linux or `Cmd(⌘)+Shift+P` on MacOS)
2. Run the **`Pokemon Coding: Change Pokemon language`** command
3. Select your preferred language from the list

#### Using Settings

You can also configure the language directly in your `settings.json`:

```json
{
  "vscode-pokemon.pokemonLanguage": "fr-FR"
}
```

Available options:
- **`auto`** (default): Automatically uses VS Code's language setting
- **`en-US`**: English (US) names
- **`fr-FR`**: French names (e.g., "Bulbizarre", "Salamèche", "Dracaufeu")
- **`de-DE`**: German names (e.g., "Bisasam", "Glumanda", "Glurak")
- **`ja-JP`**: Japanese names (e.g., "フシギダネ", "ヒトカゲ", "リザードン")

**Note:** The language setting applies to all Pokémon names throughout the extension, including in the spawn selection menu, roll-call, and export features. Translations are available for all Pokémon from Generations 1–5; later generations fall back to English until their `l10n/pokemon/<locale>/gen<N>.json` files exist.

## Features

All nine generations are available – #001 Bulbasaur to #1025 Pecharunt, with shinies, gender variants and ~150 alternate forms (seasons, Drives, Vivillon patterns, Therian/Hisuian/Galarian forms, Necrozma, Calyrex riders, Ogerpon masks, …). Generations 1–4 are hand-made from overworld sprites; from Generation 5 (#494 Victini) onwards the idle/walk GIFs are **generated** from static front sprites with `scripts/sprites/generate_pokemon_gifs.py` – see [`scripts/sprites/README.md`](scripts/sprites/README.md) for how to run it and [`User Stories/`](User%20Stories/README.md) for the work log.

```bash
pip install -r scripts/sprites/requirements.txt
npm run sprites:generate -- --ids 495,644,649   # -> media/gen5/<key>/*.gif
npm run sprites:test                            # unit tests for the generator
npm run test:media                              # media/ <-> pokemon-data.ts consistency
```

## Credits

### Sprite Sources
- Pokemon Sprites: © The Pokémon Company / Nintendo / Game Freak
- Generation 5+ sprites are generated from the static front sprites collected by [PokéAPI/sprites](https://github.com/PokeAPI/sprites)
- The sprites are used for non-commercial, fan project purposes only
- Original sprite artwork belongs to the respective copyright holders

### Acknowledgments
- All sprites are property of their original creators
- This repository is a fan project and is not affiliated with Nintendo, The Pokémon Company, or Game Freak

This repository is inspired by and based on [vscode-pets](https://github.com/tonybaloney/vscode-pets) by [tonybaloney](https://github.com/tonybaloney).
