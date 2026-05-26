import { generateKeyPairSync, createPublicKey } from "node:crypto";
import type { PaymentRequest, PolicySpec } from "@repo/leash-core";
import type { LeashConfig } from "./config";
import { openStore } from "./store";
import { createAuditWriter } from "./audit";
import { createGovernor } from "./governor";
import type { RailAdapter } from "./rails/types";

/**
 * Offline demo of the policy gate. No funds, no network, no MCP host: it drives
 * the SAME governor + deterministic policy engine the MCP `pay` tool uses, with
 * a mock rail for the allowed path. Records a clean terminal trace for a GIF.
 *
 * Run: pnpm --filter @repo/leashd demo
 */

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  amber: "\x1b[33m",
  gray: "\x1b[90m",
  cyan: "\x1b[36m",
};

function sat(n: number): string {
  return n.toLocaleString("en-US");
}

const DECISION_STYLE: Record<string, { color: string; label: string }> = {
  allowed: { color: C.green, label: "ALLOW " },
  capped: { color: C.amber, label: "CAPPED" },
  denied: { color: C.red, label: "DENY  " },
  approval_required: { color: C.cyan, label: "APPROVE" },
};

async function main(): Promise<void> {
  const { privateKey } = generateKeyPairSync("ed25519");
  const signingPublicKeyB64 = createPublicKey(privateKey)
    .export({ type: "spki", format: "der" })
    .toString("base64");

  const config: LeashConfig = {
    controlPlaneUrl: "http://127.0.0.1:1", // unreachable: demo stays local
    workspaceId: "demo-workspace",
    agentId: "demo-agent",
    agentToken: "demo",
    dbPath: ":memory:",
    signingPrivateKey: privateKey,
    signingPublicKeyB64,
  };

  const store = openStore(":memory:");
  const audit = createAuditWriter(store, config);

  // A mock Lightning rail for the allowed path (no real settlement in the demo).
  const mockRail: RailAdapter = {
    rail: "lightning_nwc",
    async pay(req) {
      return { ok: true, ref: "3f9a1c8e…preimage", settledAmount: req.amount };
    },
  };
  const rails = new Map<PaymentRequest["rail"], RailAdapter>([
    ["lightning_nwc", mockRail],
  ]);

  // Mutable so we can flip the kill-switch mid-demo.
  const policy: PolicySpec = {
    version: 1,
    defaultDecision: "deny",
    perTxMax: { unit: "sat", value: 5000 },
    budgets: [{ window: "day", cap: { unit: "sat", value: 10000 } }],
    allow: { lightningAddresses: ["ops@leashd.dev"] },
    timezone: "UTC",
    timeWindows: [],
    killSwitch: false,
    gradedState: "normal",
    rails: ["lightning_nwc"],
  };

  const governor = createGovernor({
    store,
    config,
    audit,
    rails,
    resolvePolicy: () => policy,
  });

  const line = (s: string) => process.stdout.write(s + "\n");

  line("");
  line(`${C.bold}leashd${C.reset} ${C.dim}— policy gate for AI agent payments${C.reset}`);
  line(`${C.gray}offline demo · no real funds · no network · deterministic engine${C.reset}`);
  line("");
  line(
    `${C.dim}policy:${C.reset} deny by default · per-tx max ${C.bold}${sat(5000)} sat${C.reset} · daily cap ${C.bold}${sat(10000)} sat${C.reset}`
  );
  line(
    `${C.dim}       allow:${C.reset} ⚡ ops@leashd.dev   ${C.dim}rails:${C.reset} lightning`
  );
  line("");

  type Step = { to: string; amount: number; note?: string; killSwitch?: boolean };
  const steps: Step[] = [
    { to: "ops@leashd.dev", amount: 2000 },
    { to: "ops@leashd.dev", amount: 8000 },
    { to: "attacker@evil.com", amount: 2000, note: "prompt-injection redirect" },
    { to: "ops@leashd.dev", amount: 5000 },
    { to: "ops@leashd.dev", amount: 5000 },
    { to: "ops@leashd.dev", amount: 100, killSwitch: true, note: "kill-switch engaged" },
  ];

  for (const step of steps) {
    if (step.killSwitch) {
      policy.killSwitch = true;
      line(`${C.red}${C.bold}  ⏻ kill-switch engaged${C.reset}`);
    }

    const req: PaymentRequest = {
      agentId: "demo-agent",
      rail: "lightning_nwc",
      amount: { unit: "sat", value: step.amount },
      lightningAddress: step.to,
      ts: Date.now(),
    };

    const { decision, settled } = await governor.requestPayment(req);
    const style = DECISION_STYLE[decision.decision] ?? DECISION_STYLE.denied;
    const reason =
      decision.decision === "allowed"
        ? `settled ⚡ ${C.gray}${settled?.ref ?? ""}${C.reset}`
        : `${decision.reasons[0] ?? ""}`;

    const left = `  ${C.cyan}agent${C.reset} → pay ${C.bold}${sat(step.amount).padStart(6)} sat${C.reset} to ${step.to.padEnd(18)}`;
    line(`${left} ${style.color}${C.bold}${style.label}${C.reset}  ${style.color}${reason}${C.reset}`);
    await new Promise((r) => setTimeout(r, 450)); // pacing for the recording
  }

  line("");
  line(
    `${C.green}✓${C.reset} every decision signed + appended to the audit log. ${C.bold}your keys never moved.${C.reset}`
  );
  line("");
}

main().catch((err) => {
  process.stderr.write(`demo failed: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
