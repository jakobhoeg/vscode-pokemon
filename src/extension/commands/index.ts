import * as vscode from 'vscode';
import { CommandDeps } from './types/index';
import { registerChangePokemonLanguageCommand } from './change-pokemon-language.command';
import { registerConfigureKeybindingsCommand } from './configure-keybindings.command';
import { registerExportPokemonListCommand } from './export-pokemon-list.command';
import { registerDeletePokemonCommand } from './delete-pokemon.command';
import { registerImportPokemonListCommand } from './import-pokemon-list.command';
import { registerRemoveAllPokemonCommand } from './remove-all-pokemon.command';
import { registerRollCallCommand } from './roll-call.command';
import { registerSpawnPokemonCommand } from './spawn-pokemon.command';
import { registerSpawnRandomPokemonCommand } from './spawn-random-pokemon.command';
import { registerStartCommand } from './start.command';

export function registerPokemonCommands(
  context: vscode.ExtensionContext,
  deps: CommandDeps,
): vscode.Disposable[] {
  return [
    registerStartCommand(context, deps),
    registerDeletePokemonCommand(context, deps),
    registerRemoveAllPokemonCommand(context, deps),
    registerRollCallCommand(context, deps),
    registerConfigureKeybindingsCommand(),
    registerChangePokemonLanguageCommand(),
    registerExportPokemonListCommand(context, deps),
    registerImportPokemonListCommand(context, deps),
    registerSpawnPokemonCommand(context, deps),
    registerSpawnRandomPokemonCommand(context, deps),
  ];
}
