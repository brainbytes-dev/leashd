"use client";

import { useState } from "react";
import { createBaseAccountSDK, type ProviderInterface } from "@base-org/account";
import type { requestSpendPermission } from "@base-org/account/spend-permission";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Must stay in sync with NETWORKS in packages/leashd/src/rails/x402-wiring.ts.
const USDC: Record<number, `0x${string}`> = {
  8453: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
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
  const [provider, setProvider] = useState<ProviderInterface | null>(null);
  const [granted, setGranted] = useState<Granted | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function grant() {
    setError(null);
    try {
      // Dynamic import: @base-org/account/spend-permission's Node build (what
      // Next.js resolves while analyzing this client component during the
      // server build) omits the browser-only wallet-interaction exports. A
      // runtime import forces bundling for the browser instead.
      const { requestSpendPermission } = await import("@base-org/account/spend-permission");
      const sdk = createBaseAccountSDK({ appName: "leashd", appChainIds: [chainId] });
      const activeProvider = sdk.getProvider();
      setProvider(activeProvider);
      const [account] = (await activeProvider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const permission = await requestSpendPermission({
        account: account as `0x${string}`,
        spender: spender as `0x${string}`,
        token: USDC[chainId],
        chainId,
        allowance: BigInt(Math.round(Number(dollarsPerPeriod) * 1_000_000)),
        periodInDays: Number(periodDays),
        provider: activeProvider,
      });
      setGranted(permission);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  /** Save the permission to a file locally. Nothing is uploaded. */
  function download(p: Granted) {
    setError(null);
    try {
      const url = URL.createObjectURL(
        new Blob([serialise(p)], { type: "application/json" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `leash-x402-permission-${chainId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  /**
   * Clipboard access is unavailable in an insecure context and can be denied by
   * permission, so surface the failure instead of dropping it on the floor.
   */
  function copy(p: Granted) {
    setError(null);
    const failed = (e: unknown) =>
      setError(
        `Could not copy to clipboard (${e instanceof Error ? e.message : String(e)}). Use Download JSON instead.`
      );
    try {
      navigator.clipboard.writeText(serialise(p)).catch(failed);
    } catch (e) {
      failed(e);
    }
  }

  async function revoke() {
    if (!granted || !provider) return;
    try {
      const { requestRevoke } = await import("@base-org/account/spend-permission");
      await requestRevoke({ provider, permission: granted });
      setGranted(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-6">
      <h1 className="font-mono text-lg">Grant a spend permission to your agent key</h1>
      <p className="font-sans text-sm text-muted-foreground">
        Runs entirely in your browser. Nothing is sent to leashd.dev. Download the JSON and point
        <code> LEASH_X402_PERMISSION_PATH</code> at it.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor="chain">Chain</Label>
        <Select value={String(chainId)} onValueChange={(v) => setChainId(Number(v))}>
          <SelectTrigger id="chain" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="8453">Base (eip155:8453)</SelectItem>
            <SelectItem value="84532">Base Sepolia (eip155:84532)</SelectItem>
            <SelectItem value="1">Ethereum (eip155:1)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="spender">
          Agent address (from `pnpm --filter @repo/leashd x402 keygen`)
        </Label>
        <Input
          id="spender"
          value={spender}
          onChange={(e) => setSpender(e.target.value)}
          placeholder="0x…"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="usd">USDC per period</Label>
        <Input id="usd" value={dollarsPerPeriod} onChange={(e) => setDollars(e.target.value)} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="days">Period (days)</Label>
        <Input id="days" value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} />
      </div>
      <Button
        className="cursor-pointer"
        onClick={grant}
        disabled={!/^0x[0-9a-fA-F]{40}$/.test(spender)}
      >
        Grant with Base Account
      </Button>
      {error && <p className="font-sans text-sm text-deny">{error}</p>}
      {granted && (
        <>
          <pre className="max-h-64 overflow-auto rounded bg-muted p-3 text-xs">
            {serialise(granted)}
          </pre>
          <div className="flex gap-2">
            <Button className="cursor-pointer" onClick={() => download(granted)}>
              Download JSON
            </Button>
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => copy(granted)}
            >
              Copy JSON
            </Button>
            <Button className="cursor-pointer" variant="destructive" onClick={revoke}>
              Revoke
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
