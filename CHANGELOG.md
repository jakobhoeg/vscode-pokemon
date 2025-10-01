# Change Log

All notable changes to the "vscode-pokemon" extension will be documented in this file.

## [Unreleased]

## [Unreleased]

- Add public API to delete Pokémon by type (`deletePokemonByType`)
- Add unit tests for delete-by-type and delete-by-name actions
- Add debug logging to all auto-spawn actions
- Add new auto-spawn feature: automatically spawn Pokémon on a timer with configurable behaviors:
	- `evolve`: Try to evolve an existing Pokémon
	- `replace`: Replace a random Pokémon with a new one
	- `random`: Randomly choose between evolve or replace
	- `doNothing`: Take no action when the collection is full
	- `evolve_or_replace`: Randomly choose between evolve or replace (explicit option)
	- `evolve_then_replace`: Try to evolve, and if not possible, replace
- Add support for multiple/branching evolutions (e.g., Eevee)
- Add configurable auto-spawn: enable/disable, interval (in seconds), max Pokémon, and generation filtering
- Adds evolution logic, with support for multiple evolutions
- Update README with auto-spawn settings, migration notes, and examples
- Add release notes for new features and migration
- Minor bugfixes and refactors

## [3.1.1]

- chore: update readme

## [3.1.0]

- fix: stop randomly and change direction
- fix: make default size medium

## [3.0.1]

- fix: pixelate bubbles

## [3.0.0]

- feat: add generation 3 Pokémon

## [2.0.3]

- fix: add Celebi + fix Ho-Oh id

## [2.0.2]

- fix: use pixelate image rendering

## [2.0.1]

- fix: Entei typo

## [2.0.0]

- feat: add generation 2 Pokemon

## [1.1.0]

- feat: add functionality for adding a random Pokemon

## [1.0.2]

- fix: added missing Victreebel & Omastar

## [1.0.1]

- Bump version to reflex changes to readme

## [1.0.0]

- Added all 1st generation Pokémon.
