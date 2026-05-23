import { PaymentRequest, type PolicyDecision, type PolicySpec } from "@repo/leash-core";
import type { LeashConfig } from "./config";
import type { Store } from "./store";
import type { RailAdapter, RailResult } from "./rails/types";
import type { AuditWriter } from "./audit";
export interface GovernorResult {
    decision: PolicyDecision;
    policyVersion?: number;
    settled?: RailResult;
}
export interface Governor {
    /** Two-phase commit: propose -> validate -> settle -> commit, always audit. */
    requestPayment(req: PaymentRequest, opts?: {
        taskRef?: string;
    }): Promise<GovernorResult>;
    /** Validate only (dry-run). No settlement, no spend, but still audited as the decision. */
    checkPolicy(req: PaymentRequest): GovernorResult;
}
export declare function createGovernor(deps: {
    store: Store;
    config: LeashConfig;
    audit: AuditWriter;
    rails: Map<PaymentRequest["rail"], RailAdapter>;
    /** Override policy resolution (tests). */
    resolvePolicy?: (agentId: string) => PolicySpec | undefined;
}): Governor;
//# sourceMappingURL=governor.d.ts.map