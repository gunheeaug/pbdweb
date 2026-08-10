# Hero Earth + Sticker Load Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Speed up homepage and Aug investors hero loading by resizing shared sticker assets in place (balanced quality) and preloading Earth.webp.

**Architecture:** One-off Python/Pillow script backs up oversized sticker masters to `assets/stickers/_originals/`, then overwrites WebP + PNG at existing public paths (max long edge 480px). Both HTML heroes keep the same `src`/`srcset` URLs and gain an Earth preload link.

**Tech Stack:** Static HTML site; Python 3 + Pillow for asset processing; WebP + PNG dual delivery already in markup.

## Global Constraints

- Max sticker long edge: **480px**; skip files already ≤ 480px.
- WebP quality ~**80**, preserve alpha; PNG resized to match WebP dimensions with alpha.
- Overwrite existing paths under `assets/stickers/` (no HTML path changes for stickers).
- Backup full-res masters to `assets/stickers/_originals/` before overwrite.
- Touch only hero stickers used by `index.html` and `aug/investors/index.html`, plus Earth preload in both heads.
- Do not add AVIF, CDN, service worker, or sticker `srcset` in this pass.
- Commit only if the user explicitly asks (repo rule).

## File map

| Path | Role |
|------|------|
| `scripts/optimize_hero_stickers.py` | Create: one-off resize/backup script |
| `assets/stickers/_originals/*` | Create: full-res backups |
| `assets/stickers/*.{webp,png}` | Modify: resized display assets (existing names) |
| `index.html` | Modify: preload Earth.webp in `<head>` |
| `aug/investors/index.html` | Modify: preload Earth.webp in `<head>` |

## Hero sticker file list

These basename stems (each has `.webp` + `.png`) are the only stickers to process:

```
aug sticker 1
aug sticker 2
aug sticker 3
aug sticker 4
aug sticker 5
aug sticker 6
aug sticker 7
aug sticker 8
aug sticker 9
aug sticker 10
aug eyes sticker 1
Basquiat sticker 1
Basquiat sticker 2
pbd sticker 1
pbd sticker 2
pbd sticker 4
pbd sticker 6
```

---

### Task 1: Resize script + run asset optimization

**Files:**
- Create: `scripts/optimize_hero_stickers.py`
- Create: `assets/stickers/_originals/` (via script)
- Modify: matching files under `assets/stickers/`

**Interfaces:**
- Consumes: Pillow (`PIL.Image`), files listed above under `assets/stickers/`
- Produces: resized WebP/PNG at same paths; originals copied to `_originals/`; stdout summary of before/after bytes

- [ ] **Step 1: Ensure Pillow is available**

```bash
python3 -c "from PIL import Image; print(Image.__version__)"
```

Expected: a version string (e.g. `10.x`). If ImportError, run `python3 -m pip install Pillow` then re-check.

- [ ] **Step 2: Create `scripts/optimize_hero_stickers.py`**

```python
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
        if png_path.exists() or True:
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
```

- [ ] **Step 3: Run the script**

```bash
cd /Users/gh/Desktop/pbdweb && python3 scripts/optimize_hero_stickers.py
```

Expected: per-file lines with dimensions; `WebP-only after` under ~800KB; `_originals` populated for files that existed.

- [ ] **Step 4: Spot-check dimensions**

```bash
python3 - <<'PY'
from PIL import Image
from pathlib import Path
stems = [
    "aug sticker 2", "Basquiat sticker 1", "pbd sticker 1", "aug sticker 5",
]
root = Path("assets/stickers")
for s in stems:
    im = Image.open(root / f"{s}.webp")
    assert max(im.size) <= 480, (s, im.size)
    print(s, im.size, (root / f"{s}.webp").stat().st_size // 1024, "KB")
print("ok")
PY
```

Expected: all listed ≤ 480 long edge; `aug sticker 5` may already have been small (`keep-dim`).

---

### Task 2: Preload Earth.webp on both pages

**Files:**
- Modify: `index.html` (near other `<link rel="preload">` / favicon links in `<head>`)
- Modify: `aug/investors/index.html` (near existing font preload / favicon links)

**Interfaces:**
- Consumes: `/assets/images/Earth.webp` (investors) or `assets/images/Earth.webp` (homepage relative convention)
- Produces: earlier discovery of Earth for both heroes

- [ ] **Step 1: Add preload to `aug/investors/index.html`**

After the Cal Sans font preload line, insert:

```html
<link rel="preload" as="image" href="/assets/images/Earth.webp" type="image/webp">
```

- [ ] **Step 2: Add preload to `index.html`**

Near other head asset links (favicon / apple-touch-icon area), insert using the homepage’s relative convention:

```html
<link rel="preload" as="image" href="assets/images/Earth.webp" type="image/webp">
```

- [ ] **Step 3: Verify markup presence**

```bash
rg -n 'preload.*Earth\.webp' index.html aug/investors/index.html
```

Expected: one match in each file.

---

### Task 3: Visual + network verification

**Files:**
- Test: local static server against `/` and `/aug/investors/`

**Interfaces:**
- Consumes: optimized stickers + preload from Tasks 1–2
- Produces: confirmation stickers render and WebP transfer is reduced

- [ ] **Step 1: Serve the site**

```bash
cd /Users/gh/Desktop/pbdweb && python3 -m http.server 8765
```

- [ ] **Step 2: Load both pages**

Open:
- `http://127.0.0.1:8765/`
- `http://127.0.0.1:8765/aug/investors/`

Confirm Earth appears and all stickers render (no broken images). Glance-check sharpness on retina.

- [ ] **Step 3: Optional Network check**

In DevTools → Network, filter `sticker` / `Earth.webp` on a hard reload. Confirm sticker WebPs are small (tens of KB each for former multi‑MB files) and Earth is requested early (preload / high priority).

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Backup to `assets/stickers/_originals/` | Task 1 |
| Max long edge 480px, skip if smaller | Task 1 |
| WebP q~80 + PNG match, keep alpha | Task 1 |
| Overwrite existing sticker paths | Task 1 |
| Earth keep dims; optional light recompress | Task 1 (Earth left as-is; optional) |
| Preload Earth on both HTML pages | Task 2 |
| Success: WebP stickers under ~800KB; pages render | Task 1 Step 3 + Task 3 |
| No AVIF/CDN/srcset/path churn | Global constraints |

## Self-review notes

- No TBD/placeholder steps; script is complete.
- Commit steps omitted from task bodies per repo rule (commit only on explicit user request).
- PNG always rewritten alongside WebP so fallbacks stay dimension-matched.
