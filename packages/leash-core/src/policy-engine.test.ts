import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "./policy-engine";
import type { PolicySpec, PaymentRequest, EvalState } from "./types";

const base: PolicySpec = {
  version: 1,
  defaultDecision: "deny",
  budgets: [],
  timezone: "UTC",
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

  describe("time windows (timezone-aware)", () => {
    const allowEndpoint = { endpoints: ["https://api.example.com/x"] };
    // A fixed instant: 2026-05-24 22:30 UTC = 2026-05-25 00:30 in Europe/Zurich (+02:00 DST).
    const ts = Date.UTC(2026, 4, 24, 22, 30, 0);
    const window = [{ days: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 60 }]; // 00:00–01:00

    it("allows inside the window evaluated in the policy timezone", () => {
      // 00:30 Zurich on Sunday(=0, since it's the 25th) is inside 00:00–01:00.
      const spec: PolicySpec = {
        ...base,
        allow: { ...allowEndpoint },
        timezone: "Europe/Zurich",
        timeWindows: window,
      };
      expect(evaluatePolicy(spec, req({ ts }), zeroState).decision).toBe("allowed");
    });

    it("denies the same instant when evaluated in UTC (22:30 is outside 00:00–01:00)", () => {
      const spec: PolicySpec = {
        ...base,
        allow: { ...allowEndpoint },
        timezone: "UTC",
        timeWindows: window,
      };
      expect(evaluatePolicy(spec, req({ ts }), zeroState).decision).toBe("denied");
    });

    it("fail-closed on an invalid timezone", () => {
      const spec: PolicySpec = {
        ...base,
        allow: { ...allowEndpoint },
        timezone: "Not/AZone",
        timeWindows: window,
      };
      expect(evaluatePolicy(spec, req({ ts }), zeroState).decision).toBe("denied");
    });
  });
});
