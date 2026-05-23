import type { RailAdapter, RailResult } from "./types";

/** Stub: x402 / USDC (ERC-4337 session keys) is post-MVP. */
export function createX402Adapter(): RailAdapter {
  return {
    rail: "x402",
    async pay(): Promise<RailResult> {
      return { ok: false, error: "rail not implemented in MVP" };
    },
  };
}
