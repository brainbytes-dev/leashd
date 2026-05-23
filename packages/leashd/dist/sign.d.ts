import { type KeyObject } from "node:crypto";
import { type PolicySpec } from "@repo/leash-core";
/**
 * ed25519 over canonicalize(payload). Both leashd and the control plane sign
 * the byte-identical canonical JSON so signatures are portable. ed25519 takes
 * `null` for the algorithm argument (the curve fixes the hash).
 */
export declare function signPayload(payload: unknown, privateKey: KeyObject): string;
export declare function verifyPayload(payload: unknown, signatureB64: string, publicKey: KeyObject): boolean;
/** Convenience wrapper used by the audit pipeline. */
export declare function signEvent(event: unknown, privateKey: KeyObject): string;
/**
 * Verify a control-plane policy signature. `controlPlanePubKeyB64` is the SPKI
 * DER public key (base64). Returns false on any malformed input (fail-closed).
 */
export declare function verifyPolicySignature(spec: PolicySpec, signatureB64: string, controlPlanePubKeyB64: string): boolean;
//# sourceMappingURL=sign.d.ts.map