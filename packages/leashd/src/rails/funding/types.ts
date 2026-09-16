import type { Amount } from "@repo/leash-core";

export interface FundingResult {
  ok: boolean;
  /** What was actually pulled into the agent key (usd_cent). */
  pulled?: Amount;
  txHash?: `0x${string}`;
  error?: string;
}

/**
 * Where the agent key's USDC comes from. The chain-level budget lives here;
 * the Leash policy is the finer layer on top. Implementations resolve, never
 * throw, and never hold anything but the agent key's own funds.
 */
export interface FundingSource {
  readonly kind: "base-spend-permission" | "manual";
  /** Pull up to `amount` (usd_cent) into the agent key. */
  topUp(amount: Amount): Promise<FundingResult>;
  /** Remaining allowance in the current period (usd_cent). */
  remaining(): Promise<Amount>;
  /** Unix seconds when the current period ends; undefined when not periodic. */
  periodEndsAt(): Promise<number | undefined>;
}

/** Minimal ERC-20 read seam so funding sources and tests share one shape. */
export interface Erc20Reader {
  balanceOf(owner: `0x${string}`): Promise<bigint>;
}

/** USDC has 6 decimals; leash-core counts US cents. */
export const ATOMIC_PER_CENT = 10_000n;

export function atomicToCents(atomic: bigint): number {
  return Number(atomic / ATOMIC_PER_CENT);
}

export function centsToAtomic(cents: number): bigint {
  return BigInt(cents) * ATOMIC_PER_CENT;
}
