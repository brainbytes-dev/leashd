/**
 * Deterministic JSON serialization for signing.
 *
 * Audit events and policies are signed by leashd / the control plane. Both
 * sides must produce byte-identical input to the signer, so we serialize with
 * recursively sorted object keys and no incidental whitespace.
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortDeep((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}
