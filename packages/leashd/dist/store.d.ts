import type { Amount, AuditEvent, EvalState, MoneyUnit } from "@repo/leash-core";
export interface StoredPolicy {
    version: number;
    specJson: string;
    signature: string;
}
export interface PersistedAudit {
    id: number;
    event: AuditEvent;
    signature: string;
}
export interface Store {
    computeEvalState(agentId: string, unit: MoneyUnit, now: number, rateWindowSeconds: number, taskRef?: string): EvalState;
    /** Atomically record committed spend + its signed audit event. */
    commit(input: {
        agentId: string;
        amount: Amount;
        taskRef?: string;
        event: AuditEvent;
        signature: string;
    }): void;
    /** Write a signed audit event without recording spend (denials etc.). */
    recordAudit(agentId: string, event: AuditEvent, signature: string): void;
    /** Next monotonic per-agent sequence number. */
    nextSeq(agentId: string): number;
    getPolicy(agentId: string): StoredPolicy | undefined;
    putPolicy(agentId: string, p: StoredPolicy): void;
    unpushedAudit(limit: number): PersistedAudit[];
    markPushed(ids: number[]): void;
    close(): void;
}
export declare function openStore(dbPath: string): Store;
//# sourceMappingURL=store.d.ts.map