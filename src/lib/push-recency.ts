// Recency bands for the "Last push" column on /accounts (plan 005).
//
// Pure so the thresholds are testable without a database or a clock: callers
// pass `now` explicitly rather than the function reaching for Date.now().

export type PushBand = "today" | "warm" | "slow" | "cold" | "none";

export type PushRecency = {
  band: PushBand;
  label: string;
  /** Whole days since the push; null when there is nothing to measure. */
  days: number | null;
};

const DAY_MS = 86_400_000;

export function getPushRecency(pushedAt: Date | string | null | undefined, now: number): PushRecency {
  if (!pushedAt) {
    // No linked repo, or a repo with no commits. Unknown, not zero — the "none"
    // band renders grey precisely so it can't be misread as "abandoned".
    return { band: "none", label: "—", days: null };
  }

  const time = pushedAt instanceof Date ? pushedAt.getTime() : new Date(pushedAt).getTime();
  if (Number.isNaN(time)) {
    return { band: "none", label: "—", days: null };
  }

  // A clock skew or a push dated in the future still reads as "today" rather
  // than a negative day count.
  const days = Math.max(0, Math.floor((now - time) / DAY_MS));

  if (days < 1) {
    return { band: "today", label: "today", days };
  }

  const label = days === 1 ? "1d ago" : `${days}d ago`;

  if (days <= 7) {
    return { band: "warm", label, days };
  }
  if (days <= 30) {
    return { band: "slow", label, days };
  }
  return { band: "cold", label, days };
}
