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
}

const CAPABILITIES: Capability[] = [
  {
    icon: Gauge,
    title: "Budget caps",
    body: "Per-task, rolling hourly, daily, and monthly limits, plus a per-transaction maximum. Hit the cap and the next payment is denied, deterministically.",
  },
  {
    icon: KeyRound,
    title: "Scoped credentials",
    body: "Bind agents to spend-limited, revocable rail credentials. Keys never enter the agent sandbox or the LLM context.",
  },
  {
    icon: ListChecks,
    title: "Allowlists",
    body: "Restrict spend to known endpoints, domains, Lightning addresses, and Cashu mints. An unlisted recipient is rejected atomically.",
  },
  {
    icon: Timer,
    title: "Rate limits",
    body: "Transactions per minute and per hour, with time windows that say when an agent may spend at all.",
  },
  {
    icon: PowerOff,
    title: "Graded shutdown",
    body: "Not a binary kill switch. A dimmer: attenuate scope to read-only, drop high-risk tools, escalate approvals, then capture state and quarantine so no orphaned sub-agent keeps spending.",
  },
  {
    icon: ScrollText,
    title: "Immutable audit trail",
    body: "An append-only, signed, exportable event log of every decision. Designed for EU AI Act Article 12 logging requirements.",
  },
  {
    icon: Network,
    title: "Multi-rail",
    body: "Bitcoin Lightning and L402, Cashu ecash, and stablecoin over x402. Bind rails with priority and fall back when one is unavailable.",
  },
  {
    icon: Plug,
    title: "MCP-native",
    body: "leashd ships as an MCP server exposing a policy-gated pay tool. Drop it into Claude Code or any MCP host.",
  },
];

export function Capabilities() {
  return (
    <section id="capabilities" className="border-t border-border">
      <div className="mx-auto max-w-[66rem] px-4 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-sans text-3xl font-bold tracking-tight">
            A deterministic gate between your agent and the rail
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Policy is evaluated before settlement, locally, and cannot be
            bypassed by prompt manipulation.
          </p>
        </div>
        <div className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary"
              >
                <Icon className="size-6 text-primary" aria-hidden />
                <h3 className="font-sans text-base font-bold">{cap.title}</h3>
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
