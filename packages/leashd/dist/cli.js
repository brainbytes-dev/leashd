#!/usr/bin/env node
import { loadConfig } from "./config";
import { openStore } from "./store";
import { createAuditWriter } from "./audit";
import { createGovernor } from "./governor";
import { createMcpServer, startMcpServer } from "./mcp-server";
import { createLightningNwcAdapter } from "./rails/lightning-nwc";
import { createCashuAdapter } from "./rails/cashu";
import { createX402Adapter } from "./rails/x402";
async function main() {
    const config = loadConfig();
    const store = openStore(config.dbPath);
    const audit = createAuditWriter(store, config);
    const rails = new Map();
    if (config.nwcUrl) {
        rails.set("lightning_nwc", createLightningNwcAdapter(config.nwcUrl));
    }
    rails.set("cashu", createCashuAdapter());
    rails.set("x402", createX402Adapter());
    const governor = createGovernor({ store, config, audit, rails });
    const server = createMcpServer({ governor, store, config });
    // Best-effort flush of any audit events queued while offline.
    void audit.flush();
    // stderr only: stdout is the MCP stdio transport and must stay clean.
    process.stderr.write(`leashd: agent=${config.agentId} db=${config.dbPath}\n`);
    await startMcpServer(server);
}
main().catch((err) => {
    process.stderr.write(`leashd failed to start: ${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
});
