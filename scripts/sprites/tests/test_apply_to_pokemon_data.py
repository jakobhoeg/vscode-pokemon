"""Tests for scripts/sprites/apply_to_pokemon_data.py"""
from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import apply_to_pokemon_data as app  # noqa: E402

SAMPLE_TS = """const POKEMON_DATA_RAW: Record<string, PokemonConfig> = {
  // Generation 4
  arceus: {
    id: 493,
    name: 'Arceus',
    generation: PokemonGeneration.Gen4,
    cry: 'Arceus!',
    possibleColors: [PokemonColor.default],
    originalSpriteSize: 64,
  },
  /* Generation 5 */
  victini: {
    id: 494,
    name: 'Victini',
    generation: PokemonGeneration.Gen5,
    cry: 'Victini!',
    possibleColors: [PokemonColor.default],
  },
  snivy: {
    id: 495,
    name: 'Snivy',
    generation: PokemonGeneration.Gen5,
    cry: 'Snivy!',
    possibleColors: [],
  },
  sawk: {
    id: 539,
    name: 'Sawk',
    generation: PokemonGeneration.Gen5,
    cry: 'Sawk!',
    possibleColors: [PokemonColor.default],
    extraSprites: [PokemonExtraSprite.leftFacing],
  },
  deerling_spring: {
    id: 585,
    name: 'Deerling (Spring Form)',
    generation: PokemonGeneration.Gen5,
    cry: 'Deerling!',
    possibleColors: [PokemonColor.default],
  },
  zekrom: {
    id: 644,
    name: 'Zekrom',
    generation: PokemonGeneration.Gen5,
    cry: 'Zekrom!',
    possibleColors: [],
  },
};
"""


def gen(key, id_, name, generation=5, colors=("default", "shiny"), size=32, is_base=True):
    return {
        "key": key, "id": id_, "name": name, "generation": generation, "sprite_size": size,
        "colors": list(colors), "files": [], "is_base": is_base,
    }


def test_parse_entries():
    entries = app.parse_entries(SAMPLE_TS)
    assert [e.key for e in entries] == ["arceus", "victini", "snivy", "sawk", "deerling_spring", "zekrom"]
    assert entries[0].id == 493 and entries[0].generation == 4
    assert entries[3].field("extraSprites") == "[PokemonExtraSprite.leftFacing]"


def test_update_existing_entries_keep_name_and_cry(tmp_path):
    generated = [
        gen("victini", 494, "Victini"),
        gen("snivy", 495, "Snivy"),
        gen("zekrom", 644, "Zekrom", size=64),
        gen("sawk", 539, "Sawk"),
        gen("deerling_spring", 585, "Deerling", colors=("default",)),
    ]
    text, stats = app.apply(SAMPLE_TS, generated, tmp_path)
    assert stats == {"updated": 4, "added": 0, "unchanged": 1}
    entries = {e.key: e for e in app.parse_entries(text)}
    assert entries["victini"].field("possibleColors") == "[PokemonColor.default, PokemonColor.shiny]"
    assert entries["snivy"].field("possibleColors") == "[PokemonColor.default, PokemonColor.shiny]"
    assert entries["zekrom"].field("originalSpriteSize") == "64"
    assert entries["deerling_spring"].field("name") == "'Deerling (Spring Form)'", "existing display name kept"
    assert entries["deerling_spring"].field("possibleColors") == "[PokemonColor.default]"
    # no hand-made walk_left gif on disk -> extraSprites removed
    assert entries["sawk"].field("extraSprites") is None
    # entry order untouched
    assert list(entries) == ["arceus", "victini", "snivy", "sawk", "deerling_spring", "zekrom"]


def test_extra_sprites_kept_when_walk_left_exists(tmp_path):
    (tmp_path / "gen5" / "sawk").mkdir(parents=True)
    (tmp_path / "gen5" / "sawk" / "default_walk_left_8fps.gif").write_bytes(b"GIF89a")
    text, _ = app.apply(SAMPLE_TS, [gen("sawk", 539, "Sawk")], tmp_path)
    assert {e.key: e for e in app.parse_entries(text)}["sawk"].field("extraSprites") == "[PokemonExtraSprite.leftFacing]"


def test_originalSpriteSize_removed_when_back_to_32(tmp_path):
    text, _ = app.apply(SAMPLE_TS, [gen("arceus", 493, "Arceus", generation=4, size=32)], tmp_path)
    assert {e.key: e for e in app.parse_entries(text)}["arceus"].field("originalSpriteSize") is None


def test_new_entries_inserted_in_pokedex_order(tmp_path):
    generated = [
        gen("deerling_autumn", 585, "Deerling", is_base=False),
        gen("servine", 496, "Servine"),
        gen("genesect", 649, "Genesect"),
        gen("unfezant_female", 521, "Unfezant", is_base=False),
    ]
    text, stats = app.apply(SAMPLE_TS, generated, tmp_path)
    assert stats["added"] == 4
    keys = [e.key for e in app.parse_entries(text)]
    assert keys == [
        "arceus", "victini", "snivy", "servine", "unfezant_female", "sawk",
        "deerling_spring", "deerling_autumn", "zekrom", "genesect",
    ]
    entries = {e.key: e for e in app.parse_entries(text)}
    assert entries["deerling_autumn"].field("name") == "'Deerling (Autumn)'"
    assert entries["unfezant_female"].field("name") == "'Unfezant (Female)'"
    assert entries["genesect"].field("cry") == "'Genesect!'"


def test_new_generation_gets_header_and_goes_after_previous(tmp_path):
    generated = [gen("chespin", 650, "Chespin", generation=6), gen("sylveon", 700, "Sylveon", generation=6, size=64)]
    text, stats = app.apply(SAMPLE_TS, generated, tmp_path)
    assert stats["added"] == 2
    assert "  /* Generation 6 */\n  chespin: {" in text
    keys = [e.key for e in app.parse_entries(text)]
    assert keys[-3:] == ["zekrom", "chespin", "sylveon"]
    assert text.rstrip().endswith("};")
    assert "originalSpriteSize: 64,\n  },\n};" in text


def test_main_preserves_crlf_and_is_idempotent(tmp_path):
    data = tmp_path / "pokemon-data.ts"
    data.write_bytes(SAMPLE_TS.replace("\n", "\r\n").encode())
    manifest = tmp_path / "m.json"
    manifest.write_text(json.dumps({"generated": [gen("snivy", 495, "Snivy"), gen("servine", 496, "Servine")]}))
    assert app.main(["--manifest", str(manifest), "--data", str(data), "--media", str(tmp_path)]) == 0
    out = data.read_bytes()
    assert b"\r\n" in out and b"\n\n" not in out.replace(b"\r\n", b"")
    assert out.count(b"\n") == out.count(b"\r\n"), "every line ending is CRLF"
    first = out
    app.main(["--manifest", str(manifest), "--data", str(data), "--media", str(tmp_path)])
    assert data.read_bytes() == first, "second run changes nothing"
