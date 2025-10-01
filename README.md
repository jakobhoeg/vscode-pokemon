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

![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/jakobhoeg.vscode-pokemon)
![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/jakobhoeg.vscode-pokemon)
![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/jakobhoeg.vscode-pokemon)

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

## 💖 Support

If you enjoy this project, please consider supporting me.
Manually creating the `.gif` files for each sprite takes a lot of time and effort.
Your sponsorship helps me dedicate more energy to improve and expand the project.

[![GitHub Sponsor](https://img.shields.io/badge/Sponsor-❤-blue?style=flat&logo=github)](https://github.com/sponsors/jakobhoeg)

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

## Changing settings

Open the setting panel with Ctrl+, on Windows/Linux or Cmd(⌘)+, on MacOS. In the search bar, enter “vscode-pokemon" to see all available options.

Set the size and position of the extension.

## Auto-spawn settings (automatic Pokémon)


The extension can automatically spawn Pokémon on a timer. All auto-spawn features and behaviors are new in this release. Configure these under the `vscode-pokemon.autoSpawn` settings:

- `vscode-pokemon.autoSpawn.enabled` (boolean) — Enable automatic spawning.
- `vscode-pokemon.autoSpawn.interval` (number, seconds) — Time in seconds between automatic spawn checks. Default: 20.
- `vscode-pokemon.autoSpawn.maxPokemon` (number) — Maximum number of Pokémon allowed. When the number of spawned Pokémon reaches this value, the extension will apply the configured behavior. Default: 6.
- `vscode-pokemon.autoSpawn.generations` (array of numbers) — Which Pokémon generations to spawn from (1, 2, 3). Empty array means all generations.
- `vscode-pokemon.autoSpawn.behavior` (string) — What to do when `maxPokemon` is reached. Options:
  - `evolve`: Try to evolve an existing Pokémon
  - `replace`: Replace a random Pokémon with a new one
  - `random`: Randomly choose between evolve or replace
  - `doNothing`: Take no action when the collection is full
  - `evolve_or_replace`: Randomly choose between evolve or replace (explicit option)
  - `evolve_then_replace`: Try to evolve, and if not possible, replace

Other new features:
- Support for multiple/branching evolutions (e.g., Eevee)
- Generation filtering for auto-spawn
- Debug logging for all auto-spawn actions


Example scenarios
- Keep a small, evolving collection: set `maxPokemon` to `3` and `behavior` to `evolve_then_replace`. The extension will try to evolve first and only replace when evolution isn't possible.
- Fast frequent spawns: set `autoSpawn.interval` to `60` (60 seconds) and `maxPokemon` to `6`. Use `replace` if you want the collection to frequently refresh with new types.
- Leave the collection intact after it fills: set `behavior` to `doNothing` so the extension never removes or evolves Pokémon once the limit is reached.

## Upcoming features

Extracting and creating .gif files involves quite a bit of tedious manual work, but I’ll aim to add Gen 4 soon!

## Credits

### Sprite Sources
- Pokemon Sprites: © The Pokémon Company / Nintendo / Game Freak
- The sprites are used for non-commercial, fan project purposes only
- Original sprite artwork belongs to the respective copyright holders

### Acknowledgments
- All sprites are property of their original creators
- This repository is a fan project and is not affiliated with Nintendo, The Pokémon Company, or Game Freak

This repository is inspired by and based on [vscode-pets](https://github.com/tonybaloney/vscode-pets) by [tonybaloney](https://github.com/tonybaloney).
