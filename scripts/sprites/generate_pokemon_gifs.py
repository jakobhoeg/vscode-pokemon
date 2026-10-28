#!/usr/bin/env python3
"""
Generate the animated GIF sprites used by vscode-pokemon from static PNG sprites.

The extension expects, for every Pokémon key ``<key>`` in ``src/common/pokemon-data.ts``:

    media/gen<N>/<key>/default_idle_8fps.gif
    media/gen<N>/<key>/default_walk_8fps.gif
    media/gen<N>/<key>/shiny_idle_8fps.gif      (optional)
    media/gen<N>/<key>/shiny_walk_8fps.gif      (optional)

Generations 1-4 were hand-made from overworld sprites.  From #494 (Victini)
onwards we synthesise the idle/walk animations from the static 96x96 battle
sprites that live in ``sprites/sprites/pokemon`` (PokéAPI sprite layout):

    sprites/sprites/pokemon/<id>.png                default
    sprites/sprites/pokemon/<id>-<form>.png         default, alternate form
    sprites/sprites/pokemon/shiny/<id>.png          shiny
    sprites/sprites/pokemon/female/<id>.png         female variant
    sprites/sprites/pokemon/shiny/female/<id>.png   shiny female variant

Run ``python scripts/sprites/generate_pokemon_gifs.py --help`` or read
``scripts/sprites/README.md`` for usage.
"""
from __future__ import annotations

import argparse
import io
import json
import logging
import re
import sys
import unicodedata
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Sequence, Tuple

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover - guarded import for a friendlier error
    sys.stderr.write("Pillow is required: pip install -r scripts/sprites/requirements.txt\n")
    raise

LOG = logging.getLogger("generate_pokemon_gifs")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent.parent
DEFAULT_POKEDEX = SCRIPT_DIR / "pokedex.json"
DEFAULT_SOURCE_ROOT = REPO_ROOT / "sprites" / "sprites" / "pokemon"
DEFAULT_OUT_ROOT = REPO_ROOT / "media"

FIRST_GENERATED_ID = 494  # Victini - everything before this is hand-made.

COLORS = ("default", "shiny")
STATES = ("idle", "walk")
SUFFIX = "8fps.gif"

SMALL_CANVAS = 32
LARGE_CANVAS = 64
# Source content (max of width/height in the 96px sprite) at or above which a
# Pokémon is automatically rendered on the large 64px canvas.  0 disables the
# heuristic (default): like gen 1-4, only the Pokémon explicitly marked
# "sprite_size": 64 in pokedex.json (box legendaries & co.) get the big canvas.
DEFAULT_LARGE_THRESHOLD = 0
# Nominal downscale applied to the 96px battle sprite. Content that does not
# fit the canvas after this scale is shrunk further so it always fits.
DEFAULT_BASE_SCALE = 0.5
# Pixels of margin kept around the content inside the canvas.
CANVAS_MARGIN = 1

IDLE_FRAME_DURATION_MS = 300
# Walk cycle: a bouncy gait built from one static image - one hop per loop
# (the GIF loops, so 4 frames @ 70 ms = a hop every 280 ms) with squash &
# stretch and a slight forward lean.  More frames = smoother but bigger file.
DEFAULT_WALK_FRAMES = 4
DEFAULT_WALK_FRAME_MS = 70
DEFAULT_WALK_LEAN_DEGREES = 4.0
DEFAULT_WALK_BOUNCE = 2.0  # hop height in px on the 32px canvas (scaled for 64px)
DEFAULT_WALK_SQUASH = 0.06  # 6% squash on landing / stretch at the top of the hop

# The extension assumes sprites face RIGHT and mirrors them (scaleX(-1)) when a
# Pokémon walks left.  PokéAPI front battle sprites face the player, i.e. LEFT,
# so by default every source is mirrored.  Override per Pokémon with
# "facing": "right" (already faces right) or "front" (symmetric) in pokedex.json.
DEFAULT_SOURCE_FACING = "left"

TRANSPARENT_INDEX = 255
ALPHA_THRESHOLD = 128

# Where to fetch missing static sprites from (PokéAPI sprites repository).
DEFAULT_DOWNLOAD_URL = (
    "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{relpath}"
)


# ---------------------------------------------------------------------------
# Pokédex metadata
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class PokedexEntry:
    id: int
    name: str
    slug: str
    generation: int
    sprite_size: Optional[int] = None  # forced canvas size (32/64) or None = auto
    base_form: Optional[str] = None  # suffix appended to the base sprite key
    facing: Optional[str] = None  # "left" | "right" | "front"; None = --source-facing
    form_filter: Optional[str] = None  # regex; only <id>-<form>.png whose form matches are used

    @property
    def base_key(self) -> str:
        return f"{self.slug}_{self.base_form}" if self.base_form else self.slug


def slugify(name: str) -> str:
    """Convert a display name to the key convention used by pokemon-data.ts.

    >>> slugify("Mr. Rime")
    'mrrime'
    >>> slugify("Flabébé")
    'flabebe'
    >>> slugify("Type: Null")
    'typenull'
    """
    ascii_name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", ascii_name.lower())


def form_to_suffix(form: str) -> str:
    """Normalise a sprite file form suffix ("blue-striped") to a key suffix ("blue_striped")."""
    return re.sub(r"[^a-z0-9]+", "_", form.lower()).strip("_")


def load_pokedex(path: Path = DEFAULT_POKEDEX) -> Dict[int, PokedexEntry]:
    with open(path, encoding="utf-8") as fh:
        raw = json.load(fh)
    entries: Dict[int, PokedexEntry] = {}
    for key, value in raw["pokemon"].items():
        pid = int(key)
        entries[pid] = PokedexEntry(
            id=pid,
            name=value["name"],
            slug=value.get("slug") or slugify(value["name"]),
            generation=int(value["generation"]),
            sprite_size=value.get("sprite_size"),
            base_form=value.get("base_form"),
            facing=value.get("facing"),
            form_filter=value.get("form_filter"),
        )
    return entries


# ---------------------------------------------------------------------------
# Source discovery
# ---------------------------------------------------------------------------


@dataclass
class SpriteJob:
    """One output folder (``media/gen<N>/<key>``) and the PNGs that feed it."""

    entry: PokedexEntry
    key: str
    form: Optional[str]  # None for the base sprite
    sources: Dict[str, Path] = field(default_factory=dict)  # color -> png path
    # Relative paths (inside the source root) that would be needed to fill in
    # missing colors; used for --download and reporting.
    missing: Dict[str, str] = field(default_factory=dict)

    @property
    def out_dir_name(self) -> str:
        return f"gen{self.entry.generation}/{self.key}"


def _png_relpaths(pid: int, form: Optional[str], female: bool) -> Dict[str, str]:
    """Relative source paths (from the source root) for each color of a sprite."""
    fname = f"{pid}-{form}.png" if form else f"{pid}.png"
    if female:
        return {"default": f"female/{fname}", "shiny": f"shiny/female/{fname}"}
    return {"default": fname, "shiny": f"shiny/{fname}"}


def discover_jobs(
    entries: Dict[int, PokedexEntry],
    ids: Iterable[int],
    source_root: Path,
    include_forms: bool = True,
    include_female: bool = True,
) -> List[SpriteJob]:
    """Work out which output folders can/should be produced for ``ids``."""
    jobs: List[SpriteJob] = []
    for pid in sorted(set(ids)):
        entry = entries.get(pid)
        if entry is None:
            LOG.warning("#%d is not in the pokedex metadata - skipped", pid)
            continue

        variants: List[Tuple[str, Optional[str], bool]] = [(entry.base_key, None, False)]

        if include_forms:
            seen = set()
            for folder in (source_root, source_root / "shiny"):
                for png in sorted(folder.glob(f"{pid}-*.png")):
                    form = png.stem[len(str(pid)) + 1 :]
                    if form in seen:
                        continue
                    seen.add(form)
                    if entry.form_filter and not re.search(entry.form_filter, form):
                        LOG.debug("#%d form %s filtered out by form_filter", pid, form)
                        continue
                    variants.append((f"{entry.slug}_{form_to_suffix(form)}", form, False))

        if include_female and (
            (source_root / "female" / f"{pid}.png").exists()
            or (source_root / "shiny" / "female" / f"{pid}.png").exists()
        ):
            variants.append((f"{entry.slug}_female", None, True))

        seen_keys = set()
        for key, form, female in variants:
            if key in seen_keys:  # e.g. 592-female.png and female/592.png are the same variant
                continue
            seen_keys.add(key)
            job = SpriteJob(entry=entry, key=key, form=form)
            for color, rel in _png_relpaths(pid, form, female).items():
                path = source_root / rel
                if path.exists():
                    job.sources[color] = path
                else:
                    job.missing[color] = rel
            jobs.append(job)
    return jobs


# ---------------------------------------------------------------------------
# Downloading
# ---------------------------------------------------------------------------


def download_missing(
    jobs: Sequence[SpriteJob],
    source_root: Path,
    url_template: str = DEFAULT_DOWNLOAD_URL,
    timeout: float = 20.0,
    opener=None,
) -> int:
    """Try to fetch missing PNGs into ``source_root``. Returns number fetched."""
    opener = opener or urllib.request.urlopen
    fetched = 0
    for job in jobs:
        for color, rel in list(job.missing.items()):
            url = url_template.format(relpath=rel, id=job.entry.id, slug=job.entry.slug)
            dest = source_root / rel
            try:
                with opener(url, timeout=timeout) as resp:  # type: ignore[call-arg]
                    data = resp.read()
                Image.open(io.BytesIO(data)).verify()  # make sure it's an image
            except (urllib.error.URLError, urllib.error.HTTPError, OSError, ValueError) as exc:
                LOG.warning("download failed for %s (%s): %s", job.key, color, exc)
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            job.sources[color] = dest
            del job.missing[color]
            fetched += 1
            LOG.info("downloaded %s -> %s", url, dest)
    return fetched


# ---------------------------------------------------------------------------
# Image processing
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class RenderOptions:
    base_scale: float = DEFAULT_BASE_SCALE
    large_threshold: int = DEFAULT_LARGE_THRESHOLD
    walk_frames: int = DEFAULT_WALK_FRAMES
    walk_frame_ms: int = DEFAULT_WALK_FRAME_MS
    walk_lean: float = DEFAULT_WALK_LEAN_DEGREES
    walk_bounce: float = DEFAULT_WALK_BOUNCE
    walk_squash: float = DEFAULT_WALK_SQUASH
    source_facing: str = DEFAULT_SOURCE_FACING
    idle_style: str = "breathe"  # "breathe" | "shift"
    resample: str = "box"  # "box" | "lanczos" | "nearest"

    @property
    def resample_filter(self) -> int:
        return {
            "box": Image.Resampling.BOX,
            "lanczos": Image.Resampling.LANCZOS,
            "nearest": Image.Resampling.NEAREST,
            "bilinear": Image.Resampling.BILINEAR,
        }[self.resample]


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def pixels(img: Image.Image):
    """Flat pixel sequence; Image.getdata() is deprecated since Pillow 12."""
    getter = getattr(img, "get_flattened_data", None)
    return getter() if getter else img.getdata()


def crop_to_content(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    if bbox is None:
        raise ValueError("sprite is fully transparent")
    return img.crop(bbox)


def choose_canvas(content: Image.Image, forced: Optional[int], threshold: int) -> int:
    if forced in (SMALL_CANVAS, LARGE_CANVAS):
        return int(forced)
    if forced is not None:
        raise ValueError(f"sprite_size must be {SMALL_CANVAS} or {LARGE_CANVAS}, got {forced}")
    if threshold and max(content.size) >= threshold:
        return LARGE_CANVAS
    return SMALL_CANVAS


def compute_scale(content: Image.Image, canvas: int, opts: RenderOptions) -> float:
    """Nominal scale, reduced if needed so the content fits inside the canvas."""
    limit = canvas - 2 * CANVAS_MARGIN
    fit = limit / max(content.size)
    if canvas == LARGE_CANVAS:
        # Large canvases get a bigger nominal scale so giants look giant.
        nominal = max(opts.base_scale, limit / 96.0)
    else:
        nominal = opts.base_scale
    return min(nominal, fit)


def threshold_alpha(img: Image.Image) -> Image.Image:
    """GIF only supports 1-bit transparency: make alpha fully on/off."""
    alpha = img.getchannel("A").point(lambda v: 255 if v >= ALPHA_THRESHOLD else 0)
    out = img.copy()
    out.putalpha(alpha)
    return out


def scale_content(content: Image.Image, scale: float, opts: RenderOptions) -> Image.Image:
    w = max(1, round(content.width * scale))
    h = max(1, round(content.height * scale))
    return threshold_alpha(content.resize((w, h), opts.resample_filter))


def place_on_canvas(sprite: Image.Image, canvas: int, dx: int = 0, dy: int = 0) -> Image.Image:
    """Anchor ``sprite`` bottom-centre on a transparent ``canvas``x``canvas`` image."""
    frame = Image.new("RGBA", (canvas, canvas), (0, 0, 0, 0))
    x = (canvas - sprite.width) // 2 + dx
    y = canvas - CANVAS_MARGIN - sprite.height + dy
    frame.paste(sprite, (x, y), sprite)
    return frame


def tilt(content: Image.Image, degrees: float) -> Image.Image:
    """Rotate (pixel-perfect, no smoothing) and re-crop so the feet stay on the floor.

    Positive degrees lean the top of the sprite to the LEFT (PIL rotates
    counter-clockwise), negative to the right.
    """
    if abs(degrees) < 1e-6:
        return content
    rotated = content.rotate(degrees, resample=Image.Resampling.NEAREST, expand=True)
    return crop_to_content(rotated)


def face_right(content: Image.Image, facing: str) -> Image.Image:
    """Mirror a left-facing source so the sprite faces right like the gen 1-4 assets."""
    if facing not in ("left", "right", "front"):
        raise ValueError(f"facing must be left, right or front, got {facing!r}")
    return ImageOps.mirror(content) if facing == "left" else content


def squash_stretch(content: Image.Image, amount: float) -> Image.Image:
    """amount > 0: squash (wider + shorter), amount < 0: stretch (narrower + taller)."""
    if abs(amount) < 1e-6:
        return content
    w = max(1, round(content.width * (1 + amount)))
    h = max(1, round(content.height * (1 - amount)))
    return content.resize((w, h), Image.Resampling.BILINEAR)


def fit_to_canvas(sprite: Image.Image, canvas: int) -> Image.Image:
    """Safety net: transformed frames may grow a pixel or two past the canvas."""
    limit = canvas - 2 * CANVAS_MARGIN
    if sprite.width <= limit and sprite.height <= limit:
        return sprite
    k = min(limit / sprite.width, limit / sprite.height)
    return sprite.resize(
        (max(1, round(sprite.width * k)), max(1, round(sprite.height * k))),
        Image.Resampling.NEAREST,
    )


def build_idle_frames(
    content: Image.Image, canvas: int, scale: float, opts: RenderOptions
) -> List[Image.Image]:
    """Two frame 'breathing' loop, matching the hand-made gen 1-4 sprites."""
    base = scale_content(content, scale, opts)
    unit = canvas // SMALL_CANVAS  # 1px on a 32 canvas, 2px on a 64 canvas
    if opts.idle_style == "shift":
        second = place_on_canvas(base, canvas, dy=-unit)
    else:  # breathe: squash the sprite down by one unit, keep feet planted
        squashed = base.resize(
            (base.width, max(1, base.height - unit)), Image.Resampling.NEAREST
        )
        second = place_on_canvas(squashed, canvas)
    return [place_on_canvas(base, canvas), second]


def walk_cycle(n: int, bounce: float, squash: float):
    """Per-frame (dy, squash) for one hop per loop. dy <= 0 (up), squash in [-s, s]."""
    import math

    cycle = []
    for i in range(n):
        height = math.sin(math.pi * i / n)  # 0 on the ground, 1 at the apex
        dy = -round(bounce * height)
        # on the ground (height ~ 0) -> squash, at the apex -> stretch
        sq = squash * (1 - 2 * height)
        cycle.append((dy, sq))
    return cycle


def build_walk_frames(
    content: Image.Image, canvas: int, scale: float, opts: RenderOptions
) -> List[Image.Image]:
    """Bouncy gait: one hop per loop with squash & stretch and a forward lean.

    The sprite faces right, so "forward" is a clockwise (negative) lean.
    """
    unit = canvas // SMALL_CANVAS
    leaned = tilt(content, -opts.walk_lean)
    frames: List[Image.Image] = []
    for dy, sq in walk_cycle(opts.walk_frames, opts.walk_bounce * unit, opts.walk_squash):
        sprite = scale_content(squash_stretch(leaned, sq), scale, opts)
        sprite = fit_to_canvas(sprite, canvas)
        frames.append(place_on_canvas(sprite, canvas, dy=dy))
    return frames


# ---------------------------------------------------------------------------
# GIF encoding
# ---------------------------------------------------------------------------


def _build_palette(frames: Sequence[Image.Image]) -> List[Tuple[int, int, int]]:
    """Global palette (<= 255 colours) shared by all frames; index 255 is transparent."""
    opaque: List[Tuple[int, int, int]] = []
    for frame in frames:
        for r, g, b, a in pixels(frame):
            if a >= ALPHA_THRESHOLD:
                opaque.append((r, g, b))
    unique = sorted(set(opaque))
    if len(unique) <= TRANSPARENT_INDEX:
        return unique
    strip = Image.new("RGB", (len(opaque), 1))
    strip.putdata(opaque)
    quantized = strip.quantize(colors=TRANSPARENT_INDEX, method=Image.Quantize.MEDIANCUT)
    raw = quantized.getpalette()[: TRANSPARENT_INDEX * 3]
    return sorted({(raw[i], raw[i + 1], raw[i + 2]) for i in range(0, len(raw), 3)})


def _nearest_index(color: Tuple[int, int, int], palette: Sequence[Tuple[int, int, int]]) -> int:
    r, g, b = color
    best, best_d = 0, 1 << 30
    for i, (pr, pg, pb) in enumerate(palette):
        d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
        if d < best_d:
            best, best_d = i, d
            if d == 0:
                break
    return best


def frames_to_gif_bytes(frames: Sequence[Image.Image], durations: Sequence[int]) -> bytes:
    if len(frames) != len(durations):
        raise ValueError("frames/durations length mismatch")
    palette = _build_palette(frames)
    flat = [c for rgb in palette for c in rgb]
    flat += [0] * (TRANSPARENT_INDEX * 3 - len(flat))
    flat += [0, 0, 0]  # transparent slot
    lookup: Dict[Tuple[int, int, int], int] = {rgb: i for i, rgb in enumerate(palette)}

    indexed: List[Image.Image] = []
    for frame in frames:
        data = []
        for r, g, b, a in pixels(frame):
            if a < ALPHA_THRESHOLD:
                data.append(TRANSPARENT_INDEX)
                continue
            idx = lookup.get((r, g, b))
            if idx is None:  # only when the palette had to be quantized
                idx = lookup[(r, g, b)] = _nearest_index((r, g, b), palette)
            data.append(idx)
        img = Image.new("P", frame.size)
        img.putdata(data)
        img.putpalette(flat)
        indexed.append(img)
    buf = io.BytesIO()
    indexed[0].save(
        buf,
        format="GIF",
        save_all=True,
        append_images=indexed[1:],
        duration=list(durations),
        loop=0,
        disposal=2,
        transparency=TRANSPARENT_INDEX,
        optimize=False,
    )
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------


@dataclass
class JobResult:
    key: str
    id: int
    name: str
    generation: int
    sprite_size: int
    colors: List[str]
    files: List[str]
    skipped: bool = False
    reason: str = ""
    missing: Dict[str, str] = field(default_factory=dict)
    is_base: bool = True  # False for alternate forms / female variants


def render_job(
    job: SpriteJob, out_root: Path, opts: RenderOptions, force: bool = False, dry_run: bool = False
) -> JobResult:
    entry = job.entry
    result = JobResult(
        key=job.key,
        id=entry.id,
        name=entry.name,
        generation=entry.generation,
        sprite_size=0,
        colors=[],
        files=[],
        missing=dict(job.missing),
        is_base=job.key == entry.base_key,
    )
    if "default" not in job.sources:
        result.skipped = True
        result.reason = f"missing default sprite ({job.missing.get('default')})"
        LOG.info("#%d %s: %s", entry.id, job.key, result.reason)
        return result

    facing = entry.facing or opts.source_facing
    # The default sprite decides the canvas/scale so shiny and default line up.
    default_content = face_right(crop_to_content(load_rgba(job.sources["default"])), facing)
    canvas = choose_canvas(default_content, entry.sprite_size, opts.large_threshold)
    scale = compute_scale(default_content, canvas, opts)
    result.sprite_size = canvas

    out_dir = out_root / f"gen{entry.generation}" / job.key
    for color in COLORS:
        src = job.sources.get(color)
        if src is None:
            continue
        content = (
            default_content
            if color == "default"
            else face_right(crop_to_content(load_rgba(src)), facing)
        )
        animations = {
            "idle": (build_idle_frames(content, canvas, scale, opts), IDLE_FRAME_DURATION_MS),
            "walk": (build_walk_frames(content, canvas, scale, opts), opts.walk_frame_ms),
        }
        for state, (frames, duration) in animations.items():
            target = out_dir / f"{color}_{state}_{SUFFIX}"
            result.files.append(target.relative_to(out_root).as_posix())
            if target.exists() and not force:
                LOG.debug("exists, skipping %s", target)
                continue
            if dry_run:
                LOG.info("[dry-run] would write %s", target)
                continue
            out_dir.mkdir(parents=True, exist_ok=True)
            target.write_bytes(frames_to_gif_bytes(frames, [duration] * len(frames)))
            LOG.info("wrote %s", target)
        result.colors.append(color)
    return result


def parse_ids(spec: Optional[str], start: Optional[int], end: Optional[int], gens: Sequence[int],
              entries: Dict[int, PokedexEntry]) -> List[int]:
    ids: set = set()
    if spec:
        for part in spec.split(","):
            part = part.strip()
            if not part:
                continue
            if "-" in part:
                a, b = part.split("-", 1)
                ids.update(range(int(a), int(b) + 1))
            else:
                ids.add(int(part))
    if gens:
        ids.update(pid for pid, e in entries.items() if e.generation in gens)
    if start is not None or end is not None:
        lo = start if start is not None else min(entries)
        hi = end if end is not None else max(entries)
        ids.update(range(lo, hi + 1))
    if not ids:
        ids.update(entries)
    return sorted(pid for pid in ids if pid >= FIRST_GENERATED_ID)


# ---------------------------------------------------------------------------
# Output helpers (manifest / TypeScript snippet)
# ---------------------------------------------------------------------------


def results_to_manifest(results: Sequence[JobResult], opts: RenderOptions) -> dict:
    return {
        "options": opts.__dict__,
        "generated": [r.__dict__ for r in results if not r.skipped],
        "skipped": [r.__dict__ for r in results if r.skipped],
    }


def ts_string(value: str) -> str:
    """Quote a string the way prettier does in pokemon-data.ts (single quotes unless it contains one)."""
    if "'" in value:
        return json.dumps(value, ensure_ascii=False)
    return f"'{value}'"


def display_name(result: JobResult) -> str:
    """'Deerling' + key 'deerling_autumn' -> 'Deerling (Autumn)'."""
    base_slug = slugify(result.name)
    if result.key == base_slug or not result.key.startswith(base_slug + "_"):
        return result.name
    suffix = result.key[len(base_slug) + 1 :].replace("_", " ").title()
    return f"{result.name} ({suffix})"


def results_to_typescript(results: Sequence[JobResult]) -> str:
    """Render ``POKEMON_DATA_RAW`` entries for src/common/pokemon-data.ts."""
    lines: List[str] = []
    current_gen = None
    for r in sorted((r for r in results if not r.skipped), key=lambda r: (r.id, r.key)):
        if r.generation != current_gen:
            current_gen = r.generation
            lines.append(f"  /* Generation {current_gen} */")
        colors = ", ".join(f"PokemonColor.{c}" for c in r.colors)
        lines.append(f"  {r.key}: {{")
        lines.append(f"    id: {r.id},")
        lines.append(f"    name: {ts_string(display_name(r))},")
        lines.append(f"    generation: PokemonGeneration.Gen{r.generation},")
        lines.append(f"    cry: {ts_string(r.name + '!')},")
        lines.append(f"    possibleColors: [{colors}],")
        if r.sprite_size != SMALL_CANVAS:
            lines.append(f"    originalSpriteSize: {r.sprite_size},")
        lines.append("  },")
    return "\n".join(lines) + "\n"


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    sel = p.add_argument_group("selection")
    sel.add_argument("--ids", help="comma separated pokedex numbers and/or ranges, e.g. 494,500-505")
    sel.add_argument("--start", type=int, help="first pokedex number (inclusive)")
    sel.add_argument("--end", type=int, help="last pokedex number (inclusive)")
    sel.add_argument("--gen", type=int, action="append", default=[], help="whole generation(s), repeatable")
    sel.add_argument("--no-forms", action="store_true", help="skip alternate forms (<id>-<form>.png)")
    sel.add_argument("--no-female", action="store_true", help="skip female variants")

    io_ = p.add_argument_group("paths")
    io_.add_argument("--pokedex", type=Path, default=DEFAULT_POKEDEX)
    io_.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT,
                     help="folder containing <id>.png, shiny/, female/ (default: %(default)s)")
    io_.add_argument("--out", type=Path, default=DEFAULT_OUT_ROOT,
                     help="media folder to write gen<N>/<key>/*.gif into (default: %(default)s)")
    io_.add_argument("--manifest", type=Path, help="write a JSON report of what was generated")
    io_.add_argument("--emit-ts", type=Path,
                     help="write POKEMON_DATA_RAW entries for the generated sprites to this file")

    net = p.add_argument_group("downloading")
    net.add_argument("--download", action="store_true",
                     help="fetch missing source PNGs into --source-root before rendering")
    net.add_argument("--download-url", default=DEFAULT_DOWNLOAD_URL,
                     help="URL template with {relpath}, {id} and {slug} placeholders")

    rend = p.add_argument_group("rendering")
    rend.add_argument("--scale", type=float, default=DEFAULT_BASE_SCALE,
                      help="nominal downscale of the 96px sprite (default: %(default)s)")
    rend.add_argument("--large-threshold", type=int, default=DEFAULT_LARGE_THRESHOLD,
                      help="source content size (px) from which the 64px canvas is used automatically "
                           "(0 = only pokedex.json sprite_size overrides, default)")
    rend.add_argument("--walk-frames", type=int, default=DEFAULT_WALK_FRAMES,
                      help="frames per walk loop (default: %(default)s)")
    rend.add_argument("--walk-frame-ms", type=int, default=DEFAULT_WALK_FRAME_MS,
                      help="duration of one walk frame in ms (default: %(default)s)")
    rend.add_argument("--walk-lean", type=float, default=DEFAULT_WALK_LEAN_DEGREES,
                      help="forward lean in degrees while walking (default: %(default)s)")
    rend.add_argument("--walk-bounce", type=float, default=DEFAULT_WALK_BOUNCE,
                      help="hop height in px on the 32px canvas (default: %(default)s)")
    rend.add_argument("--walk-squash", type=float, default=DEFAULT_WALK_SQUASH,
                      help="squash/stretch factor, 0 disables (default: %(default)s)")
    rend.add_argument("--source-facing", choices=("left", "right", "front"), default=DEFAULT_SOURCE_FACING,
                      help="which way the source sprites face; 'left' sources are mirrored so the "
                           "result faces right like gen 1-4 (default: %(default)s)")
    rend.add_argument("--idle-style", choices=("breathe", "shift"), default="breathe")
    rend.add_argument("--resample", choices=("box", "lanczos", "nearest", "bilinear"), default="box")

    p.add_argument("--force", action="store_true", help="overwrite existing gifs")
    p.add_argument("--dry-run", action="store_true", help="do not write gifs (reports from --manifest/--emit-ts are still written)")
    p.add_argument("-v", "--verbose", action="count", default=0)
    return p


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = build_arg_parser().parse_args(argv)
    logging.basicConfig(
        level=logging.DEBUG if args.verbose > 1 else logging.INFO if args.verbose else logging.WARNING,
        format="%(levelname)s %(message)s",
    )

    entries = load_pokedex(args.pokedex)
    ids = parse_ids(args.ids, args.start, args.end, args.gen, entries)
    if not ids:
        LOG.error("nothing selected (note: ids below #%d are hand-made and never generated)", FIRST_GENERATED_ID)
        return 2

    jobs = discover_jobs(entries, ids, args.source_root,
                         include_forms=not args.no_forms, include_female=not args.no_female)
    if args.download:
        fetched = download_missing(jobs, args.source_root, args.download_url)
        LOG.info("downloaded %d file(s)", fetched)

    opts = RenderOptions(
        base_scale=args.scale,
        large_threshold=args.large_threshold,
        walk_frames=args.walk_frames,
        walk_frame_ms=args.walk_frame_ms,
        walk_lean=args.walk_lean,
        walk_bounce=args.walk_bounce,
        walk_squash=args.walk_squash,
        source_facing=args.source_facing,
        idle_style=args.idle_style,
        resample=args.resample,
    )
    results = [render_job(job, args.out, opts, force=args.force, dry_run=args.dry_run) for job in jobs]

    generated = [r for r in results if not r.skipped]
    skipped = [r for r in results if r.skipped]
    shiny_missing = [r for r in generated if "shiny" not in r.colors]
    print(f"pokemon selected: {len(ids)}   sprite folders: {len(results)}   "
          f"generated: {len(generated)}   skipped: {len(skipped)}   without shiny: {len(shiny_missing)}")
    for r in skipped:
        print(f"  SKIPPED #{r.id:<4} {r.key:<28} {r.reason}")

    # Reports are written even on --dry-run; only the gifs are skipped.
    if args.manifest:
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        args.manifest.write_text(json.dumps(results_to_manifest(results, opts), indent=2), encoding="utf-8")
        print(f"manifest written to {args.manifest}")
    if args.emit_ts:
        args.emit_ts.parent.mkdir(parents=True, exist_ok=True)
        args.emit_ts.write_text(results_to_typescript(results), encoding="utf-8")
        print(f"TypeScript entries written to {args.emit_ts}")
    # Non-zero when something could not be produced so CI / callers notice.
    return 1 if skipped else 0


if __name__ == "__main__":
    sys.exit(main())
