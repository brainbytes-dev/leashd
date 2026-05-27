# Leash — Design Spec (Shape A)

_Working title "Leash" — not final. Status: design, pre-build. Date: 2026-05-23._

> **Superseded (2026-05-26):** the product shipped as **leashd** and is now **Bitcoin-only**. The x402 / USDC / ERC-4337 / stablecoin rail described below was dropped entirely. Rails are Lightning (NWC / L402) and Cashu ecash only. Treat every "x402 / stablecoin / multi-rail incl. stablecoin" mention in this historical doc as removed.

## 1. Summary

Leash is a **non-custodial spend-governance layer for autonomous AI agents.** It gives agents money with hard guardrails: budget caps, scoped credentials, allowlists, rate limits, graded shutdown, approval thresholds, and an immutable audit trail. Multi-rail, BTC-first (Lightning/L402, Cashu) with stablecoin (x402/USDC) support.

**Strategy: open-core, two faces of one business.**
- **`leashd`** — open-source local sidecar (MCP server + policy engine). The sovereign-dev wedge and distribution funnel. Free.
- **Leash Control Plane** — commercial hosted SaaS (policy authoring, audit aggregation, team, billing). The revenue.

**ICP:** sovereign indie developers running their own agent swarms (Claude Code, custom orchestrators) who will never hand keys to a custodial provider. Not enterprise — that is where the funded competitors fight.

## 2. Why this exists (validated demand)

Agents now discover services, buy compute, and pay other agents autonomously. Giving an agent an unconstrained wallet is catastrophic: prompt injection, dependency exploits, or loops can drain funds. The fix is a **deterministic execution layer**, not probabilistic LLM guardrails. Market: AI agents $11-15B (2026) → $183B (2033, CAGR 49.6%); machine transactions projected $30T by 2030. 87% of financial institutions cite trust as the #1 adoption barrier. (NotebookLM Deep Research, 2026-05-23.)

## 3. Architecture (Model 1: local enforcement + hosted control plane)

```
┌─ User infrastructure (their machine / server) ──────────────┐
│  AI Agent (Claude Code / orchestrator)                       │
│        │ MCP: leash.pay / leash.check_policy                 │
│        ▼                                                     │
│  leashd  (OSS sidecar, MCP server + policy engine)           │
│   - holds rail connections LOCALLY (NWC string, scoped       │
│     macaroon, Cashu wallet, x402/ERC-4337 session key)       │
│   - evaluates policy locally (works offline)                 │
│   - two-phase commit; signs immutable audit events           │
│   - settles via the user's own rail                          │
└───────┬──────────────────────────────────────────┬──────────┘
        │ pull signed policy            push audit events (read-only)
        ▼                                          ▲
┌─ Leash Control Plane (hosted SaaS) ──────────────┴──────────┐
│  policy authoring · agents/workspaces · audit aggregation   │
│  team · billing (Stripe). Holds NO credentials/keys/funds.  │
└──────────────────────────────────────────────────────────────┘
```

The control plane signs policies; `leashd` verifies the signature before applying. Credentials never leave user infra. Even a full compromise of the control plane cannot move funds.

## 4. Payment flow (two-phase commit)

1. **Propose** — agent calls MCP tool `leash.pay({ endpoint, amount, rail, reason })`, or `leashd` intercepts an HTTP 402 challenge.
2. **Validate** — `leashd` evaluates the request against current policy (caps, scope, per-tx max, rate, time window, kill/graded state, approval threshold). Decision is deterministic and binary.
3. **Commit / Abort** — if allowed, `leashd` settles via the user's scoped rail credential; if denied, returns a structured denial to the agent. Atomic.
4. **Audit** — a signed, append-only event is written locally and pushed to the control plane: `timestamp · agent · endpoint · amount · rail · decision · policy_version`.

**Anti tool-description-poisoning:** the payment amount Leash acts on is the one cryptographically committed by the resource server (L402 invoice hash / x402 signed PAYMENT-REQUIRED), never a number parsed from an MCP tool description.

## 5. Policy model (the core product)

Hierarchy: **workspace → agent → policy**. Controls:

- **Budget caps:** per-task, rolling hourly/daily/monthly (e.g. 24h cap of 100k sats).
- **Per-transaction max** (e.g. block any single payment above N).
- **Allowlist / denylist:** endpoints, domains, Lightning addresses, Cashu mints. Unlisted recipient → atomic rejection.
- **Rate limit:** transactions per minute/hour.
- **Time windows:** when the agent may spend.
- **Approval threshold:** above amount X → human-in-the-loop confirmation required.
- **Graded shutdown ("dimmer", not binary kill):** scope attenuation → read-only; tool dropping (detach high-risk capabilities); approval-threshold escalation; on hard stop, state capture + quarantine so no orphaned sub-agents keep spending.
- **Authorization chain:** each payment links to a signed delegation / human intent, so a manipulated infinite loop cannot endlessly self-authorize.

Multi-rail: each policy binds one or more rails with priority (e.g. prefer sats, fallback stablecoin).

## 6. Audit (compliance-grade)

Append-only, signed, exportable event log. Designed to satisfy **EU AI Act Article 12** (immutable, exportable, verifiable logging for high-risk autonomous systems). Local log of record in `leashd`; aggregated read-only view in the control plane. The audit feed is the product's signature UI (terminal-style stream, mono, semantic-colored decisions).

## 7. Rails

Build order, BTC-first:

1. **Lightning / L402 + NWC (first).** Integrate over **NWC (NIP-47)** connection strings (works with Alby Hub, LND/CLN/LDK/Phoenixd). Use the rail's own scoped budget caps (e.g. Alby's per-connection budget) as defense-in-depth under Leash policy. L402 (now token-agnostic per bLIP) for pay-per-call API access; interoperate with `lnget`/Aperture. **Do not reinvent NWC/Alby** — orchestrate on top, adding cross-rail + agent-scoped policy + audit + graded shutdown.
2. **Cashu (second).** Via CDK (Rust) or the Ippon/Minibits seedless-agent-wallet REST+MCP primitive. Privacy + true micropayments; NIP-61 nutzaps tie-in.
3. **x402 / USDC (third).** EVM (Base/Solana). Non-custodial primitive = **ERC-4337 smart accounts** with session keys + on-chain limits + Paymaster (gasless), never raw EOAs. Interop with x402 facilitator flow.

## 8. MCP integration

`leashd` ships as an MCP server. Drop into Claude Code or any MCP host. The agent gets a policy-gated `pay` tool plus `check_policy` and `get_budget`. This is the wedge into the dev's existing stack and is complementary to Lightning Labs' MCP toolkit.

## 9. Security model

- Private keys never enter the agent sandbox or LLM context (remote-signer / isolation pattern).
- Credentials are scoped at the rail level (pay-only/attenuated macaroons, NWC budgets, ERC-4337 session keys) — defense-in-depth beneath Leash policy.
- Connection secrets in `leashd` are encrypted at rest; never logged in plaintext; never transmitted to the control plane.
- Deterministic policy gate sits between agent and rail; cannot be bypassed by prompt manipulation.

## 10. Data model

- **Control plane (Postgres):** `users`, `workspaces`, `members`, `agents`, `policies` (signed), `rail_bindings` (config references, NOT secrets), `audit_events` (aggregated), `subscriptions`.
- **`leashd` (local):** encrypted rail credentials, signed policy cache, append-only audit buffer.

## 11. Non-custodial / regulatory posture

Leash never holds funds or keys and never transmits money; it authorises/denies, the user's rail settles. Per Swiss FINMA, non-custodial software needs no license (see memory `finma-noncustodial-software`). Explicitly not a money transmitter/MSB (US). Legal pages already encode this (`/legal/privacy.md`, `/legal/terms.md`).

## 12. Pricing (open-core)

- `leashd`: free, OSS (permissive or source-available; license TBD — see open questions).
- Control plane: **Free** (1 workspace, few agents, 7-day audit retention) · **Pro** (more agents, long audit retention, team, approval workflows, alerting) · **Team** later. Stripe (USD). Stripe Tax for VAT.

## 13. Stack

- **Control plane:** Next.js 16 + Tailwind + shadcn/ui, Postgres + Drizzle, Better Auth, Stripe, Resend, Vercel. Visual system per `DESIGN.md` (Terminal-Sharp).
- **`leashd`:** open implementation choice — **Rust** (CDK/Cashu native, single static binary, sovereign-credible) vs **TS/Node** (MCP SDK maturity, velocity, shared types with control plane). Leaning Rust for the sidecar; decide at plan time.

## 14. MVP scope

**In:**
- `leashd`: MCP server (`pay`, `check_policy`, `get_budget`), Lightning/NWC rail, local policy engine (caps, scope, per-tx, rate, kill + basic graded shutdown), two-phase commit, signed local audit + push.
- Control plane: auth, workspace, agents, policy editor, audit feed UI, Stripe billing, landing page.

**Out (post-MVP):** Cashu rail, x402/ERC-4337 rail, advanced graded-shutdown automation, approval-workflow UI, team/RBAC, alerting.

## 15. Open questions & risks

- `leashd` language: Rust vs TS.
- OSS license: permissive (MaxAdoption) vs source-available/BSL (protect commercial plane).
- NWC-budget vs custom enforcement: how much to lean on Alby's existing caps vs Leash-native.
- Authorization-chain spec: which delegation format (signed intents).
- **Race monitoring:** Mnemopay, Foundation Devices ($6.4M), Coinbase CDP, Alby Hub. Re-check traction before heavy investment; differentiation is OSS + local-enforcement + multi-rail BTC-first + MCP self-host + graded-shutdown + Art.12 audit.
- Name + domain (working title).
