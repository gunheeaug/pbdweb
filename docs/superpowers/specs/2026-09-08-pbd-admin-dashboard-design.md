# PBD Admin Portfolio Dashboard

**Date:** 2026-09-08  
**URL:** `https://pbd.team/admin`  
**Repo path:** `admin/index.html` plus one Supabase Edge Function  
**Status:** Approved for implementation planning

## Goal

Replace the localStorage waitlist tables at `pbd.team/admin` with one password-gated page that shows live user and retention numbers for every PBD product on a single screen.

Opening or refreshing the page loads current numbers. There is no background poll, cron, or auto-refresh.

## Who it is for

Gunhee only, in a browser. Not public, not for investors, not for end users.

## Approach

Keep `pbd.team` on GitHub Pages. The admin page is static HTML. One Edge Function (hosted on the dedicated pbdweb Supabase project `npzfayefowbeufbrtkxy`) checks the password and pulls stats from each product in parallel. Crema is a data source, not the host.

The password lives only in the Function secret `PBD_ADMIN_PASSWORD`. It is never written into HTML, JS, git, or this spec.

## Page

Password form first. After success, a grid of product cards (one column on mobile, two on desktop). A refresh button re-fetches with the password kept in `sessionStorage` for that tab only. Closing the tab requires the password again.

The old waitlist tabs (aug / Superba / Crema email tables, CSV export, Clear All) are removed. Those tables only read this browser’s localStorage and are not portfolio stats.

Each card:

- Product name
- Users, DAU, WAU, MAU, stickiness (WAU ÷ MAU, shown only when MAU > 0)
- One extra line that is product-specific
- Link to the product’s own `/admin` when one exists
- Missing metrics render as `—` (not `0`). `0` means we measured zero.

## Products

| Card | Source | Extra line | Own admin |
|------|--------|------------|-----------|
| aug | Existing admin analytics API (`/admin/analytics`) | New users, last 30 days | Yes — existing aug admin |
| Superba | Existing `admin_metrics` Edge Function | Total runs | [share.superba.me/admin](https://share.superba.me/admin) |
| Gather | Existing `admin_dashboard` RPC | Onboarded count | [gather.best/admin](https://gather.best/admin) |
| 고수맵 | Supabase `auth.users` + engagement tables | Signups last 7 / 30 days | [gosoomap.com/admin](https://gosoomap.com/admin) |
| Crema | `auth.users` + `waitlist_submissions` | Waitlist count | None |
| Shotup AI | Supabase `public.users`, activity from `sources` / `conversations` / `messages` | Source (screenshot) count | None |
| augclaw | No server metrics today | “No live metrics yet” | None |

aug Android waitlist on pbd.team writes only to `localStorage`. It is not a data source.

## Metric definitions

**Users** — registered accounts, not waitlist rows.

**DAU / WAU / MAU** — distinct users active in the last 24 hours / 7 days / 30 days. “Active” matches each product’s existing admin when one exists:

- aug — same definition as `/admin/analytics`
- Superba — same as `admin_metrics` (sign-in, HealthKit weekly-step sync, or a run)
- Gather — same as `admin_dashboard` (sign-in, swipe, message, location, or finished onboarding)
- 고수맵 — `auth.users.last_sign_in_at` (their admin has no activity DAU today; this is the approximation)
- Crema — `auth.users.last_sign_in_at`
- Shotup AI — a user who ingested a source or updated a conversation/message in the window. Not Firebase-only last sign-in, and not AWS. Identity is Firebase; product data is Supabase.

**Stickiness** — `round(100 * WAU / MAU)` when MAU > 0.

**Waitlist** — rows in that product’s `waitlist_submissions` table. Shown as the extra line, never as Users.

## Data flow

1. Browser `POST`s the password to the Edge Function.
2. Function compares against `PBD_ADMIN_PASSWORD` (hashed compare). Wrong password → 403, no cards, log only.
3. On success, Function fans out to each product (parallel). Per-product timeout 8 seconds. Overall timeout stops after that; partial results still return.
4. Response is one JSON list of cards. Each card is `ok` with numbers or `error` with a short reason. One product failing does not fail the page.
5. Browser paints cards. Failed cards show “불러오지 못함” and a retry that re-requests the whole payload (economical: no per-card extra endpoints).

Secrets on the Function only: `PBD_ADMIN_PASSWORD`, service-role keys / existing admin passwords / aug admin API credentials for each source. CORS allows `https://pbd.team` only.

No cache job. A single in-memory 60-second cache on the Function is allowed so a double refresh does not hit every database twice.

## Error handling

- Wrong password: 403, stay on the form.
- Missing secret for one product: that card errors; others render.
- Product timeout or 5xx: that card errors.
- Empty but successful query: show `0` or `—` by the missing-vs-zero rule above.
- augclaw: successful card with all core metrics `—` and the extra line “No live metrics yet”.

## Testing

1. Wrong password → 403, no stats in the response body.
2. Force one product to fail (bad URL or revoked key) → other cards still populate.
3. For aug, Superba, Gather, and 고수맵: Users and DAU on the card match that product’s own `/admin` at the same moment (고수맵 DAU may differ because their page does not show DAU; Users and 7/30-day signups must match).
4. Shotup Users equals `count(*)` from `public.users`. DAU moves when a source or conversation is written in the last 24 hours.
5. Refresh button updates numbers without asking for the password again in the same tab. A new tab asks again.
6. `pbd.team/admin` is `noindex`.

## Out of scope

- Auto-refresh, cron snapshots, historical charts, CSV export
- Rebuilding each product’s full admin (leaderboards, school breakdown, maps)
- iframe embeds of existing admins
- Moving pbd.team off GitHub Pages
- AWS access for Shotup (not required)
- Inventing augclaw metrics
- Sharing this page with anyone who should not have the password
