import * as fs from 'fs';

import {
  PokemonColor,
  PokemonExtraSprite,
  PokemonGeneration,
} from '../common/types';
import { getAllPokemon, POKEMON_DATA } from '../common/pokemon-data';

type MissingGif = {
  generation: number;
  pokemon: string;
  states: string[];
};

const mediaFolder = './media';

function runGifCheck(folder: string): number {
  // Group pokemon by generation
  const genMap: Record<number, string[]> = {};
  getAllPokemon().forEach((pokemon) => {
    const generation = POKEMON_DATA[pokemon]?.generation || 1;
    if (!genMap[generation]) genMap[generation] = [];
    genMap[generation].push(pokemon);
  });

  const missingPokemon: MissingGif[] = [];
  // Iterate generations starting at 1
  for (
    let generation = PokemonGeneration.Gen1;
    generation <= PokemonGeneration.Gen4;
    generation++
  ) {
    console.log(`Checking generation ${generation}...`);
    const pokes = genMap[generation] || [];
    // Order by POKEMON_DATA id when available
    pokes.sort(
      (a, b) => (POKEMON_DATA[a]?.id || 0) - (POKEMON_DATA[b]?.id || 0),
    );

    for (const pokemon of pokes) {
      const cfg = POKEMON_DATA[pokemon];
      console.log(`  Checking ${pokemon}...`);
      const colors =
        cfg?.possibleColors && cfg.possibleColors.length > 0
          ? cfg.possibleColors
          : [PokemonColor.default];
      const states = ['idle', 'walk'];
      if (
        cfg?.extraSprites &&
        cfg.extraSprites.includes(PokemonExtraSprite.leftFacing)
      ) {
        states.push('walk_left');
      }

      const missing: string[] = [];

      for (const color of colors) {
        for (const state of states) {
          const filename = `${color}_${state}_8fps.gif`;
          const filePath = `${folder}/gen${generation}/${pokemon}/${filename}`;
          if (!fs.existsSync(filePath)) {
            missing.push(`${color}_${state}`);
          }
        }
      }

      if (missing.length > 0) {
        console.error(
          `    \x1b[31m${pokemon}: missing ${missing.join(', ')}\x1b[0m`,
        );
        missingPokemon.push({ generation, pokemon, states: missing });
      }
    }
  }

  if (missingPokemon.length === 0) {
    console.log('All GIFs are present!');
  } else {
    console.error(`\nMissing GIFs:`);
    missingPokemon.forEach(({ generation, pokemon, states }) => {
      console.error(`  Gen ${generation} - ${pokemon}: ${states.join(', ')}`);
    });
  }
  return missingPokemon.length;
}

const missing = runGifCheck(mediaFolder);
if (missing > 0) {
  // Non-zero exit to fail CI when there are missing GIFs
  process.exit(1);
}
process.exit(0);
