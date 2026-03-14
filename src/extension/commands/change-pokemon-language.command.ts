import * as vscode from 'vscode';
import * as localize from '../../common/localize';
import { PokemonType } from '../../common/types';
import { VSCODE_POKEMON_CHANGE_LANGUAGE_COMMAND } from '../../constants/vscode-keys.constant';

export function registerChangePokemonLanguageCommand(): vscode.Disposable {
  return vscode.commands.registerCommand(
    VSCODE_POKEMON_CHANGE_LANGUAGE_COMMAND,
    async () => {
      const config = vscode.workspace.getConfiguration('vscode-pokemon');
      const currentLanguage = config.get<string>('pokemonLanguage', 'auto');

      /* eslint-disable @typescript-eslint/naming-convention */
      const languageLabels: {
        [key: string]: { label: string; description: string };
      } = {
        auto: {
          label: '$(globe) Auto',
          description: vscode.l10n.t('Use VS Code language'),
        },
        'en-US': {
          label: '🇺🇸 English (US)',
          description: vscode.l10n.t('English names'),
        },
        'fr-FR': {
          label: '🇫🇷 Français (FR)',
          description: vscode.l10n.t('French names'),
        },
        'de-DE': {
          label: '🇩🇪 Deutsch (DE)',
          description: vscode.l10n.t('German names'),
        },
        'ja-JP': {
          label: '🇯🇵 日本語 (JP)',
          description: vscode.l10n.t('Japanese names'),
        },
      } as { [key: string]: { label: string; description: string } };
      /* eslint-enable @typescript-eslint/naming-convention */

      const languageOptions: Array<vscode.QuickPickItem & { value: string }> = [
        {
          label: languageLabels['auto'].label,
          description: languageLabels['auto'].description,
          detail:
            currentLanguage === 'auto' ? vscode.l10n.t('Current') : undefined,
          value: 'auto',
        },
        ...localize.SUPPORTED_LOCALES.map((locale) => ({
          label: languageLabels[locale]?.label || locale,
          description: languageLabels[locale]?.description || locale,
          detail:
            currentLanguage === locale ? vscode.l10n.t('Current') : undefined,
          value: locale,
        })),
      ];

      const picked = await vscode.window.showQuickPick(languageOptions, {
        placeHolder: vscode.l10n.t('Select language for Pokemon names'),
      });

      if (!picked) {
        return;
      }

      await config.update(
        'pokemonLanguage',
        picked.value,
        vscode.ConfigurationTarget.Global,
      );

      localize.resetPokemonTranslationsCache();

      const testPokemon: PokemonType = 'bulbasaur';
      localize.getLocalizedPokemonName(testPokemon);

      await vscode.window.showInformationMessage(
        vscode.l10n.t(
          'Pokemon language changed to {0}. The change will persist after restart.',
          picked.label,
        ),
      );
    },
  );
}
