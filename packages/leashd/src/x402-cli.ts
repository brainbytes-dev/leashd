#!/usr/bin/env node
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { loadConfig } from "./config";
import { buildX402Runtime } from "./rails/x402-wiring";
import type { X402Status } from "./rails/x402-status";

export function generateAgentKey(): { privateKey: `0x${string}`; address: `0x${string}` } {
  const privateKey = generatePrivateKey();
  return { privateKey, address: privateKeyToAccount(privateKey).address };
}

function dollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatStatus(s: X402Status): string {
  const lines = [
    `agent     ${s.agentAddress}`,
    `network   ${s.network}`,
    `balance   ${dollars(s.agentBalanceUsdCent)}`,
    `remaining ${dollars(s.allowanceRemainingUsdCent)} this period`,
    `funding   ${s.funding}`,
  ];
  if (s.periodEndsAt) lines.push(`period    ends ${new Date(s.periodEndsAt * 1000).toISOString()}`);
  return lines.join("\n");
}

async function main(argv: string[]): Promise<void> {
  const cmd = argv[0];
  if (cmd === "keygen") {
    const k = generateAgentKey();
    // The key is printed once; the operator stores it as LEASH_X402_PRIVATE_KEY (0600).
    process.stdout.write(`LEASH_X402_PRIVATE_KEY=${k.privateKey}\nagent address (use as spender): ${k.address}\n`);
    return;
  }
  const config = loadConfig();
  if (!config.x402) throw new Error("x402 rail is not configured (LEASH_X402_*)");
  const runtime = buildX402Runtime(config.x402);

  if (cmd === "status") {
    process.stdout.write(formatStatus(await runtime.status()) + "\n");
    return;
  }
  if (cmd === "drain") {
    const to = (argv[1] as `0x${string}` | undefined) ?? runtime.ownerAddress;
    if (!to) throw new Error("drain needs a target address (or a spend permission to infer the owner)");
    const hash = await runtime.drain(to);
    process.stdout.write(`drained agent key to ${to}: ${hash}\n`);
    return;
  }
  throw new Error("usage: x402 <keygen|status|drain [address]>");
}

if (process.argv[1]?.endsWith("x402-cli.ts") || process.argv[1]?.endsWith("x402-cli.js")) {
  main(process.argv.slice(2)).catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.message : String(err)}\n`);
    process.exit(1);
  });
}
