#!/usr/bin/env node
// Generates the ed25519 keypair used to sign/verify Leash policies.
//
//   - LEASH_POLICY_SIGNING_KEY  -> control plane (apps/web), PKCS8 PEM private key
//   - LEASH_CONTROL_PLANE_PUBKEY -> leashd, base64 SPKI DER public key
//
// The control plane signs each policy with the private key; leashd verifies the
// signature with the public key before applying. Run:  node scripts/gen-leash-keys.mjs
import { generateKeyPairSync } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const publicB64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");

console.log("# --- Leash policy signing keypair ---");
console.log("# Control plane (apps/web) .env.local:");
console.log(`LEASH_POLICY_SIGNING_KEY="${privatePem.trimEnd()}"`);
console.log("");
console.log("# leashd env (per machine running the sidecar):");
console.log(`LEASH_CONTROL_PLANE_PUBKEY=${publicB64}`);
