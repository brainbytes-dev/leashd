import { AuditEvent } from "@repo/leash-core";
import type { LeashConfig } from "./config";
import type { Store } from "./store";
import { signEvent } from "./sign";

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

export function createAuditWriter(store: Store, config: LeashConfig): AuditWriter {
  function buildSigned(
    partial: Omit<AuditEvent, "seq" | "workspaceId">
  ): { event: AuditEvent; signature: string } {
    const event = AuditEvent.parse({
      ...partial,
      workspaceId: config.workspaceId,
      seq: store.nextSeq(partial.agentId),
    });
    const signature = signEvent(event, config.signingPrivateKey);
    return { event, signature };
  }

  async function push(event: AuditEvent, signature: string, localId?: number): Promise<void> {
    try {
      const res = await fetch(`${config.controlPlaneUrl}/api/leash/audit`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.agentToken}`,
        },
        body: JSON.stringify({ event, signature, signerPubKey: config.signingPublicKeyB64 }),
      });
      if (res.ok && localId !== undefined) store.markPushed([localId]);
    } catch {
      // Offline: the event is already persisted locally and flagged unpushed.
    }
  }

  return {
    emit(partial, recordSpend) {
      const { event, signature } = buildSigned(partial);

      if (recordSpend && event.amount) {
        store.commit({
          agentId: event.agentId,
          amount: event.amount,
          taskRef: recordSpend.taskRef,
          event,
          signature,
        });
      } else {
        store.recordAudit(event.agentId, event, signature);
      }

      void push(event, signature);
      return event;
    },

    async flush() {
      const pending = store.unpushedAudit(100);
      for (const p of pending) {
        await push(p.event, p.signature, p.id);
      }
    },
  };
}
