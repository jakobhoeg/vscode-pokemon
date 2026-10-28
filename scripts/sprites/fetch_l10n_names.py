#!/usr/bin/env python3
"""
Create/extend the localized Pokémon name files (``l10n/pokemon/<locale>/gen<N>.json``)
for the generations handled by ``generate_pokemon_gifs.py``.

Species names come from the PokéAPI CSV export
(``pokemon_species_names.csv``).  Keys are the same keys used in
``src/common/pokemon-data.ts`` / the media folders, so the output can be merged
straight into the existing l10n files.

The keys to translate are read from ``src/common/pokemon-data.ts`` (every
registered key of the generation, forms included), or from a
``generate_pokemon_gifs.py --manifest`` file when ``--manifest`` is given.

Alternate forms (``deerling_autumn`` ...) get ``"<species> (<Form>)"``.  Common
form labels (Female, Hisuian, Galarian, Therian Forme, ...) are translated from
a built-in table; anything else keeps the English label and is listed in the
summary so a human can translate it (see the existing gen5 files for the house
style, e.g. ``"Sesokitz (Herbstform)"``).

The CSV is cached in ``scripts/sprites/out/`` after the first download, so
re-runs work offline (``--refresh`` forces a new download).

Usage:
    python scripts/sprites/fetch_l10n_names.py --gen 6 --gen 7 --gen 8 --gen 9
    python scripts/sprites/fetch_l10n_names.py --csv pokemon_species_names.csv --gen 6
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import sys
import urllib.request
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_pokemon_gifs import PokedexEntry, DEFAULT_POKEDEX, REPO_ROOT, load_pokedex, slugify  # noqa: E402

SPECIES_NAMES_CSV = (
    "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv"
)
DEFAULT_L10N_ROOT = REPO_ROOT / "l10n" / "pokemon"
DEFAULT_DATA_TS = REPO_ROOT / "src" / "common" / "pokemon-data.ts"
CSV_CACHE = Path(__file__).resolve().parent / "out" / "pokemon_species_names.csv"

# Translations for form labels that occur many times.  Keys are the lowercase
# English label produced by form_label(); missing labels stay in English.
FORM_LABELS: Dict[str, Dict[str, str]] = {
    "female": {"de-DE": "Weiblich", "fr-FR": "Femelle", "ja-JP": "メス"},
    "male": {"de-DE": "Männlich", "fr-FR": "Mâle", "ja-JP": "オス"},
    "hisuian": {"de-DE": "Hisui-Form", "fr-FR": "de Hisui", "ja-JP": "ヒスイのすがた"},
    "galarian": {"de-DE": "Galar-Form", "fr-FR": "de Galar", "ja-JP": "ガラルのすがた"},
    "alolan": {"de-DE": "Alola-Form", "fr-FR": "d'Alola", "ja-JP": "アローラのすがた"},
    "paldean": {"de-DE": "Paldea-Form", "fr-FR": "de Paldea", "ja-JP": "パルデアのすがた"},
    "therian": {"de-DE": "Tiergeistform", "fr-FR": "Forme Totémique", "ja-JP": "れいじゅうフォルム"},
    "mega": {"de-DE": "Mega", "fr-FR": "Méga", "ja-JP": "メガ"},
    "crowned": {"de-DE": "König", "fr-FR": "Couronné", "ja-JP": "けんのおう"},
    "eternamax": {"de-DE": "Unendynamax", "fr-FR": "Infinimax", "ja-JP": "ムゲンダイマックス"},
    "zen": {"de-DE": "Trance-Modus", "fr-FR": "Mode Transe", "ja-JP": "ダルマモード"},
    "spring": {"de-DE": "Frühlingsform", "fr-FR": "Forme Printemps", "ja-JP": "はるのすがた"},
    "summer": {"de-DE": "Sommerform", "fr-FR": "Forme Été", "ja-JP": "なつのすがた"},
    "autumn": {"de-DE": "Herbstform", "fr-FR": "Forme Automne", "ja-JP": "あきのすがた"},
    "winter": {"de-DE": "Winterform", "fr-FR": "Forme Hiver", "ja-JP": "ふゆのすがた"},
    "red": {"de-DE": "Rot", "fr-FR": "Rouge", "ja-JP": "あかいはな"},
    "blue": {"de-DE": "Blau", "fr-FR": "Bleu", "ja-JP": "あおいはな"},
    "yellow": {"de-DE": "Gelb", "fr-FR": "Jaune", "ja-JP": "きいろのはな"},
    "white": {"de-DE": "Weiß", "fr-FR": "Blanc", "ja-JP": "しろいはな"},
    "orange": {"de-DE": "Orange", "fr-FR": "Orange", "ja-JP": "オレンジいろのはな"},
    "complete": {"de-DE": "Optimum", "fr-FR": "Forme Parfaite", "ja-JP": "パーフェクトフォルム"},
    "10 percent": {"de-DE": "10 %", "fr-FR": "Forme 10 %", "ja-JP": "10%フォルム"},
    "50 percent": {"de-DE": "50 %", "fr-FR": "Forme 50 %", "ja-JP": "50%フォルム"},
    "unbound": {"de-DE": "Entfesselt", "fr-FR": "Déchaîné", "ja-JP": "ときはなたれしすがた"},
    "blade": {"de-DE": "Klingenform", "fr-FR": "Forme Assaut", "ja-JP": "ブレードフォルム"},
    "original": {"de-DE": "Originalfarbe", "fr-FR": "Couleur Originelle", "ja-JP": "オリジナルカラー"},
    "busted": {"de-DE": "Entlarvte Form", "fr-FR": "Forme Démasquée", "ja-JP": "ばれたすがた"},
    "school": {"de-DE": "Schwarmform", "fr-FR": "Forme Banc", "ja-JP": "むれたすがた"},
    "midnight": {"de-DE": "Mitternachtsform", "fr-FR": "Forme Nocturne", "ja-JP": "まよなかのすがた"},
    "dusk": {"de-DE": "Zwielichtform", "fr-FR": "Forme Crépusculaire", "ja-JP": "たそがれのすがた"},
    "dusk mane": {"de-DE": "Abendmähne", "fr-FR": "Crinière du Couchant", "ja-JP": "たそがれのたてがみ"},
    "dawn wings": {"de-DE": "Morgenschwingen", "fr-FR": "Ailes de l'Aurore", "ja-JP": "あかつきのつばさ"},
    "ultra": {"de-DE": "Ultra", "fr-FR": "Ultra", "ja-JP": "ウルトラ"},
    "low key": {"de-DE": "Tieftonform", "fr-FR": "Forme Grave", "ja-JP": "ローなすがた"},
    "noice": {"de-DE": "Tauwetterform", "fr-FR": "Tête Dégel", "ja-JP": "ナイスフェイス"},
    "hangry": {"de-DE": "Kohldampfmuster", "fr-FR": "Mode Affamé", "ja-JP": "はらぺこもよう"},
    "rapid strike": {"de-DE": "Fließender Stil", "fr-FR": "Style Eau Fluide", "ja-JP": "れんげきのかた"},
    "dada": {"de-DE": "Papa", "fr-FR": "Papa", "ja-JP": "とうちゃん"},
    "ice rider": {"de-DE": "Schimmelreiter", "fr-FR": "Cavalier du Froid", "ja-JP": "はくばじょうのすがた"},
    "shadow rider": {"de-DE": "Rappenreiter", "fr-FR": "Cavalier d'Effroi", "ja-JP": "こくばじょうのすがた"},
    "hero": {"de-DE": "Heldenform", "fr-FR": "Forme Super", "ja-JP": "マイティフォルム"},
    "three segment": {"de-DE": "Dreiteilige Form", "fr-FR": "Forme Tripartite", "ja-JP": "みふしのすがた"},
    "family of three": {"de-DE": "Dreierfamilie", "fr-FR": "Famille de Trois", "ja-JP": "みつごのすがた"},
    "droopy": {"de-DE": "Hängende Form", "fr-FR": "Forme Affalée", "ja-JP": "たれたすがた"},
    "stretchy": {"de-DE": "Gestreckte Form", "fr-FR": "Forme Raide", "ja-JP": "のびたすがた"},
    "wellspring": {"de-DE": "Brunnenmaske", "fr-FR": "Masque du Puits", "ja-JP": "いどのめん"},
    "hearthflame": {"de-DE": "Ofenmaske", "fr-FR": "Masque du Fourneau", "ja-JP": "かまどのめん"},
    "cornerstone": {"de-DE": "Fundamentmaske", "fr-FR": "Masque de la Pierre", "ja-JP": "いしずえのめん"},
    "terastal": {"de-DE": "Terakristall-Form", "fr-FR": "Forme Téracristal", "ja-JP": "テラスタルフォルム"},
    "stellar": {"de-DE": "Stellarform", "fr-FR": "Forme Stellaire", "ja-JP": "ステラフォルム"},
    "neutral": {"de-DE": "Ruhiger Modus", "fr-FR": "Mode Paisible", "ja-JP": "リラックスモード"},
    "eternalflower": {"de-DE": "Ewigblüte", "fr-FR": "Fleur Éternelle", "ja-JP": "えいえんのはな"},
    "pirouette": {"de-DE": "Tanzform", "fr-FR": "Forme Danse", "ja-JP": "ステップフォルム"},
    "resolute": {"de-DE": "Resolutform", "fr-FR": "Forme Conscient", "ja-JP": "かくごのすがた"},
    # Silvally memories (same wording as the arceus_* entries in gen4.json)
    "bug": {"de-DE": "Käfer", "fr-FR": "Insecte", "ja-JP": "むし"},
    "dark": {"de-DE": "Unlicht", "fr-FR": "Ténèbres", "ja-JP": "あく"},
    "dragon": {"de-DE": "Drache", "fr-FR": "Dragon", "ja-JP": "ドラゴン"},
    "electric": {"de-DE": "Elektro", "fr-FR": "Électrik", "ja-JP": "でんき"},
    "fairy": {"de-DE": "Fee", "fr-FR": "Fée", "ja-JP": "フェアリー"},
    "fighting": {"de-DE": "Kampf", "fr-FR": "Combat", "ja-JP": "かくとう"},
    "fire": {"de-DE": "Feuer", "fr-FR": "Feu", "ja-JP": "ほのお"},
    "flying": {"de-DE": "Flug", "fr-FR": "Vol", "ja-JP": "ひこう"},
    "ghost": {"de-DE": "Geist", "fr-FR": "Spectre", "ja-JP": "ゴースト"},
    "grass": {"de-DE": "Pflanze", "fr-FR": "Plante", "ja-JP": "くさ"},
    "ground": {"de-DE": "Boden", "fr-FR": "Sol", "ja-JP": "じめん"},
    "ice": {"de-DE": "Eis", "fr-FR": "Glace", "ja-JP": "こおり"},
    "poison": {"de-DE": "Gift", "fr-FR": "Poison", "ja-JP": "どく"},
    "psychic": {"de-DE": "Psycho", "fr-FR": "Psy", "ja-JP": "エスパー"},
    "rock": {"de-DE": "Gestein", "fr-FR": "Roche", "ja-JP": "いわ"},
    "steel": {"de-DE": "Stahl", "fr-FR": "Acier", "ja-JP": "はがね"},
    "water": {"de-DE": "Wasser", "fr-FR": "Eau", "ja-JP": "みず"},
    # Vivillon patterns
    "icy snow": {"de-DE": "Eismeermuster", "fr-FR": "Motif Banquise", "ja-JP": "ひょうせつのもよう"},
    "polar": {"de-DE": "Polarmuster", "fr-FR": "Motif Glace", "ja-JP": "ゆきぐにのもよう"},
    "tundra": {"de-DE": "Tundramuster", "fr-FR": "Motif Toundra", "ja-JP": "タイガのもよう"},
    "continental": {"de-DE": "Kontinentalmuster", "fr-FR": "Motif Continent", "ja-JP": "たいりくのもよう"},
    "garden": {"de-DE": "Gartenmuster", "fr-FR": "Motif Jardin", "ja-JP": "ていえんのもよう"},
    "elegant": {"de-DE": "Elegantmuster", "fr-FR": "Motif Élégance", "ja-JP": "みやびのもよう"},
    "meadow": {"de-DE": "Blumenmeermuster", "fr-FR": "Motif Floraison", "ja-JP": "はなぞののもよう"},
    "modern": {"de-DE": "Modernmuster", "fr-FR": "Motif Moderne", "ja-JP": "モダンのもよう"},
    "marine": {"de-DE": "Marinemuster", "fr-FR": "Motif Marin", "ja-JP": "マリンのもよう"},
    "archipelago": {"de-DE": "Archipelmuster", "fr-FR": "Motif Archipel", "ja-JP": "ぐんとうのもよう"},
    "high plains": {"de-DE": "Trockenmuster", "fr-FR": "Motif Sécheresse", "ja-JP": "こうやのもよう"},
    "sandstorm": {"de-DE": "Sandsturmmuster", "fr-FR": "Motif Sable", "ja-JP": "さじんのもよう"},
    "river": {"de-DE": "Flussmuster", "fr-FR": "Motif Fleuve", "ja-JP": "たいがのもよう"},
    "monsoon": {"de-DE": "Monsunmuster", "fr-FR": "Motif Mousson", "ja-JP": "モンスーンのもよう"},
    "savanna": {"de-DE": "Savannenmuster", "fr-FR": "Motif Savane", "ja-JP": "サバンナのもよう"},
    "sun": {"de-DE": "Sonnenmuster", "fr-FR": "Motif Soleil", "ja-JP": "たいようのもよう"},
    "ocean": {"de-DE": "Ozeanmuster", "fr-FR": "Motif Océan", "ja-JP": "オーシャンのもよう"},
    "jungle": {"de-DE": "Dschungelmuster", "fr-FR": "Motif Jungle", "ja-JP": "ジャングルのもよう"},
    "fancy": {"de-DE": "Fantasiemuster", "fr-FR": "Motif Fantaisie", "ja-JP": "ファンシーのもよう"},
    "poke ball": {"de-DE": "Pokéballmuster", "fr-FR": "Motif Poké Ball", "ja-JP": "ボールのもよう"},
    # Furfrou trims
    "heart": {"de-DE": "Herzchenschnitt", "fr-FR": "Coupe Cœur", "ja-JP": "ハートカット"},
    "star": {"de-DE": "Sternchenschnitt", "fr-FR": "Coupe Étoile", "ja-JP": "スターカット"},
    "diamond": {"de-DE": "Diamantenschnitt", "fr-FR": "Coupe Diamant", "ja-JP": "ダイヤカット"},
    "debutante": {"de-DE": "Fräuleinschnitt", "fr-FR": "Coupe Demoiselle", "ja-JP": "レディカット"},
    "matron": {"de-DE": "Damenschnitt", "fr-FR": "Coupe Madame", "ja-JP": "マダムカット"},
    "dandy": {"de-DE": "Herrenschnitt", "fr-FR": "Coupe Monsieur", "ja-JP": "ジェントルカット"},
    "la reine": {"de-DE": "Königinnenschnitt", "fr-FR": "Coupe Reine", "ja-JP": "クイーンカット"},
    "kabuki": {"de-DE": "Kabuki-Schnitt", "fr-FR": "Coupe Kabuki", "ja-JP": "カブキカット"},
    "pharaoh": {"de-DE": "Pharaonenschnitt", "fr-FR": "Coupe Pharaon", "ja-JP": "キングダムカット"},
    # Oricorio styles
    "pom pom": {"de-DE": "Cheerleadingstil", "fr-FR": "Style Pom-Pom", "ja-JP": "ぱちぱちスタイル"},
    "pau": {"de-DE": "Hulastil", "fr-FR": "Style Hula", "ja-JP": "ふらふらスタイル"},
    "sensu": {"de-DE": "Buyo-Stil", "fr-FR": "Style Buyo", "ja-JP": "まいまいスタイル"},
    # Alcremie flavours (the sweet is always the strawberry one)
    "caramel swirl strawberry sweet": {"de-DE": "Karamell-Mix", "fr-FR": "Mélange Caramel", "ja-JP": "キャラメルミックス"},
    "lemon cream strawberry sweet": {"de-DE": "Zitronen-Creme", "fr-FR": "Lait Citron", "ja-JP": "ミルキィレモン"},
    "matcha cream strawberry sweet": {"de-DE": "Matcha-Creme", "fr-FR": "Lait Matcha", "ja-JP": "ミルキィまっちゃ"},
    "mint cream strawberry sweet": {"de-DE": "Minz-Creme", "fr-FR": "Lait Menthe", "ja-JP": "ミルキィミント"},
    "rainbow swirl strawberry sweet": {"de-DE": "Trio-Mix", "fr-FR": "Mélange Tricolore", "ja-JP": "トリプルミックス"},
    "ruby cream strawberry sweet": {"de-DE": "Ruby-Creme", "fr-FR": "Lait Ruby", "ja-JP": "ミルキィルビー"},
    "ruby swirl strawberry sweet": {"de-DE": "Ruby-Mix", "fr-FR": "Mélange Ruby", "ja-JP": "ルビーミックス"},
    "salted cream strawberry sweet": {"de-DE": "Salz-Creme", "fr-FR": "Lait Salé", "ja-JP": "ミルキィソルト"},
    # misc
    "gulping": {"de-DE": "Schluckform", "fr-FR": "Forme Gobage", "ja-JP": "うのみのすがた"},
    "gorging": {"de-DE": "Stopfform", "fr-FR": "Forme Gloutonnerie", "ja-JP": "まるのみのすがた"},
    "ash": {"de-DE": "Ash", "fr-FR": "Sacha", "ja-JP": "サトシ"},
}

# PokéAPI local_language_id -> extension locale folder
LANGUAGE_IDS: Dict[str, int] = {
    "fr-FR": 5,
    "de-DE": 6,
    "ja-JP": 1,  # ja-Hrkt (katakana), matching the existing ja-JP files
}


def parse_species_names(csv_text: str) -> Dict[int, Dict[int, str]]:
    """-> {species_id: {language_id: name}}"""
    out: Dict[int, Dict[int, str]] = {}
    for row in csv.DictReader(io.StringIO(csv_text)):
        out.setdefault(int(row["pokemon_species_id"]), {})[int(row["local_language_id"])] = row["name"]
    return out


def fetch_csv(url: str = SPECIES_NAMES_CSV, opener=urllib.request.urlopen, cache: Optional[Path] = CSV_CACHE,
              refresh: bool = False) -> str:
    if cache and cache.exists() and not refresh:
        return cache.read_text(encoding="utf-8")
    with opener(url, timeout=30) as resp:  # type: ignore[call-arg]
        text = resp.read().decode("utf-8")
    if cache:
        cache.parent.mkdir(parents=True, exist_ok=True)
        cache.write_text(text, encoding="utf-8")
    return text


def entry_for_key(entries: Dict[int, PokedexEntry], key: str) -> Optional[PokedexEntry]:
    """Species entry for a key: exact match, else the longest slug that is a '_'-separated prefix."""
    best: Optional[PokedexEntry] = None
    for e in entries.values():
        if key == e.base_key or key == e.slug:
            return e
        if key.startswith(e.slug + "_") and (best is None or len(e.slug) > len(best.slug)):
            best = e
    return best


def form_label(entry: PokedexEntry, key: str) -> Optional[str]:
    """'deerling_autumn' -> 'Autumn'; None for the plain species key."""
    if key == entry.slug:
        return None
    if key.startswith(entry.slug + "_"):
        return key[len(entry.slug) + 1 :].replace("_", " ").title()
    return None


def localized_form_label(label: str, locale: str) -> Optional[str]:
    return FORM_LABELS.get(label.lower(), {}).get(locale)


def build_translations(
    entries: Dict[int, PokedexEntry],
    keys: Iterable[str],
    names: Dict[int, Dict[int, str]],
    language_id: int,
    locale: Optional[str] = None,
) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for key in keys:
        entry = entry_for_key(entries, key)
        if entry is None:
            continue
        localized = names.get(entry.id, {}).get(language_id) or entry.name
        label = form_label(entry, key)
        if label and locale:
            label = localized_form_label(label, locale) or label
        out[key] = f"{localized} ({label})" if label else localized
    return out


def registered_keys(data_ts: Path) -> Dict[str, int]:
    """key -> generation for every entry in pokemon-data.ts (forms included)."""
    from apply_to_pokemon_data import parse_entries

    text = data_ts.read_bytes().decode("utf-8").replace("\r\n", "\n").replace("\r", "\n")
    return {e.key: e.generation for e in parse_entries(text)}


def keys_for_generation(
    entries: Dict[int, PokedexEntry],
    generation: int,
    manifest: Optional[dict] = None,
    registered: Optional[Dict[str, int]] = None,
) -> List[str]:
    """Keys to localize, in Pokédex order (species first, then its forms).

    Source: a generation manifest if given, else the keys registered in
    pokemon-data.ts, else every base key of the generation in pokedex.json.
    """
    if manifest:
        keys = {r["key"] for r in manifest.get("generated", []) if r["generation"] == generation}
    elif registered:
        keys = {k for k, g in registered.items() if g == generation}
    else:
        keys = {e.base_key for e in entries.values() if e.generation == generation}

    def order(k: str):
        e = entry_for_key(entries, k)
        return (e.id if e else 10**6, k != (e.base_key if e else k), k)

    return sorted((k for k in keys if entry_for_key(entries, k)), key=order)


def write_locale_file(path: Path, translations: Dict[str, str], merge: bool = True) -> None:
    existing: Dict[str, str] = {}
    indent = "    "
    if merge and path.exists():
        raw = path.read_text(encoding="utf-8")
        existing = json.loads(raw)
        indent = "\t" if '\n\t"' in raw else "    "
    # Hand-edited translations win; only new keys are added. Use --no-merge to overwrite.
    merged = {**translations, **existing}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(merged, ensure_ascii=False, indent=indent) + "\n", encoding="utf-8")


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--gen", type=int, action="append", required=True, help="generation(s) to produce, repeatable")
    p.add_argument("--csv", type=Path, help="local copy of pokemon_species_names.csv (skips download)")
    p.add_argument("--manifest", type=Path, help="manifest.json from generate_pokemon_gifs.py; limits keys to generated sprites")
    p.add_argument("--pokedex", type=Path, default=DEFAULT_POKEDEX)
    p.add_argument("--data", type=Path, default=DEFAULT_DATA_TS,
                   help="pokemon-data.ts whose registered keys are translated (default: %(default)s)")
    p.add_argument("--refresh", action="store_true", help="re-download the CSV even if a cached copy exists")
    p.add_argument("--l10n-root", type=Path, default=DEFAULT_L10N_ROOT)
    p.add_argument("--locale", action="append", default=[], help="subset of locales (default: all of %s)" % ", ".join(LANGUAGE_IDS))
    p.add_argument("--no-merge", action="store_true", help="overwrite files instead of adding missing keys to existing ones")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args(argv)

    entries = load_pokedex(args.pokedex)
    csv_text = args.csv.read_text(encoding="utf-8") if args.csv else fetch_csv(refresh=args.refresh)
    names = parse_species_names(csv_text)
    manifest = json.loads(args.manifest.read_text(encoding="utf-8")) if args.manifest else None
    registered = registered_keys(args.data) if args.data.exists() else None
    locales = args.locale or list(LANGUAGE_IDS)

    needs_review: List[str] = []
    for generation in args.gen:
        keys = keys_for_generation(entries, generation, manifest, registered)
        for k in keys:
            label = form_label(entry_for_key(entries, k), k)  # type: ignore[arg-type]
            if label and any(localized_form_label(label, loc) is None for loc in locales):
                needs_review.append(k)
        for locale in locales:
            translations = build_translations(entries, keys, names, LANGUAGE_IDS[locale], locale)
            target = args.l10n_root / locale / f"gen{generation}.json"
            if args.dry_run:
                print(f"[dry-run] {target}: {len(translations)} names")
                continue
            write_locale_file(target, translations, merge=not args.no_merge)
            print(f"wrote {len(translations)} names -> {target}")
    if needs_review:
        print("\nForm labels without a built-in translation were left in English and need a manual translation:")
        for key in sorted(set(needs_review)):
            print(f"  {key}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
