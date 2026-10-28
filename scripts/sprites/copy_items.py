#!/usr/bin/env python3
"""
Copy the item sprites referenced by ``src/common/items.ts`` from the PokéAPI
item sprites (``sprites/sprites/items/<key-with-dashes>.png``) into
``media/items/<key>.png``, normalised to 30x30 (the Gen 3–7 item sprite size).

Larger art (64/128/160 px, Gen 8+ style) is cropped to its content and scaled
down to fit. Existing files are left alone unless ``--force`` is given.

    python3 scripts/sprites/copy_items.py [--force]
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent.parent
ITEMS_TS = ROOT / "src" / "common" / "items.ts"
SOURCE = ROOT / "sprites" / "sprites" / "items"
DEST = ROOT / "media" / "items"
SIZE = 30
CONTENT = 26  # px of the 30x30 canvas used by large art after downscaling


def item_keys(ts_path: Path = ITEMS_TS) -> list[str]:
    return re.findall(r"^  ([a-z0-9_]+): \{", ts_path.read_text(encoding="utf-8"), re.M)


def normalise(src: Path) -> Image.Image:
    im = Image.open(src).convert("RGBA")
    if im.size == (SIZE, SIZE):
        return im
    bbox = im.getbbox()
    content = im.crop(bbox) if bbox else im
    scale = min(CONTENT / content.width, CONTENT / content.height, 1.0)
    content = content.resize(
        (max(1, round(content.width * scale)), max(1, round(content.height * scale))),
        Image.Resampling.LANCZOS,
    )
    content.putalpha(content.getchannel("A").point(lambda v: 255 if v >= 96 else 0))
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(content, ((SIZE - content.width) // 2, (SIZE - content.height) // 2), content)
    return out


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--force", action="store_true")
    args = p.parse_args(argv)
    DEST.mkdir(parents=True, exist_ok=True)
    missing, written = [], 0
    for key in item_keys():
        src = SOURCE / f"{key.replace('_', '-')}.png"
        dest = DEST / f"{key}.png"
        if not src.exists():
            missing.append(src.name)
            continue
        if dest.exists() and not args.force:
            continue
        normalise(src).save(dest)
        written += 1
    print(f"{written} sprite(s) written to {DEST}")
    if missing:
        print("missing source sprites: " + ", ".join(missing))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
