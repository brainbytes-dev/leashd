import { describe, it, expect } from "vitest";
import { formatStatus, generateAgentKey } from "./x402-cli";

describe("x402 cli helpers", () => {
  it("generates a 32-byte key and its address", () => {
    const k = generateAgentKey();
    expect(k.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
    expect(k.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
  it("formats status as one line per fact, dollars with two decimals", () => {
    const out = formatStatus({
      agentAddress: ("0x" + "ab".repeat(20)) as `0x${string}`, network: "eip155:8453",
      agentBalanceUsdCent: 125, allowanceRemainingUsdCent: 375, periodEndsAt: 1_800_000_000, funding: "base-spend-permission",
    });
    expect(out).toContain("balance   $1.25");
    expect(out).toContain("remaining $3.75 this period");
    expect(out).toContain("funding   base-spend-permission");
  });
});
