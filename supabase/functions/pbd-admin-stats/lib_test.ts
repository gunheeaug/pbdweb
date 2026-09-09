import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { applyHistory, findWeekAgo, passwordOk, pctChange, settleCard, stickiness, withTimeout } from "./lib.ts";

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

Deno.test("pctChange is null when previous is missing or zero", () => {
  assertEquals(pctChange(10, null), null);
  assertEquals(pctChange(10, 0), null);
  assertEquals(pctChange(null, 8), null);
});

Deno.test("pctChange rounds week-over-week percent", () => {
  assertEquals(pctChange(12, 10), 20);
  assertEquals(pctChange(8, 10), -20);
  assertEquals(pctChange(10, 10), 0);
});

Deno.test("findWeekAgo prefers exact day minus 7", () => {
  assertEquals(findWeekAgo(["2026-09-01", "2026-09-02"], "2026-09-09"), "2026-09-02");
});

Deno.test("applyHistory fills deltas from week-ago snapshot", () => {
  const cards = applyHistory(
    [{
      id: "gather",
      name: "Gather",
      status: "ok",
      users: 36,
      dau: 2,
      wau: 14,
      mau: 30,
      usersDelta: null,
      dauDelta: null,
      wauDelta: null,
      mauDelta: null,
      stickiness: 47,
      extra: "Onboarded 24",
      details: [],
      series: [],
      last7: 4,
      adminUrl: null,
    }],
    [{
      product_id: "gather",
      day: "2026-09-01",
      users: 30,
      dau: 1,
      wau: 10,
      mau: 25,
    }],
    "2026-09-08",
  );
  assertEquals(cards[0].status, "ok");
  if (cards[0].status === "ok") {
    assertEquals(cards[0].usersDelta, 20);
    assertEquals(cards[0].dauDelta, 100);
    assertEquals(cards[0].series.length, 1);
  }
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
