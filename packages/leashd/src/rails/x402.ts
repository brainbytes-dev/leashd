import {
  wrapFetchWithPayment,
  decodeXPaymentResponse,
  type PaymentRequirementsSelector,
} from "x402-fetch";
import { privateKeyToAccount } from "viem/accounts";
import type { PaymentRequest } from "@repo/leash-core";
import type { RailAdapter, RailResult } from "./types";

/**
 * x402 stablecoin rail. The EVM private key is the wallet and stays local. On
 * pay we GET the endpoint through x402-fetch: it handles the 402 challenge,
 * signs a USDC payment up to a hard max, retries, and returns the settled
 * response. The policy-approved amount is the ceiling the client will ever pay,
 * and (if configured) payment is constrained to a single network.
 */
export function createX402Adapter(opts: {
  privateKey: string;
  network?: string;
}): RailAdapter {
  const account = privateKeyToAccount(opts.privateKey as `0x${string}`);

  const selectByNetwork: PaymentRequirementsSelector | undefined = opts.network
    ? (accepts, _network, scheme) => {
        const match = accepts.find(
          (a) => a.network === opts.network && (scheme ? a.scheme === scheme : true)
        );
        return match ?? accepts[0];
      }
    : undefined;

  return {
    rail: "x402",
    async pay(req: PaymentRequest): Promise<RailResult> {
      if (!req.endpoint) {
        return { ok: false, error: "x402 rail requires an endpoint URL" };
      }
      if (req.amount.unit !== "usd_cent") {
        return { ok: false, error: `x402 rail requires usd_cent amounts, got ${req.amount.unit}` };
      }

      try {
        // Policy cap as the max payable: cents -> USDC atomic units (6 decimals).
        const maxValue = BigInt(req.amount.value) * 10_000n;
        const fetchWithPay = wrapFetchWithPayment(
          fetch,
          account,
          maxValue,
          selectByNetwork
        );

        const res = await fetchWithPay(req.endpoint);
        if (!res.ok) {
          return { ok: false, error: `x402 endpoint returned ${res.status}` };
        }

        const header = res.headers.get("x-payment-response");
        const settlement = header ? decodeXPaymentResponse(header) : undefined;
        if (settlement && settlement.success === false) {
          return { ok: false, error: "x402 settlement reported failure" };
        }

        return {
          ok: true,
          ref: settlement?.transaction,
          settledAmount: req.amount,
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
