import type { LeashConfig } from "./config";
import type { Store } from "./store";
import { applySignedPolicy } from "./policy";

/**
 * Pulls the agent's signed policy from the control plane on an interval and
 * applies it after signature verification (applySignedPolicy is fail-closed and
 * rejects version downgrades). Best-effort: network errors are logged to stderr
 * and retried on the next tick. stdout is reserved for the MCP stdio transport.
 */
const DEFAULT_INTERVAL_MS = 30_000;

export interface PolicySync {
  stop(): void;
}

export function startPolicySync(
  config: LeashConfig,
  store: Store,
  intervalMs: number = DEFAULT_INTERVAL_MS
): PolicySync {
  let stopped = false;

  async function tick(): Promise<void> {
    if (stopped) return;
    try {
      const url = `${config.controlPlaneUrl}/api/leash/policy?agentId=${encodeURIComponent(config.agentId)}`;
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${config.agentToken}` },
      });
      if (!res.ok) {
        if (res.status !== 404) {
          process.stderr.write(`leashd policy-sync: HTTP ${res.status}\n`);
        }
        return;
      }
      const body = (await res.json()) as {
        spec: unknown;
        version: number;
        signature: string | null;
      };
      if (!body.signature) {
        process.stderr.write("leashd policy-sync: policy is unsigned; skipped (fail-closed)\n");
        return;
      }
      const applied = applySignedPolicy(
        store,
        config,
        config.agentId,
        JSON.stringify(body.spec),
        body.signature
      );
      if (!applied) {
        process.stderr.write("leashd policy-sync: policy rejected (signature/downgrade)\n");
      }
    } catch (err) {
      process.stderr.write(
        `leashd policy-sync: ${err instanceof Error ? err.message : String(err)}\n`
      );
    }
  }

  // Prime immediately, then poll. leashd is a long-lived MCP daemon, so the
  // interval keeping the loop alive is fine.
  void tick();
  const handle = setInterval(() => void tick(), intervalMs);

  return {
    stop() {
      stopped = true;
      clearInterval(handle);
    },
  };
}
