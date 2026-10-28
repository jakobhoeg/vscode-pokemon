#!/usr/bin/env python3
"""
Merge the result of ``generate_pokemon_gifs.py --manifest`` into
``src/common/pokemon-data.ts``.

For every generated sprite folder:

* an existing entry keeps its ``name`` / ``cry`` (and any other fields) but gets
  ``possibleColors`` and ``originalSpriteSize`` updated to match the GIFs on disk;
  ``extraSprites: [PokemonExtraSprite.leftFacing]`` is dropped unless a
  ``default_walk_left_8fps.gif`` actually exists in the folder;
* a new entry is inserted in Pokédex order (forms right after their species),
  with a ``/* Generation N */`` header when a generation is new.

Usage:
    python scripts/sprites/generate_pokemon_gifs.py --gen 5 --manifest scripts/sprites/out/gen5.json
    python scripts/sprites/apply_to_pokemon_data.py --manifest scripts/sprites/out/gen5.json

Line endings of the TypeScript file are preserved.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Sequence

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generate_pokemon_gifs import REPO_ROOT, SMALL_CANVAS, display_name, ts_string, JobResult  # noqa: E402

DEFAULT_DATA_TS = REPO_ROOT / "src" / "common" / "pokemon-data.ts"
DEFAULT_MEDIA = REPO_ROOT / "media"

ENTRY_RE = re.compile(r"^  (?P<key>[A-Za-z0-9_]+): \{\n(?P<body>(?:    .*\n)+?)  \},\n", re.M)
GEN_COMMENT_RE = re.compile(r"^  (?://|/\*)\s*Generation (?P<gen>\d+)\s*(?:\*/)?\n", re.M)


@dataclass
class Entry:
    key: str
    start: int
    end: int
    body: str

    def field(self, name: str) -> Optional[str]:
        m = re.search(rf"^    {name}: (?P<v>.*),\n", self.body, re.M)
        return m.group("v") if m else None

    @property
    def id(self) -> int:
        return int(self.field("id") or 0)

    @property
    def generation(self) -> int:
        m = re.search(r"PokemonGeneration\.Gen(\d+)", self.field("generation") or "")
        return int(m.group(1)) if m else 0


def parse_entries(text: str) -> List[Entry]:
    return [Entry(m.group("key"), m.start(), m.end(), m.group("body")) for m in ENTRY_RE.finditer(text)]


def set_field(body: str, name: str, value: Optional[str], after: Sequence[str] = ()) -> str:
    """Set (or remove when value is None) a ``    name: value,`` line in an entry body."""
    line_re = re.compile(rf"^    {name}: .*,\n", re.M)
    if value is None:
        return line_re.sub("", body)
    line = f"    {name}: {value},\n"
    if line_re.search(body):
        return line_re.sub(lambda _: line, body, count=1)
    # insert after the last of the given anchor fields, else append
    for anchor in reversed(list(after)):
        m = re.search(rf"^    {anchor}: .*,\n", body, re.M)
        if m:
            return body[: m.end()] + line + body[m.end() :]
    return body + line


def colors_literal(colors: Sequence[str]) -> str:
    return "[" + ", ".join(f"PokemonColor.{c}" for c in colors) + "]"


def render_entry(r: dict) -> str:
    jr = JobResult(**{k: r[k] for k in ("key", "id", "name", "generation", "sprite_size", "colors", "files")})
    lines = [
        f"  {r['key']}: {{",
        f"    id: {r['id']},",
        f"    name: {ts_string(display_name(jr))},",
        f"    generation: PokemonGeneration.Gen{r['generation']},",
        f"    cry: {ts_string(r['name'] + '!')},",
        f"    possibleColors: {colors_literal(r['colors'])},",
    ]
    if r["sprite_size"] != SMALL_CANVAS:
        lines.append(f"    originalSpriteSize: {r['sprite_size']},")
    lines.append("  },")
    return "\n".join(lines) + "\n"


def apply(text: str, generated: Sequence[dict], media_root: Path) -> tuple[str, Dict[str, int]]:
    stats = {"updated": 0, "added": 0, "unchanged": 0}
    for r in sorted(generated, key=lambda r: (r["id"], not r.get("is_base", True), r["key"])):
        entries = parse_entries(text)
        by_key = {e.key: e for e in entries}
        walk_left = media_root / f"gen{r['generation']}" / r["key"] / "default_walk_left_8fps.gif"
        if r["key"] in by_key:
            e = by_key[r["key"]]
            body = set_field(e.body, "possibleColors", colors_literal(r["colors"]), after=("cry",))
            size = None if r["sprite_size"] == SMALL_CANVAS else str(r["sprite_size"])
            body = set_field(body, "originalSpriteSize", size, after=("possibleColors",))
            if not walk_left.exists():
                body = set_field(body, "extraSprites", None)
            if body == e.body:
                stats["unchanged"] += 1
                continue
            text = text[: e.start] + f"  {e.key}: {{\n{body}  }},\n" + text[e.end :]
            stats["updated"] += 1
            continue

        block = render_entry(r)
        same_gen = [e for e in entries if e.generation == r["generation"]]
        if same_gen:
            # after the last entry of this generation whose id <= ours (forms follow their species)
            candidates = [e for e in same_gen if e.id <= r["id"]]
            anchor = max(candidates, key=lambda e: e.end) if candidates else None
            pos = anchor.end if anchor else min(e.start for e in same_gen)
            text = text[:pos] + block + text[pos:]
        else:
            # brand new generation: after the last entry of the previous generation(s), with a header
            earlier = [e for e in entries if e.generation < r["generation"]]
            pos = max(e.end for e in earlier) if earlier else text.index("};")
            text = text[:pos] + f"  /* Generation {r['generation']} */\n" + block + text[pos:]
        stats["added"] += 1
    return text, stats


def main(argv: Optional[Sequence[str]] = None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--manifest", type=Path, required=True, action="append",
                   help="manifest.json written by generate_pokemon_gifs.py (repeatable)")
    p.add_argument("--data", type=Path, default=DEFAULT_DATA_TS, help="pokemon-data.ts to update")
    p.add_argument("--media", type=Path, default=DEFAULT_MEDIA, help="media folder (to detect hand-made walk_left gifs)")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args(argv)

    generated: List[dict] = []
    for m in args.manifest:
        generated.extend(json.loads(m.read_text(encoding="utf-8"))["generated"])

    raw = args.data.read_bytes()
    crlf = b"\r\n" in raw
    text = raw.decode("utf-8").replace("\r\n", "\n")
    new_text, stats = apply(text, generated, args.media)
    print(f"{args.data.name}: {stats['added']} added, {stats['updated']} updated, {stats['unchanged']} unchanged")
    if not args.dry_run and new_text != text:
        out = new_text.replace("\n", "\r\n") if crlf else new_text
        args.data.write_bytes(out.encode("utf-8"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
