import { NextRequest, NextResponse } from "next/server";
import { getDb, eq, and, desc, agents, auditEvents } from "@repo/db";
import { err, getSessionUser, isMember } from "@/lib/leash/api";

const COLUMNS = [
  "occurred_at",
  "agent",
  "decision",
  "rail",
  "endpoint",
  "amount_msat",
  "amount_minor",
  "currency",
  "reason",
  "policy_version",
  "seq",
  "signature",
] as const;

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request.headers);
  if (!user) return err(401, "Unauthorized");

  const workspaceId = request.nextUrl.searchParams.get("workspaceId");
  const agentId = request.nextUrl.searchParams.get("agentId");
  const decision = request.nextUrl.searchParams.get("decision");
  if (!workspaceId) return err(400, "workspaceId required");
  if (!(await isMember(user.id, workspaceId))) return err(403, "Forbidden");

  const db = getDb();
  const filters = [eq(auditEvents.workspaceId, workspaceId)];
  if (agentId) filters.push(eq(auditEvents.agentId, agentId));
  if (decision) filters.push(eq(auditEvents.decision, decision));

  const rows = await db
    .select({
      occurredAt: auditEvents.occurredAt,
      agentName: agents.name,
      decision: auditEvents.decision,
      rail: auditEvents.rail,
      endpoint: auditEvents.endpoint,
      amountMsat: auditEvents.amountMsat,
      amountMinor: auditEvents.amountMinor,
      currency: auditEvents.currency,
      reason: auditEvents.reason,
      policyVersion: auditEvents.policyVersion,
      seq: auditEvents.seq,
      signature: auditEvents.signature,
    })
    .from(auditEvents)
    .leftJoin(agents, eq(auditEvents.agentId, agents.id))
    .where(and(...filters))
    .orderBy(desc(auditEvents.occurredAt))
    .limit(10000);

  const lines = [COLUMNS.join(",")];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.occurredAt).toISOString(),
        r.agentName ?? "",
        r.decision,
        r.rail ?? "",
        r.endpoint ?? "",
        r.amountMsat ?? "",
        r.amountMinor ?? "",
        r.currency ?? "",
        r.reason ?? "",
        r.policyVersion ?? "",
        r.seq,
        r.signature,
      ]
        .map(csvCell)
        .join(",")
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leashd-audit-${date}.csv"`,
    },
  });
}
