import type { Amount, PaymentRequest } from "@repo/leash-core";

export interface RailResult {
  ok: boolean;
  /** Actual amount settled (may differ from requested for fees etc.). */
  settledAmount?: Amount;
  /** Rail-specific settlement reference (preimage, tx hash, ...). */
  ref?: string;
  error?: string;
}

/**
 * A rail settles a request the policy engine has already approved. Adapters
 * hold their own scoped credentials locally and never surface secrets in the
 * result. Errors must resolve (not throw) into `{ ok: false, error }`.
 */
export interface RailAdapter {
  readonly rail: PaymentRequest["rail"];
  pay(req: PaymentRequest): Promise<RailResult>;
}
