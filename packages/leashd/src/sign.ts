import { sign, verify, createPublicKey, type KeyObject } from "node:crypto";
import { canonicalize, type PolicySpec } from "@repo/leash-core";

/**
 * ed25519 over canonicalize(payload). Both leashd and the control plane sign
 * the byte-identical canonical JSON so signatures are portable. ed25519 takes
 * `null` for the algorithm argument (the curve fixes the hash).
 */

export function signPayload(payload: unknown, privateKey: KeyObject): string {
  const data = Buffer.from(canonicalize(payload), "utf8");
  return sign(null, data, privateKey).toString("base64");
}

export function verifyPayload(
  payload: unknown,
  signatureB64: string,
  publicKey: KeyObject
): boolean {
  try {
    const data = Buffer.from(canonicalize(payload), "utf8");
    return verify(null, data, publicKey, Buffer.from(signatureB64, "base64"));
  } catch {
    // Fail-closed: any verification error is a failed verification.
    return false;
  }
}

/** Convenience wrapper used by the audit pipeline. */
export function signEvent(event: unknown, privateKey: KeyObject): string {
  return signPayload(event, privateKey);
}

/**
 * Verify a control-plane policy signature. `controlPlanePubKeyB64` is the SPKI
 * DER public key (base64). Returns false on any malformed input (fail-closed).
 */
export function verifyPolicySignature(
  spec: PolicySpec,
  signatureB64: string,
  controlPlanePubKeyB64: string
): boolean {
  try {
    const publicKey = createPublicKey({
      key: Buffer.from(controlPlanePubKeyB64, "base64"),
      format: "der",
      type: "spki",
    });
    return verifyPayload(spec, signatureB64, publicKey);
  } catch {
    return false;
  }
}
