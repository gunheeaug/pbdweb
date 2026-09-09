export type ProductId =
  | "aug"
  | "superba"
  | "gather"
  | "gosoomap"
  | "crema"
  | "shotup"
  | "augclaw";

export type Metric = number | null;

export type DetailRow = { label: string; value: string };

export type DayPoint = {
  date: string;
  users: Metric;
  dau: Metric;
  wau: Metric;
  mau: Metric;
};

export type SnapshotRow = {
  product_id: string;
  day: string;
  users: Metric;
  dau: Metric;
  wau: Metric;
  mau: Metric;
};

export type ProductMetrics = {
  users: Metric;
  dau: Metric;
  wau: Metric;
  mau: Metric;
  extra: string;
  last7?: Metric;
  details?: DetailRow[];
};

export type CardOk = {
  id: ProductId;
  name: string;
  status: "ok";
  users: Metric;
  dau: Metric;
  wau: Metric;
  mau: Metric;
  usersDelta: Metric;
  dauDelta: Metric;
  wauDelta: Metric;
  mauDelta: Metric;
  stickiness: Metric;
  extra: string;
  details: DetailRow[];
  series: DayPoint[];
  last7: Metric;
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

const secretOverlay: Record<string, string> = {};

export function secret(name: string): string | undefined {
  return secretOverlay[name] ?? Deno.env.get(name) ?? undefined;
}

export function applySecrets(rows: { name?: string; value?: string }[]): void {
  for (const row of rows) {
    if (row.name && row.value && !secret(row.name)) {
      secretOverlay[row.name] = row.value;
    }
  }
}

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

export function pctChange(curr: Metric, prev: Metric): Metric {
  if (curr == null || prev == null || prev === 0) return null;
  return Math.round((100 * (curr - prev)) / prev);
}

export function addUtcDays(isoDay: string, n: number): string {
  const d = new Date(`${isoDay}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function findWeekAgo(days: string[], today: string): string | null {
  const target = addUtcDays(today, -7);
  const set = new Set(days);
  if (set.has(target)) return target;
  let best: string | null = null;
  let bestDist = 99;
  for (let i = -10; i <= -5; i++) {
    const day = addUtcDays(today, i);
    if (!set.has(day)) continue;
    const dist = Math.abs(i + 7);
    if (dist < bestDist) {
      best = day;
      bestDist = dist;
    }
  }
  return best;
}

export function applyHistory(cards: Card[], snapshots: SnapshotRow[], today: string): Card[] {
  return cards.map((card) => {
    if (card.status !== "ok") return card;
    const rows = snapshots.filter((s) => s.product_id === card.id);
    const byDay = new Map(rows.map((s) => [s.day.slice(0, 10), s]));
    const weekAgo = findWeekAgo([...byDay.keys()], today);
    const prev = weekAgo ? byDay.get(weekAgo) : undefined;
    let usersDelta = prev ? pctChange(card.users, prev.users) : null;
    if (usersDelta == null && card.users != null && card.last7 != null && card.users > card.last7) {
      usersDelta = pctChange(card.users, card.users - card.last7);
    }
    const series = rows
      .map((s) => ({
        date: s.day.slice(0, 10),
        users: s.users,
        dau: s.dau,
        wau: s.wau,
        mau: s.mau,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);
    return {
      ...card,
      usersDelta,
      dauDelta: prev ? pctChange(card.dau, prev.dau) : null,
      wauDelta: prev ? pctChange(card.wau, prev.wau) : null,
      mauDelta: prev ? pctChange(card.mau, prev.mau) : null,
      series,
    };
  });
}

export async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
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
      usersDelta: null,
      dauDelta: null,
      wauDelta: null,
      mauDelta: null,
      stickiness: stickiness(m.wau, m.mau),
      extra: m.extra,
      details: m.details ?? [],
      series: [],
      last7: m.last7 ?? null,
      adminUrl,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed";
    return { id, name, status: "error", error: message, adminUrl };
  }
}
