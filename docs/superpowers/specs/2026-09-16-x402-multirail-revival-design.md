# leashd: x402 multi-rail revival, Spec 1 (EVM)

Status: approved design (2026-09-16). Supersedes the Bitcoin-only pivot of 2026-05-26 (`36ca637`, `247f72b`).
The `x402.ts` removed back then was a raw-EOA stub and is not the target.
Spec 2 (Solana rail) is a separate cycle after launch.

## 1. Decisions

| Question | Decision | Why |
|---|---|---|
| Non-custodial primitive for stablecoins | **On-chain allowance from the owner wallet** (Base Account Spend Permissions). The local agent key never holds more than one period's allowance. | Kernel/ZeroDev session keys can only restrict *who calls* `isValidSignature`, not amount or recipient. An x402 "exact" payment is an EIP-3009 signature the facilitator submits, so the cap has to come from the allowance primitive. |
| Custom Kernel signature policy (on-chain typed-data check) | Open issue, help wanted | Solidity plus audit; not "back to life" work |
| Chains | Base + Ethereum, one adapter, `network` is config. Solana is Spec 2. | Solana needs a different wallet model |
| Scope | EVM rail + control plane + Lightning/Cashu live E2E + launch | The post shows three rails with one real settlement each |
| Demo | Base mainnet, real USDC, single-digit dollars | One real dollar in a GIF beats three rails on testnet |
| Team | One person until launch; contributors via the open issues afterwards | Adapter against an existing interface; the policy engine is untouched |

## 2. Architecture

```
Owner wallet (Base Account, owner's keys, never in leashd)
   │  Spend Permission: spender = agent key, token = USDC,
   │  allowance = X per period, end = expiry, revocable any time
   ▼
leashd (local)
   ├─ FundingSource "base-spend-permission"
   │    on shortfall pulls at most the period budget via spend() into the agent key
   ├─ Agent key (EOA, generated locally, 0600 on disk, never holds more than one period)
   ├─ Rail "x402" (EVM): pays via @x402/fetch as an EOA (EIP-3009)
   │    network from config: eip155:8453 (Base), eip155:1 (Ethereum)
   └─ Policy engine (unchanged): caps, allowlist, rate, time windows, kill
        Leash policy caps <= on-chain allowance, otherwise a config error
```

Two layers, kept apart:

- **The chain guarantees** (independent of leashd): loss per period <= `allowance`, lifetime <= `end`, revocable from the owner wallet at any time.
- **Leash guarantees** (deterministic software): per-tx max, endpoint allowlist, rate limit, time windows, approval threshold, graded shutdown, signed audit trail.
- **Not guaranteed:** protection within one period against a compromised leashd host. The README threat model says so.

### 2.1 Interfaces (`packages/leashd/src/rails/`)

`RailAdapter` stays as is (`rail`, `pay(req) -> RailResult`, errors resolve, never throw).

New, `rails/funding/types.ts`:

```ts
export interface FundingSource {
  readonly kind: "base-spend-permission" | "manual";
  /** Pull up to `amount` (usd_cent) into the agent key. Resolves, never throws. */
  topUp(amount: Amount): Promise<FundingResult>;
  /** Remaining on-chain allowance in the current period (usd_cent). */
  remaining(): Promise<Amount>;
  /** Unix seconds when the current period ends, if periodic. */
  periodEndsAt(): Promise<number | undefined>;
}
```

Spec 1 implementations: `base-spend-permission` (core) and `manual` (owner transfers by hand, cap = balance; fallback for chains without a SpendPermissionManager deployment).

`createX402Adapter({ network, account, funding, publicClient, usdcAddress })`: before paying, check the agent key's USDC balance; if balance < approved amount, `funding.topUp()` for exactly the shortfall up to the period remainder; then pay. Never pull "in advance".

### 2.2 Grant flow, non-custodial

A client-only page in the control plane (`/dashboard/rails/x402/grant`) runs the Base Account SDK in the browser, `requestSpendPermission` -> signed permission as a JSON download. No server storage, no key on Vercel. Import locally by pointing `LEASH_X402_PERMISSION_PATH` at the file. Revoke via `requestRevoke` on the same page or directly in the owner wallet.

### 2.3 Kill switch and drain

On kill / hard stop: no further pull. The remaining balance stays in the agent key. `x402 drain` sends it back to the owner wallet.

## 3. Changes per package

**leash-core**: `Amount.unit` regains `usd_cent`; `Rail` gains `"x402"`. New pure validator `validateX402Caps(spec, allowance)` rejecting a policy whose x402 caps exceed the bound allowance (Leash <= chain). Policy engine otherwise unchanged.

**leashd**: `rails/x402.ts`, `rails/funding/{types,base-spend-permission,manual}.ts`, config block (`LEASH_X402_NETWORK`, `LEASH_X402_PRIVATE_KEY`, `LEASH_X402_FUNDING`, `LEASH_X402_PERMISSION_PATH`, `LEASH_X402_RPC_URL`), `x402` CLI (`keygen`, `status`, `drain`), `get_budget` reports the on-chain remainder per rail. Deps: `@x402/fetch`, `@x402/evm`, `viem`. `@base-org/account` only in the web app.

**Control plane**: x402 rail binding with metadata only (`network`, agent address, `permissionHash`, `allowance`, `period`, `end`); grant page; policy editor with a per-policy unit (`sat` | `usd_cent`) and the x402 rail; audit columns `amount_minor`/`currency` used for `usd_cent`; copy and legal pages back to multi-rail.

**Lightning + Cashu** (May backlog, now in scope): NWC on the operator's LND with an NWC-side budget cap as defense in depth; the May runbook end to end; Cashu mint funded with a small amount, one live `melt`.

## 4. Spikes before building (about one hour each)

1. Is `SpendPermissionManager` deployed on Ethereum mainnet? If not, Ethereum starts with `manual`; Base is the launch proof.
2. Gas for `spend()`: the agent key needs a little ETH on Base (cents) and on Ethereum (dollars); on Ethereum use large, rare periods. Put the number in the README.
3. Facilitator behaviour for an EOA payment from the agent key against a real endpoint on Base Sepolia, before mainnet.

## 5. Tests

- **Unit (vitest):** x402 adapter against a mocked fetch with a 402 challenge; funding logic (pull only on shortfall, never above allowance, period rollover); `validateX402Caps`; drain.
- **Integration, Base Sepolia, CI:** real permission, real `spend()`, real x402 payment against the x402 foundation test endpoint. Testnet key as a CI secret; the job is skipped when the secret is absent.
- **Live proof, mainnet, once, by hand:** Base, 5 USD USDC allowance per day. Three cases in the audit log: allowed payment (CoinGecko, 0.01 USDC), policy DENY (endpoint not allowlisted), chain DENY (allowance exhausted). Plus one real settlement each over NWC and Cashu.

## 6. Launch order

1. DENY/ALLOW GIF via asciinema from the mainnet run.
2. README rewrite: hero, the diagram from section 2, threat model (chain / Leash / not guaranteed), open issues up front.
3. dev.to post, about 1,500 words. Direction: "I gave my AI agents a wallet with a hard on-chain budget. Here's the boring part that makes it safe." No hype.
4. Same-day crossposts: Show HN, Nostr, X. Text only, scheduled through Postiz.
5. Reddit **not** on launch day: a fresh account without karma gets shadowbanned when posting through automation. r/ethdev and r/lightningnetwork two to three weeks later, by hand. No automated warmup.
6. Stripe live keys only after launch, when someone asks for Pro.

## 7. Open issues in the repo from day one ("help wanted")

- `funding: ERC-7715 delegation` (MetaMask smart accounts) as a second FundingSource.
- `funding: Kernel signature policy`: a Solidity policy checking EIP-3009 typed data inside `isValidSignature`.
- `rail: Solana x402` (Spec 2).
- `funding: Ethereum mainnet` if spike 1 is negative.

## 8. Out of scope

Approval workflow UI, alerting retention, PNG illustrations, Reddit account warmup, Solana, Stripe live before launch.

## 9. Sources

- x402 v2 smart-wallet support (ERC-1271/6492 in the facilitator): x402-foundation/x402, `python/x402/mechanisms/evm/README.md`, `docs/extensions/sign-in-with-x.mdx`; client API: `typescript/packages/http/fetch/README.md`.
- ZeroDev permissions, signature policy restricts callers only: docs.zerodev.app/smart-accounts/permissions/policies/signature.
- Base Account Spend Permissions (`SpendPermission` struct, `requestSpendPermission`, `prepareSpendCallData`, `getPermissionStatus`, `requestRevoke`): docs.base.org/base-account.
- Original May design: `docs/2026-05-23-leash-design-spec.md`.
