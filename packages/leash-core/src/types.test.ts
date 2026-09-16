import { describe, it, expect } from "vitest";
import { Amount, Rail, PaymentRequest } from "./types";

describe("money units and rails", () => {
  it("accepts usd_cent amounts", () => {
    expect(Amount.parse({ unit: "usd_cent", value: 5 })).toEqual({ unit: "usd_cent", value: 5 });
  });
  it("accepts the x402 rail", () => {
    expect(Rail.parse("x402")).toBe("x402");
  });
  it("still rejects unknown units", () => {
    expect(() => Amount.parse({ unit: "eur_cent", value: 1 })).toThrow();
  });
  it("parses an x402 payment request", () => {
    const r = PaymentRequest.parse({
      agentId: "a1",
      rail: "x402",
      amount: { unit: "usd_cent", value: 1 },
      endpoint: "https://api.coingecko.com/api/v3/x402/ping",
      ts: 1,
    });
    expect(r.rail).toBe("x402");
  });
});
