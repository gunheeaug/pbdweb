import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { assembleCards, handleRequest } from "./index.ts";
import type { ProductMetrics } from "./lib.ts";

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
