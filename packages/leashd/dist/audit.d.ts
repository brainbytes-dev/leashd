import { AuditEvent } from "@repo/leash-core";
import type { LeashConfig } from "./config";
import type { Store } from "./store";
/**
 * Audit pipeline. Every payment outcome (allowed/denied/capped/approval) is
 * written to the local append-only log as the record of truth, then pushed to
 * the control plane best-effort. Only metadata + the decision leave the device:
 * never rail secrets, invoices, or preimages.
 */
export interface AuditWriter {
    /** Build + sign + persist an event; returns the signed event. Pushes async. */
    emit(partial: Omit<AuditEvent, "seq" | "workspaceId">, recordSpend?: SpendRecord): AuditEvent;
    /** Flush any locally queued (unpushed) events to the control plane. */
    flush(): Promise<void>;
}
export interface SpendRecord {
    taskRef?: string;
}
export declare function createAuditWriter(store: Store, config: LeashConfig): AuditWriter;
//# sourceMappingURL=audit.d.ts.map