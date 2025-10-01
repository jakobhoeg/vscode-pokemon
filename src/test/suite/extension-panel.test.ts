import { strict as assert } from 'assert';
import { PokemonWebviewContainer } from '../../extension/extension';
import { PokemonType } from '../../common/types';

describe('Extension Panel Methods', function () {
  it('deletePokemon posts delete-pokemon message with name', function () {
    // Create a minimal mock webview spy
    const posted: any[] = [];
    const mockWebview: any = { postMessage: (msg: any) => posted.push(msg) };
    // Create a minimal subclass to provide getWebview
    class TestContainer extends PokemonWebviewContainer {
      constructor() {
        // ...existing code... (call super with dummy values)
        // @ts-ignore
        super(undefined, 'default' as any, 'bulbasaur' as any, 'medium' as any, 'gen1', 32, 'none' as any, 1 as any, true);
      }
      getWebview() {
        return mockWebview;
      }
    }

    const c = new TestContainer();
    c.deletePokemon('Pikachu');

    assert.equal(posted.length, 1);
    const callArg = posted[0];
    assert.equal(callArg.command, 'delete-pokemon');
    assert.equal(callArg.name, 'Pikachu');
  });

  it('deletePokemonByType posts delete-pokemon-by-type message with type', function () {
    const posted: any[] = [];
    const mockWebview: any = { postMessage: (msg: any) => posted.push(msg) };

    class TestContainer extends PokemonWebviewContainer {
      constructor() {
        // @ts-ignore
        super(undefined, 'default' as any, 'bulbasaur' as any, 'medium' as any, 'gen1', 32, 'none' as any, 1 as any, true);
      }
      getWebview() {
        return mockWebview;
      }
    }

    const c = new TestContainer();
    c.deletePokemonByType('pikachu' as PokemonType);

    assert.equal(posted.length, 1);
    const callArg = posted[0];
    assert.equal(callArg.command, 'delete-pokemon-by-type');
    assert.equal(callArg.type, 'pikachu');
  });
});
