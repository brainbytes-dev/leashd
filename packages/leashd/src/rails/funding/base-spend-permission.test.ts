import { describe, it, expect, vi } from "vitest";
import { createBaseSpendPermissionFunding, type ChainWriter } from "./base-spend-permission";
import { parseSignedPermission, type SignedSpendPermission } from "./spend-permission-manager";

const agent = ("0x" + "ab".repeat(20)) as `0x${string}`;
const owner = ("0x" + "cd".repeat(20)) as `0x${string}`;
const usdcAddr = ("0x" + "ef".repeat(20)) as `0x${string}`;

const permission: SignedSpendPermission = {
  chainId: 8453,
  permissionHash: ("0x" + "01".repeat(32)) as `0x${string}`,
  signature: ("0x" + "02".repeat(65)) as `0x${string}`,
  permission: {
    account: owner, spender: agent, token: usdcAddr,
    allowance: 5_000_000n, // 5 USD per period
    period: 86_400, start: 1_000, end: 2_000_000_000, salt: 0n, extraData: "0x",
  },
};

function chain(over: Partial<ChainWriter> = {}): ChainWriter & { sendCall: ReturnType<typeof vi.fn> } {
  return {
    sendCall: vi.fn(async () => ("0x" + "aa".repeat(32)) as `0x${string}`),
    readCurrentPeriod: async () => ({ start: 1_000, end: 87_400, spend: 1_000_000n }),
    isApproved: async () => true,
    ...over,
  } as ChainWriter & { sendCall: ReturnType<typeof vi.fn> };
}

describe("base spend permission funding", () => {
  it("reports remaining allowance for the current period in usd_cent", async () => {
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: chain() });
    expect(await f.remaining()).toEqual({ unit: "usd_cent", value: 400 });
    expect(await f.periodEndsAt()).toBe(87_400);
  });
  it("pulls exactly the requested amount when it fits", async () => {
    const c = chain();
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: c });
    const r = await f.topUp({ unit: "usd_cent", value: 150 });
    expect(r).toMatchObject({ ok: true, pulled: { unit: "usd_cent", value: 150 } });
    expect(c.sendCall).toHaveBeenCalledTimes(1);
  });
  it("refuses to pull more than the period remainder", async () => {
    const c = chain();
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: c });
    const r = await f.topUp({ unit: "usd_cent", value: 401 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/exceeds remaining allowance 400/);
    expect(c.sendCall).not.toHaveBeenCalled();
  });
  it("prepends approveWithSignature when the permission is not yet registered", async () => {
    const c = chain({ isApproved: async () => false });
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: c });
    await f.topUp({ unit: "usd_cent", value: 1 });
    expect(c.sendCall).toHaveBeenCalledTimes(2);
  });
  it("refuses outside the permission's validity window", async () => {
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: chain(), now: () => 2_000_000_001 });
    const r = await f.topUp({ unit: "usd_cent", value: 1 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/expired/);
  });
  it("resolves chain errors instead of throwing", async () => {
    const c = chain({ sendCall: vi.fn(async () => { throw new Error("rpc down"); }) });
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: c });
    expect(await f.topUp({ unit: "usd_cent", value: 1 })).toEqual({ ok: false, error: "rpc down" });
  });
  it("parses the grant page JSON and rejects a spender mismatch at construction", () => {
    const json = JSON.stringify({ ...permission, permission: { ...permission.permission,
      allowance: "5000000", salt: "0" } });
    const parsed = parseSignedPermission(json);
    expect(parsed.permission.allowance).toBe(5_000_000n);
    expect(() => createBaseSpendPermissionFunding({ permission: parsed,
      agentAddress: owner, usdc: { balanceOf: async () => 0n }, chain: chain() }))
      .toThrow(/spender/);
  });
  it("parses a permission whose wallet omitted the optional permissionHash", () => {
    const { permissionHash: _omitted, ...withoutHash } = permission;
    const json = JSON.stringify({ ...withoutHash, permission: { ...permission.permission,
      allowance: "5000000", salt: "0" } });
    const parsed = parseSignedPermission(json);
    expect(parsed.permissionHash).toBeUndefined();
    expect(parsed.chainId).toBe(8453);
    // Still fully usable: the on-chain calls take the struct, not the hash.
    const f = createBaseSpendPermissionFunding({ permission: parsed, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: chain() });
    expect(f).toBeDefined();
  });
});
