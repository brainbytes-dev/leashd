import { describe, it, expect } from "vitest";
import { createManualFunding } from "./manual";

const agent = ("0x" + "ab".repeat(20)) as `0x${string}`;

describe("manual funding", () => {
  it("reports the agent balance as the remaining allowance, in usd_cent", async () => {
    const f = createManualFunding({ agentAddress: agent, usdc: { balanceOf: async () => 1_230_000n } });
    expect(await f.remaining()).toEqual({ unit: "usd_cent", value: 123 });
  });
  it("cannot top up and says how to fund", async () => {
    const f = createManualFunding({ agentAddress: agent, usdc: { balanceOf: async () => 0n } });
    const r = await f.topUp({ unit: "usd_cent", value: 5 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain(agent);
  });
  it("has no period", async () => {
    const f = createManualFunding({ agentAddress: agent, usdc: { balanceOf: async () => 0n } });
    expect(await f.periodEndsAt()).toBeUndefined();
  });
  it("floors sub-cent dust", async () => {
    const f = createManualFunding({ agentAddress: agent, usdc: { balanceOf: async () => 19_999n } });
    expect(await f.remaining()).toEqual({ unit: "usd_cent", value: 1 });
  });
});
