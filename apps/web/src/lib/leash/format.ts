import type { Amount, Decision } from "@repo/leash-core";

/**
 * Render an Amount as a mono-friendly string in its own minor unit.
 * sats stay integers with tabular grouping; usd_cent renders as dollars
 * (same two-decimal `$` convention as leashd's x402 CLI and the rails list).
 */
export function formatAmount(amount: Amount | null | undefined): string {
  if (!amount) return "—";
  if (amount.unit === "usd_cent") {
    return `$${(amount.value / 100).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
  return `${amount.value.toLocaleString("en-US")} sat`;
}

/** Semantic Tailwind text color per decision (paired with an icon + label in UI). */
export const decisionColor: Record<Decision, string> = {
  allowed: "text-allow",
  denied: "text-deny",
  capped: "text-capped",
  approval_required: "text-info",
};

export const decisionLabel: Record<Decision, string> = {
  allowed: "ALLOWED",
  denied: "DENIED",
  capped: "CAPPED",
  approval_required: "APPROVAL",
};

export const agentStatusColor: Record<string, string> = {
  active: "text-allow",
  paused: "text-capped",
  revoked: "text-deny",
};
