import { describe, it, expect } from "vitest";
import { createX402Status } from "./x402-status";

const agent = ("0x" + "ab".repeat(20)) as `0x${string}`;

describe("x402 status", () => {
  it("combines agent balance and funding remainder", async () => {
    const status = createX402Status({
      agentAddress: agent, network: "eip155:8453",
      usdc: { balanceOf: async () => 250_000n },
      funding: { kind: "manual", topUp: async () => ({ ok: false }), remaining: async () => ({ unit: "usd_cent", value: 400 }), periodEndsAt: async () => 99 },
    });
    expect(await status()).toEqual({
      agentAddress: agent, network: "eip155:8453", agentBalanceUsdCent: 25,
      allowanceRemainingUsdCent: 400, periodEndsAt: 99, funding: "manual",
    });
  });
});
