<p align="center">
  <img src="./.github/banner.svg" alt="leashd" width="100%">
</p>

<h3 align="center">Give your agents money. Keep the leash.</h3>

<p align="center">
  Non-custodial spend governance for AI agents.<br/>
  Hard budgets, allowlists, rate limits, time windows, graded shutdown, signed audit trail.<br/>
  Lightning (NWC), Cashu and x402/USDC on Base and Ethereum.
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-10b981?style=flat-square" alt="License: AGPL-3.0"></a>
  <a href="https://github.com/brainbytes-dev/leashd/actions"><img src="https://img.shields.io/github/actions/workflow/status/brainbytes-dev/leashd/ci.yml?style=flat-square&label=build" alt="Build"></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square" alt="TypeScript">
  <img src="https://img.shields.io/badge/MCP-compatible-10b981?style=flat-square" alt="MCP compatible">
  <img src="https://img.shields.io/badge/Bitcoin-Lightning-f7931a?style=flat-square" alt="Bitcoin Lightning">
  <img src="https://img.shields.io/badge/PRs-welcome-10b981?style=flat-square" alt="PRs welcome">
  <a href="https://github.com/brainbytes-dev/leashd/stargazers"><img src="https://img.shields.io/github/stars/brainbytes-dev/leashd?style=social" alt="Stars"></a>
</p>

<p align="center">
  <a href="https://leashd.dev"><b>Website</b></a> ·
  <a href="https://leashd.dev/docs"><b>Docs</b></a> ·
  <a href="https://leashd.dev/faq"><b>FAQ</b></a> ·
  <a href="https://leashd.dev/community"><b>Community</b></a>
</p>

---

## What the chain guarantees, what leashd guarantees, what nobody guarantees

- **Chain (x402):** the owner wallet grants a Spend Permission: at most `allowance` USDC per `period`,
  until `end`, revocable any time. leashd's agent key can never hold more than one period.
- **leashd (all rails):** per-transaction max, endpoint/domain allowlists, rate limit, time windows,
  approval threshold, kill switch and graded shutdown, signed append-only audit. Deterministic; a
  prompt cannot talk it out of a decision.
- **Not guaranteed:** within one period, a fully compromised host running leashd can spend that period's
  allowance. Pick the period and allowance you can afford to lose.

## Rails

| Rail | Funding | Chain-side cap |
|---|---|---|
| Lightning (NWC) | your node / Alby Hub | NWC connection budget |
| Cashu | mint proofs in the local store | balance |
| x402 / USDC | Base Account Spend Permission (or manual) | allowance per period |

## The problem

Autonomous AI agents now discover services, buy compute, and pay other agents on their own. The moment you give an agent a wallet, one prompt injection, one dependency exploit, or one runaway loop can drain it. Probabilistic guardrails in the model are not a control. You need a deterministic gate between the agent and the money.

## What leashd is

leashd is a bouncer with a rulebook standing between your AI agent and your funds. The agent asks to pay, leashd checks your policy (budget left, recipient allowed, under the limit, kill-switch off), then authorises or blocks it, and writes every decision to a signed log. It is non-custodial: leashd runs on your own machine and holds your wallet connection locally. It never touches your funds or keys.

## How it works

```
  AI agent ──pay 50 sat──▶ leashd (your machine)
                              │  check policy (caps · allowlist · rate · kill-switch)
                              ├─ allowed ─▶ your wallet (NWC) ──▶ api.foo.com
                              ├─ capped / denied ─▶ structured refusal to the agent
                              └─ signed audit event ──▶ control plane feed
```

The agent never gets your wallet. It gets a policy-gated `pay` tool over MCP that points at leashd. Funds settle directly between your own wallet and the counterparty. leashd sits in the policy path, never the custody path.

## Features

| | |
|---|---|
| Budget caps | per transaction, per task, rolling hourly / daily / monthly |
| Scoped credentials | allowlists and denylists for endpoints, domains, Lightning addresses, mints |
| Rate limits | cap transactions per window |
| Time windows | only let agents spend when you allow |
| Approval thresholds | human-in-the-loop above a value you set |
| Graded shutdown | a dimmer, not just a kill-switch: attenuate scope, drop tools, escalate approvals |
| Signed audit trail | append-only, tamper-evident, exportable. EU AI Act Article 12 grade |
| Multi-rail | Lightning (NWC) and L402, Cashu ecash, x402/USDC on Base and Ethereum |
| MCP-native | drops into Claude Code or any MCP host |

## Quickstart

leashd is in early access. Install from source for now; a published one-line install is on the way.

```bash
# install from source (requires node >= 22.5 and pnpm)
git clone https://github.com/brainbytes-dev/leashd
cd leashd && pnpm install

# run leashd with your env (token + control plane URL)
LEASH_AGENT_TOKEN=lsh_live_xxxxxxxx \
LEASH_API_URL=https://leashd.dev \
pnpm --filter @repo/leashd dev
```

Wire it into Claude Code via `.mcp.json`:

```json
{
  "mcpServers": {
    "leashd": {
      "command": "leashd",
      "args": ["--mcp"],
      "env": {
        "LEASH_AGENT_TOKEN": "lsh_live_xxxxxxxx",
        "LEASH_API_URL": "https://leashd.dev"
      }
    }
  }
}
```

Then create a workspace and agent, set a policy, and your agent's `pay` calls are policy-gated. Full guide at [leashd.dev/docs](https://leashd.dev/docs).

## Architecture (open core)

leashd is open core. leashd (the program that runs on your machine) and the policy engine are open source under AGPL-3.0. The hosted control plane (policy authoring, audit aggregation, team, billing) is available at [leashd.dev](https://leashd.dev), and a commercial license is available (see [COMMERCIAL.md](./COMMERCIAL.md)).

```
packages/
  leash-core/   deterministic policy engine + shared contract (zod)
  leashd/       runs on your machine: MCP server, governor, rail adapters, audit
apps/
  web/          the control plane (Next.js)
```

Stack: TypeScript, Next.js, Turborepo, Drizzle, node:sqlite. Zero native build for leashd.

## Non-custodial by design

You hold the keys. leashd holds the policy. The control plane stores only policies and the audit log, never funds or keys. Even a full compromise of leashd, or of the control plane, cannot move your money, because the keys never leave your machine. leashd is not a money transmitter.

## Roadmap

- [x] Lightning / L402 rail, policy engine, MCP server, signed audit
- [x] Cashu ecash rail
- [x] x402 / USDC rail (Base + Ethereum), on-chain enforced Spend Permissions
- [x] Team and RBAC, audit CSV export
- [ ] Approval workflow UI, alerting, long audit retention

## Funding the x402 rail

x402/USDC is funded non-custodially: your own wallet grants a per-period Spend Permission, and
leashd's local agent key can never hold more than one period's allowance.

```bash
# 1. Generate a local agent key (private key never leaves this machine)
pnpm --filter @repo/leashd x402 keygen

# 2. Grant a Spend Permission from your own wallet — client-side, no server involved
#    open the grant page and sign with the owner wallet, save the downloaded JSON:
open https://leashd.dev/dashboard/rails/x402/grant

# 3. Point leashd at the granted permission
LEASH_X402_NETWORK=eip155:8453 \
LEASH_X402_PRIVATE_KEY=0x... \
LEASH_X402_RPC_URL=https://mainnet.base.org \
LEASH_X402_FUNDING=base-spend-permission \
LEASH_X402_PERMISSION_PATH=~/.leashd/x402-permission.json \
LEASH_X402_OWNER_ADDRESS=0xYourOwnerWallet \
pnpm --filter @repo/leashd dev

# 4. Check remaining allowance and period end anytime
pnpm --filter @repo/leashd x402 status
```

Revoke the grant any time from the same grant page, or directly in the owner wallet. leashd's agent
key can never pull more than the last granted period.

Gas: a `spend()` call measures roughly 186,880 gas in the contract's own gas snapshot. At the fees
recorded in `docs/x402-spikes.md` (Step 2, fetched live 2026-09-16) that's about **$0.0027 on Base**
(0.006 gwei) and about **$0.083 on Ethereum mainnet** (0.185 gwei) — point-in-time estimates, not a
promise, and Base is the launch rail for a reason.

## Open issues, help wanted

Full list once filed: [issues labelled `help wanted`](https://github.com/brainbytes-dev/leashd/issues?q=is%3Aopen+label%3A%22help+wanted%22).

- **funding: ERC-7715 delegation as a second `FundingSource`** — MetaMask smart accounts, an erc20
  periodic permission as an alternative to the Base Account Spend Permission.
- **funding: Kernel signature policy enforcing EIP-3009 typed data on-chain** — a Kernel v3 policy that
  validates a `transferWithAuthorization` typed-data signature on-chain, capping an x402 payment without
  the pull-into-agent-key step.
- **rail: Solana x402** — the x402 `exact` scheme on Solana, non-custodial per-period cap (Spec 2).

## Contributing

PRs welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md). The one invariant you must never break: leashd stays non-custodial. Report vulnerabilities per [SECURITY.md](./SECURITY.md).

## Support development

leashd is built in the open by an indie solo-dev. If it saves your agents from spending your sats, send some back:

```
⚡ leashd@walletofsatoshi.com   (TODO: replace with the real Lightning address)
```

A GitHub sponsor button is set up via [.github/FUNDING.yml](./.github/FUNDING.yml).

## License

[AGPL-3.0](./LICENSE). Commercial licenses available, see [COMMERCIAL.md](./COMMERCIAL.md).

<p align="center"><sub>Built by BrainBytes Studio, an indie solo-dev shop.</sub></p>
