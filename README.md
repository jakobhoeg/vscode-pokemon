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
      "name": "Flame",
      "replacementInterval": 15
    },
    {
      "type": "articuno"
    }
  ]
}
```

- **`type`** (required): The Pokémon species (e.g., `"pikachu"`, `"charizard"`, `"mewtwo"`)
- **`name`** (optional): A custom name for your Pokémon. If not provided, a random name will be assigned
- **`replacementInterval`** (optional): How long (in minutes) before this Pokémon is automatically replaced with a random one. Set to `0` or omit to never replace automatically

**Note:** The extension automatically saves your current Pokémon between sessions. The `defaultPokemon` setting is only used when:
- You start the extension for the first time
- You open a new windows/repository
- You have removed all Pokémon (no saved session exists)

To reset to your default Pokémon, use the "Remove all pokemon" command and restart VS Code.

### Automatic Replacement

You can configure Pokémon to automatically replace themselves with random ones after a specified time interval. This feature adds variety to your coding sessions!

#### Global Default Replacement Interval
Set a default replacement interval for all newly spawned Pokémon:

```json
{
  "vscode-pokemon.defaultReplacementInterval": 30
}
```

This setting controls the default interval (in minutes) for automatic replacement. Set to `0` to disable automatic replacement by default.

#### Per-Pokémon Replacement Intervals
When spawning individual Pokémon, you'll be prompted to set a custom replacement interval, or you can configure them in your default Pokémon list (see above).

#### Replacement Notifications
Control whether you see notifications when Pokémon are automatically replaced:

```json
{
  "vscode-pokemon.showReplacementMessages": false
}
```

Set to `false` to disable replacement notification messages. Default is `true` (notifications enabled).

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
