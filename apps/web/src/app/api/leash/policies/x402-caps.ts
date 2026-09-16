import { validateX402Caps, type PolicySpec } from "@repo/leash-core";

/** Metadata is strings; only a binding that carries an allowance can be checked. */
export function x402CapViolations(
  spec: PolicySpec,
  bindings: { rail: string; meta: Record<string, unknown> | null }[]
): string[] {
  const errors: string[] = [];
  for (const b of bindings) {
    if (b.rail !== "x402" || !b.meta) continue;
    const allowance = Number(b.meta.allowanceUsdCent);
    const period = Number(b.meta.periodSeconds);
    if (!Number.isFinite(allowance) || !Number.isFinite(period) || period <= 0) continue;
    errors.push(...validateX402Caps(spec, { allowanceUsdCent: allowance, periodSeconds: period }));
  }
  return errors;
}
