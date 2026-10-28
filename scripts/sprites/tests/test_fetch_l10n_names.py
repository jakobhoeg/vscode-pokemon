"""Tests for scripts/sprites/fetch_l10n_names.py (offline, using a tiny fake CSV)."""
from __future__ import annotations

import io
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import fetch_l10n_names as l10n  # noqa: E402
import generate_pokemon_gifs as gen  # noqa: E402

FAKE_CSV = """pokemon_species_id,local_language_id,name,genus
585,1,シキジカ,きせつポケモン
585,5,Vivaldaim,Pokémon Saison
585,6,Sesokitz,Jahreszeitenpokémon
585,9,Deerling,Season Pokémon
650,1,ハリマロン,イガグリポケモン
650,5,Marisson,Pokémon Châtaigne
650,6,Igamaro,Kastanienpokémon
650,9,Chespin,Spiny Nut Pokémon
669,5,Flabébé,
669,6,Flabébé,
"""


def pokedex(tmp_path: Path):
    data = {
        "pokemon": {
            "585": {"name": "Deerling", "generation": 5, "base_form": "spring"},
            "650": {"name": "Chespin", "generation": 6},
            "669": {"name": "Flabébé", "generation": 6},
            "700": {"name": "Sylveon", "generation": 6},
        }
    }
    path = tmp_path / "pokedex.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return gen.load_pokedex(path)


def test_parse_species_names():
    names = l10n.parse_species_names(FAKE_CSV)
    assert names[585][6] == "Sesokitz"
    assert names[650][1] == "ハリマロン"


def test_build_translations_species_forms_and_fallback(tmp_path):
    entries = pokedex(tmp_path)
    names = l10n.parse_species_names(FAKE_CSV)
    out = l10n.build_translations(
        entries, ["deerling_spring", "deerling_autumn", "chespin", "flabebe", "sylveon"], names, 6
    )
    assert out == {
        "deerling_spring": "Sesokitz (Spring)",
        "deerling_autumn": "Sesokitz (Autumn)",
        "chespin": "Igamaro",
        "flabebe": "Flabébé",
        "sylveon": "Sylveon",  # not in the CSV -> English fallback
    }


def test_keys_for_generation_from_pokedex_and_manifest(tmp_path):
    entries = pokedex(tmp_path)
    assert l10n.keys_for_generation(entries, 6, None) == ["chespin", "flabebe", "sylveon"]
    manifest = {"generated": [{"key": "sylveon", "generation": 6}, {"key": "chespin", "generation": 6}, {"key": "deerling_autumn", "generation": 5}]}
    assert l10n.keys_for_generation(entries, 6, manifest) == ["chespin", "sylveon"]
    assert l10n.keys_for_generation(entries, 5, manifest) == ["deerling_autumn"]


def test_main_writes_and_merges_locale_files(tmp_path, capsys):
    pokedex(tmp_path)
    csv_path = tmp_path / "names.csv"
    csv_path.write_text(FAKE_CSV, encoding="utf-8")
    l10n_root = tmp_path / "l10n"
    existing = l10n_root / "de-DE" / "gen6.json"
    existing.parent.mkdir(parents=True)
    existing.write_text('{\n\t"chespin": "Igamaro (hand edited)"\n}\n', encoding="utf-8")

    rc = l10n.main(
        [
            "--gen", "6",
            "--csv", str(csv_path),
            "--pokedex", str(tmp_path / "pokedex.json"),
            "--l10n-root", str(l10n_root),
            "--locale", "de-DE",
            "--locale", "fr-FR",
        ]
    )
    assert rc == 0
    de = json.loads(existing.read_text(encoding="utf-8"))
    assert de["chespin"] == "Igamaro (hand edited)", "existing (hand edited) entries are kept"
    assert de["flabebe"] == "Flabébé" and de["sylveon"] == "Sylveon"
    assert existing.read_text(encoding="utf-8").startswith('{\n\t"'), "tab indentation of the existing file is kept"
    fr = json.loads((l10n_root / "fr-FR" / "gen6.json").read_text(encoding="utf-8"))
    assert fr["chespin"] == "Marisson"
    assert not (l10n_root / "ja-JP").exists()


def test_entry_for_key_prefers_exact_then_longest_prefix(tmp_path):
    data = {"pokemon": {
        "921": {"name": "Pawmi", "generation": 9}, "922": {"name": "Pawmo", "generation": 9},
        "923": {"name": "Pawmot", "generation": 9}, "550": {"name": "Basculin", "generation": 5, "base_form": "red_striped"},
    }}
    path = tmp_path / "p.json"; path.write_text(json.dumps(data))
    entries = gen.load_pokedex(path)
    assert l10n.entry_for_key(entries, "pawmot").id == 923, "pawmot is a species, not a form of pawmo"
    assert l10n.entry_for_key(entries, "pawmo_female").id == 922
    assert l10n.entry_for_key(entries, "basculin_red_striped").id == 550
    assert l10n.entry_for_key(entries, "basculin_blue_striped").id == 550
    assert l10n.entry_for_key(entries, "pikachu") is None
    assert l10n.form_label(entries[923], "pawmot") is None
    assert l10n.form_label(entries[550], "basculin_blue_striped") == "Blue Striped"


def test_form_labels_are_translated_when_known(tmp_path):
    entries = pokedex(tmp_path)
    names = l10n.parse_species_names(FAKE_CSV)
    de = l10n.build_translations(entries, ["deerling_autumn", "chespin_female", "chespin_totem"], names, 6, "de-DE")
    assert de == {
        "deerling_autumn": "Sesokitz (Herbstform)",
        "chespin_female": "Igamaro (Weiblich)",
        "chespin_totem": "Igamaro (Totem)",  # unknown label stays English
    }
    ja = l10n.build_translations(entries, ["deerling_autumn"], names, 1, "ja-JP")
    assert ja == {"deerling_autumn": "シキジカ (あきのすがた)"}


def test_keys_come_from_pokemon_data_ts_including_forms(tmp_path):
    entries = pokedex(tmp_path)
    ts = tmp_path / "pokemon-data.ts"
    # bytes, so the CRLF line endings are written literally on every platform
    ts.write_bytes(
        (
            "const X = {\r\n"
            "  chespin: {\r\n    id: 650,\r\n    generation: PokemonGeneration.Gen6,\r\n    possibleColors: [],\r\n  },\r\n"
            "  flabebe_blue: {\r\n    id: 669,\r\n    generation: PokemonGeneration.Gen6,\r\n    possibleColors: [],\r\n  },\r\n"
            "  flabebe: {\r\n    id: 669,\r\n    generation: PokemonGeneration.Gen6,\r\n    possibleColors: [],\r\n  },\r\n"
            "  deerling_spring: {\r\n    id: 585,\r\n    generation: PokemonGeneration.Gen5,\r\n    possibleColors: [],\r\n  },\r\n"
            "};\r\n"
        ).encode("utf-8")
    )
    registered = l10n.registered_keys(ts)
    assert registered == {"chespin": 6, "flabebe_blue": 6, "flabebe": 6, "deerling_spring": 5}
    # species first, forms after their species, Pokédex order; sylveon is not registered -> not included
    assert l10n.keys_for_generation(entries, 6, None, registered) == ["chespin", "flabebe", "flabebe_blue"]
    assert l10n.keys_for_generation(entries, 5, None, registered) == ["deerling_spring"]


def test_fetch_csv_uses_cache(tmp_path):
    cache = tmp_path / "names.csv"
    calls = []

    class Resp(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def opener(url, timeout):
        calls.append(url)
        return Resp(b"pokemon_species_id,local_language_id,name,genus\n650,6,Igamaro,\n")

    assert "Igamaro" in l10n.fetch_csv(opener=opener, cache=cache)
    assert "Igamaro" in l10n.fetch_csv(opener=opener, cache=cache)
    assert len(calls) == 1, "second call is served from the cache"
    l10n.fetch_csv(opener=opener, cache=cache, refresh=True)
    assert len(calls) == 2
