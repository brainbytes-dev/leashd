import { describe, it, expect } from "vitest";
import { x402CapViolations } from "@/app/api/leash/policies/x402-caps";

const spec = {
  version: 1, defaultDecision: "deny" as const, budgets: [], timezone: "UTC", timeWindows: [],
  killSwitch: false, gradedState: "normal" as const, rails: ["x402" as const],
  perTxMax: { unit: "usd_cent" as const, value: 900 },
};

describe("x402CapViolations", () => {
  it("returns nothing when no x402 binding exists", () => {
    expect(x402CapViolations(spec, [{ rail: "cashu", meta: null }])).toEqual([]);
  });
  it("checks against the binding's allowance metadata", () => {
    const out = x402CapViolations(spec, [{ rail: "x402", meta: { allowanceUsdCent: "500", periodSeconds: "86400" } }]);
    expect(out).toHaveLength(1);
  });
  it("ignores a binding without allowance metadata", () => {
    expect(x402CapViolations(spec, [{ rail: "x402", meta: { network: "eip155:8453" } }])).toEqual([]);
  });
});
