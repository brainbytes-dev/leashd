import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Bot,
  ShieldCheck,
  ScrollText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Plus,
} from "lucide-react";
import {
  getDb,
  eq,
  and,
  gte,
  desc,
  sql,
  agents,
  policies,
  auditEvents,
  type AuditEvent,
} from "@repo/db";
import type { Decision } from "@repo/leash-core";
import { getActiveContext } from "@/lib/leash/server";
import { auditColumnsToAmount } from "@/lib/leash/api";
import { formatAmount, decisionColor, decisionLabel } from "@/lib/leash/format";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const ICONS: Record<Decision, typeof CheckCircle2> = {
  allowed: CheckCircle2,
  denied: XCircle,
  capped: AlertTriangle,
  approval_required: HelpCircle,
};

type Counts = {
  agents: number;
  activePolicies: number;
  events24h: number;
  allowed: number;
  denied: number;
  capped: number;
};

async function loadCounts(workspaceId: string): Promise<Counts> {
  const db = getDb();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [agentRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(agents)
    .where(eq(agents.workspaceId, workspaceId));

  const [policyRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(policies)
    .where(
      and(eq(policies.workspaceId, workspaceId), eq(policies.active, true))
    );

  const [eventRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.workspaceId, workspaceId),
        gte(auditEvents.occurredAt, since)
      )
    );

  const breakdown = await db
    .select({
      decision: auditEvents.decision,
      n: sql<number>`count(*)::int`,
    })
    .from(auditEvents)
    .where(
      and(
        eq(auditEvents.workspaceId, workspaceId),
        gte(auditEvents.occurredAt, since)
      )
    )
    .groupBy(auditEvents.decision);

  const byDecision = (d: string) =>
    breakdown.find((b) => b.decision === d)?.n ?? 0;

  return {
    agents: agentRow?.n ?? 0,
    activePolicies: policyRow?.n ?? 0,
    events24h: eventRow?.n ?? 0,
    allowed: byDecision("allowed"),
    denied: byDecision("denied"),
    capped: byDecision("capped"),
  };
}

export default async function OverviewPage() {
  const ctx = await getActiveContext();
  if (!ctx) redirect("/login");

  if (!ctx.workspace) {
    return (
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="font-mono text-lg">
              Create your first workspace
            </CardTitle>
            <CardDescription className="font-sans">
              A workspace holds your agents, policies, rails and the audit log.
              Create one to start governing agent spend.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/agents">
                <Plus aria-hidden />
                Get started
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const counts = await loadCounts(ctx.workspace.id);

  const db = getDb();
  const recent: (AuditEvent & { agentName: string | null })[] = await db
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
    .where(eq(auditEvents.workspaceId, ctx.workspace.id))
    .orderBy(desc(auditEvents.occurredAt))
    .limit(8);

  return (
    <main className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-semibold tracking-tight">
          Overview
        </h1>
        <p className="font-sans text-sm text-muted-foreground">
          Workspace{" "}
          <span className="font-mono text-foreground">
            {ctx.workspace.name}
          </span>{" "}
          — last 24h of governed spend.
        </p>
      </header>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Agents"
          value={counts.agents}
          icon={Bot}
          href="/dashboard/agents"
        />
        <StatCard
          label="Active policies"
          value={counts.activePolicies}
          icon={ShieldCheck}
          href="/dashboard/policies"
        />
        <StatCard
          label="Events (24h)"
          value={counts.events24h}
          icon={ScrollText}
          href="/dashboard/audit"
        />
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="font-sans text-xs uppercase tracking-wide">
              Decisions (24h)
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 font-mono text-sm tabular-nums">
            <DecisionLine
              icon={CheckCircle2}
              label="allowed"
              value={counts.allowed}
              className="text-allow"
            />
            <DecisionLine
              icon={AlertTriangle}
              label="capped"
              value={counts.capped}
              className="text-capped"
            />
            <DecisionLine
              icon={XCircle}
              label="denied"
              value={counts.denied}
              className="text-deny"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent activity + Get started */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="font-mono text-base">
              Recent activity
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/audit">
                View audit
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50 border-t border-border">
              {recent.length === 0 ? (
                <p className="px-4 py-8 text-center font-mono text-sm text-muted-foreground">
                  No audit events yet. leashd pushes events to{" "}
                  <span className="text-info">POST /api/leash/audit</span>.
                </p>
              ) : (
                recent.map((e, i) => {
                  const decision = e.decision as Decision;
                  const Icon = ICONS[decision] ?? HelpCircle;
                  const amount = auditColumnsToAmount(e);
                  return (
                    <div
                      key={e.id}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 font-mono text-xs ${
                        i % 2 === 1 ? "bg-muted/40" : "bg-card"
                      }`}
                    >
                      <span className="text-muted-foreground tabular-nums">
                        {new Date(e.occurredAt)
                          .toISOString()
                          .replace("T", " ")
                          .slice(0, 19)}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-foreground">
                        {e.agentName ?? "—"}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="max-w-[24ch] truncate text-foreground">
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
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-base">Get started</CardTitle>
            <CardDescription className="font-sans">
              Three steps to a leashed agent.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <GetStartedStep
              n={1}
              title="Create an agent"
              body="Mint a scoped agent and grab its one-time token."
              href="/dashboard/agents"
              cta="Open Agents"
            />
            <GetStartedStep
              n={2}
              title="Set a policy"
              body="Define caps and an allowlist. leashd verifies it before enforcing."
              href="/dashboard/policies"
              cta="Open Policies"
            />
            <GetStartedStep
              n={3}
              title="Run leashd"
              body="Install the daemon locally; pay calls become policy-gated."
              href="/docs"
              cta="Read the docs"
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  href,
}: {
  label: string;
  value: number;
  icon: typeof Bot;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-lg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <Card className="transition-colors hover:border-primary/50">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardDescription className="font-sans text-xs uppercase tracking-wide">
            {label}
          </CardDescription>
          <Icon className="size-4 text-muted-foreground" aria-hidden />
        </CardHeader>
        <CardContent>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {value.toLocaleString("en-US")}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

function DecisionLine({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={`inline-flex items-center gap-2 ${className}`}>
        <Icon className="size-4" aria-hidden />
        {label}
      </span>
      <span className="tabular-nums text-foreground">
        {value.toLocaleString("en-US")}
      </span>
    </div>
  );
}

function GetStartedStep({
  n,
  title,
  body,
  href,
  cta,
}: {
  n: number;
  title: string;
  body: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-full border border-border font-mono text-xs tabular-nums text-foreground">
          {n}
        </span>
        <span className="font-mono text-sm font-medium">{title}</span>
      </div>
      <p className="pl-8 font-sans text-sm text-muted-foreground">{body}</p>
      <Link
        href={href}
        className="ml-8 inline-flex w-fit items-center gap-1 rounded-md font-sans text-sm text-primary outline-none transition-colors hover:text-primary/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {cta}
        <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
