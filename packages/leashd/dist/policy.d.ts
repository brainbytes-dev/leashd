import { PolicySpec } from "@repo/leash-core";
import type { LeashConfig } from "./config";
import type { Store } from "./store";
/**
 * Resolves the current PolicySpec for an agent from the local signed cache.
 * The control plane signs every policy; leashd verifies the signature before
 * applying. A policy that fails verification is rejected (fail-closed): callers
 * get `undefined` and the governor denies.
 */
export declare function loadAgentPolicy(store: Store, config: LeashConfig, agentId: string): PolicySpec | undefined;
/**
 * Persist a freshly pulled signed policy after verifying it. Returns true if it
 * was accepted (verified and not a downgrade), false otherwise.
 */
export declare function applySignedPolicy(store: Store, config: LeashConfig, agentId: string, specJson: string, signature: string): boolean;
//# sourceMappingURL=policy.d.ts.map