"""
Tests for scripts/sprites/generate_pokemon_gifs.py

Run with:  python -m pytest scripts/sprites/tests -q

Most tests work on synthetic sprites so they run anywhere.  The tests marked
``needs_repo_sprites`` exercise the real static assets in
``sprites/sprites/pokemon`` and are skipped when that folder is not present.
"""
from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path

import pytest
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import generate_pokemon_gifs as gen  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parents[3]
REAL_SOURCE_ROOT = REPO_ROOT / "sprites" / "sprites" / "pokemon"
needs_repo_sprites = pytest.mark.skipif(
    not (REAL_SOURCE_ROOT / "494.png").exists(), reason="repo sprite assets not available"
)


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------


def make_sprite(width: int, height: int, color=(200, 40, 40, 255), canvas: int = 96) -> Image.Image:
    """A 96x96 transparent PNG-like image with a coloured blob of the given size in it."""
    img = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    blob = Image.new("RGBA", (width, height), color)
    # a darker "outline" column so the sprite is asymmetric and has >1 colour
    for y in range(height):
        blob.putpixel((0, y), (20, 20, 20, 255))
    img.paste(blob, ((canvas - width) // 2, canvas - 5 - height))
    return img


def read_gif_frames(data: bytes):
    im = Image.open(io.BytesIO(data))
    frames, durations = [], []
    try:
        while True:
            frames.append(im.convert("RGBA"))
            durations.append(im.info.get("duration"))
            im.seek(im.tell() + 1)
    except EOFError:
        pass
    return im, frames, durations


def write_pokedex(path: Path, entries: dict) -> Path:
    path.write_text(json.dumps({"pokemon": entries}), encoding="utf-8")
    return path


@pytest.fixture
def fake_source(tmp_path: Path) -> Path:
    """A miniature PokéAPI-style sprite tree."""
    root = tmp_path / "src"
    for sub in ("", "shiny", "female", "shiny/female"):
        (root / sub).mkdir(parents=True, exist_ok=True)
    make_sprite(40, 50).save(root / "494.png")  # small -> 32 canvas
    make_sprite(40, 50, (40, 200, 40, 255)).save(root / "shiny" / "494.png")
    make_sprite(90, 80).save(root / "643.png")  # huge -> 64 canvas (pokedex override)
    make_sprite(90, 80, (60, 60, 220, 255)).save(root / "shiny" / "643.png")
    make_sprite(30, 30).save(root / "585.png")  # base + forms
    make_sprite(30, 30).save(root / "585-autumn.png")
    make_sprite(30, 30).save(root / "shiny" / "585-autumn.png")
    make_sprite(30, 30).save(root / "592.png")  # female variant
    make_sprite(30, 30).save(root / "female" / "592.png")
    make_sprite(30, 30).save(root / "shiny" / "700.png")  # shiny only -> skipped
    return root


@pytest.fixture
def fake_pokedex(tmp_path: Path) -> dict:
    entries = {
        "494": {"name": "Victini", "slug": "victini", "generation": 5},
        "585": {"name": "Deerling", "slug": "deerling", "generation": 5, "base_form": "spring"},
        "592": {"name": "Frillish", "slug": "frillish", "generation": 5},
        "643": {"name": "Reshiram", "slug": "reshiram", "generation": 5, "sprite_size": 64},
        "700": {"name": "Sylveon", "slug": "sylveon", "generation": 6},
        "866": {"name": "Mr. Rime", "generation": 8},  # slug derived
    }
    path = write_pokedex(tmp_path / "pokedex.json", entries)
    return gen.load_pokedex(path)


# ---------------------------------------------------------------------------
# naming
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "name,slug",
    [
        ("Victini", "victini"),
        ("Mr. Rime", "mrrime"),
        ("Sirfetch'd", "sirfetchd"),
        ("Flabébé", "flabebe"),
        ("Type: Null", "typenull"),
        ("Tapu Koko", "tapukoko"),
        ("Jangmo-o", "jangmoo"),
        ("Porygon2", "porygon2"),
        ("Wo-Chien", "wochien"),
    ],
)
def test_slugify_matches_pokemon_data_conventions(name, slug):
    assert gen.slugify(name) == slug


@pytest.mark.parametrize("form,suffix", [("autumn", "autumn"), ("blue-striped", "blue_striped"), ("Form-1", "form_1")])
def test_form_to_suffix(form, suffix):
    assert gen.form_to_suffix(form) == suffix


def test_load_pokedex_derives_slug_and_base_key(fake_pokedex):
    assert fake_pokedex[866].slug == "mrrime"
    assert fake_pokedex[585].base_key == "deerling_spring"
    assert fake_pokedex[494].base_key == "victini"


def test_bundled_pokedex_is_complete_and_consistent():
    entries = gen.load_pokedex(gen.DEFAULT_POKEDEX)
    ids = sorted(entries)
    assert ids[0] == 494 and ids[-1] == 1025
    assert ids == list(range(494, 1026)), "pokedex.json must be contiguous from Victini to Pecharunt"
    gens = {5: (494, 649), 6: (650, 721), 7: (722, 809), 8: (810, 905), 9: (906, 1025)}
    for pid, entry in entries.items():
        lo, hi = gens[entry.generation]
        assert lo <= pid <= hi, f"#{pid} {entry.name} has generation {entry.generation}"
        assert re.fullmatch(r"[a-z0-9]+", entry.slug), entry.slug
        assert entry.slug == gen.slugify(entry.name)
        assert entry.sprite_size in (None, 32, 64)
    keys = [e.base_key for e in entries.values()]
    assert len(keys) == len(set(keys)), "duplicate keys in pokedex.json"


# ---------------------------------------------------------------------------
# discovery
# ---------------------------------------------------------------------------


def test_discover_jobs_finds_base_forms_female_and_missing(fake_source, fake_pokedex):
    jobs = gen.discover_jobs(fake_pokedex, [494, 585, 592, 700, 999], fake_source)
    by_key = {j.key: j for j in jobs}
    assert set(by_key) == {
        "victini",
        "deerling_spring",
        "deerling_autumn",
        "frillish",
        "frillish_female",
        "sylveon",
    }
    assert set(by_key["victini"].sources) == {"default", "shiny"}
    assert set(by_key["deerling_spring"].sources) == {"default"}
    assert by_key["deerling_spring"].missing == {"shiny": "shiny/585.png"}
    assert set(by_key["deerling_autumn"].sources) == {"default", "shiny"}
    assert by_key["frillish_female"].sources["default"] == fake_source / "female" / "592.png"
    assert by_key["frillish_female"].missing["shiny"] == "shiny/female/592.png"
    assert by_key["sylveon"].missing["default"] == "700.png"
    assert by_key["sylveon"].out_dir_name == "gen6/sylveon"


def test_discover_jobs_dedupes_female_form_file_and_female_folder(fake_source, fake_pokedex):
    # PokéAPI ships Frillish's female both as 592-female.png and female/592.png
    make_sprite(30, 30).save(fake_source / "592-female.png")
    jobs = gen.discover_jobs(fake_pokedex, [592], fake_source)
    assert [j.key for j in jobs] == ["frillish", "frillish_female"]


def test_discover_jobs_can_exclude_forms_and_female(fake_source, fake_pokedex):
    jobs = gen.discover_jobs(fake_pokedex, [585, 592], fake_source, include_forms=False, include_female=False)
    assert [j.key for j in jobs] == ["deerling_spring", "frillish"]


def test_parse_ids_variants(fake_pokedex):
    assert gen.parse_ids("494,585-592", None, None, [], fake_pokedex) == [494, 585, 586, 587, 588, 589, 590, 591, 592]
    assert gen.parse_ids(None, 600, 700, [], fake_pokedex) == list(range(600, 701))
    assert gen.parse_ids(None, None, None, [6], fake_pokedex) == [700]
    # everything in the pokedex when nothing is selected
    assert gen.parse_ids(None, None, None, [], fake_pokedex) == [494, 585, 592, 643, 700, 866]
    # hand-made generations are never regenerated
    assert gen.parse_ids("1-10,494", None, None, [], fake_pokedex) == [494]


# ---------------------------------------------------------------------------
# rendering
# ---------------------------------------------------------------------------


def test_choose_canvas_auto_and_forced():
    small = Image.new("RGBA", (40, 50))
    huge = Image.new("RGBA", (90, 80))
    # default: heuristic off, everything without an override is 32
    assert gen.choose_canvas(small, None, gen.DEFAULT_LARGE_THRESHOLD) == 32
    assert gen.choose_canvas(huge, None, gen.DEFAULT_LARGE_THRESHOLD) == 32
    # opt-in threshold
    assert gen.choose_canvas(small, None, 88) == 32
    assert gen.choose_canvas(huge, None, 88) == 64
    assert gen.choose_canvas(huge, 32, 88) == 32
    assert gen.choose_canvas(small, 64, 88) == 64
    with pytest.raises(ValueError):
        gen.choose_canvas(small, 48, 88)


def test_compute_scale_never_overflows_canvas():
    opts = gen.RenderOptions()
    for w, h in [(10, 10), (40, 50), (60, 60), (70, 30), (96, 96)]:
        content = Image.new("RGBA", (w, h))
        for canvas in (32, 64):
            scale = gen.compute_scale(content, canvas, opts)
            assert round(w * scale) <= canvas - 2 * gen.CANVAS_MARGIN
            assert round(h * scale) <= canvas - 2 * gen.CANVAS_MARGIN
    # small content keeps the nominal scale so relative sizes are preserved
    assert gen.compute_scale(Image.new("RGBA", (40, 50)), 32, opts) == pytest.approx(0.5)


def test_frames_are_canvas_sized_and_anchored_to_floor():
    opts = gen.RenderOptions()
    content = gen.crop_to_content(make_sprite(40, 50))
    scale = gen.compute_scale(content, 32, opts)
    idle = gen.build_idle_frames(content, 32, scale, opts)
    walk = gen.build_walk_frames(content, 32, scale, opts)
    assert len(idle) == 2 and len(walk) == gen.DEFAULT_WALK_FRAMES == 4
    for frame in idle + walk:
        assert frame.size == (32, 32)
        bbox = frame.getbbox()
        assert bbox is not None
        # feet on the floor (1px margin) or hopping up to 2px above it
        assert bbox[3] in (31, 30, 29)
        # alpha is binary (GIF has no partial transparency)
        assert set(gen.pixels(frame.getchannel("A"))) <= {0, 255}
    # idle second frame is a squash (breathe): shorter but same width/feet
    assert idle[1].getbbox()[3] == 31 and idle[1].getbbox()[1] > idle[0].getbbox()[1]
    # walk: one hop per loop - ground (squashed) -> apex (stretched, 2px up) -> down
    bottoms = [f.getbbox()[3] for f in walk]
    assert bottoms == [31, 30, 29, 30]
    ground, apex = walk[0].getbbox(), walk[2].getbbox()
    assert (ground[2] - ground[0]) > (apex[2] - apex[0]), "squashed on the ground is wider"
    assert (ground[3] - ground[1]) < (apex[3] - apex[1]), "stretched at the apex is taller"
    assert walk[1].tobytes() == walk[3].tobytes() and walk[1].tobytes() != walk[0].tobytes()


def test_idle_shift_style():
    opts = gen.RenderOptions(idle_style="shift")
    content = gen.crop_to_content(make_sprite(40, 50))
    idle = gen.build_idle_frames(content, 32, 0.5, opts)
    b0, b1 = idle[0].getbbox(), idle[1].getbbox()
    assert (b1[1], b1[3]) == (b0[1] - 1, b0[3] - 1)


def test_large_canvas_uses_two_pixel_units():
    opts = gen.RenderOptions()
    content = gen.crop_to_content(make_sprite(90, 80))
    scale = gen.compute_scale(content, 64, opts)
    walk = gen.build_walk_frames(content, 64, scale, opts)
    assert walk[0].size == (64, 64)
    # hop height doubles on the 64px canvas (4px at the apex)
    assert walk[2].getbbox()[3] == walk[0].getbbox()[3] - 4
    idle = gen.build_idle_frames(content, 64, scale, opts)
    assert idle[1].getbbox()[1] == idle[0].getbbox()[1] + 2


def test_walk_cycle_shape():
    cycle = gen.walk_cycle(4, 2.0, 0.06)
    assert [dy for dy, _ in cycle] == [0, -1, -2, -1]
    assert [dy for dy, _ in gen.walk_cycle(8, 2.0, 0.06)] == [0, -1, -1, -2, -2, -2, -1, -1]
    assert cycle[0][1] == pytest.approx(0.06)  # squash on the ground
    assert cycle[2][1] == pytest.approx(-0.06)  # stretch at the apex
    assert gen.walk_cycle(4, 0, 0) == [(0, 0.0)] * 4


def test_squash_stretch_and_tilt_keep_content():
    content = gen.crop_to_content(make_sprite(40, 50))
    squashed = gen.squash_stretch(content, 0.1)
    stretched = gen.squash_stretch(content, -0.1)
    assert squashed.size == (44, 45) and stretched.size == (36, 55)
    assert gen.squash_stretch(content, 0) is content
    assert gen.tilt(content, 0) is content
    leaned = gen.tilt(content, -4)
    assert leaned.getbbox() == (0, 0, leaned.width, leaned.height)  # re-cropped


def test_face_right_mirrors_left_facing_sources():
    content = gen.crop_to_content(make_sprite(40, 50))  # dark column on the LEFT edge
    assert content.getpixel((0, 0)) == (20, 20, 20, 255)
    mirrored = gen.face_right(content, "left")
    assert mirrored.getpixel((mirrored.width - 1, 0)) == (20, 20, 20, 255)
    assert gen.face_right(content, "right").tobytes() == content.tobytes()
    assert gen.face_right(content, "front").tobytes() == content.tobytes()
    with pytest.raises(ValueError):
        gen.face_right(content, "up")


def test_render_job_uses_facing_override(fake_source, tmp_path):
    entries = gen.load_pokedex(
        write_pokedex(
            tmp_path / "p.json",
            {"494": {"name": "Victini", "generation": 5, "facing": "right"}},
        )
    )
    job = gen.discover_jobs(entries, [494], fake_source)[0]
    assert entries[494].facing == "right"
    out_default = tmp_path / "default"
    out_override = tmp_path / "override"
    gen.render_job(job, out_default, gen.RenderOptions())
    gen.render_job(job, out_override, gen.RenderOptions(source_facing="right"))
    a = Image.open(out_default / "gen5/victini/default_idle_8fps.gif").convert("RGBA")
    b = Image.open(out_override / "gen5/victini/default_idle_8fps.gif").convert("RGBA")
    # the pokedex "facing" override wins over --source-facing, so both are identical
    assert a.tobytes() == b.tobytes()
    # ... and the un-mirrored source keeps its dark edge on the LEFT
    x0, y0, x1, _ = a.getbbox()
    y = y0 + 2
    assert a.getpixel((x0, y))[0] < a.getpixel((x1 - 1, y))[0], "left edge should be the dark column"


# ---------------------------------------------------------------------------
# gif encoding
# ---------------------------------------------------------------------------


def test_gif_roundtrip_preserves_frames_durations_and_transparency():
    opts = gen.RenderOptions()
    content = gen.crop_to_content(make_sprite(40, 50))
    frames = gen.build_walk_frames(content, 32, 0.5, opts)
    data = gen.frames_to_gif_bytes(frames, [70] * len(frames))
    assert data.startswith(b"GIF89a")
    im, decoded, durations = read_gif_frames(data)
    assert im.size == (32, 32)
    assert len(decoded) == len(frames) == 4
    assert durations == [70] * 4
    assert im.info.get("loop") == 0
    for expected, got in zip(frames, decoded):
        assert got.getchannel("A").tobytes() == expected.getchannel("A").tobytes()
        # opaque pixels keep their exact colours (palette had room for all of them)
        assert got.tobytes() == expected.tobytes()


def test_gif_quantizes_when_more_than_255_colours():
    # a 32x32 gradient has > 255 colours; must still encode and keep alpha exact
    frame = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    for y in range(2, 30):
        for x in range(2, 30):
            frame.putpixel((x, y), (x * 8, y * 8, (x * y) % 256, 255))
    shifted = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    shifted.paste(frame, (0, -1))
    data = gen.frames_to_gif_bytes([frame, shifted], [300, 300])
    _, decoded, _ = read_gif_frames(data)
    assert len(decoded) == 2
    assert decoded[0].getchannel("A").tobytes() == frame.getchannel("A").tobytes()
    assert decoded[1].getchannel("A").tobytes() == shifted.getchannel("A").tobytes()
    # colours are approximated, but must stay close to the originals
    for expected, got in zip(gen.pixels(frame), gen.pixels(decoded[0])):
        if expected[3]:
            assert max(abs(e - g) for e, g in zip(expected[:3], got[:3])) < 48


def gif_image_descriptors(data: bytes):
    """(left, top, right, bottom) of every image block in a GIF, in file order."""
    import struct

    pos, packed = 13, data[10]
    if packed & 0x80:
        pos += 3 * (1 << ((packed & 7) + 1))

    def skip_sub_blocks(p):
        while True:
            size = data[p]
            p += 1
            if size == 0:
                return p
            p += size

    rects = []
    while pos < len(data):
        block = data[pos]
        pos += 1
        if block == 0x3B:
            break
        if block == 0x21:
            pos = skip_sub_blocks(pos + 1)
        elif block == 0x2C:
            left, top, w, h = struct.unpack("<HHHH", data[pos : pos + 8])
            img_packed = data[pos + 8]
            pos += 9
            if img_packed & 0x80:
                pos += 3 * (1 << ((img_packed & 7) + 1))
            pos = skip_sub_blocks(pos + 1)
            rects.append((left, top, left + w, top + h))
    return rects


def test_gif_frames_are_never_cropped_below_their_content():
    """Pillow stores sub-rectangles per frame; they must contain every opaque pixel."""
    opts = gen.RenderOptions()
    content = gen.crop_to_content(make_sprite(40, 50))
    frames = gen.build_walk_frames(content, 32, 0.5, opts)
    rects = gif_image_descriptors(gen.frames_to_gif_bytes(frames, [70] * len(frames)))
    assert len(rects) == 4
    for frame, (l, t, r, b) in zip(frames, rects):
        x0, y0, x1, y1 = frame.getbbox()
        assert l <= x0 and t <= y0 and r >= x1 and b >= y1


def test_gif_output_is_deterministic():
    opts = gen.RenderOptions()
    content = gen.crop_to_content(make_sprite(40, 50))
    a = gen.frames_to_gif_bytes(gen.build_idle_frames(content, 32, 0.5, opts), [300, 300])
    b = gen.frames_to_gif_bytes(gen.build_idle_frames(content, 32, 0.5, opts), [300, 300])
    assert a == b


# ---------------------------------------------------------------------------
# end to end (render_job / CLI)
# ---------------------------------------------------------------------------


def expected_files(key: str, gen_no: int, colors=("default", "shiny")):
    return sorted(f"gen{gen_no}/{key}/{c}_{s}_8fps.gif" for c in colors for s in ("idle", "walk"))


def test_render_job_writes_expected_files(fake_source, fake_pokedex, tmp_path):
    out = tmp_path / "media"
    jobs = {j.key: j for j in gen.discover_jobs(fake_pokedex, [494, 585, 643, 700], fake_source)}
    opts = gen.RenderOptions()

    r = gen.render_job(jobs["victini"], out, opts)
    assert not r.skipped and r.colors == ["default", "shiny"] and r.sprite_size == 32
    assert sorted(r.files) == expected_files("victini", 5)
    for rel in r.files:
        assert (out / rel).exists()
        assert Image.open(out / rel).size == (32, 32)

    r = gen.render_job(jobs["deerling_spring"], out, opts)
    assert r.colors == ["default"] and r.missing == {"shiny": "shiny/585.png"}
    assert sorted(r.files) == expected_files("deerling_spring", 5, ("default",))

    r = gen.render_job(jobs["reshiram"], out, opts)
    assert r.sprite_size == 64, "sprite_size override from pokedex.json"
    assert Image.open(out / "gen5/reshiram/default_idle_8fps.gif").size == (64, 64)

    r = gen.render_job(jobs["sylveon"], out, opts)
    assert r.skipped and "missing default" in r.reason and r.files == []
    assert not (out / "gen6").exists()


def test_render_job_large_threshold_opt_in(fake_source, fake_pokedex, tmp_path):
    # victini is 40x50 in the fake source: below 88 -> 32, with a low threshold -> 64
    job = next(j for j in gen.discover_jobs(fake_pokedex, [494], fake_source) if j.key == "victini")
    assert gen.render_job(job, tmp_path / "a", gen.RenderOptions()).sprite_size == 32
    assert gen.render_job(job, tmp_path / "b", gen.RenderOptions(large_threshold=40)).sprite_size == 64


def test_render_job_respects_existing_files_unless_forced(fake_source, fake_pokedex, tmp_path):
    out = tmp_path / "media"
    job = next(j for j in gen.discover_jobs(fake_pokedex, [494], fake_source) if j.key == "victini")
    target = out / "gen5" / "victini" / "default_idle_8fps.gif"
    target.parent.mkdir(parents=True)
    target.write_bytes(b"hand-made")
    gen.render_job(job, out, gen.RenderOptions())
    assert target.read_bytes() == b"hand-made", "existing (hand-made) gifs must not be overwritten by default"
    gen.render_job(job, out, gen.RenderOptions(), force=True)
    assert target.read_bytes().startswith(b"GIF89a")


def test_render_job_dry_run_writes_nothing(fake_source, fake_pokedex, tmp_path):
    out = tmp_path / "media"
    job = gen.discover_jobs(fake_pokedex, [494], fake_source)[0]
    r = gen.render_job(job, out, gen.RenderOptions(), dry_run=True)
    assert len(r.files) == 4 and not out.exists()


def test_cli_end_to_end_with_manifest_and_typescript(fake_source, fake_pokedex, tmp_path, capsys):
    pokedex = tmp_path / "pokedex.json"  # written by the fixture
    out = tmp_path / "media"
    manifest = tmp_path / "manifest.json"
    ts = tmp_path / "entries.ts"
    rc = gen.main(
        [
            "--pokedex", str(pokedex),
            "--source-root", str(fake_source),
            "--out", str(out),
            "--ids", "494,585,592,643,700",
            "--manifest", str(manifest),
            "--emit-ts", str(ts),
        ]
    )
    assert rc == 1, "sylveon has no default sprite so the run must signal a skip"
    printed = capsys.readouterr().out
    assert "SKIPPED #700" in printed

    data = json.loads(manifest.read_text(encoding="utf-8"))
    generated = {r["key"]: r for r in data["generated"]}
    assert set(generated) == {"victini", "deerling_spring", "deerling_autumn", "frillish", "frillish_female", "reshiram"}
    assert [r["key"] for r in data["skipped"]] == ["sylveon"]
    assert generated["reshiram"]["sprite_size"] == 64
    assert data["options"]["base_scale"] == 0.5

    snippet = ts.read_text(encoding="utf-8")
    assert "/* Generation 5 */" in snippet
    assert "  victini: {\n    id: 494,\n    name: 'Victini',\n    generation: PokemonGeneration.Gen5,\n    cry: 'Victini!',\n    possibleColors: [PokemonColor.default, PokemonColor.shiny],\n  }," in snippet
    assert "name: 'Deerling (Autumn)'" in snippet
    assert "name: 'Frillish (Female)'" in snippet
    assert "possibleColors: [PokemonColor.default],\n  }," in snippet  # deerling_spring has no shiny
    assert "originalSpriteSize: 64" in snippet
    assert "sylveon" not in snippet

    # every file listed in the manifest exists and is a valid gif of the right size
    for r in data["generated"]:
        for rel in r["files"]:
            with Image.open(out / rel) as im:
                assert im.format == "GIF"
                assert im.size == (r["sprite_size"], r["sprite_size"])


def test_ts_string_quoting():
    assert gen.ts_string("Victini") == "'Victini'"
    assert gen.ts_string("Sirfetch'd!") == '"Sirfetch\'d!"'


def test_download_missing_uses_template_and_fills_sources(fake_source, fake_pokedex, tmp_path):
    jobs = gen.discover_jobs(fake_pokedex, [700], fake_source)
    job = jobs[0]
    assert job.missing == {"default": "700.png"}

    png = io.BytesIO()
    make_sprite(30, 30).save(png, format="PNG")
    requested = []

    class FakeResponse(io.BytesIO):
        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

    def fake_opener(url, timeout):
        requested.append(url)
        return FakeResponse(png.getvalue())

    fetched = gen.download_missing(jobs, fake_source, "https://example.test/{relpath}?id={id}&slug={slug}", opener=fake_opener)
    assert fetched == 1
    assert requested == ["https://example.test/700.png?id=700&slug=sylveon"]
    assert job.sources["default"] == fake_source / "700.png"
    assert job.missing == {}
    assert (fake_source / "700.png").exists()


def test_download_missing_handles_failures(fake_source, fake_pokedex):
    jobs = gen.discover_jobs(fake_pokedex, [700], fake_source)

    def failing_opener(url, timeout):
        raise OSError("offline")

    assert gen.download_missing(jobs, fake_source, opener=failing_opener) == 0
    assert jobs[0].missing == {"default": "700.png"}


# ---------------------------------------------------------------------------
# real assets
# ---------------------------------------------------------------------------


@needs_repo_sprites
@pytest.mark.parametrize("pid,key,size", [(494, "victini", 32), (495, "snivy", 32), (643, "reshiram", 64)])
def test_real_sprites_render(tmp_path, pid, key, size):
    entries = gen.load_pokedex(gen.DEFAULT_POKEDEX)
    jobs = gen.discover_jobs(entries, [pid], REAL_SOURCE_ROOT, include_forms=False, include_female=False)
    assert [j.key for j in jobs] == [key]
    r = gen.render_job(jobs[0], tmp_path, gen.RenderOptions())
    assert r.colors == ["default", "shiny"] and r.sprite_size == size
    for rel in r.files:
        _, frames, durations = read_gif_frames((tmp_path / rel).read_bytes())
        assert frames[0].size == (size, size)
        assert all(f.getbbox() is not None for f in frames), "frames must not be empty"
        assert len(frames) == (2 if "idle" in rel else 4)
        assert durations == ([300] * 2 if "idle" in rel else [70] * 4)


@needs_repo_sprites
def test_real_gen5_sources_are_complete():
    """Every gen 5 Pokémon in the bundled sprite folder has a default + shiny sprite."""
    entries = gen.load_pokedex(gen.DEFAULT_POKEDEX)
    jobs = gen.discover_jobs(entries, range(494, 650), REAL_SOURCE_ROOT, include_forms=False, include_female=False)
    missing = [(j.key, j.missing) for j in jobs if j.missing]
    assert missing == []


def test_form_filter_limits_alternate_forms(fake_source, tmp_path):
    for form in ("vanilla-cream-strawberry-sweet", "ruby-cream-strawberry-sweet", "ruby-cream-berry-sweet"):
        make_sprite(30, 30).save(fake_source / f"869-{form}.png")
    make_sprite(30, 30).save(fake_source / "869.png")
    entries = gen.load_pokedex(
        write_pokedex(
            tmp_path / "p.json",
            {"869": {"name": "Alcremie", "generation": 8, "form_filter": "^(?!vanilla-cream).*-strawberry-sweet$"}},
        )
    )
    jobs = gen.discover_jobs(entries, [869], fake_source)
    assert [j.key for j in jobs] == ["alcremie", "alcremie_ruby_cream_strawberry_sweet"]


def test_bundled_pokedex_alcremie_filter_keeps_nine_flavours():
    entries = gen.load_pokedex(gen.DEFAULT_POKEDEX)
    assert entries[869].form_filter
    flavours = ["vanilla-cream", "ruby-cream", "matcha-cream", "mint-cream", "lemon-cream",
                "salted-cream", "ruby-swirl", "caramel-swirl", "rainbow-swirl"]
    kept = [f for f in flavours if re.search(entries[869].form_filter, f + "-strawberry-sweet")]
    assert kept == flavours[1:]
    assert not re.search(entries[869].form_filter, "ruby-cream-berry-sweet")
