#!/usr/bin/env node
import { validateX402Caps, type PaymentRequest } from "@repo/leash-core";
import { loadConfig } from "./config";
import { openStore } from "./store";
import { createAuditWriter } from "./audit";
import { createGovernor } from "./governor";
import { createMcpServer, startMcpServer } from "./mcp-server";
import { startPolicySync } from "./policy-sync";
import { loadAgentPolicy } from "./policy";
import type { RailAdapter } from "./rails/types";
import { createLightningNwcAdapter } from "./rails/lightning-nwc";
import { createCashuAdapter } from "./rails/cashu";
import { buildX402Runtime, type X402Runtime } from "./rails/x402-wiring";

async function main(): Promise<void> {
  const config = loadConfig();
  const store = openStore(config.dbPath);
  const audit = createAuditWriter(store, config);

  const rails = new Map<PaymentRequest["rail"], RailAdapter>();
  if (config.nwcUrl) {
    rails.set("lightning_nwc", createLightningNwcAdapter(config.nwcUrl));
  }
  if (config.cashuMintUrl) {
    rails.set("cashu", createCashuAdapter({ mintUrl: config.cashuMintUrl, store }));
  }
  let x402: X402Runtime | undefined;
  if (config.x402) {
    x402 = buildX402Runtime(config.x402);
    rails.set("x402", x402.adapter);
  }

  const governor = createGovernor({ store, config, audit, rails });

  // The on-chain allowance is the outer wall; refuse to serve a policy that is wider than it.
  if (x402?.allowance) {
    const spec = loadAgentPolicy(store, config, config.agentId);
    const violations = spec ? validateX402Caps(spec, x402.allowance) : [];
    if (violations.length > 0) {
      process.stderr.write(`leashd: x402 policy caps exceed the on-chain allowance:\n  ${violations.join("\n  ")}\n`);
      process.exit(1);
    }
  }

  const server = createMcpServer({ governor, store, config, x402Status: x402?.status });

  // Best-effort flush of any audit events queued while offline.
  void audit.flush();

  // Pull + verify the signed policy from the control plane on an interval.
  const policySync = startPolicySync(config, store);

  // stderr only: stdout is the MCP stdio transport and must stay clean.
  process.stderr.write(`leashd: agent=${config.agentId} db=${config.dbPath}\n`);

  const shutdown = () => {
    policySync.stop();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await startMcpServer(server);
}

main().catch((err) => {
  process.stderr.write(`leashd failed to start: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
