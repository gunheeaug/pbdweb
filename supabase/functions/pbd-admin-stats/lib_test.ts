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
