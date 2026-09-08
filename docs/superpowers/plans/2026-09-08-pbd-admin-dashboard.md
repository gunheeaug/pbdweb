# PBD Admin Portfolio Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `pbd.team/admin` with a password-gated card dashboard that loads live user / DAU / WAU / MAU numbers for every PBD product from one Edge Function.

**Architecture:** GitHub Pages keeps serving static `admin/index.html`. The page POSTs the password to Crema’s Supabase Edge Function `pbd-admin-stats`. The function checks `PBD_ADMIN_PASSWORD`, fans out to each product (8s each), and returns a card list. One product failing does not fail the page. No auto-refresh, no cron.

**Tech Stack:** Static HTML + vanilla JS; Deno Supabase Edge Function (`@supabase/supabase-js@2`); Deno tests for pure logic; existing product admin APIs / service-role reads.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-08-pbd-admin-dashboard-design.md`
- URL: `https://pbd.team/admin` — `noindex`
- Password only in Function secret `PBD_ADMIN_PASSWORD` — never in HTML, JS, git, comments, or this plan’s committed code samples as a literal
- CORS allow origin: `https://pbd.team` only
- Per-product timeout: 8000ms; missing metric: `null` → UI `—`; measured zero: `0`
- Stickiness: `Math.round(100 * wau / mau)` only when `mau > 0`; otherwise `null`
- Product order: aug, Superba, Gather, 고수맵, Crema, Shotup AI, augclaw
- Refresh uses `sessionStorage` key `pbd_admin_pw` (same tab only)
- Do not commit `.DS_Store`, investor deck WIP, or other dirty files
- Do not add auto-refresh, charts, CSV, iframes, or AWS for Shotup
- Function project-ref: `jantbnwrzeyvfblschct` (Crema; already used by pbd.team waitlists)
- Deploy with JWT verification off — the password is the gate

## File structure

| File | Responsibility |
|------|----------------|
| `supabase/functions/pbd-admin-stats/lib.ts` | Types, password compare, stickiness, timeout, `settleCard` |
| `supabase/functions/pbd-admin-stats/lib_test.ts` | Deno tests for lib |
| `supabase/functions/pbd-admin-stats/sources.ts` | One fetcher per product (injectable `fetch` / clients) |
| `supabase/functions/pbd-admin-stats/sources_test.ts` | Fetcher tests with stubbed HTTP / RPC |
| `supabase/functions/pbd-admin-stats/index.ts` | HTTP handler: CORS, 403, 60s cache, parallel assemble |
| `supabase/functions/pbd-admin-stats/index_test.ts` | Handler tests (wrong password, isolation, cache) |
| `supabase/config.toml` | `verify_jwt = false` for this function |
| `admin/index.html` | Password form + card grid (replaces waitlist tables) |

## Secrets (Function only, set at deploy)

| Secret | Used by |
|--------|---------|
| `PBD_ADMIN_PASSWORD` | Gate |
| `AUG_ADMIN_API_URL` | Default `https://dev-admin-api.aug.ooo` until prod URL is confirmed |
| `AUG_ADMIN_BEARER` | Firebase ID token the aug admin API already accepts |
| `SUPERBA_SUPABASE_URL` | `https://tqugnlmtkvmdzwqskgva.supabase.co` |
| `SUPERBA_ANON_KEY` | Public anon key already on share.superba.me/admin |
| `SUPERBA_ADMIN_PASSWORD` | Same password Superba `/admin` already sends as `x-admin-password` |
| `GATHER_SUPABASE_URL` | `https://auth.gather.best` |
| `GATHER_SERVICE_ROLE_KEY` | Gather service role |
| `GATHER_ADMIN_PASSWORD` | Gather `admin_dashboard` RPC `p_password` |
| `GOSOOMAP_SUPABASE_URL` | `https://aohldfdbiddythohfvtf.supabase.co` |
| `GOSOOMAP_SERVICE_ROLE_KEY` | 고수맵 service role |
| `SHOTUP_SUPABASE_URL` | `https://ipsalcfuqftizwfphcqn.supabase.co` |
| `SHOTUP_SERVICE_ROLE_KEY` | Shotup service role |

Crema uses the Function’s auto-injected `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

Missing secret for one product → that card `status: "error"`; others still return.

## Shared types (lock these names)

```ts
export type ProductId =
  | "aug"
  | "superba"
  | "gather"
  | "gosoomap"
  | "crema"
  | "shotup"
  | "augclaw";

export type Metric = number | null;

export type CardOk = {
  id: ProductId;
  name: string;
  status: "ok";
  users: Metric;
  dau: Metric;
  wau: Metric;
  mau: Metric;
  stickiness: Metric;
  extra: string;
  adminUrl: string | null;
};

export type CardError = {
  id: ProductId;
  name: string;
  status: "error";
  error: string;
  adminUrl: string | null;
};

export type Card = CardOk | CardError;

export type StatsResponse = {
  generatedAt: string;
  cards: Card[];
};

export type ProductMetrics = {
  users: Metric;
  dau: Metric;
  wau: Metric;
  mau: Metric;
  extra: string;
};
```

Card display names and admin URLs (hardcode in `sources.ts`):

| id | name | adminUrl |
|----|------|----------|
| aug | aug | `https://admin.aug.ooo` if that host 404s, use the URL already bookmarked for aug admin — do not invent a new domain; if unknown, `null` and the card still works |
| superba | Superba | `https://share.superba.me/admin` |
| gather | Gather | `https://gather.best/admin` |
| gosoomap | 고수맵 | `https://gosoomap.com/admin` |
| crema | Crema | `null` |
| shotup | Shotup AI | `null` |
| augclaw | augclaw | `null` |

For aug `adminUrl`: grep `aug-mono/web/admin` / Amplify host at implement time. If no stable public host, `null`.

---

### Task 1: Pure lib — password, stickiness, timeout, settleCard

**Files:**
- Create: `supabase/functions/pbd-admin-stats/lib.ts`
- Create: `supabase/functions/pbd-admin-stats/lib_test.ts`
- Create: `supabase/config.toml`

**Interfaces:**
- Consumes: nothing
- Produces: types above; `sha256Hex`; `passwordOk(given: string, expected: string): Promise<boolean>`; `stickiness(wau: Metric, mau: Metric): Metric`; `withTimeout<T>(p: Promise<T>, ms: number): Promise<T>`; `settleCard(id, name, adminUrl, load: () => Promise<ProductMetrics>): Promise<Card>`

- [ ] **Step 1: Write the failing tests**

Create `supabase/functions/pbd-admin-stats/lib_test.ts`:

```ts
import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { passwordOk, settleCard, stickiness, withTimeout } from "./lib.ts";

Deno.test("passwordOk rejects empty expected even if given is empty", async () => {
  assertEquals(await passwordOk("", ""), false);
});

Deno.test("passwordOk accepts exact match", async () => {
  assertEquals(await passwordOk("secret", "secret"), true);
});

Deno.test("passwordOk rejects mismatch", async () => {
  assertEquals(await passwordOk("nope", "secret"), false);
});

Deno.test("stickiness null when mau missing or zero", () => {
  assertEquals(stickiness(3, null), null);
  assertEquals(stickiness(3, 0), null);
  assertEquals(stickiness(null, 10), null);
});

Deno.test("stickiness rounds WAU/MAU percent", () => {
  assertEquals(stickiness(3, 10), 30);
  assertEquals(stickiness(1, 3), 33);
});

Deno.test("withTimeout rejects after ms", async () => {
  await assertRejects(
    () => withTimeout(new Promise(() => {}), 20),
    Error,
    "timeout",
  );
});

Deno.test("settleCard returns error card on throw", async () => {
  const card = await settleCard("aug", "aug", null, async () => {
    throw new Error("boom");
  });
  assertEquals(card.status, "error");
  if (card.status === "error") assertEquals(card.error, "boom");
});

Deno.test("settleCard fills stickiness on ok", async () => {
  const card = await settleCard("gather", "Gather", "https://gather.best/admin", async () => ({
    users: 10,
    dau: 1,
    wau: 3,
    mau: 10,
    extra: "Onboarded 8",
  }));
  assertEquals(card.status, "ok");
  if (card.status === "ok") assertEquals(card.stickiness, 30);
});
```

- [ ] **Step 2: Run tests — expect fail (module missing)**

Run:

```bash
deno test supabase/functions/pbd-admin-stats/lib_test.ts
```

Expected: fail with `Cannot find module` / `lib.ts` missing.

- [ ] **Step 3: Implement `lib.ts`**

```ts
export type ProductId =
  | "aug"
  | "superba"
  | "gather"
  | "gosoomap"
  | "crema"
  | "shotup"
  | "augclaw";

export type Metric = number | null;

export type ProductMetrics = {
  users: Metric;
  dau: Metric;
  wau: Metric;
  mau: Metric;
  extra: string;
};

export type CardOk = {
  id: ProductId;
  name: string;
  status: "ok";
  users: Metric;
  dau: Metric;
  wau: Metric;
  mau: Metric;
  stickiness: Metric;
  extra: string;
  adminUrl: string | null;
};

export type CardError = {
  id: ProductId;
  name: string;
  status: "error";
  error: string;
  adminUrl: string | null;
};

export type Card = CardOk | CardError;

export type StatsResponse = {
  generatedAt: string;
  cards: Card[];
};

export async function sha256Hex(s: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function passwordOk(given: string, expected: string): Promise<boolean> {
  if (!expected) return false;
  const [a, b] = await Promise.all([sha256Hex(given), sha256Hex(expected)]);
  return a === b;
}

export function stickiness(wau: Metric, mau: Metric): Metric {
  if (wau == null || mau == null || mau <= 0) return null;
  return Math.round((100 * wau) / mau);
}

export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: number | undefined;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export const PRODUCT_TIMEOUT_MS = 8000;

export async function settleCard(
  id: ProductId,
  name: string,
  adminUrl: string | null,
  load: () => Promise<ProductMetrics>,
): Promise<Card> {
  try {
    const m = await withTimeout(load(), PRODUCT_TIMEOUT_MS);
    return {
      id,
      name,
      status: "ok",
      users: m.users,
      dau: m.dau,
      wau: m.wau,
      mau: m.mau,
      stickiness: stickiness(m.wau, m.mau),
      extra: m.extra,
      adminUrl,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed";
    return { id, name, status: "error", error: message, adminUrl };
  }
}
```

Create `supabase/config.toml`:

```toml
project_id = "jantbnwrzeyvfblschct"

[functions.pbd-admin-stats]
verify_jwt = false
```

- [ ] **Step 4: Run tests — expect pass**

```bash
deno test supabase/functions/pbd-admin-stats/lib_test.ts
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/pbd-admin-stats/lib.ts supabase/functions/pbd-admin-stats/lib_test.ts supabase/config.toml
git commit -m "$(cat <<'EOF'
Add admin stats helpers for password, stickiness, and card errors.

EOF
)"
```

---

### Task 2: Product fetchers

**Files:**
- Create: `supabase/functions/pbd-admin-stats/sources.ts`
- Create: `supabase/functions/pbd-admin-stats/sources_test.ts`

**Interfaces:**
- Consumes: `ProductMetrics`, `ProductId` from `lib.ts`
- Produces: `PRODUCTS: { id, name, adminUrl, load }[]` in spec order; `countAuthActivity(supabase)` for Crema / 고수맵; `loadAug`, `loadSuperba`, `loadGather`, `loadGosoomap`, `loadCrema`, `loadShotup`, `loadAugclaw`

- [ ] **Step 1: Write failing fetcher tests**

Create `supabase/functions/pbd-admin-stats/sources_test.ts`:

```ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  countAuthActivity,
  loadAug,
  loadAugclaw,
  loadGather,
  loadShotup,
  loadSuperba,
} from "./sources.ts";

Deno.test("countAuthActivity buckets signup and last_sign_in", async () => {
  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - days * 86400000).toISOString();
  const a = await countAuthActivity(async () => [
    { created_at: ago(2), last_sign_in_at: ago(0.5) },
    { created_at: ago(40), last_sign_in_at: ago(20) },
  ]);
  assertEquals(a.users, 2);
  assertEquals(a.dau, 1);
  assertEquals(a.mau, 2);
  assertEquals(a.last7, 1);
  assertEquals(a.last30, 1);
});

Deno.test("loadAugclaw is always empty ok metrics", async () => {
  const m = await loadAugclaw();
  assertEquals(m.users, null);
  assertEquals(m.dau, null);
  assertEquals(m.extra, "No live metrics yet");
});

Deno.test("loadAug maps analytics payload", async () => {
  const m = await loadAug(async () =>
    new Response(JSON.stringify({
      data: { totalUsers: 12, dau: 2, wau: 4, mau: 8, newUsersLast30Days: 3 },
    }), { status: 200 })
  );
  assertEquals(m.users, 12);
  assertEquals(m.dau, 2);
  assertEquals(m.extra, "New users (30d) 3");
});

Deno.test("loadAug throws when bearer missing", async () => {
  const prev = Deno.env.get("AUG_ADMIN_BEARER");
  Deno.env.delete("AUG_ADMIN_BEARER");
  let threw = false;
  try {
    await loadAug(async () => new Response("{}", { status: 200 }));
  } catch {
    threw = true;
  }
  if (prev) Deno.env.set("AUG_ADMIN_BEARER", prev);
  assertEquals(threw, true);
});

Deno.test("loadSuperba maps totals and active", async () => {
  const m = await loadSuperba(async () =>
    new Response(JSON.stringify({
      totals: { total_users: 20, total_runs: 50 },
      active: { dau: 1, wau: 5, mau: 10 },
    }), { status: 200 })
  );
  assertEquals(m.users, 20);
  assertEquals(m.mau, 10);
  assertEquals(m.extra, "Runs 50");
});

Deno.test("loadGather maps rpc payload", async () => {
  const m = await loadGather({
    rpc: async () => ({ data: { total: 9, onboarded: 7, dau: 1, wau: 2, mau: 4 }, error: null }),
  });
  assertEquals(m.users, 9);
  assertEquals(m.extra, "Onboarded 7");
});

Deno.test("loadShotup uses users + activity union + sources", async () => {
  const m = await loadShotup({
    countUsers: async () => 15,
    countSources: async () => 40,
    activeUserIds: async (sinceMs: number) => {
      if (sinceMs <= 24 * 3600 * 1000 + 1000) return 2;
      if (sinceMs <= 7 * 24 * 3600 * 1000 + 1000) return 5;
      return 9;
    },
  });
  assertEquals(m.users, 15);
  assertEquals(m.dau, 2);
  assertEquals(m.wau, 5);
  assertEquals(m.mau, 9);
  assertEquals(m.extra, "Sources 40");
});
```

- [ ] **Step 2: Run tests — expect fail**

```bash
deno test supabase/functions/pbd-admin-stats/sources_test.ts
```

Expected: fail — `sources.ts` missing.

- [ ] **Step 3: Implement `sources.ts`**

Keep fetchers small. Inject `fetch` / clients so tests do not hit the network.

```ts
import type { ProductId, ProductMetrics } from "./lib.ts";

type FetchFn = typeof fetch;

export async function loadAugclaw(): Promise<ProductMetrics> {
  return { users: null, dau: null, wau: null, mau: null, extra: "No live metrics yet" };
}

export async function loadAug(fetchFn: FetchFn = fetch): Promise<ProductMetrics> {
  const bearer = Deno.env.get("AUG_ADMIN_BEARER");
  const base = Deno.env.get("AUG_ADMIN_API_URL") || "https://dev-admin-api.aug.ooo";
  if (!bearer) throw new Error("missing AUG_ADMIN_BEARER");
  const res = await fetchFn(`${base}/admin/analytics`, {
    headers: { Authorization: `Bearer ${bearer}` },
  });
  if (!res.ok) throw new Error(`aug ${res.status}`);
  const body = await res.json();
  const d = body.data ?? body;
  return {
    users: num(d.totalUsers),
    dau: num(d.dau),
    wau: num(d.wau),
    mau: num(d.mau),
    extra: `New users (30d) ${num(d.newUsersLast30Days) ?? 0}`,
  };
}

export async function loadSuperba(fetchFn: FetchFn = fetch): Promise<ProductMetrics> {
  const url = Deno.env.get("SUPERBA_SUPABASE_URL");
  const anon = Deno.env.get("SUPERBA_ANON_KEY");
  const pw = Deno.env.get("SUPERBA_ADMIN_PASSWORD");
  if (!url || !anon || !pw) throw new Error("missing Superba secrets");
  const res = await fetchFn(`${url}/functions/v1/admin_metrics?limit=1`, {
    headers: { Authorization: `Bearer ${anon}`, "x-admin-password": pw },
  });
  if (!res.ok) throw new Error(`superba ${res.status}`);
  const p = await res.json();
  return {
    users: num(p.totals?.total_users),
    dau: num(p.active?.dau),
    wau: num(p.active?.wau),
    mau: num(p.active?.mau),
    extra: `Runs ${num(p.totals?.total_runs) ?? 0}`,
  };
}

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export async function loadGather(client?: RpcClient): Promise<ProductMetrics> {
  const c = client ?? gatherClient();
  const { data, error } = await c.rpc("admin_dashboard", {
    p_password: Deno.env.get("GATHER_ADMIN_PASSWORD") ?? "",
  });
  if (error) throw new Error(error.message);
  const d = data as { total: number; onboarded: number; dau: number; wau: number; mau: number };
  return {
    users: num(d.total),
    dau: num(d.dau),
    wau: num(d.wau),
    mau: num(d.mau),
    extra: `Onboarded ${num(d.onboarded) ?? 0}`,
  };
}

function gatherClient(): RpcClient {
  const url = Deno.env.get("GATHER_SUPABASE_URL");
  const key = Deno.env.get("GATHER_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("missing Gather secrets");
  return {
    async rpc(fn, args) {
      const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
      const supabase = createClient(url, key, { auth: { persistSession: false } });
      return await supabase.rpc(fn, args);
    },
  };
}

export type AuthActivity = {
  users: number;
  dau: number;
  wau: number;
  mau: number;
  last7: number;
  last30: number;
};

export async function countAuthActivity(
  listUsers: () => Promise<{ created_at?: string; last_sign_in_at?: string }[]>,
): Promise<AuthActivity> {
  const users = await listUsers();
  const now = Date.now();
  const since = (d: number) => now - d * 86400000;
  let dau = 0, wau = 0, mau = 0, last7 = 0, last30 = 0;
  for (const u of users) {
    const created = u.created_at ? Date.parse(u.created_at) : 0;
    const active = u.last_sign_in_at ? Date.parse(u.last_sign_in_at) : 0;
    if (created >= since(7)) last7 += 1;
    if (created >= since(30)) last30 += 1;
    if (active >= since(1)) dau += 1;
    if (active >= since(7)) wau += 1;
    if (active >= since(30)) mau += 1;
  }
  return { users: users.length, dau, wau, mau, last7, last30 };
}

export async function loadGosoomap(
  listUsers?: () => Promise<{ created_at?: string; last_sign_in_at?: string }[]>,
): Promise<ProductMetrics> {
  const rows = listUsers ?? (() => pageAuthUsers(
    Deno.env.get("GOSOOMAP_SUPABASE_URL"),
    Deno.env.get("GOSOOMAP_SERVICE_ROLE_KEY"),
  ));
  const a = await countAuthActivity(rows);
  return {
    users: a.users,
    dau: a.dau,
    wau: a.wau,
    mau: a.mau,
    extra: `Signups 7d ${a.last7} · 30d ${a.last30}`,
  };
}

export async function loadCrema(
  listUsers?: () => Promise<{ created_at?: string; last_sign_in_at?: string }[]>,
  countWaitlist?: () => Promise<number>,
): Promise<ProductMetrics> {
  const rows = listUsers ?? (() => pageAuthUsers(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  ));
  const wait = countWaitlist ?? (() => countTable(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    "waitlist_submissions",
  ));
  const a = await countAuthActivity(rows);
  const w = await wait();
  return {
    users: a.users,
    dau: a.dau,
    wau: a.wau,
    mau: a.mau,
    extra: `Waitlist ${w}`,
  };
}

export type ShotupClient = {
  countUsers: () => Promise<number>;
  countSources: () => Promise<number>;
  activeUserIds: (sinceMs: number) => Promise<number>;
};

export async function loadShotup(client?: ShotupClient): Promise<ProductMetrics> {
  const c = client ?? shotupClient();
  const day = 86400000;
  const [users, sources, dau, wau, mau] = await Promise.all([
    c.countUsers(),
    c.countSources(),
    c.activeUserIds(day),
    c.activeUserIds(7 * day),
    c.activeUserIds(30 * day),
  ]);
  return { users, dau, wau, mau, extra: `Sources ${sources}` };
}

function shotupClient(): ShotupClient {
  const url = Deno.env.get("SHOTUP_SUPABASE_URL");
  const key = Deno.env.get("SHOTUP_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("missing Shotup secrets");
  return {
    countUsers: () => countTable(url, key, "users"),
    countSources: () => countTable(url, key, "sources"),
    activeUserIds: (sinceMs) => countShotupActive(url, key, sinceMs),
  };
}

export const PRODUCTS: {
  id: ProductId;
  name: string;
  adminUrl: string | null;
  load: () => Promise<ProductMetrics>;
}[] = [
  { id: "aug", name: "aug", adminUrl: null, load: () => loadAug() },
  { id: "superba", name: "Superba", adminUrl: "https://share.superba.me/admin", load: () => loadSuperba() },
  { id: "gather", name: "Gather", adminUrl: "https://gather.best/admin", load: () => loadGather() },
  { id: "gosoomap", name: "고수맵", adminUrl: "https://gosoomap.com/admin", load: () => loadGosoomap() },
  { id: "crema", name: "Crema", adminUrl: null, load: () => loadCrema() },
  { id: "shotup", name: "Shotup AI", adminUrl: null, load: () => loadShotup() },
  { id: "augclaw", name: "augclaw", adminUrl: null, load: () => loadAugclaw() },
];

function num(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

async function pageAuthUsers(
  url: string | undefined,
  key: string | undefined,
): Promise<{ created_at?: string; last_sign_in_at?: string }[]> {
  if (!url || !key) throw new Error("missing auth-user secrets");
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const out: { created_at?: string; last_sign_in_at?: string }[] = [];
  let page = 1;
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    out.push(...data.users);
    if (data.users.length < 1000) break;
    page += 1;
  }
  return out;
}

async function countTable(url: string | undefined, key: string | undefined, table: string): Promise<number> {
  if (!url || !key) throw new Error("missing count secrets");
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

async function countShotupActive(url: string, key: string, sinceMs: number): Promise<number> {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const since = new Date(Date.now() - sinceMs).toISOString();
  const ids = new Set<string>();
  const add = (rows: { user_id?: string }[] | null) => {
    for (const r of rows ?? []) if (r.user_id) ids.add(r.user_id);
  };
  const sources = await supabase.from("sources").select("user_id").gte("ingested_at", since);
  if (sources.error) throw new Error(sources.error.message);
  add(sources.data);
  const conv = await supabase.from("conversations").select("user_id").gte("updated_at", since);
  if (conv.error) throw new Error(conv.error.message);
  add(conv.data);
  const msgs = await supabase
    .from("messages")
    .select("conversation_id, created_at")
    .gte("created_at", since);
  if (msgs.error) throw new Error(msgs.error.message);
  const convIds = [...new Set((msgs.data ?? []).map((m: { conversation_id: string }) => m.conversation_id))];
  if (convIds.length) {
    const owners = await supabase.from("conversations").select("id, user_id").in("id", convIds);
    if (owners.error) throw new Error(owners.error.message);
    add(owners.data);
  }
  return ids.size;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
deno test --allow-env supabase/functions/pbd-admin-stats/sources_test.ts
```

Expected: all pass. If `loadAug throws when bearer missing` fails because the env is set in the shell, `Deno.env.delete` in the test is enough — do not skip the test.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/pbd-admin-stats/sources.ts supabase/functions/pbd-admin-stats/sources_test.ts
git commit -m "$(cat <<'EOF'
Add per-product admin stat fetchers with isolated failures.

EOF
)"
```

---

### Task 3: HTTP handler — CORS, password, parallel cards, 60s cache

**Files:**
- Create: `supabase/functions/pbd-admin-stats/index.ts`
- Create: `supabase/functions/pbd-admin-stats/index_test.ts`

**Interfaces:**
- Consumes: `passwordOk`, `settleCard` from `lib.ts`; `PRODUCTS` from `sources.ts`
- Produces: `handleRequest(req: Request, now?: () => number): Promise<Response>` so tests do not need `Deno.serve`

- [ ] **Step 1: Write failing handler tests**

```ts
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { handleRequest } from "./index.ts";

function post(pw: string, origin = "https://pbd.team") {
  return new Request("https://example.com/pbd-admin-stats", {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify({ password: pw }),
  });
}

Deno.test("OPTIONS is 204 with pbd.team CORS", async () => {
  const res = await handleRequest(new Request("https://example.com", {
    method: "OPTIONS",
    headers: { Origin: "https://pbd.team" },
  }));
  assertEquals(res.status, 204);
  assertEquals(res.headers.get("Access-Control-Allow-Origin"), "https://pbd.team");
});

Deno.test("wrong password is 403 without cards", async () => {
  Deno.env.set("PBD_ADMIN_PASSWORD", "right");
  const res = await handleRequest(post("wrong"));
  assertEquals(res.status, 403);
  const body = await res.json();
  assertEquals(body.cards, undefined);
});

Deno.test("empty env password is 403", async () => {
  Deno.env.delete("PBD_ADMIN_PASSWORD");
  const res = await handleRequest(post("anything"));
  assertEquals(res.status, 403);
});
```

Also add a test that `assembleCards` (exported) keeps other cards when one `load` throws:

```ts
import { assembleCards } from "./index.ts";
import type { ProductMetrics } from "./lib.ts";

Deno.test("assembleCards keeps neighbors when one load throws", async () => {
  const cards = await assembleCards([
    {
      id: "aug",
      name: "aug",
      adminUrl: null,
      load: async (): Promise<ProductMetrics> => {
        throw new Error("aug down");
      },
    },
    {
      id: "augclaw",
      name: "augclaw",
      adminUrl: null,
      load: async () => ({ users: null, dau: null, wau: null, mau: null, extra: "No live metrics yet" }),
    },
  ]);
  assertEquals(cards[0].status, "error");
  assertEquals(cards[1].status, "ok");
});
```

- [ ] **Step 2: Run tests — expect fail**

```bash
deno test --allow-env supabase/functions/pbd-admin-stats/index_test.ts
```

Expected: fail — `index.ts` missing.

- [ ] **Step 3: Implement `index.ts`**

```ts
import { passwordOk, settleCard, type Card, type ProductMetrics, type StatsResponse } from "./lib.ts";
import { PRODUCTS } from "./sources.ts";

const ALLOW_ORIGIN = "https://pbd.team";
const CACHE_MS = 60_000;

type ProductSpec = {
  id: (typeof PRODUCTS)[number]["id"];
  name: string;
  adminUrl: string | null;
  load: () => Promise<ProductMetrics>;
};

let cache: { at: number; body: StatsResponse } | null = null;

function cors(origin: string | null): HeadersInit {
  const allow = origin === ALLOW_ORIGIN ? origin : ALLOW_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };
}

export async function assembleCards(products: ProductSpec[] = PRODUCTS): Promise<Card[]> {
  return await Promise.all(
    products.map((p) => settleCard(p.id, p.name, p.adminUrl, p.load)),
  );
}

export async function handleRequest(req: Request, now: () => number = Date.now): Promise<Response> {
  const origin = req.headers.get("Origin");
  const headers = cors(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  let password = "";
  try {
    const body = await req.json();
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return new Response(JSON.stringify({ error: "Bad request" }), { status: 400, headers });
  }

  const expected = Deno.env.get("PBD_ADMIN_PASSWORD") ?? "";
  if (!(await passwordOk(password, expected))) {
    console.warn("pbd-admin-stats: rejected password");
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers });
  }

  const t = now();
  if (cache && t - cache.at < CACHE_MS) {
    return new Response(JSON.stringify(cache.body), { status: 200, headers });
  }

  const cards = await assembleCards();
  const body: StatsResponse = { generatedAt: new Date(t).toISOString(), cards };
  cache = { at: t, body };
  return new Response(JSON.stringify(body), { status: 200, headers });
}

Deno.serve((req) => handleRequest(req));
```

`index_test.ts` imports `handleRequest` — `Deno.serve` at module load will start a server during tests. **Do not call `Deno.serve` at top level.** Guard it:

```ts
if (import.meta.main) {
  Deno.serve((req) => handleRequest(req));
}
```

Edge Functions need a default serve. Supabase bundles `index.ts` and expects `Deno.serve`. `import.meta.main` is true in the deployed isolate and false when the file is imported from tests. Use that guard.

- [ ] **Step 4: Run tests — expect pass**

```bash
deno test --allow-env supabase/functions/pbd-admin-stats/index_test.ts
```

Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add supabase/functions/pbd-admin-stats/index.ts supabase/functions/pbd-admin-stats/index_test.ts
git commit -m "$(cat <<'EOF'
Gate portfolio stats behind a password and isolate product failures.

EOF
)"
```

---

### Task 4: Replace `admin/index.html` with the card dashboard

**Files:**
- Modify: `admin/index.html` (replace entire file)

**Interfaces:**
- Consumes: `POST { password }` → `StatsResponse` from `https://jantbnwrzeyvfblschct.supabase.co/functions/v1/pbd-admin-stats`
- Produces: password view + card grid; `sessionStorage['pbd_admin_pw']`; `noindex`

- [ ] **Step 1: Write failing page checks (current file is waitlist)**

Run:

```bash
rg -q "pbd-admin-stats" admin/index.html && rg -q "noindex" admin/index.html
```

Expected: exit code `1` (strings absent).

- [ ] **Step 2: Replace `admin/index.html`**

Write the full page. Requirements in this file:

- `<meta name="robots" content="noindex, nofollow">`
- Title: `PBD Admin`
- `#login-view` form `#password` + submit
- `#dash-view` hidden until success: header “PBD Admin”, `#refresh-btn`, `#cards`
- Two-column grid at `min-width: 800px`, one column below
- Metric `null` → `—`; number → `toLocaleString()`
- Stickiness shown only when not `null`, as `N%`
- `status === "error"` → “불러오지 못함” + `#refresh-btn` is the retry (no extra endpoint)
- `adminUrl` → “어드민 →” link
- `sessionStorage.setItem("pbd_admin_pw", password)` on submit; on load, if key exists, fetch immediately
- 403 → clear session key, show login “Wrong password.”
- Function URL exactly: `https://jantbnwrzeyvfblschct.supabase.co/functions/v1/pbd-admin-stats`
- POST JSON `{ password }`, `Content-Type: application/json`
- Do not embed `PBD_ADMIN_PASSWORD`
- Remove waitlist tabs, CSV, Clear All, `localStorage` waitlist keys
- Visual: light page `#F6F3F0`, system/Inter font (readable numbers). Not the black marketing home.

Skeleton (implement the JS fully — this is the page, not a placeholder):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>PBD Admin</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; background: #F6F3F0; color: #1d1d1f; }
        .wrap { max-width: 960px; margin: 0 auto; padding: 40px 20px; }
        h1 { font-size: 28px; letter-spacing: -0.02em; }
        .grid { display: grid; gap: 16px; grid-template-columns: 1fr; }
        @media (min-width: 800px) { .grid { grid-template-columns: 1fr 1fr; } }
        .card { background: #fff; border-radius: 16px; padding: 20px; }
        .card.error { background: #fff5f5; }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 16px; }
        .metrics dt { font-size: 11px; color: #86868b; text-transform: uppercase; }
        .metrics dd { font-size: 22px; font-weight: 650; font-variant-numeric: tabular-nums; }
        .extra, .err { margin-top: 12px; font-size: 13px; color: #6e6e73; }
        .err { color: #b42318; }
        input, button { font: inherit; }
        input { width: 100%; padding: 12px 14px; border-radius: 10px; border: 1px solid #d2d2d7; }
        button { background: #1d1d1f; color: #fff; border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; }
        a { color: #0066cc; }
        [hidden] { display: none !important; }
    </style>
</head>
<body>
    <div class="wrap">
        <section id="login-view">
            <h1>PBD Admin</h1>
            <form id="login-form" style="margin-top:24px;max-width:320px;display:flex;flex-direction:column;gap:12px;">
                <input id="password" type="password" autocomplete="current-password" required>
                <button type="submit">Continue</button>
                <p id="login-msg" class="err"></p>
            </form>
        </section>
        <section id="dash-view" hidden>
            <header style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px;">
                <h1>PBD Admin</h1>
                <button type="button" id="refresh-btn">Refresh</button>
            </header>
            <div id="cards" class="grid"></div>
        </section>
    </div>
    <script>
        const FN = "https://jantbnwrzeyvfblschct.supabase.co/functions/v1/pbd-admin-stats";
        const PW_KEY = "pbd_admin_pw";
        const $ = (id) => document.getElementById(id);

        function fmt(v) {
            if (v === null || v === undefined) return "—";
            return Number(v).toLocaleString();
        }

        function render(cards) {
            $("cards").innerHTML = cards.map((c) => {
                if (c.status === "error") {
                    return `<article class="card error"><h2>${c.name}</h2><p class="err">불러오지 못함</p></article>`;
                }
                const stick = c.stickiness == null ? "" : `<p class="extra">Stickiness ${c.stickiness}%</p>`;
                const link = c.adminUrl ? `<p class="extra"><a href="${c.adminUrl}" target="_blank" rel="noopener">어드민 →</a></p>` : "";
                return `<article class="card">
                    <h2>${c.name}</h2>
                    <dl class="metrics">
                        <div><dt>Users</dt><dd>${fmt(c.users)}</dd></div>
                        <div><dt>DAU</dt><dd>${fmt(c.dau)}</dd></div>
                        <div><dt>WAU</dt><dd>${fmt(c.wau)}</dd></div>
                        <div><dt>MAU</dt><dd>${fmt(c.mau)}</dd></div>
                    </dl>
                    ${stick}
                    <p class="extra">${c.extra || ""}</p>
                    ${link}
                </article>`;
            }).join("");
        }

        async function load() {
            const password = sessionStorage.getItem(PW_KEY);
            if (!password) {
                $("login-view").hidden = false;
                $("dash-view").hidden = true;
                return;
            }
            const res = await fetch(FN, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            if (res.status === 403) {
                sessionStorage.removeItem(PW_KEY);
                $("login-msg").textContent = "Wrong password.";
                $("login-view").hidden = false;
                $("dash-view").hidden = true;
                return;
            }
            if (!res.ok) {
                $("login-msg").textContent = "Could not load stats.";
                return;
            }
            const body = await res.json();
            $("login-view").hidden = true;
            $("dash-view").hidden = false;
            render(body.cards);
        }

        $("login-form").addEventListener("submit", (e) => {
            e.preventDefault();
            sessionStorage.setItem(PW_KEY, $("password").value);
            load();
        });
        $("refresh-btn").addEventListener("click", load);
        load();
    </script>
</body>
</html>
```

- [ ] **Step 3: Re-run page checks — expect pass**

```bash
rg -q "pbd-admin-stats" admin/index.html && rg -q "noindex" admin/index.html && rg -q "pbd_admin_pw" admin/index.html && rg -q "불러오지 못함" admin/index.html
! rg -q "pbd_waitlist_" admin/index.html
! rg -q "PBD_ADMIN_PASSWORD" admin/index.html
! rg -q "Pbdllc" admin/index.html
```

Expected: first four succeed; last three `! rg` also succeed (password and old waitlist keys absent).

- [ ] **Step 4: Commit**

```bash
git add admin/index.html
git commit -m "$(cat <<'EOF'
Replace waitlist admin with a portfolio stats card page.

EOF
)"
```

---

### Task 5: Deploy secrets, function, and live-check

**Files:**
- None in git (secrets only). Function source already committed.

**Interfaces:**
- Consumes: deployed `pbd-admin-stats`; password from the design conversation (set as secret, do not echo it in shell history if avoidable — `supabase secrets set` prompt / `--env-file` that is gitignored)
- Produces: live `https://pbd.team/admin` after GitHub Pages publishes `admin/index.html`

- [ ] **Step 1: Create a gitignored env file for secrets**

Create `.supabase-admin-secrets` (do not commit). Add `.supabase-admin-secrets` to `.gitignore` if not already ignored.

```
PBD_ADMIN_PASSWORD=
AUG_ADMIN_API_URL=https://dev-admin-api.aug.ooo
AUG_ADMIN_BEARER=
SUPERBA_SUPABASE_URL=https://tqugnlmtkvmdzwqskgva.supabase.co
SUPERBA_ANON_KEY=
SUPERBA_ADMIN_PASSWORD=
GATHER_SUPABASE_URL=https://auth.gather.best
GATHER_SERVICE_ROLE_KEY=
GATHER_ADMIN_PASSWORD=
GOSOOMAP_SUPABASE_URL=https://aohldfdbiddythohfvtf.supabase.co
GOSOOMAP_SERVICE_ROLE_KEY=
SHOTUP_SUPABASE_URL=https://ipsalcfuqftizwfphcqn.supabase.co
SHOTUP_SERVICE_ROLE_KEY=
```

Fill from each product’s existing admin / Supabase dashboard. For `AUG_ADMIN_BEARER`, sign into aug admin once and copy a current Firebase ID token from the network tab (`Authorization` on `/admin/analytics`). If that token expires (~1h), the aug card will error until the secret is rotated — do not build AWS/Firebase minting in this plan.

- [ ] **Step 2: Push secrets and deploy**

```bash
supabase secrets set --env-file .supabase-admin-secrets --project-ref jantbnwrzeyvfblschct
supabase functions deploy pbd-admin-stats --project-ref jantbnwrzeyvfblschct --no-verify-jwt
```

Expected: deploy prints the function URL ending in `/functions/v1/pbd-admin-stats`.

- [ ] **Step 3: Curl contract**

Wrong password (use a dummy, not the real one):

```bash
curl -s -o /tmp/pbd-admin-403.json -w "%{http_code}" \
  -X POST https://jantbnwrzeyvfblschct.supabase.co/functions/v1/pbd-admin-stats \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://pbd.team' \
  -d '{"password":"wrong"}'
```

Expected: `403` and `/tmp/pbd-admin-403.json` has no `cards` key.

Right password (read from the env file in the same shell, do not print it):

```bash
set -a && source .supabase-admin-secrets && set +a
curl -s -X POST https://jantbnwrzeyvfblschct.supabase.co/functions/v1/pbd-admin-stats \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://pbd.team' \
  -d "{\"password\":\"$PBD_ADMIN_PASSWORD\"}" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert "cards" in d; print([c["id"]+"="+c["status"] for c in d["cards"]])'
```

Expected: seven ids in order `aug superba gather gosoomap crema shotup augclaw`. `augclaw=ok`. Others `ok` if their secrets work, `error` if not — that is acceptable for first deploy as long as the page still renders.

- [ ] **Step 4: Browser verify on production**

After Pages deploy (or wait for `main` to publish):

1. Open `https://pbd.team/admin` — login form, no waitlist tables.
2. Wrong password — stay on form, “Wrong password.”
3. Right password — seven cards.
4. Refresh button — same tab, no password prompt.
5. New tab to `/admin` — password prompt again.
6. Compare Users (and DAU where the product admin shows it) to:
   - Superba `share.superba.me/admin`
   - Gather `gather.best/admin`
   - 고수맵 `gosoomap.com/admin` (Users + 7/30-day signups; DAU may differ)
   - aug admin (Users + DAU)
7. Shotup Users = `select count(*) from public.users` in Shotup Supabase.
8. View-source / response headers: `noindex` present.
9. If one secret is wrong, that card says “불러오지 못함” and the rest stay.

- [ ] **Step 5: Commit gitignore only if you added the secrets filename**

```bash
git add .gitignore
git commit -m "$(cat <<'EOF'
Ignore the local file that holds admin dashboard secrets.

EOF
)"
```

Skip this commit if `.gitignore` did not change.

---

## Self-review

**Spec coverage**

| Spec item | Task |
|-----------|------|
| Replace waitlist admin | Task 4 |
| Password gate, hashed compare, 403 no cards | Tasks 1, 3, 5 |
| Parallel fetch, 8s timeout, isolate errors | Tasks 1–3 |
| Cards: users / DAU / WAU / MAU / stickiness / extra / admin link | Tasks 2, 4 |
| Product list including richer Shotup | Task 2 |
| augclaw empty success | Task 2 |
| sessionStorage, no auto-refresh | Task 4 |
| 60s in-memory cache | Task 3 |
| CORS `https://pbd.team` only | Task 3 |
| Secrets not in git | Tasks 4–5 |
| `noindex` | Task 4 |
| Live compare to existing admins | Task 5 |
| No AWS for Shotup | Task 2 uses Supabase only |

**Placeholder scan:** no TBD. aug `adminUrl` may be `null` if the public host is unclear — that is an allowed spec outcome, not a missing metric.

**Type consistency:** `ProductId`, `Metric`, `ProductMetrics`, `Card`, `StatsResponse`, `settleCard`, `handleRequest`, `assembleCards`, `PRODUCTS` names match across tasks.
