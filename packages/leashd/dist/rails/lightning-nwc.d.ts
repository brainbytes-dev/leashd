import type { RailAdapter } from "./types";
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
export declare function createLightningNwcAdapter(nwcUrl: string): RailAdapter;
//# sourceMappingURL=lightning-nwc.d.ts.map