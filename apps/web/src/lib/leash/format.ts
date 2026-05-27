import type { Amount, Decision } from "@repo/leash-core";

/** Render an Amount as a mono-friendly string with tabular grouping. */
export function formatAmount(amount: Amount | null | undefined): string {
  if (!amount) return "—";
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
