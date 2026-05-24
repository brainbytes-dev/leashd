import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, auditEvents } from "@repo/db";
import { AuditEvent } from "@repo/leash-core";
import { err, authAgent, amountToAuditColumns } from "@/lib/leash/api";
import { verifySignatureB64Spki } from "@/lib/leash/signing";

/**
 * leashd pushes signed audit events here (bearer agent-token auth). Events are
 * append-only and deduped on (agentId, seq) via the unique index — a retried
 * push is a no-op, not a duplicate row. The detached signature over the
 * canonical event is verified against leashd's signer key for tamper-evidence.
 */
const Body = z.object({
  signature: z.string().min(1),
  signerPubKey: z.string().min(1),
  event: AuditEvent,
});

export async function POST(request: NextRequest) {
  const agent = await authAgent(request.headers);
  if (!agent) return err(401, "Unauthorized");

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return err(400, "Invalid audit event");

  const { event, signature, signerPubKey } = parsed.data;
  // The event must belong to the authenticated agent + its workspace.
  if (event.agentId !== agent.id || event.workspaceId !== agent.workspaceId)
    return err(403, "Agent mismatch");

  // Tamper-evidence: the signature must verify over the canonical event.
  if (!verifySignatureB64Spki(event, signature, signerPubKey))
    return err(400, "Invalid audit signature");

  const amount = amountToAuditColumns(event.amount);
  const db = getDb();

  const inserted = await db
    .insert(auditEvents)
    .values({
      workspaceId: agent.workspaceId,
      agentId: agent.id,
      seq: event.seq,
      decision: event.decision,
      rail: event.rail ?? null,
      endpoint: event.endpoint ?? null,
      amountMsat: amount.amountMsat,
      amountMinor: amount.amountMinor,
      currency: amount.currency,
      reason: event.reason ?? null,
      policyVersion: event.policyVersion ?? null,
      signature,
      occurredAt: new Date(event.occurredAt),
    })
    .onConflictDoNothing({
      target: [auditEvents.agentId, auditEvents.seq],
    })
    .returning({ id: auditEvents.id });

  // Empty array → the (agentId, seq) already existed; treat as success.
  return NextResponse.json(
    { accepted: true, deduped: inserted.length === 0 },
    { status: 202 }
  );
}
