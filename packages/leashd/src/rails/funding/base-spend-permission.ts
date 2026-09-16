import type { Amount } from "@repo/leash-core";
import { atomicToCents, centsToAtomic, type Erc20Reader, type FundingResult, type FundingSource } from "./types";
import { encodeApprove, encodeSpend, SPEND_PERMISSION_MANAGER, type SignedSpendPermission } from "./spend-permission-manager";

/** Chain access the funding source needs; the viem implementation lives in cli.ts. */
export interface ChainWriter {
  /** Send a call from the agent key; resolves the tx hash after inclusion. */
  sendCall(to: `0x${string}`, data: `0x${string}`): Promise<`0x${string}`>;
  readCurrentPeriod(p: SignedSpendPermission): Promise<{ start: number; end: number; spend: bigint }>;
  /**
   * The on-chain `isValid` takes the full SpendPermission struct, not a hash
   * (docs/x402-spikes.md Step 4) — there is no hash-keyed lookup on the
   * contract, so this takes the whole signed permission.
   */
  isApproved(permission: SignedSpendPermission): Promise<boolean>;
}

/**
 * The owner's Base Account granted `allowance` USDC per `period` to the agent
 * key. We pull only what a policy-approved payment needs, never in advance, and
 * never past the period remainder. The chain enforces the wall; this is the door.
 */
export function createBaseSpendPermissionFunding(opts: {
  permission: SignedSpendPermission;
  agentAddress: `0x${string}`;
  usdc: Erc20Reader;
  chain: ChainWriter;
  now?: () => number; // unix seconds
}): FundingSource {
  const { permission, chain } = opts;
  const now = opts.now ?? (() => Math.floor(Date.now() / 1000));
  if (permission.permission.spender.toLowerCase() !== opts.agentAddress.toLowerCase()) {
    throw new Error(`spend permission spender ${permission.permission.spender} is not the agent key ${opts.agentAddress}`);
  }
  const manager = SPEND_PERMISSION_MANAGER[permission.chainId];
  if (!manager) throw new Error(`no SpendPermissionManager known for chainId ${permission.chainId}`);

  async function remainingAtomic(): Promise<bigint> {
    const period = await chain.readCurrentPeriod(permission);
    const left = permission.permission.allowance - period.spend;
    return left > 0n ? left : 0n;
  }

  return {
    kind: "base-spend-permission",
    async remaining(): Promise<Amount> {
      return { unit: "usd_cent", value: atomicToCents(await remainingAtomic()) };
    },
    async periodEndsAt() {
      return (await chain.readCurrentPeriod(permission)).end;
    },
    async topUp(amount: Amount): Promise<FundingResult> {
      try {
        const t = now();
        if (t < permission.permission.start) return { ok: false, error: "spend permission not yet valid" };
        if (t >= permission.permission.end) return { ok: false, error: "spend permission expired" };
        const want = centsToAtomic(amount.value);
        const left = await remainingAtomic();
        if (want > left) {
          return { ok: false, error: `top-up ${amount.value} usd_cent exceeds remaining allowance ${atomicToCents(left)} usd_cent this period` };
        }
        let txHash: `0x${string}` | undefined;
        if (!(await chain.isApproved(permission))) {
          await chain.sendCall(manager, encodeApprove(permission));
        }
        txHash = await chain.sendCall(manager, encodeSpend(permission, want));
        return { ok: true, pulled: amount, txHash };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
