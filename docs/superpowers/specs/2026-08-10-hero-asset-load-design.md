# Hero Earth + sticker load optimization

**Date:** 2026-08-10  
**Status:** Approved for planning  
**Pages:** `index.html` (pbd.team home), `aug/investors/index.html`  
**Approach:** A — resize shared assets in place (balanced quality)

## Problem

The hero Earth + sticker cluster feels slow to appear. Earth is already reasonable (`Earth.webp` ~186KB at 946×949). The cost is the sticker set: ~4MB of WebPs with source dimensions far above display size (several at 3k–12k px on the long edge) while CSS caps most stickers at ~30–160px. Decode and transfer of those files delay the first-viewport composition on both pages that share the assets.

## Goals

- Faster first paint / earlier sticker visibility on homepage and Aug investors.
- Keep the same visual look at a glance (balanced: ~2–3× CSS display size on retina).
- Keep existing public URLs so markup path churn is minimal.
- Site-wide benefit for any consumer of these shared files.

## Non-goals

- AVIF pipeline, CDN, service worker, or caching-header work.
- Redesigning the hero layout or sticker placement.
- Replacing PNG fallbacks with WebP-only (keep dual format).
- Touching unrelated images under `assets/images` or App Previews.

## Affected assets

Shared paths already referenced by both pages:

- `/assets/images/Earth.webp` (+ `Earth.png` fallback)
- Stickers under `/assets/stickers/` used in the Earth hero (aug / Basquiat / pbd sticker set listed in both HTML heroes)

Only `index.html` and `aug/investors/index.html` reference this hero set today; resizing the files still benefits any future page that reuses them.

## Design

### 1. Backup originals

Before overwriting, copy current full-resolution sticker masters into:

`assets/stickers/_originals/`

Same filenames. Git history remains a second safety net. Do not serve `_originals` from HTML.

### 2. Resize / recompress stickers (balanced)

For each hero sticker WebP **and** matching PNG fallback:

| Rule | Value |
|------|--------|
| Max long edge | **480px** |
| Skip if already ≤ 480px on long edge | leave file unchanged |
| WebP | quality ~80, keep alpha |
| PNG | resized to same pixel dimensions as WebP (palette/compress as convenient; alpha preserved) |

Display context: default `max-width: 120px`, some variants 30–160px → 480px is ~3× the largest CSS cap.

Overwrite files at the existing paths (e.g. `aug sticker 2.webp`) so both pages pick up the change with no `src` edits for stickers.

### 3. Earth

- Keep dimensions (~946px); already near a sensible hero size.
- Optional light WebP recompress only if trivial in the same script; not required for success.
- PNG fallback may stay as-is for this pass (1.7MB is only for non-WebP clients).

### 4. HTML preload

Add to `<head>` of both `index.html` and `aug/investors/index.html` (path style matching each page):

```html
<link rel="preload" as="image" href="/assets/images/Earth.webp" type="image/webp">
```

Homepage may use a relative href consistent with existing asset links (`assets/images/Earth.webp`) if that page’s convention prefers relative paths.

Keep sticker `loading="lazy"` / `decoding="async"`. After resize, in-viewport stickers load quickly enough without eager-loading all seventeen.

### 5. Tooling

One-off local script (Python + Pillow or `cwebp`/`magick`) run from the repo to:

1. Copy oversized sticker sources → `_originals/`
2. Resize + write WebP/PNG at original paths
3. Print before/after byte totals

No new runtime dependency in the static site.

## Success criteria

- Hero sticker WebP total drops from ~4MB toward **&lt; ~500–800KB**.
- No broken image paths on home or investors.
- Side-by-side glance: stickers remain sharp enough on retina; no layout shift from dimension attributes if present (most stickers omit width/height today — do not require adding them in this pass).
- Earth still loads with `fetchpriority="high"` and benefits from preload.

## Verification

1. Run the resize script; confirm totals and that `_originals` exists.
2. Load `/` and `/aug/investors/` locally; confirm Earth + stickers render.
3. Optional: DevTools Network — sticker transfer size and decode time improved vs baseline.

## Out of scope follow-ups (later if needed)

- Responsive `srcset` (1x/2x) without overwriting masters.
- Shrinking `Earth.png` fallback.
- Width/height attributes on stickers to reduce CLS.
