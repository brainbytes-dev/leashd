import type { PaymentRequest } from "@repo/leash-core";
import type { RailAdapter, RailResult } from "./types";
import { ATOMIC_PER_CENT, centsToAtomic, type Erc20Reader, type FundingSource } from "./funding/types";

/** The subset of an x402 PaymentRequired.accepts[] entry we decide on. */
export interface PaymentRequirement {
  scheme: string;
  network: string;
  asset: string;
  /** Atomic units as a decimal string (USDC: 6 decimals). */
  amount: string;
  payTo?: string;
}

export type PaidFetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Anti tool-description poisoning: the amount we will pay is the one the server
 * committed to in PAYMENT-REQUIRED, and it may never exceed what the policy
 * approved. Anything else is refused before a signature exists.
 */
export function selectRequirement(
  accepts: PaymentRequirement[],
  network: string,
  usdcAddress: string,
  ceilingAtomic: bigint
): PaymentRequirement {
  const match = accepts.find(
    (a) => a.scheme === "exact" && a.network === network && a.asset.toLowerCase() === usdcAddress.toLowerCase()
  );
  if (!match) throw new Error(`no exact USDC requirement for ${network}`);
  if (BigInt(match.amount) > ceilingAtomic) {
    throw new Error(`endpoint requires ${match.amount} atomic, exceeds policy-approved ${ceilingAtomic}`);
  }
  return match;
}

function ceilCents(atomic: bigint): number {
  return Number((atomic + ATOMIC_PER_CENT - 1n) / ATOMIC_PER_CENT);
}

export function createX402Adapter(opts: {
  network: string;
  agentAddress: `0x${string}`;
  usdcAddress: `0x${string}`;
  usdc: Erc20Reader;
  funding: FundingSource;
  makePaidFetch: (ceilingAtomic: bigint) => PaidFetch;
  decodeSettlement: (header: string) => { success: boolean; transaction?: string };
}): RailAdapter {
  return {
    rail: "x402",
    async pay(req: PaymentRequest): Promise<RailResult> {
      if (req.amount.unit !== "usd_cent") {
        return { ok: false, error: `x402 rail requires usd_cent amounts, got ${req.amount.unit}` };
      }
      if (!req.endpoint) return { ok: false, error: "x402 rail requires an endpoint URL" };

      try {
        const ceiling = centsToAtomic(req.amount.value);
        const balance = await opts.usdc.balanceOf(opts.agentAddress);
        if (balance < ceiling) {
          const topUp = await opts.funding.topUp({ unit: "usd_cent", value: ceilCents(ceiling - balance) });
          if (!topUp.ok) return { ok: false, error: `funding failed: ${topUp.error ?? "unknown"}` };
        }

        const res = await opts.makePaidFetch(ceiling)(req.endpoint);
        if (!res.ok) return { ok: false, error: `x402 endpoint returned ${res.status}` };

        const header = res.headers.get("PAYMENT-RESPONSE") ?? res.headers.get("X-PAYMENT-RESPONSE");
        const settlement = header ? opts.decodeSettlement(header) : undefined;
        if (settlement && !settlement.success) return { ok: false, error: "x402 settlement reported failure" };

        return { ok: true, ref: settlement?.transaction, settledAmount: req.amount };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
