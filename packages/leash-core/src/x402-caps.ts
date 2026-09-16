import type { PolicySpec, BudgetWindow } from "./types";

export interface X402Allowance {
  allowanceUsdCent: number;
  periodSeconds: number;
}

const WINDOW_SECONDS: Record<BudgetWindow, number | undefined> = {
  task: undefined, // unbounded in time; compared against the allowance directly below
  hour: 3_600,
  day: 86_400,
  month: 30 * 86_400,
};

/**
 * The on-chain allowance is the outer wall; the Leash policy must fit inside it.
 * Only usd_cent caps on a policy that includes the x402 rail are checked. A
 * budget window at least as long as the permission period may not exceed the
 * allowance; shorter windows may (they are refilled within one period).
 */
export function validateX402Caps(spec: PolicySpec, allowance: X402Allowance): string[] {
  const usesX402 = spec.rails.length === 0 || spec.rails.includes("x402");
  if (!usesX402) return [];
  const errors: string[] = [];
  const wall = `on-chain allowance ${allowance.allowanceUsdCent} usd_cent per period`;

  if (spec.perTxMax?.unit === "usd_cent" && spec.perTxMax.value > allowance.allowanceUsdCent) {
    errors.push(`perTxMax ${spec.perTxMax.value} usd_cent exceeds ${wall}`);
  }
  for (const b of spec.budgets) {
    if (b.cap.unit !== "usd_cent") continue;
    const seconds = WINDOW_SECONDS[b.window];
    const coversPeriod = seconds === undefined || seconds >= allowance.periodSeconds;
    if (coversPeriod && b.cap.value > allowance.allowanceUsdCent) {
      errors.push(`${b.window} budget ${b.cap.value} usd_cent exceeds ${wall}`);
    }
  }
  return errors;
}
