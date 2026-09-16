import { describe, it, expect, vi } from "vitest";
import type { PaymentRequest } from "@repo/leash-core";
import { createX402Adapter, selectRequirement, type PaymentRequirement } from "./x402";
import type { FundingSource } from "./funding/types";

const agent = ("0x" + "ab".repeat(20)) as `0x${string}`;
const usdc = ("0x" + "ef".repeat(20)) as `0x${string}`;
const NET = "eip155:8453";

function req(over: Partial<PaymentRequest> = {}): PaymentRequest {
  return { agentId: "a1", rail: "x402", amount: { unit: "usd_cent", value: 2 },
    endpoint: "https://api.example.com/paid", ts: 1, ...over };
}

function funding(over: Partial<FundingSource> = {}): FundingSource & { topUp: ReturnType<typeof vi.fn> } {
  return {
    kind: "base-spend-permission",
    topUp: vi.fn(async (amount) => ({ ok: true, pulled: amount })),
    remaining: async () => ({ unit: "usd_cent", value: 500 }),
    periodEndsAt: async () => undefined,
    ...over,
  } as FundingSource & { topUp: ReturnType<typeof vi.fn> };
}

function okResponse(tx = "0xtx"): Response {
  return new Response("{}", { status: 200, headers: { "PAYMENT-RESPONSE": "hdr" } });
}

const settlementOk = () => ({ success: true, transaction: "0xtx" });

describe("selectRequirement", () => {
  const accepts: PaymentRequirement[] = [
    { scheme: "exact", network: "eip155:1", asset: usdc, amount: "10000" },
    { scheme: "exact", network: NET, asset: usdc, amount: "10000" },
  ];
  it("picks the exact USDC requirement on the configured network", () => {
    expect(selectRequirement(accepts, NET, usdc, 20_000n).network).toBe(NET);
  });
  it("throws when the server asks for more than the policy approved", () => {
    expect(() => selectRequirement(accepts, NET, usdc, 9_999n)).toThrow(/exceeds policy-approved/);
  });
  it("throws when nothing matches the network or asset", () => {
    expect(() => selectRequirement(accepts, "eip155:10", usdc, 20_000n)).toThrow(/no exact USDC requirement/);
  });
});

describe("x402 adapter", () => {
  it("pays without a top-up when the agent key already holds enough", async () => {
    const f = funding();
    const paid = vi.fn(async () => okResponse());
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 1_000_000n }, funding: f,
      makePaidFetch: () => paid, decodeSettlement: settlementOk });
    const r = await a.pay(req());
    expect(r).toEqual({ ok: true, ref: "0xtx", settledAmount: { unit: "usd_cent", value: 2 } });
    expect(f.topUp).not.toHaveBeenCalled();
  });
  it("tops up exactly the shortfall before paying", async () => {
    const f = funding();
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 5_000n }, funding: f,
      makePaidFetch: () => async () => okResponse(), decodeSettlement: settlementOk });
    await a.pay(req({ amount: { unit: "usd_cent", value: 3 } }));
    expect(f.topUp).toHaveBeenCalledWith({ unit: "usd_cent", value: 3 }); // 30000 - 5000 atomic = 2.5 cents, rounded up
  });
  it("denies when the top-up fails and does not call the endpoint", async () => {
    const f = funding({ topUp: vi.fn(async () => ({ ok: false, error: "expired" })) });
    const paid = vi.fn(async () => okResponse());
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 0n }, funding: f,
      makePaidFetch: () => paid, decodeSettlement: settlementOk });
    expect(await a.pay(req())).toEqual({ ok: false, error: "funding failed: expired" });
    expect(paid).not.toHaveBeenCalled();
  });
  it("hands the policy ceiling to the paid fetch", async () => {
    const make = vi.fn(() => async () => okResponse());
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 1_000_000n }, funding: funding(),
      makePaidFetch: make, decodeSettlement: settlementOk });
    await a.pay(req({ amount: { unit: "usd_cent", value: 7 } }));
    expect(make).toHaveBeenCalledWith(70_000n);
  });
  it("rejects sat amounts and missing endpoints", async () => {
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 0n }, funding: funding(),
      makePaidFetch: () => async () => okResponse(), decodeSettlement: settlementOk });
    expect((await a.pay(req({ amount: { unit: "sat", value: 1 } }))).ok).toBe(false);
    expect((await a.pay(req({ endpoint: undefined }))).ok).toBe(false);
  });
  it("reports a failed settlement and non-2xx responses as errors, never throws", async () => {
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 1_000_000n }, funding: funding(),
      makePaidFetch: () => async () => new Response("", { status: 402 }),
      decodeSettlement: settlementOk });
    expect(await a.pay(req())).toEqual({ ok: false, error: "x402 endpoint returned 402" });
    const b = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 1_000_000n }, funding: funding(),
      makePaidFetch: () => async () => { throw new Error("boom"); }, decodeSettlement: settlementOk });
    expect(await b.pay(req())).toEqual({ ok: false, error: "boom" });
  });
});
