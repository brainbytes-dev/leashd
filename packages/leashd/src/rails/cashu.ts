import { Wallet, MeltQuoteState, type Proof } from "@cashu/cashu-ts";
import { LightningAddress } from "@getalby/lightning-tools";
import type { PaymentRequest } from "@repo/leash-core";
import type { Store } from "../store";
import type { RailAdapter, RailResult } from "./types";

/**
 * Cashu ecash rail. The wallet's balance (proofs) lives locally in the store and
 * never leaves the device. We settle a payment by MELTING ecash to pay a
 * Lightning invoice (BOLT11 endpoint, or an invoice fetched for a Lightning
 * address) — ecash is the funding source, the counterparty still gets paid over
 * Lightning. Funding the balance (minting) is a separate, out-of-band step.
 */
export function createCashuAdapter(opts: {
  mintUrl: string;
  store: Store;
}): RailAdapter {
  const { mintUrl, store } = opts;
  let walletPromise: Promise<Wallet> | undefined;

  function getWallet(): Promise<Wallet> {
    if (!walletPromise) {
      const wallet = new Wallet(mintUrl, { unit: "sat" });
      walletPromise = wallet.loadMint().then(() => wallet);
    }
    return walletPromise;
  }

  return {
    rail: "cashu",
    async pay(req: PaymentRequest): Promise<RailResult> {
      if (req.amount.unit !== "sat") {
        return { ok: false, error: `cashu rail requires sat amounts, got ${req.amount.unit}` };
      }

      try {
        const invoice = await resolveInvoice(req);
        if (!invoice) {
          return { ok: false, error: "no invoice or lightning address provided" };
        }

        const proofs = store.getCashuProofs(mintUrl) as Proof[];
        if (proofs.length === 0) {
          return { ok: false, error: `no ecash balance for mint ${mintUrl}` };
        }

        const wallet = await getWallet();
        const meltQuote = await wallet.createMeltQuoteBolt11(invoice);
        const needed = meltQuote.amount.add(meltQuote.fee_reserve);

        // Coin-select (swapping with the mint if needed). Persist the post-swap
        // set BEFORE melting so a melt failure can never lose the swapped proofs.
        const { keep, send } = await wallet.send(needed, proofs, { includeFees: true });
        store.setCashuProofs(mintUrl, [...keep, ...send]);

        const { quote, change } = await wallet.meltProofsBolt11(meltQuote, send);
        store.setCashuProofs(mintUrl, [...keep, ...change]);

        if (quote.state !== MeltQuoteState.PAID) {
          return { ok: false, error: `melt not settled (state ${quote.state})` };
        }
        return {
          ok: true,
          ref: quote.payment_preimage ?? quote.quote,
          settledAmount: req.amount,
        };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}

async function resolveInvoice(req: PaymentRequest): Promise<string | undefined> {
  // A raw BOLT11 invoice may be passed as the endpoint.
  if (req.endpoint?.toLowerCase().startsWith("ln")) return req.endpoint;

  if (req.lightningAddress) {
    const ln = new LightningAddress(req.lightningAddress);
    await ln.fetch();
    const inv = await ln.requestInvoice({ satoshi: req.amount.value });
    return inv.paymentRequest;
  }

  return undefined;
}
