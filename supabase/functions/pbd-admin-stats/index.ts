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

if (import.meta.main) {
  Deno.serve((req) => handleRequest(req));
}
