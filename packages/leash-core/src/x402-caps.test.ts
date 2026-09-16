import { describe, it, expect } from "vitest";
import { validateX402Caps } from "./x402-caps";
import type { PolicySpec } from "./types";

const base: PolicySpec = {
  version: 1, defaultDecision: "deny", budgets: [], timezone: "UTC",
  timeWindows: [], killSwitch: false, gradedState: "normal", rails: ["x402"],
};
const day = { allowanceUsdCent: 500, periodSeconds: 86_400 };

describe("validateX402Caps", () => {
  it("passes when every usd_cent cap fits inside the allowance", () => {
    const spec = { ...base, perTxMax: { unit: "usd_cent" as const, value: 50 },
      budgets: [{ window: "day" as const, cap: { unit: "usd_cent" as const, value: 500 } }] };
    expect(validateX402Caps(spec, day)).toEqual([]);
  });
  it("rejects a per-tx max above the allowance", () => {
    const spec = { ...base, perTxMax: { unit: "usd_cent" as const, value: 600 } };
    expect(validateX402Caps(spec, day)).toEqual([
      "perTxMax 600 usd_cent exceeds on-chain allowance 500 usd_cent per period",
    ]);
  });
  it("rejects a budget window longer than or equal to the period whose cap exceeds the allowance", () => {
    const spec = { ...base, budgets: [{ window: "day" as const, cap: { unit: "usd_cent" as const, value: 501 } }] };
    expect(validateX402Caps(spec, day)).toHaveLength(1);
  });
  it("ignores sat caps and windows shorter than the period", () => {
    const spec = { ...base,
      perTxMax: { unit: "sat" as const, value: 10_000 },
      budgets: [{ window: "hour" as const, cap: { unit: "usd_cent" as const, value: 10_000 } }] };
    expect(validateX402Caps(spec, day)).toEqual([]);
  });
  it("is a no-op when the policy does not include the x402 rail", () => {
    const spec = { ...base, rails: ["cashu" as const], perTxMax: { unit: "usd_cent" as const, value: 9_999 } };
    expect(validateX402Caps(spec, day)).toEqual([]);
  });
});
