import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { POKEMON_DATA } from './pokemon-data';
import { PokemonType } from './types';

/**
 * Cache for loaded Pokemon translations
 * Key: locale (e.g., 'fr-FR'), Value: translations map (pokemon key -> translated name)
 */
let pokemonTranslationsCache: { [locale: string]: { [key: string]: string } } =
  {};

/**
 * Supported Pokemon translation locales
 * These correspond to the folders in l10n/pokemon/
 */
export const SUPPORTED_LOCALES = [
  'en-US',
  'fr-FR',
  'de-DE',
  'ja-JP',
  'zh-CN',
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const GENERATIONS = ['gen1', 'gen2', 'gen3', 'gen4', 'gen5'] as const;
const FALLBACK_LOCALE: SupportedLocale = 'en-US';

/**
 * Maps vscode.env.language / config values to l10n/pokemon/ folder names.
 * VS Code uses short lowercase codes (fr, zh-cn); folders use region tags (fr-FR, zh-CN).
 */
/* eslint-disable @typescript-eslint/naming-convention */
const LANGUAGE_TO_POKEMON_LOCALE: { [language: string]: SupportedLocale } = {
  en: 'en-US',
  'en-us': 'en-US',
  'en-gb': 'en-US',
  fr: 'fr-FR',
  'fr-fr': 'fr-FR',
  de: 'de-DE',
  'de-de': 'de-DE',
  ja: 'ja-JP',
  'ja-jp': 'ja-JP',
  'zh-cn': 'zh-CN',
  'zh-hans': 'zh-CN',
};
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Resets the Pokemon translations cache
 * Useful when the language configuration changes
 */
export function resetPokemonTranslationsCache(): void {
  pokemonTranslationsCache = {};
}

/**
 * Resolves a language/locale string to a canonical pokemon folder locale.
 */
export function resolvePokemonLocale(
  locale: string,
): SupportedLocale | undefined {
  const normalized = locale.toLowerCase().replace(/_/g, '-');
  if (LANGUAGE_TO_POKEMON_LOCALE[normalized]) {
    return LANGUAGE_TO_POKEMON_LOCALE[normalized];
  }

  return SUPPORTED_LOCALES.find(
    (supported) => supported.toLowerCase() === normalized,
  );
}

/**
 * Gets the configured locale for Pokemon names
 * Uses vscode-pokemon.pokemonLanguage configuration if set,
 * otherwise falls back to VS Code's language
 * @returns The locale string (e.g., 'fr-FR', 'en-US')
 */
function getPokemonLocale(): string {
  const config = vscode.workspace.getConfiguration('vscode-pokemon');
  const configuredLocale = config.get<string>('pokemonLanguage', 'auto');

  const rawLocale =
    configuredLocale && configuredLocale !== 'auto'
      ? configuredLocale
      : vscode.env.language;

  return resolvePokemonLocale(rawLocale) ?? FALLBACK_LOCALE;
}

/**
 * Gets the extension path, with caching
 */
function getExtensionPath(): string | undefined {
  const extension = vscode.extensions.getExtension('jakobhoeg.vscode-pokemon');
  return extension?.extensionPath;
}

/**
 * Resolves the path to Pokemon translation files for a given locale
 */
function resolvePokemonL10nPath(locale: string): string | undefined {
  const extensionPath = getExtensionPath();
  const basePath = extensionPath
    ? path.join(extensionPath, 'l10n', 'pokemon')
    : path.join(__dirname, '../../l10n/pokemon');

  const canonicalLocale = resolvePokemonLocale(locale) ?? locale;
  const localePath = path.join(basePath, canonicalLocale);
  if (fs.existsSync(localePath)) {
    return localePath;
  }

  // English names come from POKEMON_DATA; no en-US folder is required
  if (canonicalLocale === FALLBACK_LOCALE) {
    return undefined;
  }

  const fallbackPath = path.join(basePath, FALLBACK_LOCALE);
  return fs.existsSync(fallbackPath) ? fallbackPath : undefined;
}

/**
 * Loads Pokemon translations from generation files (gen1.json, gen2.json, gen3.json)
 * Translations are stored in l10n/pokemon/{locale}/gen*.json
 *
 * Note: English names are the default source of truth defined in
 * src/common/pokemon-generations/gen*.ts files. Translation files are optional
 * and missing translations will fall back to English names.
 *
 * @param locale The locale to load (e.g., 'fr-FR', 'en-US'). Uses configured locale if not provided
 * @returns Map of Pokemon keys to translated names
 */
function loadPokemonTranslations(locale?: string): { [key: string]: string } {
  // Use provided locale or get from configuration
  const targetLocale = locale || getPokemonLocale();

  // Return cached translations if available
  if (pokemonTranslationsCache[targetLocale]) {
    return pokemonTranslationsCache[targetLocale];
  }

  // Initialize cache for this locale
  const cache: { [key: string]: string } = {};
  pokemonTranslationsCache[targetLocale] = cache;

  try {
    const pokemonL10nPath = resolvePokemonL10nPath(targetLocale);

    if (!pokemonL10nPath) {
      console.warn(
        `[Pokemon Translations] Directory not found for locale: ${targetLocale}`,
      );
      return cache;
    }

    let totalLoaded = 0;

    for (const gen of GENERATIONS) {
      const genFile = path.join(pokemonL10nPath, `${gen}.json`);
      if (!fs.existsSync(genFile)) {
        continue;
      }

      try {
        const genData = JSON.parse(fs.readFileSync(genFile, 'utf8'));
        Object.assign(cache, genData);
        totalLoaded += Object.keys(genData).length;
      } catch (error) {
        console.warn(`[Pokemon Translations] Error loading ${genFile}:`, error);
      }
    }

    if (totalLoaded > 0) {
      console.log(
        `[Pokemon Translations] Loaded ${totalLoaded} translations from ${pokemonL10nPath}`,
      );
    } else {
      console.warn(
        `[Pokemon Translations] No translations found in ${pokemonL10nPath}`,
      );
    }
  } catch (error) {
    console.error('[Pokemon Translations] Error loading translations:', error);
  }

  return cache;
}

export class TranslatedQuickPickItem<T> implements vscode.QuickPickItem {
  label: string;
  value: T;

  constructor(label: string, value: T) {
    this.label = label;
    this.value = value;
  }
}

export function stringListAsQuickPickItemList<T>(
  collection: Array<T>,
): TranslatedQuickPickItem<T>[] {
  return collection.map<TranslatedQuickPickItem<T>>((el) => {
    return { label: vscode.l10n.t(String(el)), value: el };
  });
}

/**
 * Gets the localized name of a Pokemon.
 * Loads translations from l10n/pokemon/{locale}/gen*.json files.
 * Falls back to the English name from POKEMON_DATA if no translation is available.
 *
 * @param pokemonType The Pokemon type (e.g., 'pikachu', 'charizard')
 * @returns The localized Pokemon name, or English name if translation not found
 */
export function getLocalizedPokemonName(pokemonType: PokemonType): string {
  const translations = loadPokemonTranslations();
  return (
    translations[pokemonType] || POKEMON_DATA[pokemonType]?.name || pokemonType
  );
}
