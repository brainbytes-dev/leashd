import { atomicToCents, type Erc20Reader, type FundingSource } from "./funding/types";

export interface X402Status {
  agentAddress: `0x${string}`;
  network: string;
  agentBalanceUsdCent: number;
  allowanceRemainingUsdCent: number;
  periodEndsAt?: number;
  funding: FundingSource["kind"];
}

export function createX402Status(opts: {
  agentAddress: `0x${string}`;
  network: string;
  usdc: Erc20Reader;
  funding: FundingSource;
}): () => Promise<X402Status> {
  return async () => {
    const [balance, remaining, periodEndsAt] = await Promise.all([
      opts.usdc.balanceOf(opts.agentAddress),
      opts.funding.remaining(),
      opts.funding.periodEndsAt(),
    ]);
    return {
      agentAddress: opts.agentAddress,
      network: opts.network,
      agentBalanceUsdCent: atomicToCents(balance),
      allowanceRemainingUsdCent: remaining.value,
      periodEndsAt,
      funding: opts.funding.kind,
    };
  };
}
