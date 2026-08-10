#!/usr/bin/env python3
"""Resize hero stickers used on pbd.team home + aug/investors to max 480px long edge."""

from __future__ import annotations

import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
STICKERS = ROOT / "assets" / "stickers"
ORIGINALS = STICKERS / "_originals"
MAX_EDGE = 480
WEBP_QUALITY = 80

STEMS = [
    "aug sticker 1",
    "aug sticker 2",
    "aug sticker 3",
    "aug sticker 4",
    "aug sticker 5",
    "aug sticker 6",
    "aug sticker 7",
    "aug sticker 8",
    "aug sticker 9",
    "aug sticker 10",
    "aug eyes sticker 1",
    "Basquiat sticker 1",
    "Basquiat sticker 2",
    "pbd sticker 1",
    "pbd sticker 2",
    "pbd sticker 4",
    "pbd sticker 6",
]


def fit_size(width: int, height: int, max_edge: int) -> tuple[int, int]:
    long_edge = max(width, height)
    if long_edge <= max_edge:
        return width, height
    scale = max_edge / long_edge
    return max(1, round(width * scale)), max(1, round(height * scale))


def process_stem(stem: str) -> dict:
    webp_path = STICKERS / f"{stem}.webp"
    png_path = STICKERS / f"{stem}.png"
    if not webp_path.exists():
        raise FileNotFoundError(webp_path)

    before = webp_path.stat().st_size + (png_path.stat().st_size if png_path.exists() else 0)

    ORIGINALS.mkdir(parents=True, exist_ok=True)
    for src in (webp_path, png_path):
        if src.exists():
            dest = ORIGINALS / src.name
            if not dest.exists():
                shutil.copy2(src, dest)

    # Prefer PNG as resize source when present (lossless master); else WebP.
    source = png_path if png_path.exists() else webp_path
    with Image.open(source) as im:
        im = im.convert("RGBA")
        new_w, new_h = fit_size(im.width, im.height, MAX_EDGE)
        skipped = (new_w, new_h) == (im.width, im.height)
        if not skipped:
            im = im.resize((new_w, new_h), Image.Resampling.LANCZOS)
        im.save(webp_path, "WEBP", quality=WEBP_QUALITY, method=6)
        im.save(png_path, "PNG", optimize=True)

    after = webp_path.stat().st_size + png_path.stat().st_size
    return {
        "stem": stem,
        "size": f"{new_w}x{new_h}",
        "skipped_resize": skipped,
        "before": before,
        "after": after,
    }


def main() -> None:
    rows = [process_stem(stem) for stem in STEMS]
    before_total = sum(r["before"] for r in rows)
    after_total = sum(r["after"] for r in rows)
    for r in rows:
        flag = "keep-dim" if r["skipped_resize"] else "resized"
        print(
            f"{r['stem']}: {r['size']} {flag} "
            f"{r['before'] // 1024}KB -> {r['after'] // 1024}KB"
        )
    print(
        f"TOTAL: {before_total // 1024}KB -> {after_total // 1024}KB "
        f"(saved {(before_total - after_total) // 1024}KB)"
    )
    webp_after = sum((STICKERS / f"{s}.webp").stat().st_size for s in STEMS)
    print(f"WebP-only after: {webp_after // 1024}KB (target < ~800KB)")


if __name__ == "__main__":
    main()
