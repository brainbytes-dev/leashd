import { describe, it, expect } from "vitest";
import { buildX402Runtime } from "../rails/x402-wiring";

const key = process.env.X402_SEPOLIA_PRIVATE_KEY as `0x${string}` | undefined;
const permissionPath = process.env.X402_SEPOLIA_PERMISSION_PATH;
const endpoint = process.env.X402_SEPOLIA_ENDPOINT; // from docs/x402-spikes.md step 3
const run = key && permissionPath && endpoint ? describe : describe.skip;

run("x402 on Base Sepolia (live)", () => {
  it("pulls allowance and pays a real 402 endpoint", async () => {
    const rt = buildX402Runtime({
      network: "eip155:84532", privateKey: key as `0x${string}`, rpcUrl: "https://sepolia.base.org",
      funding: "base-spend-permission", permissionPath: permissionPath as string,
    });
    const before = await rt.status();
    const r = await rt.adapter.pay({
      agentId: "ci", rail: "x402", amount: { unit: "usd_cent", value: 1 }, endpoint: endpoint as string, ts: Date.now(),
    });
    expect(r.ok, r.error).toBe(true);
    expect(r.ref).toMatch(/^0x/);
    const after = await rt.status();
    expect(after.allowanceRemainingUsdCent).toBeLessThanOrEqual(before.allowanceRemainingUsdCent);
  }, 120_000);

  it("refuses an endpoint that asks for more than approved", async () => {
    const rt = buildX402Runtime({
      network: "eip155:84532", privateKey: key as `0x${string}`, rpcUrl: "https://sepolia.base.org",
      funding: "base-spend-permission", permissionPath: permissionPath as string,
    });
    const r = await rt.adapter.pay({
      agentId: "ci", rail: "x402", amount: { unit: "usd_cent", value: 0 }, endpoint: endpoint as string, ts: Date.now(),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/exceeds policy-approved/);
  }, 60_000);
});
