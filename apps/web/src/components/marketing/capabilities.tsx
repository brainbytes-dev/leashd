import {
  ListChecks,
  Timer,
  PowerOff,
  Plug,
  Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface CoreFeature {
  illustration: string;
  alt: string;
  title: string;
  body: string;
}

const CORE_FEATURES: CoreFeature[] = [
  {
    illustration: "/illustrations/feature-caps.png",
    alt: "A wallet meter with a green bar capping a flow of sats at a hard limit.",
    title: "Budget caps",
    body: "Per-task, rolling hourly, daily, and monthly limits, plus a per-transaction maximum. Hit the cap and the next payment is denied, deterministically.",
  },
  {
    illustration: "/illustrations/feature-control.png",
    alt: "A leash collar and a scoped key beside a green kill-switch toggle.",
    title: "Scoped control",
    body: "Bind agents to spend-limited, revocable rail credentials with explicit scopes, then pull a graded kill-switch the moment something looks wrong. Keys never enter the agent sandbox or the LLM context.",
  },
  {
    illustration: "/illustrations/feature-audit.png",
    alt: "A terminal log feed showing green allow and red deny lines in an append-only ledger.",
    title: "Immutable audit trail",
    body: "An append-only, signed, exportable event log of every decision. Designed for EU AI Act Article 12 logging requirements.",
  },
  {
    illustration: "/illustrations/feature-rails.png",
    alt: "A Lightning bolt and a stablecoin coin routed through a single green checkpoint.",
    title: "Multi-rail, BTC-first",
    body: "Bitcoin Lightning and L402, Cashu ecash, and stablecoin over x402. Bind rails with priority and fall back when one is unavailable.",
  },
];

interface Capability {
  icon: LucideIcon;
  title: string;
  body: string;
}

const MORE_CAPABILITIES: Capability[] = [
  {
    icon: ListChecks,
    title: "Allowlists",
    body: "Restrict spend to known endpoints, domains, Lightning addresses, and Cashu mints. An unlisted recipient is rejected atomically.",
  },
  {
    icon: Timer,
    title: "Rate limits",
    body: "Transactions per minute and per hour, capping burst spend before it compounds.",
  },
  {
    icon: Clock,
    title: "Time windows",
    body: "Define exactly when an agent may spend at all. Outside the window, every request is denied.",
  },
  {
    icon: PowerOff,
    title: "Graded shutdown",
    body: "A dimmer, not a switch: attenuate scope to read-only, drop high-risk tools, escalate approvals, then capture state and quarantine so no orphaned sub-agent keeps spending.",
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

        <div className="grid auto-rows-fr gap-4 md:grid-cols-2">
          {CORE_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-primary"
            >
              <img
                src={feature.illustration}
                alt={feature.alt}
                width={400}
                height={300}
                className="h-auto w-full border-b border-border"
              />
              <div className="flex flex-col gap-3 p-6">
                <h3 className="font-sans text-lg font-bold">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 mb-8 max-w-2xl text-center">
          <h3 className="font-sans text-xl font-bold tracking-tight">
            Plus the controls you reach for in production
          </h3>
        </div>
        <div className="grid auto-rows-fr gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MORE_CAPABILITIES.map((cap) => {
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
