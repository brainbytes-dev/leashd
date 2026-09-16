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

/**
 * chainId -> SpendPermissionManager.
 *
 * Address confirmed in docs/x402-spikes.md Step 1: the contract repo's own
 * README (coinbase/spend-permissions, `## Deployments`) lists this address for
 * SpendPermissionManager, and `eth_getCode` against mainnet.base.org,
 * sepolia.base.org, and ethereum-rpc.publicnode.com confirmed identical
 * bytecode present on all three chains on 2026-09-16. Ethereum mainnet (1) is
 * included per the brief's instruction ("If Ethereum mainnet is deployed, add
 * it") — the spikes doc found it deployed, contrary to the brief's own
 * fallback assumption that it was not.
 */
export const SPEND_PERMISSION_MANAGER: Record<number, `0x${string}`> = {
  8453: "0xf85210B21cC50302F477BA56686d2019dC9b67Ad", // Base mainnet
  84532: "0xf85210B21cC50302F477BA56686d2019dC9b67Ad", // Base Sepolia
  1: "0xf85210B21cC50302F477BA56686d2019dC9b67Ad", // Ethereum mainnet
};

export const spendPermissionManagerAbi = parseAbi([
  "struct SpendPermission { address account; address spender; address token; uint160 allowance; uint48 period; uint48 start; uint48 end; uint256 salt; bytes extraData; }",
  "struct PeriodSpend { uint48 start; uint48 end; uint160 spend; }",
  "function approveWithSignature(SpendPermission spendPermission, bytes signature) returns (bool)",
  "function spend(SpendPermission spendPermission, uint160 value)",
  "function getCurrentPeriod(SpendPermission spendPermission) view returns (PeriodSpend)",
  // docs/x402-spikes.md Step 4 records `isValid(SpendPermission memory spendPermission)`
  // (the full struct), not `isValid(bytes32 hash)` as the brief's placeholder had it.
  // Docs win per the brief's instruction; not currently called by this module.
  "function isValid(SpendPermission spendPermission) view returns (bool)",
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
