import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./config";

const BASE_ENV = {
  LEASH_CONTROL_PLANE_URL: "https://leashd.dev",
  LEASH_WORKSPACE_ID: "ws",
  LEASH_AGENT_ID: "ag",
  LEASH_AGENT_TOKEN: "lsh_x",
};
const KEY = "0x" + "11".repeat(32);

let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "leashd-cfg-"));
  process.env.LEASH_HOME = home;
  Object.assign(process.env, BASE_ENV);
  for (const k of Object.keys(process.env)) if (k.startsWith("LEASH_X402_")) delete process.env[k];
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

describe("x402 config", () => {
  it("is absent when no x402 env or file keys are set", () => {
    expect(loadConfig().x402).toBeUndefined();
  });
  it("loads a base-spend-permission block from env", () => {
    process.env.LEASH_X402_NETWORK = "eip155:8453";
    process.env.LEASH_X402_PRIVATE_KEY = KEY;
    process.env.LEASH_X402_RPC_URL = "https://mainnet.base.org";
    process.env.LEASH_X402_FUNDING = "base-spend-permission";
    process.env.LEASH_X402_PERMISSION_PATH = "/tmp/perm.json";
    expect(loadConfig().x402).toEqual({
      network: "eip155:8453", privateKey: KEY, rpcUrl: "https://mainnet.base.org",
      funding: "base-spend-permission", permissionPath: "/tmp/perm.json", ownerAddress: undefined,
    });
  });
  it("defaults funding to manual and rejects base-spend-permission without a permission path", () => {
    process.env.LEASH_X402_NETWORK = "eip155:8453";
    process.env.LEASH_X402_PRIVATE_KEY = KEY;
    process.env.LEASH_X402_RPC_URL = "https://mainnet.base.org";
    expect(loadConfig().x402?.funding).toBe("manual");
    process.env.LEASH_X402_FUNDING = "base-spend-permission";
    expect(() => loadConfig()).toThrow(/LEASH_X402_PERMISSION_PATH/);
  });
  it("reads the same keys from config.json", () => {
    writeFileSync(join(home, "config.json"), JSON.stringify({
      x402Network: "eip155:84532", x402PrivateKey: KEY, x402RpcUrl: "https://sepolia.base.org",
    }));
    expect(loadConfig().x402?.network).toBe("eip155:84532");
  });
  it("rejects a malformed private key", () => {
    process.env.LEASH_X402_NETWORK = "eip155:8453";
    process.env.LEASH_X402_PRIVATE_KEY = "not-a-key";
    process.env.LEASH_X402_RPC_URL = "https://mainnet.base.org";
    expect(() => loadConfig()).toThrow(/LEASH_X402_PRIVATE_KEY/);
  });
});
