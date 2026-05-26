const BASE = process.env.NEXT_PUBLIC_APP_URL || "https://leashd.dev";

// llms.txt (https://llmstxt.org): a concise, LLM-friendly map of the site.
const BODY = `# leashd

> leashd is a non-custodial spend-governance layer for autonomous AI agents. It is a deterministic policy gate that sits between an AI agent (for example Claude Code over MCP) and its payment rail. Before any payment it evaluates a policy you set (budget caps, per-transaction max, recipient allowlists, rate limits, time windows, a graded kill-switch) and authorises, caps, or denies the payment, then writes a signed, append-only audit event. Bitcoin-only: Lightning (and L402) plus Cashu ecash. No EVM, no stablecoins, no altcoins. MCP-native. Open-source under AGPL-3.0.

## What problem it solves
The moment you give an AI agent a wallet, one prompt injection or one runaway loop can drain it. A probabilistic model cannot make spending safe. leashd is a deterministic gate between the agent and the money. The decision is not made by an LLM.

## Trust model
leashd runs locally on your own machine and holds your wallet connection there. Your keys never leave your machine and never reach the hosted control plane. The control plane stores only signed policy and audit metadata, never a key or a fund, so even a full compromise of it cannot move money. Policies are signed with a key only you control; leashd verifies the signature before applying any update. Open core: the local program and policy engine are free and AGPL-3.0; a hosted control plane (policy authoring, audit aggregation across a fleet, team roles, alerting) is optional.

## Docs
- [Docs](${BASE}/docs): install, quickstart, MCP integration, self-host, hosted vs self-host
- [FAQ](${BASE}/faq): custody, where keys live, supported rails, pricing, money-transmitter status, offline behaviour
- [Community](${BASE}/community): how to get involved

## Source and links
- [Website](${BASE})
- [GitHub repository](https://github.com/brainbytes-dev/leashd) (AGPL-3.0)

## Key facts
- Category: AI agent payment governance, spend control, policy gate, MCP tool
- Rails: Bitcoin Lightning, L402, Cashu ecash. Bitcoin-only by design.
- Integration: MCP server, drops into Claude Code or any MCP host
- License: AGPL-3.0, commercial license available
- Audit: signed, append-only, exportable. Designed for EU AI Act Article 12 logging.
- Operated by BrainBytes Studio, an indie solo-dev shop.
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
