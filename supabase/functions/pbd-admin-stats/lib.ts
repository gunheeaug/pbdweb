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
      stickiness: stickiness(m.wau, m.mau),
      extra: m.extra,
      adminUrl,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed";
    return { id, name, status: "error", error: message, adminUrl };
  }
}
