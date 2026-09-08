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
  Deno.env.set("AUG_ADMIN_BEARER", "test-token");
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
  Deno.env.set("SUPERBA_SUPABASE_URL", "https://example.supabase.co");
  Deno.env.set("SUPERBA_ANON_KEY", "anon");
  Deno.env.set("SUPERBA_ADMIN_PASSWORD", "pw");
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
