import { describe, it, expect, beforeEach } from "vitest";
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import type { PaymentRequest, PolicySpec } from "@repo/leash-core";
import { openStore, type Store } from "./store";
import { createAuditWriter } from "./audit";
import { createGovernor } from "./governor";
import type { RailAdapter, RailResult } from "./rails/types";
import type { LeashConfig } from "./config";

function testConfig(): LeashConfig {
  const { privateKey } = generateKeyPairSync("ed25519");
  const pub = createPublicKey(privateKey).export({ type: "spki", format: "der" }).toString("base64");
  return {
    controlPlaneUrl: "http://localhost:0", // network push fails silently in tests
    workspaceId: "ws_test",
    agentId: "agent_test",
    agentToken: "tok_test",
    controlPlanePubKey: pub,
    dbPath: ":memory:",
    signingPrivateKey: privateKey,
    signingPublicKeyB64: pub,
  };
}

function fakeRail(result: RailResult): RailAdapter & { calls: number } {
  let calls = 0;
  return {
    rail: "lightning_nwc",
    get calls() {
      return calls;
    },
    async pay(): Promise<RailResult> {
      calls += 1;
      return result;
    },
  };
}

const allowPolicy: PolicySpec = {
  version: 1,
  defaultDecision: "deny",
  allow: { lightningAddresses: ["alice@example.com"] },
  budgets: [{ window: "day", cap: { unit: "sat", value: 10_000 } }],
  perTxMax: { unit: "sat", value: 5_000 },
  timezone: "UTC",
  timeWindows: [],
  killSwitch: false,
  gradedState: "normal",
  rails: ["lightning_nwc"],
};

function req(value: number, overrides?: Partial<PaymentRequest>): PaymentRequest {
  return {
    agentId: "agent_test",
    rail: "lightning_nwc",
    amount: { unit: "sat", value },
    lightningAddress: "alice@example.com",
    ts: Date.now(),
    ...overrides,
  };
}

describe("governor two-phase commit", () => {
  let store: Store;
  let config: LeashConfig;

  beforeEach(() => {
    config = testConfig();
    store = openStore(":memory:");
  });

  it("allowed -> settles on rail -> records spend + audit", async () => {
    const rail = fakeRail({ ok: true, ref: "preimage123", settledAmount: { unit: "sat", value: 1000 } });
    const audit = createAuditWriter(store, config);
    const gov = createGovernor({
      store,
      config,
      audit,
      rails: new Map([["lightning_nwc", rail]]),
      resolvePolicy: () => allowPolicy,
    });

    const res = await gov.requestPayment(req(1000));

    expect(res.decision.decision).toBe("allowed");
    expect(rail.calls).toBe(1);
    expect(res.settled?.ok).toBe(true);

    // Spend recorded -> next eval state reflects it.
    const state = store.computeEvalState("agent_test", "sat", Date.now(), 60);
    expect(state.spend.day).toBe(1000);

    // Audit row exists and is the source of truth.
    const audits = store.unpushedAudit(10);
    expect(audits.length).toBe(1);
    expect(audits[0]?.event.decision).toBe("allowed");
    expect(audits[0]?.event.seq).toBe(0);
  });

  it("denied -> no settlement -> still audited", async () => {
    const rail = fakeRail({ ok: true });
    const audit = createAuditWriter(store, config);
    const gov = createGovernor({
      store,
      config,
      audit,
      rails: new Map([["lightning_nwc", rail]]),
      resolvePolicy: () => allowPolicy,
    });

    // Recipient not on allowlist -> deny.
    const res = await gov.requestPayment(
      req(1000, { lightningAddress: "mallory@evil.com" })
    );

    expect(res.decision.decision).toBe("denied");
    expect(rail.calls).toBe(0);

    const state = store.computeEvalState("agent_test", "sat", Date.now(), 60);
    expect(state.spend.day).toBe(0);

    const audits = store.unpushedAudit(10);
    expect(audits.length).toBe(1);
    expect(audits[0]?.event.decision).toBe("denied");
  });

  it("over per-tx max -> capped, no settlement", async () => {
    const rail = fakeRail({ ok: true });
    const audit = createAuditWriter(store, config);
    const gov = createGovernor({
      store,
      config,
      audit,
      rails: new Map([["lightning_nwc", rail]]),
      resolvePolicy: () => allowPolicy,
    });

    const res = await gov.requestPayment(req(9000));
    expect(res.decision.decision).toBe("capped");
    expect(rail.calls).toBe(0);
  });

  it("settlement failure -> denied, no spend recorded", async () => {
    const rail = fakeRail({ ok: false, error: "wallet offline" });
    const audit = createAuditWriter(store, config);
    const gov = createGovernor({
      store,
      config,
      audit,
      rails: new Map([["lightning_nwc", rail]]),
      resolvePolicy: () => allowPolicy,
    });

    const res = await gov.requestPayment(req(1000));
    expect(res.decision.decision).toBe("denied");
    expect(rail.calls).toBe(1);

    const state = store.computeEvalState("agent_test", "sat", Date.now(), 60);
    expect(state.spend.day).toBe(0);
  });

  it("no verified policy -> fail-closed deny", async () => {
    const rail = fakeRail({ ok: true });
    const audit = createAuditWriter(store, config);
    const gov = createGovernor({
      store,
      config,
      audit,
      rails: new Map([["lightning_nwc", rail]]),
      resolvePolicy: () => undefined,
    });

    const res = await gov.requestPayment(req(1000));
    expect(res.decision.decision).toBe("denied");
    expect(rail.calls).toBe(0);
  });
});
