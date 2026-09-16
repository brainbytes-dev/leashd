import { readFileSync } from "node:fs";
import { createPublicClient, createWalletClient, http, erc20Abi, encodeFunctionData, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base, baseSepolia, mainnet } from "viem/chains";
import { wrapFetchWithPaymentFromConfig, decodePaymentResponseHeader, type PaymentRequirements } from "@x402/fetch";
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
    async isApproved(permission) {
      // isValid takes the full SpendPermission struct, not a hash (docs/x402-spikes.md Step 4;
      // there is no hash-keyed lookup on the contract) — see the ChainWriter interface note.
      const manager = SPEND_PERMISSION_MANAGER[permission.chainId];
      return publicClient.readContract({ address: manager, abi: spendPermissionManagerAbi, functionName: "isValid", args: [permission.permission] });
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
        // X402Config.network is a loosely-typed `string` (validated at runtime as a CAIP-2 id, not
        // narrowed in the type); the NETWORKS lookup above already throws for anything that isn't
        // one of the `${string}:${string}` keys, so by this point the shape is guaranteed.
        schemes: [{ network: cfg.network as `${string}:${string}`, client: new ExactEvmScheme(account) }],
        // Leash's own selectRequirement is the enforcement point that matters: it rejects any
        // server-requested amount above the policy-approved ceiling (anti tool-description
        // poisoning). See spendControls note below for why the library's own cap is disabled
        // rather than layered on top.
        //
        // The installed @x402/fetch's SelectPaymentRequirements signature is
        // `(x402Version: number, paymentRequirements: PaymentRequirements[]) => PaymentRequirements`,
        // not the brief's assumed single-argument `(accepts) => ...` — adapt the lambda shape,
        // selectRequirement itself is untouched.
        paymentRequirementsSelector: (_x402Version: number, paymentRequirements: PaymentRequirements[]) => {
          // The real @x402/core `PaymentRequirements` is a structural superset of leashd's local
          // `PaymentRequirement` (scheme/network/asset/amount/payTo, all present) — it additionally
          // carries `maxTimeoutSeconds`/`extra` and requires `payTo`, so the array is directly
          // assignable without a copy.
          const candidates: PaymentRequirement[] = paymentRequirements;
          const picked = selectRequirement(candidates, cfg.network, net.usdc, ceilingAtomic);
          // `picked` is, by reference, one of `paymentRequirements`'s own elements (selectRequirement
          // only ever returns via Array.find, never constructs a new object) — recover the full real
          // PaymentRequirements object (maxTimeoutSeconds, extra, etc.) the client library needs.
          const full = paymentRequirements.find((r) => r === picked);
          if (!full) throw new Error("internal: selectRequirement returned an object not present in the original list");
          return full;
        },
        // Leash's selectRequirement ceiling above is the authoritative, policy-derived cap; the
        // library's default spend control is an unrelated, hardcoded $1-per-payment cap on
        // "default assets" (confirmed: USDC on Base, Base Sepolia, and Ethereum mainnet are all
        // recognized default assets in @x402/evm, and DEFAULT_MAX_AMOUNT_PER_PAYMENT = "$1" in
        // @x402/core). Left enabled, it would silently reject any policy-approved payment over $1
        // before our selector even runs — a correctness bug, not defense in depth, since our own
        // ceiling already enforces the real threat model (a server requesting more than the policy
        // approved). Disabled here; the policy engine + selectRequirement are the enforcement layer.
        spendControls: false,
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
