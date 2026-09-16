# x402 Multi-Rail Revival (Spec 1, EVM) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the x402/USDC rail back into leashd with an on-chain enforced per-period budget (Base Account Spend Permissions), restore multi-rail in the control plane, prove all three rails live, and launch.

**Architecture:** The owner's Base Account grants a Spend Permission to a locally generated agent EOA. A `FundingSource` pulls at most one period's allowance into that EOA on shortfall; the `x402` `RailAdapter` then pays as an EOA through `@x402/fetch`. The policy engine is untouched; a pure validator enforces "Leash caps <= on-chain allowance". The control plane stores metadata only and hosts a client-only grant page.

**Tech Stack:** TypeScript (ESM), pnpm workspaces + turbo, vitest, zod 4, viem, `@x402/fetch` + `@x402/evm` (x402 v2), `@base-org/account` (browser only), Next.js 16, Drizzle/Neon, Node >= 22.5.

**Spec:** `docs/superpowers/specs/2026-09-16-x402-multirail-revival-design.md` (English) and the vault copy `10 - Projekte/SaaS & Apps/Leash/Architektur/2026-09-16-x402-multirail-revival-spec.md` (German, same content).

## Global Constraints

- Money is an integer in a rail-appropriate minor unit: `sat` for Lightning/Cashu, `usd_cent` for x402. Never floats. USDC has 6 decimals, so `atomic = usd_cent * 10_000`.
- Secrets (agent private key, NWC string, permission JSON) live only in leashd config/env, never in audit events, never in the control plane. The rails API "NEVER accept secrets" rule stays.
- The amount leashd acts on comes from the structured request or the server-committed `PAYMENT-REQUIRED` requirement, never from prose (anti tool-description poisoning).
- Rail adapters resolve errors into `{ ok: false, error }`; they never throw.
- Networks are CAIP-2 strings: `eip155:8453` (Base), `eip155:1` (Ethereum), `eip155:84532` (Base Sepolia).
- No `any` in TypeScript. Conventional Commits, imperative, no emojis.
- `pnpm` only. Tests: `pnpm --filter <pkg> test`. Typecheck: `pnpm typecheck` at the root.
- Nothing is pushed to `origin` by an agent; the operator pushes.
- Copy rules: no "Bitcoin-only", no "shitcoins" anywhere after Task 13. Positioning line: "non-custodial spend governance for AI agents, on-chain enforced budgets, Lightning + Cashu + x402".

---

## File map

| Path | Responsibility |
|---|---|
| `packages/leash-core/src/types.ts` | `MoneyUnit` gains `usd_cent`, `Rail` gains `x402` |
| `packages/leash-core/src/x402-caps.ts` (new) | `validateX402Caps(spec, allowance)`: pure "Leash <= chain" check |
| `packages/leash-core/src/index.ts` | export the validator |
| `packages/leashd/src/config.ts` | x402 config block |
| `packages/leashd/src/rails/funding/types.ts` (new) | `FundingSource`, `FundingResult` |
| `packages/leashd/src/rails/funding/manual.ts` (new) | balance-is-the-cap funding source |
| `packages/leashd/src/rails/funding/spend-permission-manager.ts` (new) | ABI, addresses, encoders for `SpendPermissionManager` |
| `packages/leashd/src/rails/funding/base-spend-permission.ts` (new) | pulls per-period allowance via `spend()` |
| `packages/leashd/src/rails/x402.ts` (new) | the rail adapter + pure helpers |
| `packages/leashd/src/rails/x402-status.ts` (new) | `X402Status` for `get_budget` and the CLI |
| `packages/leashd/src/cli.ts` | register the x402 rail, startup validation |
| `packages/leashd/src/mcp-server.ts` | `get_budget` reports x402 on-chain remainder |
| `packages/leashd/src/x402-cli.ts` (new) | `keygen`, `status`, `drain` |
| `packages/leashd/src/demo.ts` | offline DENY case for x402 |
| `apps/web/src/lib/leash/api.ts` | audit amount mapping for `usd_cent` |
| `apps/web/src/app/dashboard/rails/rails-client.tsx` | x402 binding with metadata fields |
| `apps/web/src/app/dashboard/rails/x402/grant/page.tsx` (new) | client-only grant/revoke page |
| `apps/web/src/app/dashboard/policies/policy-editor.tsx` | per-policy unit, x402 rail |
| `apps/web/src/app/api/leash/policies/route.ts` | soft `validateX402Caps` against the bound rail |
| marketing/legal/README/llms.txt | multi-rail copy |
| `.github/workflows/ci.yml` | `master` branch, Sepolia integration job |
| `packages/leashd/src/integration/x402-sepolia.test.ts` (new) | gated live test |
| `docs/x402-spikes.md` (new) | spike results |
| `docs/launch/2026-dev-to-post.md` (new) | launch post draft |

---

### Task 0: Spikes (record facts before code)

**Files:**
- Create: `docs/x402-spikes.md`

No code. One hour each, results written down with the command that produced them.

- [ ] **Step 1: SpendPermissionManager deployment on Ethereum mainnet**

Open https://docs.base.org/base-account/reference/onchain-contracts/spend-permissions and copy the deployed address table into `docs/x402-spikes.md`. Then verify bytecode exists on each chain you care about:

```bash
for RPC in https://mainnet.base.org https://sepolia.base.org https://ethereum-rpc.publicnode.com; do
  echo "$RPC"
  curl -s "$RPC" -H 'content-type: application/json' \
    -d '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["<ADDRESS_FROM_DOCS>","latest"]}' | cut -c1-80
done
```

Expected: `0x` followed by bytecode on Base and Base Sepolia. On Ethereum: bytecode present (record the address) or `"0x"` (record "not deployed; Ethereum uses funding=manual until the ERC-7715 issue lands").

- [ ] **Step 2: Gas cost of `spend()`**

From the same docs page, note the gas of a `spend` call (or estimate on Base Sepolia after Task 5 with `publicClient.estimateGas`). Record: "Base: ~N gas, ~$X at current fees; Ethereum: ~N gas, ~$Y". This number goes into the README funding section (Task 13).

- [ ] **Step 3: Facilitator behaviour with an EOA on Base Sepolia**

Read the x402 foundation "test endpoint" from https://github.com/x402-foundation/x402 (examples/typescript/clients/fetch/README.md names one). Record the URL, the network it advertises in `PAYMENT-REQUIRED`, the USDC asset address it names, and the price. If no public test endpoint exists, record the local resource-server example you will run instead (`examples/typescript/servers/express`) and its start command.

- [ ] **Step 4: ABI check**

From https://docs.base.org/base-account/reference/onchain-contracts/spend-permissions copy the exact signatures of `spend`, `approveWithSignature`, `getCurrentPeriod`, `isValid`, `getHash` and the `SpendPermission` struct field order into `docs/x402-spikes.md`. Task 5 hand-writes the ABI from this record.

- [ ] **Step 5: Commit**

```bash
git add docs/x402-spikes.md
git commit -m "docs(x402): record spike results before implementation"
```

---

### Task 1: Money unit and rail enum

**Files:**
- Modify: `packages/leash-core/src/types.ts:9-21`
- Test: `packages/leash-core/src/types.test.ts` (new)

**Interfaces:**
- Produces: `MoneyUnit = "sat" | "usd_cent"`, `Rail = "lightning_nwc" | "cashu" | "x402"`. Every later task relies on these two literal unions.

- [ ] **Step 1: Write the failing test**

```ts
// packages/leash-core/src/types.test.ts
import { describe, it, expect } from "vitest";
import { Amount, Rail, PaymentRequest } from "./types";

describe("money units and rails", () => {
  it("accepts usd_cent amounts", () => {
    expect(Amount.parse({ unit: "usd_cent", value: 5 })).toEqual({ unit: "usd_cent", value: 5 });
  });
  it("accepts the x402 rail", () => {
    expect(Rail.parse("x402")).toBe("x402");
  });
  it("still rejects unknown units", () => {
    expect(() => Amount.parse({ unit: "eur_cent", value: 1 })).toThrow();
  });
  it("parses an x402 payment request", () => {
    const r = PaymentRequest.parse({
      agentId: "a1",
      rail: "x402",
      amount: { unit: "usd_cent", value: 1 },
      endpoint: "https://api.coingecko.com/api/v3/x402/ping",
      ts: 1,
    });
    expect(r.rail).toBe("x402");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/leash-core test`
Expected: FAIL, zod rejects `usd_cent` and `x402`.

- [ ] **Step 3: Write the minimal implementation**

In `packages/leash-core/src/types.ts` replace lines 9-21 with:

```ts
// Minor units per rail family: sats for Lightning/Cashu, US cents for x402/USDC.
export const MoneyUnit = z.enum(["sat", "usd_cent"]);
export type MoneyUnit = z.infer<typeof MoneyUnit>;

export const Amount = z.object({
  unit: MoneyUnit,
  value: z.number().int().nonnegative(),
});
export type Amount = z.infer<typeof Amount>;

// Multi-rail: Lightning (NWC / L402), Cashu ecash, x402 (USDC on EVM).
export const Rail = z.enum(["lightning_nwc", "cashu", "x402"]);
export type Rail = z.infer<typeof Rail>;
```

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm --filter @repo/leash-core test && pnpm typecheck`
Expected: leash-core PASS. Typecheck may now fail in `apps/web` where `unit` is hard-coded to `"sat"` with a `MoneyUnit` annotation; that is fine and is fixed in Tasks 9 and 11. Note any failures, do not fix them here.

- [ ] **Step 5: Commit**

```bash
git add packages/leash-core/src/types.ts packages/leash-core/src/types.test.ts
git commit -m "feat(core): restore usd_cent unit and x402 rail"
```

---

### Task 2: Pure validator "Leash caps <= on-chain allowance"

**Files:**
- Create: `packages/leash-core/src/x402-caps.ts`
- Modify: `packages/leash-core/src/index.ts`
- Test: `packages/leash-core/src/x402-caps.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface X402Allowance { allowanceUsdCent: number; periodSeconds: number }
  export function validateX402Caps(spec: PolicySpec, allowance: X402Allowance): string[]
  ```
  Returns a list of human-readable violations; empty list means valid. Used by leashd at startup (Task 7) and by the policies API (Task 10).

- [ ] **Step 1: Write the failing test**

```ts
// packages/leash-core/src/x402-caps.test.ts
import { describe, it, expect } from "vitest";
import { validateX402Caps } from "./x402-caps";
import type { PolicySpec } from "./types";

const base: PolicySpec = {
  version: 1, defaultDecision: "deny", budgets: [], timezone: "UTC",
  timeWindows: [], killSwitch: false, gradedState: "normal", rails: ["x402"],
};
const day = { allowanceUsdCent: 500, periodSeconds: 86_400 };

describe("validateX402Caps", () => {
  it("passes when every usd_cent cap fits inside the allowance", () => {
    const spec = { ...base, perTxMax: { unit: "usd_cent" as const, value: 50 },
      budgets: [{ window: "day" as const, cap: { unit: "usd_cent" as const, value: 500 } }] };
    expect(validateX402Caps(spec, day)).toEqual([]);
  });
  it("rejects a per-tx max above the allowance", () => {
    const spec = { ...base, perTxMax: { unit: "usd_cent" as const, value: 600 } };
    expect(validateX402Caps(spec, day)).toEqual([
      "perTxMax 600 usd_cent exceeds on-chain allowance 500 usd_cent per period",
    ]);
  });
  it("rejects a budget window longer than or equal to the period whose cap exceeds the allowance", () => {
    const spec = { ...base, budgets: [{ window: "day" as const, cap: { unit: "usd_cent" as const, value: 501 } }] };
    expect(validateX402Caps(spec, day)).toHaveLength(1);
  });
  it("ignores sat caps and windows shorter than the period", () => {
    const spec = { ...base,
      perTxMax: { unit: "sat" as const, value: 10_000 },
      budgets: [{ window: "hour" as const, cap: { unit: "usd_cent" as const, value: 10_000 } }] };
    expect(validateX402Caps(spec, day)).toEqual([]);
  });
  it("is a no-op when the policy does not include the x402 rail", () => {
    const spec = { ...base, rails: ["cashu" as const], perTxMax: { unit: "usd_cent" as const, value: 9_999 } };
    expect(validateX402Caps(spec, day)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/leash-core test`
Expected: FAIL, module `./x402-caps` not found.

- [ ] **Step 3: Write the implementation**

```ts
// packages/leash-core/src/x402-caps.ts
import type { PolicySpec, BudgetWindow } from "./types";

export interface X402Allowance {
  allowanceUsdCent: number;
  periodSeconds: number;
}

const WINDOW_SECONDS: Record<BudgetWindow, number | undefined> = {
  task: undefined, // unbounded in time; compared against the allowance directly below
  hour: 3_600,
  day: 86_400,
  month: 30 * 86_400,
};

/**
 * The on-chain allowance is the outer wall; the Leash policy must fit inside it.
 * Only usd_cent caps on a policy that includes the x402 rail are checked. A
 * budget window at least as long as the permission period may not exceed the
 * allowance; shorter windows may (they are refilled within one period).
 */
export function validateX402Caps(spec: PolicySpec, allowance: X402Allowance): string[] {
  const usesX402 = spec.rails.length === 0 || spec.rails.includes("x402");
  if (!usesX402) return [];
  const errors: string[] = [];
  const wall = `on-chain allowance ${allowance.allowanceUsdCent} usd_cent per period`;

  if (spec.perTxMax?.unit === "usd_cent" && spec.perTxMax.value > allowance.allowanceUsdCent) {
    errors.push(`perTxMax ${spec.perTxMax.value} usd_cent exceeds ${wall}`);
  }
  for (const b of spec.budgets) {
    if (b.cap.unit !== "usd_cent") continue;
    const seconds = WINDOW_SECONDS[b.window];
    const coversPeriod = seconds === undefined || seconds >= allowance.periodSeconds;
    if (coversPeriod && b.cap.value > allowance.allowanceUsdCent) {
      errors.push(`${b.window} budget ${b.cap.value} usd_cent exceeds ${wall}`);
    }
  }
  return errors;
}
```

Then in `packages/leash-core/src/index.ts` add:

```ts
export * from "./x402-caps";
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @repo/leash-core test`
Expected: PASS (all five).

- [ ] **Step 5: Commit**

```bash
git add packages/leash-core/src/x402-caps.ts packages/leash-core/src/x402-caps.test.ts packages/leash-core/src/index.ts
git commit -m "feat(core): validate x402 policy caps against the on-chain allowance"
```

---

### Task 3: leashd x402 config block

**Files:**
- Modify: `packages/leashd/src/config.ts`
- Test: `packages/leashd/src/config.test.ts` (new)

**Interfaces:**
- Produces on `LeashConfig`:
  ```ts
  x402?: {
    network: string;                       // CAIP-2, e.g. "eip155:8453"
    privateKey: `0x${string}`;             // agent EOA, secret
    rpcUrl: string;
    funding: "base-spend-permission" | "manual";
    permissionPath?: string;               // required when funding = base-spend-permission
    ownerAddress?: `0x${string}`;          // drain target; defaults to permission.account
  }
  ```
  Env names: `LEASH_X402_NETWORK`, `LEASH_X402_PRIVATE_KEY`, `LEASH_X402_RPC_URL`, `LEASH_X402_FUNDING`, `LEASH_X402_PERMISSION_PATH`, `LEASH_X402_OWNER_ADDRESS`. File config keys: `x402Network`, `x402PrivateKey`, `x402RpcUrl`, `x402Funding`, `x402PermissionPath`, `x402OwnerAddress`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/leashd/src/config.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadConfig } from "./config";

const BASE_ENV = {
  LEASH_CONTROL_PLANE_URL: "https://leashd.dev",
  LEASH_WORKSPACE_ID: "ws",
  LEASH_AGENT_ID: "ag",
  LEASH_AGENT_TOKEN: "lsh_x",
};
const KEY = "0x" + "11".repeat(32);

let home: string;
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), "leashd-cfg-"));
  process.env.LEASH_HOME = home;
  Object.assign(process.env, BASE_ENV);
  for (const k of Object.keys(process.env)) if (k.startsWith("LEASH_X402_")) delete process.env[k];
});
afterEach(() => rmSync(home, { recursive: true, force: true }));

describe("x402 config", () => {
  it("is absent when no x402 env or file keys are set", () => {
    expect(loadConfig().x402).toBeUndefined();
  });
  it("loads a base-spend-permission block from env", () => {
    process.env.LEASH_X402_NETWORK = "eip155:8453";
    process.env.LEASH_X402_PRIVATE_KEY = KEY;
    process.env.LEASH_X402_RPC_URL = "https://mainnet.base.org";
    process.env.LEASH_X402_FUNDING = "base-spend-permission";
    process.env.LEASH_X402_PERMISSION_PATH = "/tmp/perm.json";
    expect(loadConfig().x402).toEqual({
      network: "eip155:8453", privateKey: KEY, rpcUrl: "https://mainnet.base.org",
      funding: "base-spend-permission", permissionPath: "/tmp/perm.json", ownerAddress: undefined,
    });
  });
  it("defaults funding to manual and rejects base-spend-permission without a permission path", () => {
    process.env.LEASH_X402_NETWORK = "eip155:8453";
    process.env.LEASH_X402_PRIVATE_KEY = KEY;
    process.env.LEASH_X402_RPC_URL = "https://mainnet.base.org";
    expect(loadConfig().x402?.funding).toBe("manual");
    process.env.LEASH_X402_FUNDING = "base-spend-permission";
    expect(() => loadConfig()).toThrow(/LEASH_X402_PERMISSION_PATH/);
  });
  it("reads the same keys from config.json", () => {
    writeFileSync(join(home, "config.json"), JSON.stringify({
      x402Network: "eip155:84532", x402PrivateKey: KEY, x402RpcUrl: "https://sepolia.base.org",
    }));
    expect(loadConfig().x402?.network).toBe("eip155:84532");
  });
  it("rejects a malformed private key", () => {
    process.env.LEASH_X402_NETWORK = "eip155:8453";
    process.env.LEASH_X402_PRIVATE_KEY = "not-a-key";
    process.env.LEASH_X402_RPC_URL = "https://mainnet.base.org";
    expect(() => loadConfig()).toThrow(/LEASH_X402_PRIVATE_KEY/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/leashd test -- config`
Expected: FAIL, `x402` is not on the config type / never populated.

- [ ] **Step 3: Implement**

In `packages/leashd/src/config.ts`:

Add to `FileConfig` (inside the `z.object({...})`):

```ts
    x402Network: z.string().optional(),
    x402PrivateKey: z.string().optional(),
    x402RpcUrl: z.string().url().optional(),
    x402Funding: z.enum(["base-spend-permission", "manual"]).optional(),
    x402PermissionPath: z.string().optional(),
    x402OwnerAddress: z.string().optional(),
```

Add after the `LeashConfig` interface:

```ts
export type X402Funding = "base-spend-permission" | "manual";

export interface X402Config {
  /** CAIP-2 network id, e.g. "eip155:8453". */
  network: string;
  /** Agent EOA private key. Secret. Holds at most one period's allowance. */
  privateKey: `0x${string}`;
  rpcUrl: string;
  funding: X402Funding;
  /** Signed Base Account spend permission JSON (from the grant page). */
  permissionPath?: string;
  /** Where `x402 drain` sends leftovers. Defaults to the permission's account. */
  ownerAddress?: `0x${string}`;
}
```

Add `x402?: X402Config;` to `LeashConfig`, and this helper above `loadConfig`:

```ts
const HEX32 = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;

function loadX402(file: FileConfig): X402Config | undefined {
  const network = process.env.LEASH_X402_NETWORK ?? file.x402Network;
  const privateKey = process.env.LEASH_X402_PRIVATE_KEY ?? file.x402PrivateKey;
  const rpcUrl = process.env.LEASH_X402_RPC_URL ?? file.x402RpcUrl;
  if (!network && !privateKey && !rpcUrl) return undefined;

  if (!network) throw new Error("missing required config: LEASH_X402_NETWORK");
  if (!privateKey || !HEX32.test(privateKey))
    throw new Error("invalid config: LEASH_X402_PRIVATE_KEY must be a 0x-prefixed 32-byte hex key");
  if (!rpcUrl) throw new Error("missing required config: LEASH_X402_RPC_URL");

  const fundingRaw = process.env.LEASH_X402_FUNDING ?? file.x402Funding ?? "manual";
  if (fundingRaw !== "base-spend-permission" && fundingRaw !== "manual")
    throw new Error(`invalid config: LEASH_X402_FUNDING must be base-spend-permission or manual, got ${fundingRaw}`);
  const permissionPath = process.env.LEASH_X402_PERMISSION_PATH ?? file.x402PermissionPath;
  if (fundingRaw === "base-spend-permission" && !permissionPath)
    throw new Error("missing required config: LEASH_X402_PERMISSION_PATH (funding=base-spend-permission)");

  const ownerRaw = process.env.LEASH_X402_OWNER_ADDRESS ?? file.x402OwnerAddress;
  if (ownerRaw && !ADDRESS.test(ownerRaw))
    throw new Error("invalid config: LEASH_X402_OWNER_ADDRESS must be a 0x address");

  return {
    network,
    privateKey: privateKey as `0x${string}`,
    rpcUrl,
    funding: fundingRaw,
    permissionPath,
    ownerAddress: ownerRaw as `0x${string}` | undefined,
  };
}
```

And in the object returned by `loadConfig()` add `x402: loadX402(file),`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @repo/leashd test -- config`
Expected: PASS (5).

- [ ] **Step 5: Commit**

```bash
git add packages/leashd/src/config.ts packages/leashd/src/config.test.ts
git commit -m "feat(leashd): x402 configuration block"
```

---

### Task 4: FundingSource interface and the manual source

**Files:**
- Create: `packages/leashd/src/rails/funding/types.ts`
- Create: `packages/leashd/src/rails/funding/manual.ts`
- Test: `packages/leashd/src/rails/funding/manual.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface FundingResult { ok: boolean; pulled?: Amount; txHash?: `0x${string}`; error?: string }
  export interface FundingSource {
    readonly kind: "base-spend-permission" | "manual";
    topUp(amount: Amount): Promise<FundingResult>;
    remaining(): Promise<Amount>;
    periodEndsAt(): Promise<number | undefined>;
  }
  export interface Erc20Reader { balanceOf(owner: `0x${string}`): Promise<bigint> }
  export function createManualFunding(opts: { agentAddress: `0x${string}`; usdc: Erc20Reader }): FundingSource
  ```
  `Erc20Reader` is the one seam every funding source and the adapter use to read balances, so tests never touch a chain.

- [ ] **Step 1: Write the failing test**

```ts
// packages/leashd/src/rails/funding/manual.test.ts
import { describe, it, expect } from "vitest";
import { createManualFunding } from "./manual";

const agent = ("0x" + "ab".repeat(20)) as `0x${string}`;

describe("manual funding", () => {
  it("reports the agent balance as the remaining allowance, in usd_cent", async () => {
    const f = createManualFunding({ agentAddress: agent, usdc: { balanceOf: async () => 1_230_000n } });
    expect(await f.remaining()).toEqual({ unit: "usd_cent", value: 123 });
  });
  it("cannot top up and says how to fund", async () => {
    const f = createManualFunding({ agentAddress: agent, usdc: { balanceOf: async () => 0n } });
    const r = await f.topUp({ unit: "usd_cent", value: 5 });
    expect(r.ok).toBe(false);
    expect(r.error).toContain(agent);
  });
  it("has no period", async () => {
    const f = createManualFunding({ agentAddress: agent, usdc: { balanceOf: async () => 0n } });
    expect(await f.periodEndsAt()).toBeUndefined();
  });
  it("floors sub-cent dust", async () => {
    const f = createManualFunding({ agentAddress: agent, usdc: { balanceOf: async () => 19_999n } });
    expect(await f.remaining()).toEqual({ unit: "usd_cent", value: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/leashd test -- manual`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
// packages/leashd/src/rails/funding/types.ts
import type { Amount } from "@repo/leash-core";

export interface FundingResult {
  ok: boolean;
  /** What was actually pulled into the agent key (usd_cent). */
  pulled?: Amount;
  txHash?: `0x${string}`;
  error?: string;
}

/**
 * Where the agent key's USDC comes from. The chain-level budget lives here;
 * the Leash policy is the finer layer on top. Implementations resolve, never
 * throw, and never hold anything but the agent key's own funds.
 */
export interface FundingSource {
  readonly kind: "base-spend-permission" | "manual";
  /** Pull up to `amount` (usd_cent) into the agent key. */
  topUp(amount: Amount): Promise<FundingResult>;
  /** Remaining allowance in the current period (usd_cent). */
  remaining(): Promise<Amount>;
  /** Unix seconds when the current period ends; undefined when not periodic. */
  periodEndsAt(): Promise<number | undefined>;
}

/** Minimal ERC-20 read seam so funding sources and tests share one shape. */
export interface Erc20Reader {
  balanceOf(owner: `0x${string}`): Promise<bigint>;
}

/** USDC has 6 decimals; leash-core counts US cents. */
export const ATOMIC_PER_CENT = 10_000n;

export function atomicToCents(atomic: bigint): number {
  return Number(atomic / ATOMIC_PER_CENT);
}

export function centsToAtomic(cents: number): bigint {
  return BigInt(cents) * ATOMIC_PER_CENT;
}
```

```ts
// packages/leashd/src/rails/funding/manual.ts
import type { Amount } from "@repo/leash-core";
import { atomicToCents, type Erc20Reader, type FundingResult, type FundingSource } from "./types";

/**
 * No automatic pull: the owner transfers USDC to the agent address by hand and
 * the balance is the cap. Used where no SpendPermissionManager is deployed.
 */
export function createManualFunding(opts: {
  agentAddress: `0x${string}`;
  usdc: Erc20Reader;
}): FundingSource {
  return {
    kind: "manual",
    async topUp(amount: Amount): Promise<FundingResult> {
      return {
        ok: false,
        error: `manual funding: transfer at least ${amount.value} usd_cent of USDC to ${opts.agentAddress}`,
      };
    },
    async remaining(): Promise<Amount> {
      return { unit: "usd_cent", value: atomicToCents(await opts.usdc.balanceOf(opts.agentAddress)) };
    },
    async periodEndsAt() {
      return undefined;
    },
  };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @repo/leashd test -- manual`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add packages/leashd/src/rails/funding/types.ts packages/leashd/src/rails/funding/manual.ts packages/leashd/src/rails/funding/manual.test.ts
git commit -m "feat(leashd): FundingSource interface and manual funding"
```

---

### Task 5: Base Account spend-permission funding source

**Files:**
- Create: `packages/leashd/src/rails/funding/spend-permission-manager.ts`
- Create: `packages/leashd/src/rails/funding/base-spend-permission.ts`
- Test: `packages/leashd/src/rails/funding/base-spend-permission.test.ts`
- Modify: `packages/leashd/package.json` (add `viem`)

**Interfaces:**
- Consumes: `FundingSource`, `Erc20Reader`, `centsToAtomic`, `atomicToCents` from Task 4.
- Produces:
  ```ts
  // spend-permission-manager.ts
  export interface SpendPermission { account; spender; token; allowance: bigint; period: number; start: number; end: number; salt: bigint; extraData: `0x${string}` }
  export interface SignedSpendPermission { chainId: number; permissionHash: `0x${string}`; signature: `0x${string}`; permission: SpendPermission }
  export const SPEND_PERMISSION_MANAGER: Record<number, `0x${string}`>   // chainId -> address, from docs/x402-spikes.md
  export const spendPermissionManagerAbi                                  // spend, approveWithSignature, getCurrentPeriod, isValid
  export function parseSignedPermission(json: string): SignedSpendPermission
  // base-spend-permission.ts
  export interface ChainWriter { sendCall(to, data): Promise<`0x${string}`>; readCurrentPeriod(p): Promise<{ start; end; spend: bigint }>; isApproved(hash): Promise<boolean> }
  export function createBaseSpendPermissionFunding(opts: { permission: SignedSpendPermission; agentAddress; usdc: Erc20Reader; chain: ChainWriter; now?: () => number }): FundingSource
  ```
  `ChainWriter` is the seam; the viem-backed implementation lives in Task 7 (`cli.ts` wiring) so this module stays unit-testable.

- [ ] **Step 1: Add viem**

Run: `pnpm --filter @repo/leashd add viem`
Expected: `viem` appears under `dependencies` in `packages/leashd/package.json`.

- [ ] **Step 2: Write the failing test**

```ts
// packages/leashd/src/rails/funding/base-spend-permission.test.ts
import { describe, it, expect, vi } from "vitest";
import { createBaseSpendPermissionFunding, type ChainWriter } from "./base-spend-permission";
import { parseSignedPermission, type SignedSpendPermission } from "./spend-permission-manager";

const agent = ("0x" + "ab".repeat(20)) as `0x${string}`;
const owner = ("0x" + "cd".repeat(20)) as `0x${string}`;
const usdcAddr = ("0x" + "ef".repeat(20)) as `0x${string}`;

const permission: SignedSpendPermission = {
  chainId: 8453,
  permissionHash: ("0x" + "01".repeat(32)) as `0x${string}`,
  signature: ("0x" + "02".repeat(65)) as `0x${string}`,
  permission: {
    account: owner, spender: agent, token: usdcAddr,
    allowance: 5_000_000n, // 5 USD per period
    period: 86_400, start: 1_000, end: 2_000_000_000, salt: 0n, extraData: "0x",
  },
};

function chain(over: Partial<ChainWriter> = {}): ChainWriter & { sendCall: ReturnType<typeof vi.fn> } {
  return {
    sendCall: vi.fn(async () => ("0x" + "aa".repeat(32)) as `0x${string}`),
    readCurrentPeriod: async () => ({ start: 1_000, end: 87_400, spend: 1_000_000n }),
    isApproved: async () => true,
    ...over,
  } as ChainWriter & { sendCall: ReturnType<typeof vi.fn> };
}

describe("base spend permission funding", () => {
  it("reports remaining allowance for the current period in usd_cent", async () => {
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: chain() });
    expect(await f.remaining()).toEqual({ unit: "usd_cent", value: 400 });
    expect(await f.periodEndsAt()).toBe(87_400);
  });
  it("pulls exactly the requested amount when it fits", async () => {
    const c = chain();
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: c });
    const r = await f.topUp({ unit: "usd_cent", value: 150 });
    expect(r).toMatchObject({ ok: true, pulled: { unit: "usd_cent", value: 150 } });
    expect(c.sendCall).toHaveBeenCalledTimes(1);
  });
  it("refuses to pull more than the period remainder", async () => {
    const c = chain();
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: c });
    const r = await f.topUp({ unit: "usd_cent", value: 401 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/exceeds remaining allowance 400/);
    expect(c.sendCall).not.toHaveBeenCalled();
  });
  it("prepends approveWithSignature when the permission is not yet registered", async () => {
    const c = chain({ isApproved: async () => false });
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: c });
    await f.topUp({ unit: "usd_cent", value: 1 });
    expect(c.sendCall).toHaveBeenCalledTimes(2);
  });
  it("refuses outside the permission's validity window", async () => {
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: chain(), now: () => 2_000_000_001 });
    const r = await f.topUp({ unit: "usd_cent", value: 1 });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/expired/);
  });
  it("resolves chain errors instead of throwing", async () => {
    const c = chain({ sendCall: vi.fn(async () => { throw new Error("rpc down"); }) });
    const f = createBaseSpendPermissionFunding({ permission, agentAddress: agent,
      usdc: { balanceOf: async () => 0n }, chain: c });
    expect(await f.topUp({ unit: "usd_cent", value: 1 })).toEqual({ ok: false, error: "rpc down" });
  });
  it("parses the grant page JSON and rejects a spender mismatch at construction", () => {
    const json = JSON.stringify({ ...permission, permission: { ...permission.permission,
      allowance: "5000000", salt: "0" } });
    const parsed = parseSignedPermission(json);
    expect(parsed.permission.allowance).toBe(5_000_000n);
    expect(() => createBaseSpendPermissionFunding({ permission: parsed,
      agentAddress: owner, usdc: { balanceOf: async () => 0n }, chain: chain() }))
      .toThrow(/spender/);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @repo/leashd test -- base-spend`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement the manager binding**

Copy the struct order and function signatures you recorded in `docs/x402-spikes.md` step 4. The shape below matches the documented contract; if the docs differ, the docs win.

```ts
// packages/leashd/src/rails/funding/spend-permission-manager.ts
import { encodeFunctionData, parseAbi } from "viem";
import { z } from "zod";

export interface SpendPermission {
  account: `0x${string}`;
  spender: `0x${string}`;
  token: `0x${string}`;
  allowance: bigint;
  period: number;
  start: number;
  end: number;
  salt: bigint;
  extraData: `0x${string}`;
}

export interface SignedSpendPermission {
  chainId: number;
  permissionHash: `0x${string}`;
  signature: `0x${string}`;
  permission: SpendPermission;
}

/** chainId -> SpendPermissionManager. Fill from docs/x402-spikes.md step 1. */
export const SPEND_PERMISSION_MANAGER: Record<number, `0x${string}`> = {
  8453: "0x<FROM_SPIKES>",
  84532: "0x<FROM_SPIKES>",
};

export const spendPermissionManagerAbi = parseAbi([
  "struct SpendPermission { address account; address spender; address token; uint160 allowance; uint48 period; uint48 start; uint48 end; uint256 salt; bytes extraData; }",
  "struct PeriodSpend { uint48 start; uint48 end; uint160 spend; }",
  "function approveWithSignature(SpendPermission spendPermission, bytes signature) returns (bool)",
  "function spend(SpendPermission spendPermission, uint160 value)",
  "function getCurrentPeriod(SpendPermission spendPermission) view returns (PeriodSpend)",
  "function isValid(bytes32 hash) view returns (bool)",
]);

const Hex = z.string().regex(/^0x[0-9a-fA-F]*$/);
const Address = z.string().regex(/^0x[0-9a-fA-F]{40}$/);
const BigIntString = z.union([z.string().regex(/^\d+$/), z.number().int().nonnegative()]).transform((v) => BigInt(v));

const SignedSpendPermissionJson = z.object({
  chainId: z.number().int().positive(),
  permissionHash: Hex,
  signature: Hex,
  permission: z.object({
    account: Address, spender: Address, token: Address,
    allowance: BigIntString,
    period: z.number().int().positive(),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
    salt: BigIntString,
    extraData: Hex.default("0x"),
  }),
});

/** The grant page serialises bigints as decimal strings; this is the inverse. */
export function parseSignedPermission(json: string): SignedSpendPermission {
  const p = SignedSpendPermissionJson.parse(JSON.parse(json));
  return {
    chainId: p.chainId,
    permissionHash: p.permissionHash as `0x${string}`,
    signature: p.signature as `0x${string}`,
    permission: {
      account: p.permission.account as `0x${string}`,
      spender: p.permission.spender as `0x${string}`,
      token: p.permission.token as `0x${string}`,
      allowance: p.permission.allowance,
      period: p.permission.period,
      start: p.permission.start,
      end: p.permission.end,
      salt: p.permission.salt,
      extraData: p.permission.extraData as `0x${string}`,
    },
  };
}

export function encodeApprove(p: SignedSpendPermission): `0x${string}` {
  return encodeFunctionData({ abi: spendPermissionManagerAbi, functionName: "approveWithSignature",
    args: [p.permission, p.signature] });
}

export function encodeSpend(p: SignedSpendPermission, value: bigint): `0x${string}` {
  return encodeFunctionData({ abi: spendPermissionManagerAbi, functionName: "spend",
    args: [p.permission, value] });
}
```

Replace both `0x<FROM_SPIKES>` with the addresses from `docs/x402-spikes.md`. If Ethereum mainnet (chainId 1) is deployed, add it.

- [ ] **Step 5: Implement the funding source**

```ts
// packages/leashd/src/rails/funding/base-spend-permission.ts
import type { Amount } from "@repo/leash-core";
import { atomicToCents, centsToAtomic, type Erc20Reader, type FundingResult, type FundingSource } from "./types";
import { encodeApprove, encodeSpend, SPEND_PERMISSION_MANAGER, type SignedSpendPermission } from "./spend-permission-manager";

/** Chain access the funding source needs; the viem implementation lives in cli.ts. */
export interface ChainWriter {
  /** Send a call from the agent key; resolves the tx hash after inclusion. */
  sendCall(to: `0x${string}`, data: `0x${string}`): Promise<`0x${string}`>;
  readCurrentPeriod(p: SignedSpendPermission): Promise<{ start: number; end: number; spend: bigint }>;
  isApproved(permissionHash: `0x${string}`): Promise<boolean>;
}

/**
 * The owner's Base Account granted `allowance` USDC per `period` to the agent
 * key. We pull only what a policy-approved payment needs, never in advance, and
 * never past the period remainder. The chain enforces the wall; this is the door.
 */
export function createBaseSpendPermissionFunding(opts: {
  permission: SignedSpendPermission;
  agentAddress: `0x${string}`;
  usdc: Erc20Reader;
  chain: ChainWriter;
  now?: () => number; // unix seconds
}): FundingSource {
  const { permission, chain } = opts;
  const now = opts.now ?? (() => Math.floor(Date.now() / 1000));
  if (permission.permission.spender.toLowerCase() !== opts.agentAddress.toLowerCase()) {
    throw new Error(`spend permission spender ${permission.permission.spender} is not the agent key ${opts.agentAddress}`);
  }
  const manager = SPEND_PERMISSION_MANAGER[permission.chainId];
  if (!manager) throw new Error(`no SpendPermissionManager known for chainId ${permission.chainId}`);

  async function remainingAtomic(): Promise<bigint> {
    const period = await chain.readCurrentPeriod(permission);
    const left = permission.permission.allowance - period.spend;
    return left > 0n ? left : 0n;
  }

  return {
    kind: "base-spend-permission",
    async remaining(): Promise<Amount> {
      return { unit: "usd_cent", value: atomicToCents(await remainingAtomic()) };
    },
    async periodEndsAt() {
      return (await chain.readCurrentPeriod(permission)).end;
    },
    async topUp(amount: Amount): Promise<FundingResult> {
      try {
        const t = now();
        if (t < permission.permission.start) return { ok: false, error: "spend permission not yet valid" };
        if (t >= permission.permission.end) return { ok: false, error: "spend permission expired" };
        const want = centsToAtomic(amount.value);
        const left = await remainingAtomic();
        if (want > left) {
          return { ok: false, error: `top-up ${amount.value} usd_cent exceeds remaining allowance ${atomicToCents(left)} usd_cent this period` };
        }
        let txHash: `0x${string}` | undefined;
        if (!(await chain.isApproved(permission.permissionHash))) {
          await chain.sendCall(manager, encodeApprove(permission));
        }
        txHash = await chain.sendCall(manager, encodeSpend(permission, want));
        return { ok: true, pulled: amount, txHash };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
```

- [ ] **Step 6: Run tests and typecheck**

Run: `pnpm --filter @repo/leashd test -- base-spend && pnpm --filter @repo/leashd typecheck`
Expected: PASS (7), typecheck clean.

- [ ] **Step 7: Commit**

```bash
git add packages/leashd/package.json pnpm-lock.yaml packages/leashd/src/rails/funding/
git commit -m "feat(leashd): Base Account spend-permission funding source"
```

---

### Task 6: The x402 rail adapter

**Files:**
- Create: `packages/leashd/src/rails/x402.ts`
- Test: `packages/leashd/src/rails/x402.test.ts`
- Modify: `packages/leashd/package.json` (add `@x402/fetch`, `@x402/evm`)

**Interfaces:**
- Consumes: `FundingSource`, `Erc20Reader`, `centsToAtomic` (Task 4); `RailAdapter`, `RailResult` (`rails/types.ts`).
- Produces:
  ```ts
  export interface PaymentRequirement { scheme: string; network: string; asset: string; amount: string; payTo?: string }
  export function selectRequirement(accepts: PaymentRequirement[], network: string, usdcAddress: string, ceilingAtomic: bigint): PaymentRequirement
  export type PaidFetch = (url: string, init?: RequestInit) => Promise<Response>
  export function createX402Adapter(opts: {
    network: string; agentAddress: `0x${string}`; usdcAddress: `0x${string}`;
    usdc: Erc20Reader; funding: FundingSource;
    /** Builds a fetch that pays up to `ceilingAtomic`. Production: @x402/fetch; tests: a stub. */
    makePaidFetch: (ceilingAtomic: bigint) => PaidFetch;
    decodeSettlement: (header: string) => { success: boolean; transaction?: string };
  }): RailAdapter
  ```

- [ ] **Step 1: Add x402 packages**

Run: `pnpm --filter @repo/leashd add @x402/fetch @x402/evm`
Expected: both under `dependencies`. If the package names differ from the x402 foundation README (`typescript/packages/http/fetch/README.md`), use the names the README gives and record the change in `docs/x402-spikes.md`.

- [ ] **Step 2: Write the failing test**

```ts
// packages/leashd/src/rails/x402.test.ts
import { describe, it, expect, vi } from "vitest";
import type { PaymentRequest } from "@repo/leash-core";
import { createX402Adapter, selectRequirement, type PaymentRequirement } from "./x402";
import type { FundingSource } from "./funding/types";

const agent = ("0x" + "ab".repeat(20)) as `0x${string}`;
const usdc = ("0x" + "ef".repeat(20)) as `0x${string}`;
const NET = "eip155:8453";

function req(over: Partial<PaymentRequest> = {}): PaymentRequest {
  return { agentId: "a1", rail: "x402", amount: { unit: "usd_cent", value: 2 },
    endpoint: "https://api.example.com/paid", ts: 1, ...over };
}

function funding(over: Partial<FundingSource> = {}): FundingSource & { topUp: ReturnType<typeof vi.fn> } {
  return {
    kind: "base-spend-permission",
    topUp: vi.fn(async (amount) => ({ ok: true, pulled: amount })),
    remaining: async () => ({ unit: "usd_cent", value: 500 }),
    periodEndsAt: async () => undefined,
    ...over,
  } as FundingSource & { topUp: ReturnType<typeof vi.fn> };
}

function okResponse(tx = "0xtx"): Response {
  return new Response("{}", { status: 200, headers: { "PAYMENT-RESPONSE": "hdr" } });
}

const settlementOk = () => ({ success: true, transaction: "0xtx" });

describe("selectRequirement", () => {
  const accepts: PaymentRequirement[] = [
    { scheme: "exact", network: "eip155:1", asset: usdc, amount: "10000" },
    { scheme: "exact", network: NET, asset: usdc, amount: "10000" },
  ];
  it("picks the exact USDC requirement on the configured network", () => {
    expect(selectRequirement(accepts, NET, usdc, 20_000n).network).toBe(NET);
  });
  it("throws when the server asks for more than the policy approved", () => {
    expect(() => selectRequirement(accepts, NET, usdc, 9_999n)).toThrow(/exceeds policy-approved/);
  });
  it("throws when nothing matches the network or asset", () => {
    expect(() => selectRequirement(accepts, "eip155:10", usdc, 20_000n)).toThrow(/no exact USDC requirement/);
  });
});

describe("x402 adapter", () => {
  it("pays without a top-up when the agent key already holds enough", async () => {
    const f = funding();
    const paid = vi.fn(async () => okResponse());
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 1_000_000n }, funding: f,
      makePaidFetch: () => paid, decodeSettlement: settlementOk });
    const r = await a.pay(req());
    expect(r).toEqual({ ok: true, ref: "0xtx", settledAmount: { unit: "usd_cent", value: 2 } });
    expect(f.topUp).not.toHaveBeenCalled();
  });
  it("tops up exactly the shortfall before paying", async () => {
    const f = funding();
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 5_000n }, funding: f,
      makePaidFetch: () => async () => okResponse(), decodeSettlement: settlementOk });
    await a.pay(req({ amount: { unit: "usd_cent", value: 3 } }));
    expect(f.topUp).toHaveBeenCalledWith({ unit: "usd_cent", value: 3 }); // 30000 - 5000 atomic = 2.5 cents, rounded up
  });
  it("denies when the top-up fails and does not call the endpoint", async () => {
    const f = funding({ topUp: vi.fn(async () => ({ ok: false, error: "expired" })) });
    const paid = vi.fn(async () => okResponse());
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 0n }, funding: f,
      makePaidFetch: () => paid, decodeSettlement: settlementOk });
    expect(await a.pay(req())).toEqual({ ok: false, error: "funding failed: expired" });
    expect(paid).not.toHaveBeenCalled();
  });
  it("hands the policy ceiling to the paid fetch", async () => {
    const make = vi.fn(() => async () => okResponse());
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 1_000_000n }, funding: funding(),
      makePaidFetch: make, decodeSettlement: settlementOk });
    await a.pay(req({ amount: { unit: "usd_cent", value: 7 } }));
    expect(make).toHaveBeenCalledWith(70_000n);
  });
  it("rejects sat amounts and missing endpoints", async () => {
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 0n }, funding: funding(),
      makePaidFetch: () => async () => okResponse(), decodeSettlement: settlementOk });
    expect((await a.pay(req({ amount: { unit: "sat", value: 1 } }))).ok).toBe(false);
    expect((await a.pay(req({ endpoint: undefined }))).ok).toBe(false);
  });
  it("reports a failed settlement and non-2xx responses as errors, never throws", async () => {
    const a = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 1_000_000n }, funding: funding(),
      makePaidFetch: () => async () => new Response("", { status: 402 }),
      decodeSettlement: settlementOk });
    expect(await a.pay(req())).toEqual({ ok: false, error: "x402 endpoint returned 402" });
    const b = createX402Adapter({ network: NET, agentAddress: agent, usdcAddress: usdc,
      usdc: { balanceOf: async () => 1_000_000n }, funding: funding(),
      makePaidFetch: () => async () => { throw new Error("boom"); }, decodeSettlement: settlementOk });
    expect(await b.pay(req())).toEqual({ ok: false, error: "boom" });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @repo/leashd test -- x402`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement**

```ts
// packages/leashd/src/rails/x402.ts
import type { PaymentRequest } from "@repo/leash-core";
import type { RailAdapter, RailResult } from "./types";
import { ATOMIC_PER_CENT, centsToAtomic, type Erc20Reader, type FundingSource } from "./funding/types";

/** The subset of an x402 PaymentRequired.accepts[] entry we decide on. */
export interface PaymentRequirement {
  scheme: string;
  network: string;
  asset: string;
  /** Atomic units as a decimal string (USDC: 6 decimals). */
  amount: string;
  payTo?: string;
}

export type PaidFetch = (url: string, init?: RequestInit) => Promise<Response>;

/**
 * Anti tool-description poisoning: the amount we will pay is the one the server
 * committed to in PAYMENT-REQUIRED, and it may never exceed what the policy
 * approved. Anything else is refused before a signature exists.
 */
export function selectRequirement(
  accepts: PaymentRequirement[],
  network: string,
  usdcAddress: string,
  ceilingAtomic: bigint
): PaymentRequirement {
  const match = accepts.find(
    (a) => a.scheme === "exact" && a.network === network && a.asset.toLowerCase() === usdcAddress.toLowerCase()
  );
  if (!match) throw new Error(`no exact USDC requirement for ${network}`);
  if (BigInt(match.amount) > ceilingAtomic) {
    throw new Error(`endpoint requires ${match.amount} atomic, exceeds policy-approved ${ceilingAtomic}`);
  }
  return match;
}

function ceilCents(atomic: bigint): number {
  return Number((atomic + ATOMIC_PER_CENT - 1n) / ATOMIC_PER_CENT);
}

export function createX402Adapter(opts: {
  network: string;
  agentAddress: `0x${string}`;
  usdcAddress: `0x${string}`;
  usdc: Erc20Reader;
  funding: FundingSource;
  makePaidFetch: (ceilingAtomic: bigint) => PaidFetch;
  decodeSettlement: (header: string) => { success: boolean; transaction?: string };
}): RailAdapter {
  return {
    rail: "x402",
    async pay(req: PaymentRequest): Promise<RailResult> {
      if (req.amount.unit !== "usd_cent") {
        return { ok: false, error: `x402 rail requires usd_cent amounts, got ${req.amount.unit}` };
      }
      if (!req.endpoint) return { ok: false, error: "x402 rail requires an endpoint URL" };

      try {
        const ceiling = centsToAtomic(req.amount.value);
        const balance = await opts.usdc.balanceOf(opts.agentAddress);
        if (balance < ceiling) {
          const topUp = await opts.funding.topUp({ unit: "usd_cent", value: ceilCents(ceiling - balance) });
          if (!topUp.ok) return { ok: false, error: `funding failed: ${topUp.error ?? "unknown"}` };
        }

        const res = await opts.makePaidFetch(ceiling)(req.endpoint);
        if (!res.ok) return { ok: false, error: `x402 endpoint returned ${res.status}` };

        const header = res.headers.get("PAYMENT-RESPONSE") ?? res.headers.get("X-PAYMENT-RESPONSE");
        const settlement = header ? opts.decodeSettlement(header) : undefined;
        if (settlement && !settlement.success) return { ok: false, error: "x402 settlement reported failure" };

        return { ok: true, ref: settlement?.transaction, settledAmount: req.amount };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
      }
    },
  };
}
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @repo/leashd test -- x402`
Expected: PASS (9).

- [ ] **Step 6: Commit**

```bash
git add packages/leashd/package.json pnpm-lock.yaml packages/leashd/src/rails/x402.ts packages/leashd/src/rails/x402.test.ts
git commit -m "feat(leashd): x402 rail adapter with policy ceiling and funding pull"
```

---

### Task 7: Wire the rail into leashd (viem chain writer, startup validation, budget report)

**Files:**
- Create: `packages/leashd/src/rails/x402-status.ts`
- Create: `packages/leashd/src/rails/x402-wiring.ts`
- Modify: `packages/leashd/src/cli.ts`
- Modify: `packages/leashd/src/mcp-server.ts:108-142`
- Test: `packages/leashd/src/rails/x402-status.test.ts`

**Interfaces:**
- Consumes: `X402Config` (Task 3), `createManualFunding`, `createBaseSpendPermissionFunding`, `ChainWriter`, `parseSignedPermission`, `createX402Adapter`, `validateX402Caps`.
- Produces:
  ```ts
  // x402-status.ts
  export interface X402Status { agentAddress; network; agentBalanceUsdCent: number; allowanceRemainingUsdCent: number; periodEndsAt?: number; funding: "base-spend-permission" | "manual" }
  export function createX402Status(opts: { agentAddress; network; usdc: Erc20Reader; funding: FundingSource }): () => Promise<X402Status>
  // x402-wiring.ts
  export interface X402Runtime { adapter: RailAdapter; status: () => Promise<X402Status>; allowance?: X402Allowance; drain: (to: `0x${string}`) => Promise<`0x${string}`> }
  export function buildX402Runtime(cfg: X402Config): X402Runtime
  ```
  `mcp-server.ts` `createMcpServer` gains an optional `x402Status?: () => Promise<X402Status>` dep.

- [ ] **Step 1: Write the failing status test**

```ts
// packages/leashd/src/rails/x402-status.test.ts
import { describe, it, expect } from "vitest";
import { createX402Status } from "./x402-status";

const agent = ("0x" + "ab".repeat(20)) as `0x${string}`;

describe("x402 status", () => {
  it("combines agent balance and funding remainder", async () => {
    const status = createX402Status({
      agentAddress: agent, network: "eip155:8453",
      usdc: { balanceOf: async () => 250_000n },
      funding: { kind: "manual", topUp: async () => ({ ok: false }), remaining: async () => ({ unit: "usd_cent", value: 400 }), periodEndsAt: async () => 99 },
    });
    expect(await status()).toEqual({
      agentAddress: agent, network: "eip155:8453", agentBalanceUsdCent: 25,
      allowanceRemainingUsdCent: 400, periodEndsAt: 99, funding: "manual",
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/leashd test -- x402-status`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement status**

```ts
// packages/leashd/src/rails/x402-status.ts
import { atomicToCents, type Erc20Reader, type FundingSource } from "./funding/types";

export interface X402Status {
  agentAddress: `0x${string}`;
  network: string;
  agentBalanceUsdCent: number;
  allowanceRemainingUsdCent: number;
  periodEndsAt?: number;
  funding: FundingSource["kind"];
}

export function createX402Status(opts: {
  agentAddress: `0x${string}`;
  network: string;
  usdc: Erc20Reader;
  funding: FundingSource;
}): () => Promise<X402Status> {
  return async () => {
    const [balance, remaining, periodEndsAt] = await Promise.all([
      opts.usdc.balanceOf(opts.agentAddress),
      opts.funding.remaining(),
      opts.funding.periodEndsAt(),
    ]);
    return {
      agentAddress: opts.agentAddress,
      network: opts.network,
      agentBalanceUsdCent: atomicToCents(balance),
      allowanceRemainingUsdCent: remaining.value,
      periodEndsAt,
      funding: opts.funding.kind,
    };
  };
}
```

- [ ] **Step 4: Run the status test**

Run: `pnpm --filter @repo/leashd test -- x402-status`
Expected: PASS.

- [ ] **Step 5: Implement the wiring (viem, no unit test; covered by the Sepolia integration test in Task 14)**

```ts
// packages/leashd/src/rails/x402-wiring.ts
import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, erc20Abi, encodeFunctionData, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia, mainnet } from "viem/chains";
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader } from "@x402/fetch";
import { ExactEvmScheme } from "@x402/evm";
import type { X402Allowance } from "@repo/leash-core";
import type { X402Config } from "../config";
import type { RailAdapter } from "./types";
import { createX402Adapter, selectRequirement, type PaymentRequirement } from "./x402";
import { createX402Status, type X402Status } from "./x402-status";
import { createManualFunding } from "./funding/manual";
import { createBaseSpendPermissionFunding, type ChainWriter } from "./funding/base-spend-permission";
import { parseSignedPermission, spendPermissionManagerAbi, SPEND_PERMISSION_MANAGER } from "./funding/spend-permission-manager";
import { atomicToCents, type Erc20Reader, type FundingSource } from "./funding/types";

/** CAIP-2 -> viem chain + canonical USDC. Extend here for more EVM networks. */
const NETWORKS: Record<string, { chain: Chain; usdc: `0x${string}` }> = {
  "eip155:8453": { chain: base, usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" },
  "eip155:84532": { chain: baseSepolia, usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" },
  "eip155:1": { chain: mainnet, usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" },
};

export interface X402Runtime {
  adapter: RailAdapter;
  status: () => Promise<X402Status>;
  /** Present when funding is a spend permission; used for the startup cap check. */
  allowance?: X402Allowance;
  /** Send the agent key's whole USDC balance to `to`. Returns the tx hash. */
  drain: (to: `0x${string}`) => Promise<`0x${string}`>;
  ownerAddress?: `0x${string}`;
}

export function buildX402Runtime(cfg: X402Config): X402Runtime {
  const net = NETWORKS[cfg.network];
  if (!net) throw new Error(`unsupported x402 network ${cfg.network}; known: ${Object.keys(NETWORKS).join(", ")}`);

  const account = privateKeyToAccount(cfg.privateKey);
  const publicClient = createPublicClient({ chain: net.chain, transport: http(cfg.rpcUrl) });
  const walletClient = createWalletClient({ account, chain: net.chain, transport: http(cfg.rpcUrl) });

  const usdc: Erc20Reader = {
    balanceOf: (owner) => publicClient.readContract({ address: net.usdc, abi: erc20Abi, functionName: "balanceOf", args: [owner] }),
  };

  const chainWriter: ChainWriter = {
    async sendCall(to, data) {
      const hash = await walletClient.sendTransaction({ to, data });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    async readCurrentPeriod(p) {
      const manager = SPEND_PERMISSION_MANAGER[p.chainId];
      const r = await publicClient.readContract({ address: manager, abi: spendPermissionManagerAbi, functionName: "getCurrentPeriod", args: [p.permission] });
      return { start: Number(r.start), end: Number(r.end), spend: r.spend };
    },
    async isApproved(hash) {
      const manager = SPEND_PERMISSION_MANAGER[net.chain.id];
      return publicClient.readContract({ address: manager, abi: spendPermissionManagerAbi, functionName: "isValid", args: [hash] });
    },
  };

  let funding: FundingSource;
  let allowance: X402Allowance | undefined;
  let ownerAddress = cfg.ownerAddress;
  if (cfg.funding === "base-spend-permission") {
    const permission = parseSignedPermission(readFileSync(cfg.permissionPath as string, "utf8"));
    if (permission.chainId !== net.chain.id) {
      throw new Error(`spend permission is for chainId ${permission.chainId}, configured network is ${cfg.network}`);
    }
    funding = createBaseSpendPermissionFunding({ permission, agentAddress: account.address, usdc, chain: chainWriter });
    allowance = { allowanceUsdCent: atomicToCents(permission.permission.allowance), periodSeconds: permission.permission.period };
    ownerAddress ??= permission.permission.account;
  } else {
    funding = createManualFunding({ agentAddress: account.address, usdc });
  }

  const adapter = createX402Adapter({
    network: cfg.network,
    agentAddress: account.address,
    usdcAddress: net.usdc,
    usdc,
    funding,
    makePaidFetch: (ceilingAtomic) =>
      wrapFetchWithPaymentFromConfig(fetch, {
        schemes: [{ network: cfg.network, client: new ExactEvmScheme(account) }],
        paymentRequirementsSelector: (accepts: PaymentRequirement[]) =>
          selectRequirement(accepts, cfg.network, net.usdc, ceilingAtomic),
      }),
    decodeSettlement: (header) => {
      const d = decodePaymentResponseHeader(header);
      return { success: d.success, transaction: d.transaction };
    },
  });

  return {
    adapter,
    status: createX402Status({ agentAddress: account.address, network: cfg.network, usdc, funding }),
    allowance,
    ownerAddress,
    async drain(to) {
      const balance = await usdc.balanceOf(account.address);
      const data = encodeFunctionData({ abi: erc20Abi, functionName: "transfer", args: [to, balance] });
      return chainWriter.sendCall(net.usdc, data);
    },
  };
}
```

If `wrapFetchWithPaymentFromConfig`'s `paymentRequirementsSelector` has a different signature in the installed `@x402/fetch` version, adapt the lambda so `selectRequirement` still receives `accepts` and returns one entry; keep `selectRequirement` itself unchanged (it is the tested piece).

- [ ] **Step 6: Register in `cli.ts` and validate caps at startup**

In `packages/leashd/src/cli.ts` add the imports:

```ts
import { validateX402Caps } from "@repo/leash-core";
import { buildX402Runtime, type X402Runtime } from "./rails/x402-wiring";
import { loadAgentPolicy } from "./policy";
```

and after the Cashu block:

```ts
  let x402: X402Runtime | undefined;
  if (config.x402) {
    x402 = buildX402Runtime(config.x402);
    rails.set("x402", x402.adapter);
  }
```

and after `createGovernor(...)`, before `createMcpServer`:

```ts
  // The on-chain allowance is the outer wall; refuse to serve a policy that is wider than it.
  if (x402?.allowance) {
    const spec = loadAgentPolicy(store, config, config.agentId);
    const violations = spec ? validateX402Caps(spec, x402.allowance) : [];
    if (violations.length > 0) {
      process.stderr.write(`leashd: x402 policy caps exceed the on-chain allowance:\n  ${violations.join("\n  ")}\n`);
      process.exit(1);
    }
  }
```

Pass `x402Status: x402?.status` into `createMcpServer({ governor, store, config, x402Status: x402?.status })`.

- [ ] **Step 7: Extend `get_budget` in `mcp-server.ts`**

Add `x402Status?: () => Promise<X402Status>` to the `createMcpServer` deps (import the type from `./rails/x402-status`). In the `get_budget` handler, before `return jsonContent({...})`:

```ts
      const x402 = deps.x402Status ? await deps.x402Status() : undefined;
```

and add `x402` to the returned object: `{ policyVersion, killSwitch, gradedState, perTxMax, budgets, x402 }`. Update the tool description to: `"... per the current policy. When the x402 rail is configured, also returns the agent key balance and remaining on-chain allowance."`

- [ ] **Step 8: Typecheck and run all leashd tests**

Run: `pnpm --filter @repo/leashd typecheck && pnpm --filter @repo/leashd test`
Expected: clean, all PASS (governor tests unchanged).

- [ ] **Step 9: Commit**

```bash
git add packages/leashd/src/rails/x402-status.ts packages/leashd/src/rails/x402-status.test.ts packages/leashd/src/rails/x402-wiring.ts packages/leashd/src/cli.ts packages/leashd/src/mcp-server.ts
git commit -m "feat(leashd): wire the x402 rail, startup cap check, on-chain budget in get_budget"
```

---

### Task 8: `x402` CLI: keygen, status, drain

**Files:**
- Create: `packages/leashd/src/x402-cli.ts`
- Modify: `packages/leashd/package.json` (script `"x402": "tsx src/x402-cli.ts"`)
- Test: `packages/leashd/src/x402-cli.test.ts`

**Interfaces:**
- Consumes: `buildX402Runtime` (Task 7), `loadConfig` (Task 3).
- Produces: `export function formatStatus(s: X402Status): string`, `export function generateAgentKey(): { privateKey: `0x${string}`; address: `0x${string}` }`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/leashd/src/x402-cli.test.ts
import { describe, it, expect } from "vitest";
import { formatStatus, generateAgentKey } from "./x402-cli";

describe("x402 cli helpers", () => {
  it("generates a 32-byte key and its address", () => {
    const k = generateAgentKey();
    expect(k.privateKey).toMatch(/^0x[0-9a-f]{64}$/);
    expect(k.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
  });
  it("formats status as one line per fact, dollars with two decimals", () => {
    const out = formatStatus({
      agentAddress: ("0x" + "ab".repeat(20)) as `0x${string}`, network: "eip155:8453",
      agentBalanceUsdCent: 125, allowanceRemainingUsdCent: 375, periodEndsAt: 1_800_000_000, funding: "base-spend-permission",
    });
    expect(out).toContain("balance   $1.25");
    expect(out).toContain("remaining $3.75 this period");
    expect(out).toContain("funding   base-spend-permission");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/leashd test -- x402-cli`
Expected: FAIL.

- [ ] **Step 3: Implement**

```ts
#!/usr/bin/env node
// packages/leashd/src/x402-cli.ts
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
```

Add to `packages/leashd/package.json` scripts: `"x402": "NODE_NO_WARNINGS=1 tsx src/x402-cli.ts"`.

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @repo/leashd test -- x402-cli && pnpm --filter @repo/leashd x402 keygen`
Expected: tests PASS; keygen prints an env line and an address.

- [ ] **Step 5: Commit**

```bash
git add packages/leashd/src/x402-cli.ts packages/leashd/src/x402-cli.test.ts packages/leashd/package.json
git commit -m "feat(leashd): x402 cli with keygen, status and drain"
```

---

### Task 9: Control plane audit columns for `usd_cent`

**Files:**
- Modify: `apps/web/src/lib/leash/api.ts:107-127`
- Test: `apps/web/src/lib/__tests__/audit-amount.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/__tests__/audit-amount.test.ts
import { describe, it, expect } from "vitest";
import { amountToAuditColumns, auditColumnsToAmount } from "@/lib/leash/api";

describe("audit amount mapping", () => {
  it("maps sats to amount_msat", () => {
    expect(amountToAuditColumns({ unit: "sat", value: 21 })).toEqual({ amountMsat: 21, amountMinor: null, currency: "sat" });
  });
  it("maps usd_cent to amount_minor", () => {
    expect(amountToAuditColumns({ unit: "usd_cent", value: 7 })).toEqual({ amountMsat: null, amountMinor: 7, currency: "usd_cent" });
  });
  it("round-trips both units", () => {
    expect(auditColumnsToAmount({ amountMsat: 21, amountMinor: null, currency: "sat" })).toEqual({ unit: "sat", value: 21 });
    expect(auditColumnsToAmount({ amountMsat: null, amountMinor: 7, currency: "usd_cent" })).toEqual({ unit: "usd_cent", value: 7 });
    expect(auditColumnsToAmount({ amountMsat: null, amountMinor: null, currency: null })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/web test -- audit-amount`
Expected: FAIL on the `usd_cent` cases.

- [ ] **Step 3: Implement**

Replace both functions in `apps/web/src/lib/leash/api.ts`:

```ts
/** Map a leash-core Amount onto the audit_events columns. */
export function amountToAuditColumns(amount: Amount | undefined): {
  amountMsat: number | null;
  amountMinor: number | null;
  currency: string | null;
} {
  if (!amount) return { amountMsat: null, amountMinor: null, currency: null };
  if (amount.unit === "sat") return { amountMsat: amount.value, amountMinor: null, currency: "sat" };
  return { amountMsat: null, amountMinor: amount.value, currency: amount.unit };
}

/** Reverse mapping for the dashboard audit feed. */
export function auditColumnsToAmount(row: {
  amountMsat: number | null;
  amountMinor: number | null;
  currency: string | null;
}): Amount | null {
  if (row.amountMsat != null) return { unit: "sat", value: row.amountMsat };
  if (row.amountMinor != null && row.currency === "usd_cent") return { unit: "usd_cent", value: row.amountMinor };
  return null;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @repo/web test -- audit-amount`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/leash/api.ts apps/web/src/lib/__tests__/audit-amount.test.ts
git commit -m "feat(web): store usd_cent audit amounts in amount_minor"
```

---

### Task 10: Rails page: x402 binding with metadata, policies API cap check

**Files:**
- Modify: `apps/web/src/app/dashboard/rails/rails-client.tsx`
- Modify: `apps/web/src/app/api/leash/policies/route.ts`
- Modify: `packages/db/src/schema.ts:216` (comment only)
- Test: `apps/web/src/app/api/__tests__/policies-x402-caps.test.ts` (new)

**Interfaces:**
- Rail binding `meta` for x402 (all strings, metadata only): `network`, `agentAddress`, `permissionHash`, `allowanceUsdCent`, `periodSeconds`, `end`.
- Produces in `policies/route.ts`: `export function x402CapViolations(spec: PolicySpec, bindings: { rail: string; meta: Record<string, unknown> | null }[]): string[]` (pure, tested).

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/app/api/__tests__/policies-x402-caps.test.ts
import { describe, it, expect } from "vitest";
import { x402CapViolations } from "@/app/api/leash/policies/x402-caps";

const spec = {
  version: 1, defaultDecision: "deny" as const, budgets: [], timezone: "UTC", timeWindows: [],
  killSwitch: false, gradedState: "normal" as const, rails: ["x402" as const],
  perTxMax: { unit: "usd_cent" as const, value: 900 },
};

describe("x402CapViolations", () => {
  it("returns nothing when no x402 binding exists", () => {
    expect(x402CapViolations(spec, [{ rail: "cashu", meta: null }])).toEqual([]);
  });
  it("checks against the binding's allowance metadata", () => {
    const out = x402CapViolations(spec, [{ rail: "x402", meta: { allowanceUsdCent: "500", periodSeconds: "86400" } }]);
    expect(out).toHaveLength(1);
  });
  it("ignores a binding without allowance metadata", () => {
    expect(x402CapViolations(spec, [{ rail: "x402", meta: { network: "eip155:8453" } }])).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @repo/web test -- policies-x402`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the pure check and use it in the route**

```ts
// apps/web/src/app/api/leash/policies/x402-caps.ts
import { validateX402Caps, type PolicySpec } from "@repo/leash-core";

/** Metadata is strings; only a binding that carries an allowance can be checked. */
export function x402CapViolations(
  spec: PolicySpec,
  bindings: { rail: string; meta: Record<string, unknown> | null }[]
): string[] {
  const errors: string[] = [];
  for (const b of bindings) {
    if (b.rail !== "x402" || !b.meta) continue;
    const allowance = Number(b.meta.allowanceUsdCent);
    const period = Number(b.meta.periodSeconds);
    if (!Number.isFinite(allowance) || !Number.isFinite(period) || period <= 0) continue;
    errors.push(...validateX402Caps(spec, { allowanceUsdCent: allowance, periodSeconds: period }));
  }
  return errors;
}
```

In `apps/web/src/app/api/leash/policies/route.ts`, inside `POST` after the body is parsed and membership checked and before signing, load the workspace's rail bindings and reject on violations:

```ts
  const bindings = await db
    .select({ rail: railBindings.rail, meta: railBindings.meta })
    .from(railBindings)
    .where(eq(railBindings.workspaceId, workspaceId));
  const violations = x402CapViolations(finalSpec, bindings as { rail: string; meta: Record<string, unknown> | null }[]);
  if (violations.length > 0) return err(400, `Policy exceeds the on-chain x402 allowance: ${violations.join("; ")}`);
```

Add `railBindings` to the `@repo/db` import and `import { x402CapViolations } from "./x402-caps";`. Use the same variable names the route already has for the parsed spec (`finalSpec`) and workspace id.

- [ ] **Step 4: Rails UI**

In `apps/web/src/app/dashboard/rails/rails-client.tsx`:

- Add `x402: { label: "x402 / USDC", Icon: Coins }` to `RAIL_META` (import a fitting lucide icon if one exists, `Coins` is acceptable).
- Add `<SelectItem value="x402">x402 / USDC</SelectItem>` to the rail select.
- When `rail === "x402"`, render six extra inputs bound to state `network` (default `eip155:8453`), `agentAddress`, `permissionHash`, `allowanceUsdCent`, `periodSeconds`, `end`; send them as `meta` in the POST body:

```tsx
const meta = rail === "x402"
  ? { network, agentAddress, permissionHash, allowanceUsdCent, periodSeconds, end }
  : undefined;
// body: JSON.stringify({ workspaceId, rail, label, meta })
```

- In the list, for an x402 row, show `meta.network`, `meta.agentAddress` shortened to `0x1234…abcd`, and `$${(Number(meta.allowanceUsdCent) / 100).toFixed(2)} / ${Number(meta.periodSeconds) / 3600}h`.
- Add a link `Grant a spend permission` to `/dashboard/rails/x402/grant` next to the x402 select.
- Update the helper text: "Rail bindings store metadata only. Secrets (NWC strings, macaroons, agent keys, signed permissions) never leave leashd."

In `packages/db/src/schema.ts` line 216 change the comment to `// lightning_nwc, cashu, x402`.

- [ ] **Step 5: Run tests and typecheck**

Run: `pnpm --filter @repo/web test -- policies-x402 && pnpm typecheck`
Expected: PASS; typecheck errors remaining only in `policy-editor.tsx` (Task 11).

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/api/leash/policies/x402-caps.ts apps/web/src/app/api/__tests__/policies-x402-caps.test.ts apps/web/src/app/api/leash/policies/route.ts apps/web/src/app/dashboard/rails/rails-client.tsx packages/db/src/schema.ts
git commit -m "feat(web): x402 rail binding metadata and allowance check on policies"
```

---

### Task 11: Policy editor: per-policy unit and x402 rail

**Files:**
- Modify: `apps/web/src/app/dashboard/policies/policy-editor.tsx:55-58, 121-122, 340`

- [ ] **Step 1: Add the rail and a unit selector**

- `RAILS`: append `{ value: "x402", label: "x402 / USDC" }`.
- Replace `const unit: MoneyUnit = "sat";` with state: `const [unit, setUnit] = useState<MoneyUnit>("sat");`. When editing an existing policy, initialise `unit` from `existing.spec.perTxMax?.unit ?? existing.spec.budgets[0]?.cap.unit ?? "sat"` in the same place the other fields are loaded.
- Replace `const unitLabel = "sat";` with `const unitLabel = unit === "sat" ? "sat" : "US cents";`.
- Add a `Select` (same shadcn components the file already uses) labelled `Unit` with items `sat` and `usd_cent` ("US cents (x402)"), bound to `unit`, placed directly above the per-transaction max field.
- Remove the comment `// Bitcoin-only: all amounts are sats.`

- [ ] **Step 2: Typecheck and lint**

Run: `pnpm typecheck && pnpm lint`
Expected: clean across the workspace.

- [ ] **Step 3: Manual check**

Run: `pnpm dev` (web), open `/dashboard/policies`, create a policy with unit `usd_cent`, per-tx max `5`, rail `x402`, save. Expected: saved; the JSON in the policies list shows `{"unit":"usd_cent","value":5}`. With an x402 binding whose `allowanceUsdCent` is `2`, saving must fail with the 400 message from Task 10.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/dashboard/policies/policy-editor.tsx
git commit -m "feat(web): per-policy money unit and x402 rail in the policy editor"
```

---

### Task 12: Grant page (client-only, Base Account SDK)

**Files:**
- Create: `apps/web/src/app/dashboard/rails/x402/grant/page.tsx`
- Create: `apps/web/src/app/dashboard/rails/x402/grant/grant-client.tsx`
- Modify: `apps/web/package.json` (add `@base-org/account`)

**Interfaces:**
- Output JSON must parse with `parseSignedPermission` (Task 5): `{ chainId, permissionHash, signature, permission: { account, spender, token, allowance: "<decimal string>", period, start, end, salt: "<decimal string>", extraData } }`.

- [ ] **Step 1: Add the dependency**

Run: `pnpm --filter @repo/web add @base-org/account`

- [ ] **Step 2: Server page shell**

```tsx
// apps/web/src/app/dashboard/rails/x402/grant/page.tsx
import { GrantClient } from "./grant-client";

export const metadata = { title: "Grant x402 spend permission" };

export default function GrantPage() {
  return <GrantClient />;
}
```

- [ ] **Step 3: Client component**

```tsx
// apps/web/src/app/dashboard/rails/x402/grant/grant-client.tsx
"use client";
import { useState } from "react";
import { createBaseAccountSDK } from "@base-org/account";
import { requestSpendPermission, requestRevoke } from "@base-org/account/spend-permission";
import { Button } from "@repo/shadcn-ui/components/button";
import { Input } from "@repo/shadcn-ui/components/input";
import { Label } from "@repo/shadcn-ui/components/label";

const USDC: Record<number, `0x${string}`> = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

type Granted = Awaited<ReturnType<typeof requestSpendPermission>>;

/** bigint -> decimal string so the file is plain JSON leashd can parse. */
function serialise(p: Granted): string {
  return JSON.stringify(p, (_k, v: unknown) => (typeof v === "bigint" ? v.toString() : v), 2);
}

export function GrantClient() {
  const [chainId, setChainId] = useState(8453);
  const [spender, setSpender] = useState("");
  const [dollarsPerPeriod, setDollars] = useState("5");
  const [periodDays, setPeriodDays] = useState("1");
  const [granted, setGranted] = useState<Granted | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function grant() {
    setError(null);
    try {
      const sdk = createBaseAccountSDK({ appName: "leashd", appChainIds: [chainId] });
      const provider = sdk.getProvider();
      const [account] = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const permission = await requestSpendPermission({
        account: account as `0x${string}`,
        spender: spender as `0x${string}`,
        token: USDC[chainId],
        chainId,
        allowance: BigInt(Math.round(Number(dollarsPerPeriod) * 1_000_000)),
        periodInDays: Number(periodDays),
        provider,
      });
      setGranted(permission);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function revoke() {
    if (!granted) return;
    try {
      await requestRevoke(granted);
      setGranted(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="font-mono text-lg">Grant a spend permission to your agent key</h1>
      <p className="text-sm text-muted-foreground">
        Runs entirely in your browser. Nothing is sent to leashd.dev. Download the JSON and point
        <code> LEASH_X402_PERMISSION_PATH</code> at it.
      </p>
      <Label htmlFor="chain">Chain</Label>
      <select id="chain" value={chainId} onChange={(e) => setChainId(Number(e.target.value))} className="rounded border p-2">
        <option value={8453}>Base (eip155:8453)</option>
        <option value={84532}>Base Sepolia (eip155:84532)</option>
      </select>
      <Label htmlFor="spender">Agent address (from `pnpm --filter @repo/leashd x402 keygen`)</Label>
      <Input id="spender" value={spender} onChange={(e) => setSpender(e.target.value)} placeholder="0x…" />
      <Label htmlFor="usd">USDC per period</Label>
      <Input id="usd" value={dollarsPerPeriod} onChange={(e) => setDollars(e.target.value)} />
      <Label htmlFor="days">Period (days)</Label>
      <Input id="days" value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} />
      <Button onClick={grant} disabled={!/^0x[0-9a-fA-F]{40}$/.test(spender)}>Grant with Base Account</Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {granted && (
        <>
          <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">{serialise(granted)}</pre>
          <div className="flex gap-2">
            <Button onClick={() => navigator.clipboard.writeText(serialise(granted))}>Copy JSON</Button>
            <Button variant="destructive" onClick={revoke}>Revoke</Button>
          </div>
        </>
      )}
    </div>
  );
}
```

Match the import paths for `Button`, `Input`, `Label` to whatever `rails-client.tsx` already imports from `@repo/shadcn-ui`; if `@base-org/account` exposes `getProvider().request` differently, follow its README in `node_modules/@base-org/account/README.md` and keep the output shape unchanged.

- [ ] **Step 4: Typecheck and manual test on Base Sepolia**

Run: `pnpm typecheck && pnpm dev`
Open `/dashboard/rails/x402/grant`, chain Base Sepolia, paste the keygen address, grant `1` USDC / `1` day with a test Base Account. Expected: JSON appears; copy it to `~/.leashd/perm-sepolia.json`; `pnpm --filter @repo/leashd x402 status` with `LEASH_X402_NETWORK=eip155:84532`, `LEASH_X402_FUNDING=base-spend-permission`, `LEASH_X402_PERMISSION_PATH=~/.leashd/perm-sepolia.json` prints `remaining $1.00 this period`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/src/app/dashboard/rails/x402/
git commit -m "feat(web): client-only x402 spend permission grant page"
```

---

### Task 13: Multi-rail copy, legal pages, READMEs, llms.txt

**Files:**
- Modify: `README.md`, `packages/leashd/README.md`, `apps/web/src/app/layout.tsx`, `apps/web/src/app/page.tsx`, `apps/web/src/app/faq/page.tsx`, `apps/web/src/app/llms.txt/route.ts`, `apps/web/src/components/marketing/hero.tsx`, `apps/web/src/components/marketing/capabilities.tsx`, `apps/web/src/app/privacy/page.tsx`, `apps/web/src/app/terms/page.tsx`, `.env.example`

- [ ] **Step 1: Find every occurrence**

Run: `grep -rn -i 'bitcoin-only\|shitcoin\|no evm\|altcoin' --include='*.ts' --include='*.tsx' --include='*.md' . | grep -v node_modules`
Expected: a list; every hit is edited in this task.

- [ ] **Step 2: Replace positioning**

Use this positioning line everywhere a one-liner is needed: **"Non-custodial spend governance for AI agents. Hard budgets, allowlists, audit trail. Lightning, Cashu and x402/USDC, on-chain enforced where the rail allows."**

Hero (`hero.tsx`): headline "Give your agents money. Keep the leash." Sub-line: the positioning line. Capabilities (`capabilities.tsx`): the rails card lists `Lightning (NWC)`, `Cashu`, `x402 / USDC (Base, Ethereum)`; add a card "On-chain enforced budgets" with: "For x402 the owner wallet grants a per-period allowance. leashd can never pull more than that, and you can revoke it any time."

FAQ (`faq/page.tsx`): replace the Bitcoin-only entry with two entries, "Why both Bitcoin rails and USDC?" (agents pay on both; governance is rail-agnostic) and "What does the chain enforce vs. what does leashd enforce?" (the two-layer paragraph from the spec §2).

`layout.tsx` metadata description and `llms.txt` route: the positioning line.

Privacy/Terms: restore the stablecoin passages removed in `36ca637` (`git show 36ca637 -- apps/web/src/app/privacy/page.tsx apps/web/src/app/terms/page.tsx` shows the exact text; re-add it, wording updated to "USDC via x402 on EVM networks").

- [ ] **Step 3: README.md**

Rewrite the top of `README.md`:

```markdown
# leashd

Non-custodial spend governance for AI agents. Hard budgets, allowlists, rate limits, time windows,
graded shutdown, signed audit trail. Lightning (NWC), Cashu and x402/USDC on Base and Ethereum.

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
```

Keep the existing sections that still apply (install, MCP wiring, control plane, license). Add a "Funding the x402 rail" section with the four commands: `x402 keygen`, grant page, env vars, `x402 status`, plus the gas note from `docs/x402-spikes.md`. Add "Open issues, help wanted" linking the four issues from Task 18.

`.env.example`: add the six `LEASH_X402_*` variables with comments.

`packages/leashd/README.md`: same rails table and the env block.

- [ ] **Step 4: Verify no stragglers, typecheck, lint**

Run: `grep -rn -i 'bitcoin-only\|shitcoin' --include='*.ts' --include='*.tsx' --include='*.md' . | grep -v node_modules; pnpm typecheck && pnpm lint`
Expected: grep prints nothing; typecheck and lint clean.

- [ ] **Step 5: Commit**

```bash
git add README.md packages/leashd/README.md .env.example apps/web/src
git commit -m "docs: multi-rail positioning, threat model, x402 funding guide"
```

---

### Task 14: CI: run on `master`, gated Base Sepolia integration test

**Files:**
- Modify: `.github/workflows/ci.yml`
- Create: `packages/leashd/src/integration/x402-sepolia.test.ts`
- Modify: `packages/leashd/package.json` (script `"test:integration": "vitest run src/integration"`), and make the default `test` exclude `src/integration` via `vitest.config.ts` (new)

- [ ] **Step 1: Exclude integration tests from the unit run**

```ts
// packages/leashd/vitest.config.ts
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { exclude: ["**/node_modules/**", "**/dist/**", "src/integration/**"] },
});
```

Add to `packages/leashd/package.json` scripts: `"test:integration": "vitest run --dir src/integration"`.

- [ ] **Step 2: Write the gated live test**

```ts
// packages/leashd/src/integration/x402-sepolia.test.ts
import { describe, it, expect } from "vitest";
import { buildX402Runtime } from "../rails/x402-wiring";

const key = process.env.X402_SEPOLIA_PRIVATE_KEY as `0x${string}` | undefined;
const permissionPath = process.env.X402_SEPOLIA_PERMISSION_PATH;
const endpoint = process.env.X402_SEPOLIA_ENDPOINT; // from docs/x402-spikes.md step 3
const run = key && permissionPath && endpoint ? describe : describe.skip;

run("x402 on Base Sepolia (live)", () => {
  it("pulls allowance and pays a real 402 endpoint", async () => {
    const rt = buildX402Runtime({
      network: "eip155:84532", privateKey: key as `0x${string}`, rpcUrl: "https://sepolia.base.org",
      funding: "base-spend-permission", permissionPath: permissionPath as string,
    });
    const before = await rt.status();
    const r = await rt.adapter.pay({
      agentId: "ci", rail: "x402", amount: { unit: "usd_cent", value: 1 }, endpoint: endpoint as string, ts: Date.now(),
    });
    expect(r.ok, r.error).toBe(true);
    expect(r.ref).toMatch(/^0x/);
    const after = await rt.status();
    expect(after.allowanceRemainingUsdCent).toBeLessThanOrEqual(before.allowanceRemainingUsdCent);
  }, 120_000);

  it("refuses an endpoint that asks for more than approved", async () => {
    const rt = buildX402Runtime({
      network: "eip155:84532", privateKey: key as `0x${string}`, rpcUrl: "https://sepolia.base.org",
      funding: "base-spend-permission", permissionPath: permissionPath as string,
    });
    const r = await rt.adapter.pay({
      agentId: "ci", rail: "x402", amount: { unit: "usd_cent", value: 0 }, endpoint: endpoint as string, ts: Date.now(),
    });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/exceeds policy-approved/);
  }, 60_000);
});
```

- [ ] **Step 3: CI**

In `.github/workflows/ci.yml`: change both `branches: [main, develop]` to `branches: [master, main, develop]`. Add a job:

```yaml
  integration-sepolia:
    name: x402 Base Sepolia (live)
    runs-on: ubuntu-latest
    if: ${{ github.event_name == 'push' }}
    needs: test
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - name: Write permission file
        if: ${{ secrets.X402_SEPOLIA_PERMISSION_JSON != '' }}
        run: echo '${{ secrets.X402_SEPOLIA_PERMISSION_JSON }}' > /tmp/perm.json
      - run: pnpm --filter @repo/leashd test:integration
        env:
          X402_SEPOLIA_PRIVATE_KEY: ${{ secrets.X402_SEPOLIA_PRIVATE_KEY }}
          X402_SEPOLIA_PERMISSION_PATH: /tmp/perm.json
          X402_SEPOLIA_ENDPOINT: ${{ vars.X402_SEPOLIA_ENDPOINT }}
```

Without the secrets the suite is skipped and the job is green; that is intended.

- [ ] **Step 4: Run locally once with real Sepolia values**

Run (with the env from Task 12 step 4 exported under the `X402_SEPOLIA_*` names): `pnpm --filter @repo/leashd test:integration`
Expected: both tests PASS; note the tx hash in `docs/x402-spikes.md`.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml packages/leashd/vitest.config.ts packages/leashd/package.json packages/leashd/src/integration/x402-sepolia.test.ts docs/x402-spikes.md
git commit -m "ci: run on master and add a gated Base Sepolia x402 integration test"
```

---

### Task 15: Offline demo shows an x402 DENY

**Files:**
- Modify: `packages/leashd/src/demo.ts`

- [ ] **Step 1: Add a usd_cent scene**

The demo drives the governor with a mock rail. Add a third scenario after the existing ones: a policy with `perTxMax: { unit: "usd_cent", value: 5 }`, `rails: ["x402"]`, `allow: { domains: ["api.coingecko.com"] }`; then (a) `pay` 1 usd_cent to `https://api.coingecko.com/api/v3/x402/ping` on rail `x402` with a mock adapter returning `{ ok: true, ref: "0xdemo" }`, printed green; (b) `pay` 1 usd_cent to `https://evil.example/drain`, printed red with the reason (`not in allowlist`). Reuse the file's `C` colours and existing print helpers; format usd_cent as `$0.01`.

- [ ] **Step 2: Run**

Run: `pnpm --filter @repo/leashd demo`
Expected: the new scene prints ALLOW then DENY with the allowlist reason; exit 0.

- [ ] **Step 3: Commit**

```bash
git add packages/leashd/src/demo.ts
git commit -m "feat(leashd): x402 allow/deny scene in the offline demo"
```

---

### Task 16: Lightning and Cashu live end to end (operator, Mac)

No code. Follow `docs/2026-05-26-e2e-runbook.md` (vault: `Leash/Notizen/2026-05-26-e2e-runbook.md`) with these concrete values.

- [ ] **Step 1: NWC with a budget cap**
  On the LND node (Umbrel, CT 111) create an NWC connection through Alby Hub / the NWC app with budget `5000 sat / day`. Copy the `nostr+walletconnect://` string into `LEASH_NWC_URL`.
- [ ] **Step 2: Policy**
  In the control plane: policy for the agent, `perTxMax 1000 sat`, day budget `3000 sat`, allowlist one Lightning address you control.
- [ ] **Step 3: Run three payments through Claude Code (`.mcp.json` from the runbook)**
  (a) 500 sat to the allowlisted address: expect `allowed`, a preimage in `ref`; (b) 500 sat to a non-allowlisted address: expect `denied`, reason `not in allowlist`; (c) 1500 sat: expect `denied`, reason `exceeds per-transaction max`. Check all three appear in the dashboard audit feed with signatures.
- [ ] **Step 4: Cashu**
  Mint 2000 sat of proofs on a public mint (e.g. the one configured in `LEASH_CASHU_MINT_URL`), pay 300 sat to the same allowlisted address on rail `cashu`. Expect `allowed`, an invoice preimage in `ref`.
- [ ] **Step 5: Record**
  Paste the three audit event ids (Lightning) and one (Cashu) into `docs/x402-spikes.md` under "Live proof".

---

### Task 17: Mainnet proof and the GIF (operator, Mac)

- [ ] **Step 1: Keys and permission**
  `pnpm --filter @repo/leashd x402 keygen`; on the grant page pick Base, spender = the new address, `5` USDC per `1` day; save JSON to `~/.leashd/perm-base.json`. Send `0.002 ETH` to the agent address for `spend()` gas (from `docs/x402-spikes.md` step 2).
- [ ] **Step 2: Env**
  `LEASH_X402_NETWORK=eip155:8453`, `LEASH_X402_RPC_URL=https://mainnet.base.org`, `LEASH_X402_FUNDING=base-spend-permission`, `LEASH_X402_PERMISSION_PATH=~/.leashd/perm-base.json`, `LEASH_X402_PRIVATE_KEY=<keygen>`. Control plane: x402 binding with `allowanceUsdCent=500`, `periodSeconds=86400`; policy unit `usd_cent`, `perTxMax 5`, day budget `100`, rail `x402`, allowlist domain `api.coingecko.com`.
- [ ] **Step 3: Three payments, recorded with asciinema**
  `asciinema rec leashd-x402.cast`, then through Claude Code: (a) 1 usd_cent to the CoinGecko x402 endpoint (URL and price from `docs/x402-spikes.md` step 3): `allowed`, `ref` is a Base tx hash, `x402 status` shows `remaining $4.99`; (b) 1 usd_cent to `https://example.com/paid`: `denied`, `not in allowlist`; (c) after temporarily setting the binding allowance to `1` usd_cent and re-granting a `0.01` USDC / day permission: a second 1-cent payment: `denied`, `funding failed: ... exceeds remaining allowance`. Stop recording.
- [ ] **Step 4: GIF**
  `agg leashd-x402.cast docs/launch/leashd-x402.gif --theme monokai --font-size 14` (install `agg` via `cargo install agg` or the release binary). Check the GIF shows ALLOW, DENY (policy), DENY (chain) and the `x402 status` line.
- [ ] **Step 5: Drain and commit**
  `pnpm --filter @repo/leashd x402 drain`; confirm the owner wallet received the leftover. `git add docs/launch/leashd-x402.gif && git commit -m "docs: mainnet x402 allow/deny recording"`.

---

### Task 18: Launch content and open issues

**Files:**
- Create: `docs/launch/2026-dev-to-post.md`

- [ ] **Step 1: Open the four issues**

```bash
gh issue create -R brainbytes-dev/leashd -l "help wanted" -t "funding: ERC-7715 delegation as a second FundingSource" -b "Implement FundingSource kind \"erc7715-delegation\" (MetaMask smart accounts, erc20 periodic permission). Interface: packages/leashd/src/rails/funding/types.ts. Acceptance: the Base Sepolia integration test passes with this source selected."
gh issue create -R brainbytes-dev/leashd -l "help wanted" -t "funding: Kernel signature policy enforcing EIP-3009 typed data on-chain" -b "A Kernel v3 policy that validates transferWithAuthorization typed data (recipient allowlist, amount cap, rolling window) inside isValidSignature, so an x402 payment is capped on-chain without the pull step. Needs Solidity, tests and an audit plan."
gh issue create -R brainbytes-dev/leashd -l "help wanted" -t "rail: Solana x402" -b "Second rail: x402 exact scheme on Solana with a non-custodial per-period cap (Squads or a session-key program). Same RailAdapter/FundingSource split as EVM. Spec 2."
gh issue create -R brainbytes-dev/leashd -l "help wanted" -t "funding: Ethereum mainnet SpendPermissionManager" -b "Only if docs/x402-spikes.md shows no deployment on chainId 1: until then Ethereum runs with funding=manual."
```

- [ ] **Step 2: Draft the post**

Write `docs/launch/2026-dev-to-post.md`, about 1,500 words, sections in this order: (1) the drain scenario in three sentences (prompt injection tells the agent to "verify your wallet" at a URL that charges $200); (2) why an LLM guardrail is the wrong layer (probabilistic, same context as the attacker); (3) the two layers, with the diagram from the spec §2 and the "chain / leashd / nobody" list from the README; (4) the GIF and what each of the three lines proves; (5) what it does not protect against (one period, compromised host); (6) rails table; (7) the four open issues as an invitation. Tone: understated, no exclamation marks, no "revolutionary". End with the repo link and `pnpm --filter @repo/leashd demo`.

- [ ] **Step 3: Schedule**

In Postiz: dev.to (publish), X (thread of 4: the drain scenario, the two layers, the GIF, the repo), Nostr (long-form, same as dev.to). Show HN by hand on the same morning, title "Show HN: leashd, non-custodial spend limits for AI agents (Lightning, Cashu, x402)". No Reddit on launch day.

- [ ] **Step 4: Commit**

```bash
git add docs/launch/2026-dev-to-post.md
git commit -m "docs: launch post draft"
```

---

## Self-review against the spec

- Spec §1 decisions: B (Tasks 4-7), C as issue (Task 18), chains Base+Ethereum via `NETWORKS` (Task 7), broad scope (Tasks 16-17), mainnet demo (Task 17), one-person (no task needed).
- Spec §2 architecture: FundingSource + adapter (4-6), grant flow (12), kill/drain (7, 8), two-layer threat model (13).
- Spec §3 per package: core (1, 2), leashd (3-8), control plane (9-12), Lightning/Cashu (16).
- Spec §4 spikes: Task 0.
- Spec §5 tests: unit (1-9), Sepolia CI (14), mainnet by hand (17).
- Spec §6 launch: 17, 18. Reddit excluded (18 step 3).
- Spec §7 issues: 18. Spec §8 out of scope: nothing here builds approval UI, alerting, Solana or Stripe.
- Type consistency: `FundingSource.topUp(amount: Amount)` (Task 4) is what the adapter (6) and status (7) call; `ChainWriter` (5) is implemented in 7; `X402Status` (7) is consumed by 8; `parseSignedPermission` (5) consumes the JSON shape 12 produces; `validateX402Caps` (2) is used in 7 and 10.
- Known open point, deliberately left to the executor: exact `@x402/fetch` selector signature and `@base-org/account` provider API may differ by version; both are isolated behind seams (`makePaidFetch`, the grant client) and the tested code does not depend on them.
