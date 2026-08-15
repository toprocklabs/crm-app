import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getPushRecency } from "@/lib/push-recency";

const now = new Date("2026-08-14T12:00:00Z").getTime();
const daysAgo = (n: number) => new Date(now - n * 86_400_000);

describe("getPushRecency", () => {
  it("treats a missing push as unknown, not stale", () => {
    for (const input of [null, undefined, ""]) {
      const result = getPushRecency(input, now);
      assert.equal(result.band, "none");
      assert.equal(result.label, "—");
      assert.equal(result.days, null);
    }
  });

  it("falls back to the none band for an unparseable date", () => {
    assert.equal(getPushRecency("not-a-date", now).band, "none");
  });

  it("labels anything inside 24h as today", () => {
    assert.deepEqual(getPushRecency(new Date(now), now), { band: "today", label: "today", days: 0 });
    assert.equal(getPushRecency(new Date(now - 23 * 3_600_000), now).band, "today");
  });

  it("clamps a future push to today rather than negative days", () => {
    const result = getPushRecency(new Date(now + 5 * 86_400_000), now);
    assert.equal(result.band, "today");
    assert.equal(result.days, 0);
  });

  it("walks the bands at their boundaries", () => {
    assert.equal(getPushRecency(daysAgo(1), now).band, "warm");
    assert.equal(getPushRecency(daysAgo(7), now).band, "warm");
    assert.equal(getPushRecency(daysAgo(8), now).band, "slow");
    assert.equal(getPushRecency(daysAgo(30), now).band, "slow");
    assert.equal(getPushRecency(daysAgo(31), now).band, "cold");
  });

  it("singularizes the one-day label", () => {
    assert.equal(getPushRecency(daysAgo(1), now).label, "1d ago");
    assert.equal(getPushRecency(daysAgo(2), now).label, "2d ago");
  });

  it("accepts an ISO string as well as a Date", () => {
    assert.equal(getPushRecency(daysAgo(3).toISOString(), now).band, "warm");
  });
});
