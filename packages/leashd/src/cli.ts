#!/usr/bin/env node
import type { PaymentRequest } from "@repo/leash-core";
import { loadConfig } from "./config";
import { openStore } from "./store";
import { createAuditWriter } from "./audit";
import { createGovernor } from "./governor";
import { createMcpServer, startMcpServer } from "./mcp-server";
import { startPolicySync } from "./policy-sync";
import type { RailAdapter } from "./rails/types";
import { createLightningNwcAdapter } from "./rails/lightning-nwc";
import { createCashuAdapter } from "./rails/cashu";
import { createX402Adapter } from "./rails/x402";

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
  if (config.x402PrivateKey) {
    rails.set(
      "x402",
      createX402Adapter({ privateKey: config.x402PrivateKey, network: config.x402Network })
    );
  }

  const governor = createGovernor({ store, config, audit, rails });
  const server = createMcpServer({ governor, store, config });

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
