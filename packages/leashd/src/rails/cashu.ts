import type { RailAdapter, RailResult } from "./types";

/** Stub: Cashu (CDK / Minibits) is post-MVP. Wired so multi-rail dispatch exists. */
export function createCashuAdapter(): RailAdapter {
  return {
    rail: "cashu",
    async pay(): Promise<RailResult> {
      return { ok: false, error: "rail not implemented in MVP" };
    },
  };
}
