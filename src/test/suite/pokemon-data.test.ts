import { strict as assert } from 'assert';
import { getRandomPokemonConfig } from '../../common/pokemon-data';
import { PokemonGeneration } from '../../common/types';

describe('getRandomPokemonConfig', function () {
  it('returns a valid [PokemonType, PokemonConfig] tuple', function () {
    const [type, config] = getRandomPokemonConfig();
    assert.equal(typeof type, 'string');
    assert.ok(config);
    assert.ok(config.name);
    assert.ok(config.generation !== undefined);
  });

  it('returns only Pokémon from the specified generations', function () {
    const allowedGens = [PokemonGeneration.Gen1, PokemonGeneration.Gen2];
    for (let i = 0; i < 20; i++) {
      const [, config] = getRandomPokemonConfig(allowedGens);
      assert.ok(allowedGens.includes(config.generation));
    }
  });

  it('throws if no Pokémon match the specified generations', function () {
    assert.throws(() => getRandomPokemonConfig([-1 as PokemonGeneration]));
  });
});
