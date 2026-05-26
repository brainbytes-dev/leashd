import {
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
  type KeyObject,
} from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { z } from "zod";

/**
 * Runtime configuration for leashd, sourced from environment variables and a
 * local JSON config file. Rail secrets (e.g. NWC URL) live ONLY here / in env
 * and are never serialized into audit events or sent to the control plane.
 */

const FileConfig = z
  .object({
    controlPlaneUrl: z.string().url().optional(),
    workspaceId: z.string().optional(),
    agentId: z.string().optional(),
    agentToken: z.string().optional(),
    controlPlanePubKey: z.string().optional(),
    nwcUrl: z.string().optional(),
    cashuMintUrl: z.string().optional(),
    dbPath: z.string().optional(),
    signingKeyPath: z.string().optional(),
  })
  .partial();
type FileConfig = z.infer<typeof FileConfig>;

export interface LeashConfig {
  controlPlaneUrl: string;
  workspaceId: string;
  agentId: string;
  agentToken: string;
  /** ed25519 public key of the control plane, base64 (SPKI DER). Optional offline. */
  controlPlanePubKey?: string;
  /** NWC connection string for the Lightning rail. Secret. */
  nwcUrl?: string;
  /** Cashu mint URL for the ecash rail. Proofs (the balance) live in the store. */
  cashuMintUrl?: string;
  dbPath: string;
  /** leashd's own ed25519 signing identity. */
  signingPrivateKey: KeyObject;
  signingPublicKeyB64: string;
}

const DEFAULT_HOME = join(homedir(), ".leashd");

function configDir(): string {
  return process.env.LEASH_HOME ?? DEFAULT_HOME;
}

function loadFileConfig(): FileConfig {
  const path = join(configDir(), "config.json");
  if (!existsSync(path)) return {};
  try {
    return FileConfig.parse(JSON.parse(readFileSync(path, "utf8")));
  } catch (err) {
    throw new Error(
      `invalid leashd config at ${path}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Load (or lazily generate) leashd's ed25519 signing key. The private key is
 * persisted PEM on disk under config home; it is the device's audit identity.
 */
function loadSigningKey(explicitPath?: string): {
  privateKey: KeyObject;
  publicKeyB64: string;
} {
  const keyPath = explicitPath ?? join(configDir(), "signing-key.pem");
  let privateKey: KeyObject;

  if (existsSync(keyPath)) {
    privateKey = createPrivateKey(readFileSync(keyPath, "utf8"));
  } else {
    const { privateKey: pk } = generateKeyPairSync("ed25519");
    const pem = pk.export({ type: "pkcs8", format: "pem" });
    mkdirSync(dirname(keyPath), { recursive: true });
    // 0600: signing identity must not be world-readable.
    writeFileSync(keyPath, pem, { mode: 0o600 });
    privateKey = pk;
  }

  const publicKey = createPublicKey(privateKey);
  const publicKeyB64 = publicKey
    .export({ type: "spki", format: "der" })
    .toString("base64");
  return { privateKey, publicKeyB64 };
}

function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`missing required config: ${name}`);
  return value;
}

export function loadConfig(): LeashConfig {
  const file = loadFileConfig();
  const { privateKey, publicKeyB64 } = loadSigningKey(
    process.env.LEASH_SIGNING_KEY_PATH ?? file.signingKeyPath
  );

  return {
    controlPlaneUrl: required(
      process.env.LEASH_CONTROL_PLANE_URL ?? file.controlPlaneUrl,
      "LEASH_CONTROL_PLANE_URL"
    ),
    workspaceId: required(
      process.env.LEASH_WORKSPACE_ID ?? file.workspaceId,
      "LEASH_WORKSPACE_ID"
    ),
    agentId: required(
      process.env.LEASH_AGENT_ID ?? file.agentId,
      "LEASH_AGENT_ID"
    ),
    agentToken: required(
      process.env.LEASH_AGENT_TOKEN ?? file.agentToken,
      "LEASH_AGENT_TOKEN"
    ),
    controlPlanePubKey:
      process.env.LEASH_CONTROL_PLANE_PUBKEY ?? file.controlPlanePubKey,
    nwcUrl: process.env.LEASH_NWC_URL ?? file.nwcUrl,
    cashuMintUrl: process.env.LEASH_CASHU_MINT_URL ?? file.cashuMintUrl,
    dbPath:
      process.env.LEASH_DB_PATH ?? file.dbPath ?? join(configDir(), "leashd.db"),
    signingPrivateKey: privateKey,
    signingPublicKeyB64: publicKeyB64,
  };
}
