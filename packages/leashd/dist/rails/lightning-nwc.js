import { nwc } from "@getalby/sdk";
import { LightningAddress } from "@getalby/lightning-tools";
/**
 * Lightning rail over NWC (NIP-47). Holds the NWC connection string locally and
 * never surfaces it. Two ways to pay:
 *   - `endpoint` is a BOLT11 invoice  -> pay it directly.
 *   - `lightningAddress` is set        -> request an invoice for `amount` sats,
 *                                         then pay it.
 *
 * The sats amount comes from the structured request (server-committed), never
 * from free text. We do NOT trust an invoice amount that disagrees with the
 * policy-evaluated amount for the address case (we request the exact amount).
 */
export function createLightningNwcAdapter(nwcUrl) {
    const client = new nwc.NWCClient({ nostrWalletConnectUrl: nwcUrl });
    return {
        rail: "lightning_nwc",
        async pay(req) {
            if (req.amount.unit !== "sat") {
                return { ok: false, error: `lightning rail requires sat amounts, got ${req.amount.unit}` };
            }
            try {
                const invoice = await resolveInvoice(req);
                if (!invoice) {
                    return { ok: false, error: "no invoice or lightning address provided" };
                }
                const res = await client.payInvoice({ invoice });
                return {
                    ok: true,
                    ref: res.preimage,
                    settledAmount: req.amount,
                };
            }
            catch (err) {
                return { ok: false, error: err instanceof Error ? err.message : String(err) };
            }
        },
    };
}
async function resolveInvoice(req) {
    // A raw BOLT11 invoice may be passed as the endpoint.
    if (req.endpoint?.toLowerCase().startsWith("ln"))
        return req.endpoint;
    if (req.lightningAddress) {
        const ln = new LightningAddress(req.lightningAddress);
        await ln.fetch();
        // requestInvoice takes satoshi; req.amount.value is already in sat.
        const inv = await ln.requestInvoice({ satoshi: req.amount.value });
        return inv.paymentRequest;
    }
    return undefined;
}
