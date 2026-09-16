import type { Amount } from "@repo/leash-core";
import { atomicToCents, type Erc20Reader, type FundingResult, type FundingSource } from "./types";

/**
 * No automatic pull: the owner transfers USDC to the agent address by hand and
 * the balance is the cap. Used where no SpendPermissionManager is deployed.
 */
export function createManualFunding(opts: {
  agentAddress: `0x${string}`;
  usdc: Erc20Reader;
}): FundingSource {
  return {
    kind: "manual",
    async topUp(amount: Amount): Promise<FundingResult> {
      return {
        ok: false,
        error: `manual funding: transfer at least ${amount.value} usd_cent of USDC to ${opts.agentAddress}`,
      };
    },
    async remaining(): Promise<Amount> {
      return { unit: "usd_cent", value: atomicToCents(await opts.usdc.balanceOf(opts.agentAddress)) };
    },
    async periodEndsAt() {
      return undefined;
    },
  };
}
