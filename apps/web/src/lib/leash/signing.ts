import {
  createPrivateKey,
  createPublicKey,
  sign as edSign,
  type KeyObject,
} from "node:crypto";
import { canonicalize } from "@repo/leash-core";

/**
 * The control plane signs every policy with an ed25519 key; leashd verifies the
 * signature before applying a policy so a compromised transport cannot inject
 * rules. The key is lazy-loaded (starter pattern) so a missing env var never
 * crashes the build — in dev we fail open and emit an unsigned policy.
 */

let cachedPrivate: KeyObject | null | undefined;
let cachedPublic: KeyObject | null | undefined;

function loadPrivateKey(): KeyObject | null {
  if (cachedPrivate !== undefined) return cachedPrivate;

  const pem = process.env.LEASH_POLICY_SIGNING_KEY;
  if (!pem) {
    console.warn(
      "[leash] LEASH_POLICY_SIGNING_KEY not set — policies will be unsigned (dev fail-open)."
    );
    cachedPrivate = null;
    return null;
  }

  try {
    cachedPrivate = createPrivateKey(pem);
  } catch (err) {
    console.warn("[leash] LEASH_POLICY_SIGNING_KEY is invalid; signing disabled.", err);
    cachedPrivate = null;
  }
  return cachedPrivate;
}

function loadPublicKey(): KeyObject | null {
  if (cachedPublic !== undefined) return cachedPublic;
  const priv = loadPrivateKey();
  cachedPublic = priv ? createPublicKey(priv) : null;
  return cachedPublic;
}

/** Sign a canonicalized policy spec. Returns base64 signature, or null in dev. */
export function signSpec(spec: unknown): string | null {
  const key = loadPrivateKey();
  if (!key) return null;
  // ed25519 ignores the digest arg; pass null per node:crypto contract.
  const sig = edSign(null, Buffer.from(canonicalize(spec)), key);
  return sig.toString("base64");
}

/** PEM-encoded public key leashd uses to verify policy signatures. */
export function getPublicKeyPem(): string | null {
  const key = loadPublicKey();
  if (!key) return null;
  return key.export({ type: "spki", format: "pem" }).toString();
}
