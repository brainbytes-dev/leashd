import {
  Gauge,
  KeyRound,
  ListChecks,
  Timer,
  PowerOff,
  ScrollText,
  Network,
  Plug,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Capability {
  icon: LucideIcon;
  title: string;
  body: string;
  // span: how wide the card is on the lg bento grid (1 or 2 of 3 columns).
  span: 1 | 2;
}

const CAPABILITIES: Capability[] = [
  {
    icon: Gauge,
    title: "Budget caps",
    body: "Per-task, rolling hourly, daily, and monthly limits, plus a per-transaction maximum. Hit the cap and the next payment is denied, deterministically.",
    span: 2,
  },
  {
    icon: KeyRound,
    title: "Scoped credentials",
    body: "Bind agents to spend-limited, revocable rail credentials. Keys never enter the agent sandbox or the LLM context.",
    span: 1,
  },
  {
    icon: ListChecks,
    title: "Allowlists",
    body: "Restrict spend to known endpoints, domains, Lightning addresses, and Cashu mints. An unlisted recipient is rejected atomically.",
    span: 1,
  },
  {
    icon: Timer,
    title: "Rate limits",
    body: "Transactions per minute and per hour, with time windows that say when an agent may spend at all.",
    span: 1,
  },
  {
    icon: PowerOff,
    title: "Graded shutdown",
    body: "Not a binary kill switch. A dimmer: attenuate scope to read-only, drop high-risk tools, escalate approvals, then capture state and quarantine so no orphaned sub-agent keeps spending.",
    span: 1,
  },
  {
    icon: ScrollText,
    title: "Immutable audit trail",
    body: "An append-only, signed, exportable event log of every decision. Built to satisfy EU AI Act Article 12 logging.",
    span: 2,
  },
  {
    icon: Network,
    title: "Multi-rail",
    body: "Bitcoin Lightning and L402, Cashu ecash, and stablecoin over x402. Bind rails with priority and fall back when one is unavailable.",
    span: 1,
  },
  {
    icon: Plug,
    title: "MCP-native",
    body: "leashd ships as an MCP server exposing a policy-gated pay tool. Drop it into Claude Code or any MCP host.",
    span: 1,
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-mono text-3xl font-bold tracking-tight">
            A deterministic gate between your agent and the rail.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Policy is evaluated before settlement, locally, and cannot be
            bypassed by prompt manipulation.
          </p>
        </div>
        <div className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className={`flex flex-col gap-3 rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary/50 ${
                  cap.span === 2 ? "lg:col-span-2" : ""
                }`}
              >
                <Icon className="size-6 text-primary" aria-hidden />
                <h3 className="font-mono text-base font-semibold">
                  {cap.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {cap.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
