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

export type RpcClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
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
  const rows = listUsers ?? (() =>
    pageAuthUsers(
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
  const rows = listUsers ?? (() =>
    pageAuthUsers(
      Deno.env.get("CREMA_SUPABASE_URL"),
      Deno.env.get("CREMA_SERVICE_ROLE_KEY"),
    ));
  const wait = countWaitlist ?? (() =>
    countTable(
      Deno.env.get("CREMA_SUPABASE_URL"),
      Deno.env.get("CREMA_SERVICE_ROLE_KEY"),
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

async function countTable(
  url: string | undefined,
  key: string | undefined,
  table: string,
): Promise<number> {
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
