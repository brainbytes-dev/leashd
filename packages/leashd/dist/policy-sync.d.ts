import type { LeashConfig } from "./config";
import type { Store } from "./store";
export interface PolicySync {
    stop(): void;
}
export declare function startPolicySync(config: LeashConfig, store: Store, intervalMs?: number): PolicySync;
//# sourceMappingURL=policy-sync.d.ts.map