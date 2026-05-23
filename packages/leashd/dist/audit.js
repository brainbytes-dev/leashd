import { AuditEvent } from "@repo/leash-core";
import { signEvent } from "./sign";
export function createAuditWriter(store, config) {
    function buildSigned(partial) {
        const event = AuditEvent.parse({
            ...partial,
            workspaceId: config.workspaceId,
            seq: store.nextSeq(partial.agentId),
        });
        const signature = signEvent(event, config.signingPrivateKey);
        return { event, signature };
    }
    async function push(event, signature, localId) {
        try {
            const res = await fetch(`${config.controlPlaneUrl}/api/leash/audit`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    authorization: `Bearer ${config.agentToken}`,
                },
                body: JSON.stringify({ event, signature, signerPubKey: config.signingPublicKeyB64 }),
            });
            if (res.ok && localId !== undefined)
                store.markPushed([localId]);
        }
        catch {
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
            }
            else {
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
