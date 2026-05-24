import type { Metadata } from "next";
import Link from "next/link";
import { Terminal, KeyRound, ShieldCheck, Cable, Server } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BRAND, GITHUB_URL } from "@/components/marketing/brand";

export const metadata: Metadata = {
  title: "Docs: leashd",
  description:
    "Give your AI agents money and keep them on a leash. Non-custodial spend governance: caps, scoped credentials, and a signed audit log.",
};

const SECTIONS = [
  { id: "how-it-works", label: "How it works" },
  { id: "install", label: "Install" },
  { id: "quickstart", label: "Quickstart" },
  { id: "mcp-integration", label: "MCP integration" },
  { id: "self-host", label: "Self-host" },
];

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="font-mono text-foreground">{children}</span>;
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-card p-4 font-mono text-sm leading-relaxed text-foreground">
      <code>{children}</code>
    </pre>
  );
}

function Step({
  n,
  icon: Icon,
  title,
  children,
}: {
  n: number;
  icon: typeof Terminal;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full border border-border font-mono text-sm tabular-nums text-foreground">
            {n}
          </span>
          <Icon className="size-5 text-primary" aria-hidden />
          <CardTitle className="font-sans text-base font-bold">
            {title}
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

export default function DocsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto grid max-w-[66rem] gap-12 px-4 py-12 lg:grid-cols-[14rem_1fr] lg:py-16">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <nav className="flex flex-col gap-1">
              <span className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Documentation
              </span>
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="flex max-w-[44rem] flex-col gap-12">
            <header className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Terminal className="size-7 text-primary" aria-hidden />
                <h1 className="font-sans text-4xl font-bold tracking-tight">
                  {BRAND} docs
                </h1>
              </div>
              <p className="text-base leading-relaxed text-muted-foreground">
                <span className="text-foreground">
                  You hold the keys. {BRAND} holds the policy.
                </span>{" "}
                {BRAND} is a non-custodial spend-governance layer for AI agents.
                The control plane (this dashboard) authors signed policies and
                stores a tamper-evident audit log. The local daemon,{" "}
                <Mono>leashd</Mono>, runs on your machine, verifies each policy
                signature, and gates every payment your agent attempts before it
                touches a rail.
              </p>
              <p className="text-base leading-relaxed text-muted-foreground">
                {BRAND} never holds your funds and never sees your keys.
                Enforcement happens locally in <Mono>leashd</Mono>: it pulls the
                signed policy, verifies it, and authorises, caps, or denies each
                spend on the spot. If the control plane is unreachable,{" "}
                <Mono>leashd</Mono> keeps enforcing the last verified policy, so
                your agent is never unleashed by an outage.
              </p>
            </header>

            <section id="how-it-works" className="flex scroll-mt-24 flex-col gap-4">
              <h2 className="font-sans text-2xl font-bold tracking-tight">
                How it works
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Think of {BRAND} as a bouncer with a rulebook standing between
                your AI agent and your money. The agent wants to pay, the bouncer
                checks the rulebook (budget left? recipient allowed? under the
                limit? kill-switch off?), then lets it through or blocks it, and
                writes every decision in a logbook. The bouncer (
                <Mono>leashd</Mono>) runs on your machine and holds your wallet
                connection locally. The rulebook and logbook live in this
                dashboard.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                A concrete run: your research agent wants to pay 50 sat for an
                API call.
              </p>
              <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                <li>
                  The agent never gets your wallet. It gets a policy-gated{" "}
                  <Mono>pay</Mono> tool over MCP that points at{" "}
                  <Mono>leashd</Mono>.
                </li>
                <li>
                  The agent calls <Mono>pay 50 sat to api.foo.com</Mono>.
                </li>
                <li>
                  <Mono>leashd</Mono> checks your policy locally: allowlisted
                  recipient, under the per-transaction max, daily budget
                  remaining, kill-switch off.
                </li>
                <li>
                  <span className="text-allow">Allowed</span>: leashd tells your
                  own Lightning wallet (over NWC) to pay the invoice. The sats go
                  directly from your wallet to the API. {BRAND} never touches
                  them.
                </li>
                <li>
                  <span className="text-deny">Denied</span> or{" "}
                  <span className="text-capped">capped</span>: leashd returns a
                  structured refusal to the agent. No money moves.
                </li>
                <li>
                  Either way, leashd writes a signed event and pushes it to your{" "}
                  <Link
                    href="/dashboard/audit"
                    className="rounded text-primary underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Audit feed
                  </Link>
                  .
                </li>
              </ol>
              <Code>{`  AI agent --pay 50 sat--> leashd (your machine)
                              |  check policy (caps . allowlist . kill-switch)
                              |- allowed -> your wallet (NWC) --> api.foo.com
                              |- capped/denied -> refusal back to agent
                              '- signed audit event --> dashboard feed`}</Code>
              <p className="text-sm leading-relaxed text-muted-foreground">
                That is the whole idea: a prepaid card with a hard limit and an
                itemised statement for your AI. Even a fully compromised agent,
                or a breach of {BRAND} itself, cannot move funds, because the
                keys never leave your machine.
              </p>
            </section>

            <section id="install" className="flex scroll-mt-24 flex-col gap-4">
              <h2 className="font-sans text-2xl font-bold tracking-tight">
                Install
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                leashd is in early access. Install from source for now; a
                published one-line install is on the way. The build requires
                node 22.5 or newer and pnpm.
              </p>
              <Code>{`# install from source (requires node >= 22.5 and pnpm)
git clone https://github.com/brainbytes-dev/leashd
cd leashd && pnpm install`}</Code>
            </section>

            <section id="quickstart" className="flex scroll-mt-24 flex-col gap-4">
              <h2 className="font-sans text-2xl font-bold tracking-tight">
                Quickstart
              </h2>

              <Step n={1} icon={KeyRound} title="Create a workspace and agent">
                <p>
                  In the dashboard, open{" "}
                  <Link
                    href="/dashboard/agents"
                    className="rounded text-primary underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Agents
                  </Link>{" "}
                  and create your first agent. You will get a one-time token
                  shown once. Copy it now; it is the credential <Mono>leashd</Mono>{" "}
                  uses to authenticate.
                </p>
                <Code>{`LEASH_AGENT_TOKEN=lsh_live_xxxxxxxxxxxxxxxx`}</Code>
              </Step>

              <Step n={2} icon={ShieldCheck} title="Set a policy">
                <p>
                  Open{" "}
                  <Link
                    href="/dashboard/policies"
                    className="rounded text-primary underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Policies
                  </Link>{" "}
                  and define caps and an allowlist. A spend over a cap is{" "}
                  <span className="text-capped">capped</span>; an endpoint
                  outside the allowlist is{" "}
                  <span className="text-deny">denied</span>. The control plane
                  signs the policy and <Mono>leashd</Mono> verifies the signature
                  before enforcing it.
                </p>
                <Code>{`{
  "caps": { "perTxnSat": 10000, "dailySat": 100000 },
  "allowlist": ["api.example.com", "*.lightning.dev"]
}`}</Code>
              </Step>

              <Step n={3} icon={Terminal} title="Run leashd">
                <p>
                  Run the daemon with your env. It connects out to the control
                  plane, pulls the signed policy, and listens locally as an MCP
                  server.
                </p>
                <Code>{`LEASH_AGENT_TOKEN=lsh_live_xxxxxxxxxxxxxxxx \\
LEASH_API_URL=https://leashd.dev \\
pnpm --filter @repo/leashd dev`}</Code>
              </Step>

              <Step n={4} icon={Cable} title="Spend is now policy-gated">
                <p>
                  Every pay call your agent makes routes through{" "}
                  <Mono>leashd</Mono>, which authorises (
                  <span className="text-allow">allowed</span>), throttles (
                  <span className="text-capped">capped</span>), or blocks (
                  <span className="text-deny">denied</span>) it against the
                  verified policy. Each decision lands in your signed audit feed.
                </p>
                <Button asChild>
                  <Link href="/dashboard/audit">View the Audit feed</Link>
                </Button>
              </Step>
            </section>

            <section
              id="mcp-integration"
              className="flex scroll-mt-24 flex-col gap-4"
            >
              <h2 className="font-sans text-2xl font-bold tracking-tight">
                MCP integration
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Wire <Mono>leashd</Mono> into your agent stack. For Claude Code,
                add it to your <Mono>.mcp.json</Mono>:
              </p>
              <Code>{`{
  "mcpServers": {
    "leash": {
      "command": "leashd",
      "args": ["--mcp"],
      "env": {
        "LEASH_AGENT_TOKEN": "lsh_live_xxxxxxxxxxxxxxxx",
        "LEASH_API_URL": "https://leashd.dev"
      }
    }
  }
}`}</Code>
            </section>

            <section id="self-host" className="flex scroll-mt-24 flex-col gap-4">
              <h2 className="font-sans text-2xl font-bold tracking-tight">
                Self-host
              </h2>
              <div className="flex items-center gap-3">
                <Server className="size-5 text-primary" aria-hidden />
                <p className="text-sm font-medium text-foreground">
                  Runs entirely on your machine.
                </p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <Mono>leashd</Mono> is non-custodial by design: enforcement, your
                wallet connection, and your keys never leave your machine. The
                control plane that signs policies and stores the audit log can be
                self-hosted from the open-source repo, or you can use the hosted
                one at <Mono>leashd.dev</Mono>.
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                The full source, including the control plane, lives on{" "}
                <a
                  href={GITHUB_URL}
                  rel="noopener noreferrer"
                  className="rounded text-primary underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  GitHub
                </a>
                .
              </p>
            </section>

            <footer className="flex flex-col gap-2 border-t border-border pt-7">
              <p className="text-sm text-muted-foreground">
                Ready to start?{" "}
                <Link
                  href="/dashboard"
                  className="rounded text-primary underline-offset-2 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Open the dashboard
                </Link>
                .
              </p>
            </footer>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
