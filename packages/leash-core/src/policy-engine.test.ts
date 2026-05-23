import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "./policy-engine";
import type { PolicySpec, PaymentRequest, EvalState } from "./types";

const base: PolicySpec = {
  version: 1,
  defaultDecision: "deny",
  budgets: [],
  timeWindows: [],
  killSwitch: false,
  gradedState: "normal",
  rails: [],
};

const zeroState: EvalState = {
  spend: { task: 0, hour: 0, day: 0, month: 0 },
  recentCount: 0,
};

function req(over: Partial<PaymentRequest> = {}): PaymentRequest {
  return {
    agentId: "a1",
    rail: "lightning_nwc",
    amount: { unit: "sat", value: 1000 },
    endpoint: "https://api.example.com/x",
    ts: Date.UTC(2026, 4, 24, 12, 0, 0),
    ...over,
  };
}

describe("evaluatePolicy", () => {
  it("default-denies with no allowlist", () => {
    expect(evaluatePolicy(base, req(), zeroState).decision).toBe("denied");
  });

  it("allows when on allowlist and within caps", () => {
    const spec: PolicySpec = {
      ...base,
      allow: { endpoints: ["https://api.example.com/x"] },
      perTxMax: { unit: "sat", value: 5000 },
    };
    expect(evaluatePolicy(spec, req(), zeroState).decision).toBe("allowed");
  });

  it("caps over per-transaction max", () => {
    const spec: PolicySpec = {
      ...base,
      allow: { endpoints: ["https://api.example.com/x"] },
      perTxMax: { unit: "sat", value: 500 },
    };
    expect(evaluatePolicy(spec, req(), zeroState).decision).toBe("capped");
  });

  it("caps when budget window would be exceeded", () => {
    const spec: PolicySpec = {
      ...base,
      allow: { endpoints: ["https://api.example.com/x"] },
      budgets: [{ window: "day", cap: { unit: "sat", value: 1500 } }],
    };
    const state: EvalState = { ...zeroState, spend: { task: 0, hour: 0, day: 1000, month: 0 } };
    expect(evaluatePolicy(spec, req(), state).decision).toBe("capped");
  });

  it("kill switch denies everything", () => {
    const spec: PolicySpec = { ...base, killSwitch: true, allow: { endpoints: ["https://api.example.com/x"] } };
    expect(evaluatePolicy(spec, req(), zeroState).decision).toBe("denied");
  });

  it("denylist beats allowlist", () => {
    const spec: PolicySpec = {
      ...base,
      allow: { endpoints: ["https://api.example.com/x"] },
      deny: { endpoints: ["https://api.example.com/x"] },
    };
    expect(evaluatePolicy(spec, req(), zeroState).decision).toBe("denied");
  });

  it("requires approval at/above threshold", () => {
    const spec: PolicySpec = {
      ...base,
      allow: { endpoints: ["https://api.example.com/x"] },
      approvalThreshold: { unit: "sat", value: 1000 },
    };
    expect(evaluatePolicy(spec, req(), zeroState).decision).toBe("approval_required");
  });

  it("denies disallowed rail", () => {
    const spec: PolicySpec = {
      ...base,
      allow: { endpoints: ["https://api.example.com/x"] },
      rails: ["cashu"],
    };
    expect(evaluatePolicy(spec, req(), zeroState).decision).toBe("denied");
  });
});
