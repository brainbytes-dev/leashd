import { redirect } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
} from "lucide-react";
import {
  getDb,
  eq,
  and,
  desc,
  agents,
  auditEvents,
  type AuditEvent,
} from "@repo/db";
import type { Decision } from "@repo/leash-core";
import { getActiveContext } from "@/lib/leash/server";
import { auditColumnsToAmount } from "@/lib/leash/api";
import { formatAmount, decisionColor, decisionLabel } from "@/lib/leash/format";
import { AuditFilters } from "./audit-filters";

export const dynamic = "force-dynamic";

const ICONS: Record<Decision, typeof CheckCircle2> = {
  allowed: CheckCircle2,
  denied: XCircle,
  capped: AlertTriangle,
  approval_required: HelpCircle,
};

type Search = { agentId?: string; decision?: string };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");
  const sp = await searchParams;

  let rows: (AuditEvent & { agentName: string | null })[] = [];
  let agentOptions: { id: string; name: string }[] = [];

  if (ctx.workspace) {
    const db = getDb();
    agentOptions = await db
      .select({ id: agents.id, name: agents.name })
      .from(agents)
      .where(eq(agents.workspaceId, ctx.workspace.id))
      .orderBy(desc(agents.createdAt));

    const filters = [eq(auditEvents.workspaceId, ctx.workspace.id)];
    if (sp.agentId) filters.push(eq(auditEvents.agentId, sp.agentId));
    if (sp.decision) filters.push(eq(auditEvents.decision, sp.decision));

    rows = await db
      .select({
        id: auditEvents.id,
        workspaceId: auditEvents.workspaceId,
        agentId: auditEvents.agentId,
        seq: auditEvents.seq,
        decision: auditEvents.decision,
        rail: auditEvents.rail,
        endpoint: auditEvents.endpoint,
        amountMsat: auditEvents.amountMsat,
        amountMinor: auditEvents.amountMinor,
        currency: auditEvents.currency,
        reason: auditEvents.reason,
        policyVersion: auditEvents.policyVersion,
        signature: auditEvents.signature,
        occurredAt: auditEvents.occurredAt,
        createdAt: auditEvents.createdAt,
        agentName: agents.name,
      })
      .from(auditEvents)
      .leftJoin(agents, eq(auditEvents.agentId, agents.id))
      .where(and(...filters))
      .orderBy(desc(auditEvents.occurredAt))
      .limit(200);
  }

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">Audit</h1>
        <p className="font-sans text-sm text-muted-foreground">
          Append-only, signed governance log pushed from leashd. EU AI Act Art.
          12 grade.
        </p>
      </header>

      {!ctx.workspace ? (
        <p className="font-sans text-sm text-muted-foreground">
          Create a workspace first.
        </p>
      ) : (
        <>
          <AuditFilters agents={agentOptions} />
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2 font-mono text-xs text-muted-foreground">
              <span>timestamp</span>
              <span>·</span>
              <span>agent</span>
              <span>·</span>
              <span>endpoint</span>
              <span>·</span>
              <span>amount</span>
              <span>·</span>
              <span>decision</span>
            </div>
            <div className="divide-y divide-border/50">
              {rows.length === 0 ? (
                <p className="px-4 py-8 text-center font-mono text-sm text-muted-foreground">
                  No audit events yet. leashd pushes events to{" "}
                  <span className="text-info">POST /api/leash/audit</span>.
                </p>
              ) : (
                rows.map((e) => {
                  const decision = e.decision as Decision;
                  const Icon = ICONS[decision] ?? HelpCircle;
                  const amount = auditColumnsToAmount(e);
                  return (
                    <div
                      key={e.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 font-mono text-xs odd:bg-muted/40"
                    >
                      <span className="text-muted-foreground tabular-nums">
                        {new Date(e.occurredAt).toISOString().replace("T", " ").slice(0, 19)}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-foreground">{e.agentName ?? "—"}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="max-w-[28ch] truncate text-foreground">
                        {e.endpoint ?? "—"}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-right tabular-nums text-foreground">
                        {formatAmount(amount)}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span
                        className={`inline-flex items-center gap-1 ${decisionColor[decision]}`}
                      >
                        <Icon className="size-3" aria-hidden />
                        {decisionLabel[decision]}
                      </span>
                      {e.rail && (
                        <span className="text-muted-foreground">[{e.rail}]</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
