import type {
  Amount,
  EvalState,
  PaymentRequest,
  PolicyDecision,
  PolicySpec,
} from "./types";

/**
 * Deterministic policy evaluation — the heart of Leash.
 *
 * Pure function: same inputs always produce the same decision. No I/O, no
 * randomness, no model calls. This is the "deterministic execution layer"
 * that prompt manipulation cannot bypass. The caller (leashd) supplies the
 * aggregated spend/rate state; this function only compares.
 *
 * Fail-closed: anything not explicitly permitted is denied.
 */
export function evaluatePolicy(
  spec: PolicySpec,
  req: PaymentRequest,
  state: EvalState
): PolicyDecision {
  const reasons: string[] = [];

  // 1. Hard stops.
  if (spec.killSwitch) {
    return { decision: "denied", reasons: ["kill switch active"], matched: "killSwitch" };
  }
  if (spec.gradedState !== "normal") {
    return {
      decision: "denied",
      reasons: [`graded state: ${spec.gradedState} blocks payments`],
      matched: "gradedState",
    };
  }

  // 2. Rail allowed?
  if (spec.rails.length > 0 && !spec.rails.includes(req.rail)) {
    return {
      decision: "denied",
      reasons: [`rail ${req.rail} not permitted`],
      matched: "rails",
    };
  }

  // 3. Denylist always wins.
  if (matchesList(spec.deny, req)) {
    return { decision: "denied", reasons: ["recipient on denylist"], matched: "deny" };
  }

  // 4. Allowlist / default decision (scope).
  if (spec.allow) {
    if (!matchesList(spec.allow, req)) {
      return {
        decision: "denied",
        reasons: ["recipient not on allowlist"],
        matched: "allow",
      };
    }
  } else if (spec.defaultDecision === "deny") {
    return {
      decision: "denied",
      reasons: ["no allowlist configured; default-deny"],
      matched: "defaultDecision",
    };
  }

  // 5. Time window.
  if (spec.timeWindows.length > 0 && !withinTimeWindow(spec.timeWindows, req.ts, spec.timezone)) {
    return {
      decision: "denied",
      reasons: ["outside permitted time window"],
      matched: "timeWindows",
    };
  }

  // 6. Rate limit.
  if (spec.rateLimit && state.recentCount >= spec.rateLimit.maxPerWindow) {
    return {
      decision: "denied",
      reasons: [
        `rate limit ${spec.rateLimit.maxPerWindow}/${spec.rateLimit.windowSeconds}s exceeded`,
      ],
      matched: "rateLimit",
    };
  }

  // 7. Per-transaction cap (unit must match to apply).
  if (spec.perTxMax && sameUnit(spec.perTxMax, req.amount) && req.amount.value > spec.perTxMax.value) {
    return {
      decision: "capped",
      reasons: [`exceeds per-transaction max (${spec.perTxMax.value} ${spec.perTxMax.unit})`],
      matched: "perTxMax",
    };
  }

  // 8. Rolling budget windows.
  for (const b of spec.budgets) {
    if (!sameUnit(b.cap, req.amount)) continue;
    const already = state.spend[b.window];
    if (already + req.amount.value > b.cap.value) {
      return {
        decision: "capped",
        reasons: [
          `would exceed ${b.window} budget (${already}+${req.amount.value} > ${b.cap.value} ${b.cap.unit})`,
        ],
        matched: `budget:${b.window}`,
      };
    }
  }

  // 9. Approval threshold.
  if (
    spec.approvalThreshold &&
    sameUnit(spec.approvalThreshold, req.amount) &&
    req.amount.value >= spec.approvalThreshold.value
  ) {
    return {
      decision: "approval_required",
      reasons: [
        `at or above approval threshold (${spec.approvalThreshold.value} ${spec.approvalThreshold.unit})`,
      ],
      matched: "approvalThreshold",
    };
  }

  reasons.push("within policy");
  return { decision: "allowed", reasons };
}

function sameUnit(a: Amount, b: Amount): boolean {
  return a.unit === b.unit;
}

type ListShape =
  | {
      endpoints?: string[];
      domains?: string[];
      lightningAddresses?: string[];
      mints?: string[];
    }
  | undefined;

function matchesList(list: ListShape, req: PaymentRequest): boolean {
  if (!list) return false;
  if (req.endpoint && list.endpoints?.includes(req.endpoint)) return true;
  if (req.domain && list.domains?.includes(req.domain)) return true;
  if (req.lightningAddress && list.lightningAddresses?.includes(req.lightningAddress)) return true;
  if (req.mint && list.mints?.includes(req.mint)) return true;
  return false;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Wall-clock day-of-week (0=Sun) and minute-of-day for `ts` in an IANA zone,
 * via Intl (the tz database ships with the runtime). Deterministic: same ts +
 * tz always yield the same parts. Returns null if the zone is invalid.
 */
function zonedDayMinute(ts: number, timezone: string): { day: number; minute: number } | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(ts));
    let day = -1;
    let hour = 0;
    let min = 0;
    for (const p of parts) {
      if (p.type === "weekday") day = WEEKDAY_INDEX[p.value] ?? -1;
      else if (p.type === "hour") hour = Number(p.value) % 24; // some envs emit "24" at midnight
      else if (p.type === "minute") min = Number(p.value);
    }
    if (day < 0) return null;
    return { day, minute: hour * 60 + min };
  } catch {
    return null;
  }
}

function withinTimeWindow(
  windows: PolicySpec["timeWindows"],
  ts: number,
  timezone: string
): boolean {
  const zoned = zonedDayMinute(ts, timezone);
  // Fail-closed: an unresolvable zone on a time-restricted policy is not "open".
  if (!zoned) return false;
  const { day, minute } = zoned;
  for (const w of windows) {
    if (!w.days.includes(day)) continue;
    if (w.startMinute <= w.endMinute) {
      if (minute >= w.startMinute && minute < w.endMinute) return true;
    } else {
      // overnight window (wraps midnight)
      if (minute >= w.startMinute || minute < w.endMinute) return true;
    }
  }
  return false;
}
