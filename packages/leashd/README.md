# leashd

`leashd` is the open-source program that runs on your machine for **Leash**, a non-custodial
spend-governance layer for AI agents.

It runs next to your agent (Claude Code, a custom orchestrator, anything that
speaks MCP) and exposes policy-gated payment tools. Every payment runs through a
deterministic policy engine and a two-phase commit: **propose → validate →
settle → commit**, with a signed, append-only audit trail.

## Non-custodial

`leashd` never sends rail secrets, wallet credentials, invoices, or preimages
anywhere. It holds rail connections **locally**. The control plane only ever
receives signed audit metadata and policy decisions. Even a full compromise of
the control plane cannot move your funds. The control plane signs policies;
`leashd` verifies the signature before applying — and fails closed if it can't.

## What it does

- **MCP server** over stdio with three tools: `pay`, `check_policy`, `get_budget`.
- **Deterministic policy engine** (from `@repo/leash-core`): budget caps
  (task/hour/day/month), per-transaction max, allow/deny lists, rate limits,
  time windows, approval thresholds, kill switch, graded shutdown.
- **Lightning rail** over NWC (NIP-47) via `@getalby/sdk`, plus a **Cashu**
  ecash rail (melt to settle a Lightning invoice). Bitcoin-only by design.
- **Local SQLite** spend ledger + signed audit log (the record of truth), pushed
  best-effort to the control plane (queued locally when offline).

## Install

```bash
pnpm add -g @repo/leashd   # or run from the monorepo: pnpm --filter @repo/leashd dev
```

## Configuration

Config comes from environment variables, overlaid on an optional
`~/.leashd/config.json` (override the home dir with `LEASH_HOME`).

| Env var | Required | Purpose |
|---|---|---|
| `LEASH_CONTROL_PLANE_URL` | yes | Base URL of the Leash control plane. |
| `LEASH_WORKSPACE_ID` | yes | Workspace this agent belongs to. |
| `LEASH_AGENT_ID` | yes | This agent's ID. |
| `LEASH_AGENT_TOKEN` | yes | Bearer token for audit push. |
| `LEASH_CONTROL_PLANE_PUBKEY` | for policy | ed25519 public key (base64 SPKI DER) used to verify signed policies. Without it, all payments fail closed. |
| `LEASH_NWC_URL` | for Lightning | NWC connection string (`nostr+walletconnect://...`). Secret — never leaves the device. |
| `LEASH_DB_PATH` | no | SQLite path. Default `~/.leashd/leashd.db`. |
| `LEASH_SIGNING_KEY_PATH` | no | Path to leashd's ed25519 signing key (PEM). Auto-generated on first run. |
| `LEASH_HOME` | no | Config/state directory. Default `~/.leashd`. |

`leashd` generates and persists its own ed25519 signing identity on first run.

## Wire into Claude Code

Add to your MCP server config (e.g. `~/.claude/mcp.json` or the Claude Code MCP
settings):

```json
{
  "mcpServers": {
    "leashd": {
      "command": "leashd",
      "env": {
        "LEASH_CONTROL_PLANE_URL": "https://app.leash.example",
        "LEASH_WORKSPACE_ID": "ws_...",
        "LEASH_AGENT_ID": "agent_...",
        "LEASH_AGENT_TOKEN": "...",
        "LEASH_CONTROL_PLANE_PUBKEY": "MCowBQYDK2VwAyEA...",
        "LEASH_NWC_URL": "nostr+walletconnect://..."
      }
    }
  }
}
```

The agent then sees `pay`, `check_policy`, and `get_budget`.

## Tools

- **`pay`** — `{ rail, amount: { unit, value }, endpoint?, lightningAddress?, mint?, domain?, reason?, intentRef? }`.
  Validates against policy and, if allowed, settles on the rail. The amount acted
  on comes only from the structured `amount` argument (or a server-committed
  invoice) — never parsed from free text.
- **`check_policy`** — same args, dry-run. Returns the decision without settling.
- **`get_budget`** — remaining headroom per budget window for the agent.

## License

AGPL-3.0.
