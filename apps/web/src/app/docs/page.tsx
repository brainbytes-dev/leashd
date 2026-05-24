import type { Metadata } from "next";
import Link from "next/link";
import { Terminal, KeyRound, ShieldCheck, Cable } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/components/marketing/brand";

export const metadata: Metadata = {
  title: "Quickstart — leashd",
  description:
    "Give your AI agents money and keep them on a leash. Non-custodial spend governance: caps, scoped credentials, and a signed audit log.",
};

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
          <CardTitle className="font-mono text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 font-sans text-sm leading-relaxed text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  );
}

export default function DocsPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Terminal className="size-6 text-primary" aria-hidden />
          <h1 className="font-mono text-3xl font-semibold tracking-tight">
            {BRAND} Quickstart
          </h1>
        </div>
        <p className="font-sans text-base leading-relaxed text-muted-foreground">
          {BRAND} is a non-custodial spend-governance layer for AI agents. You
          hold the keys; {BRAND} holds the policy. The control plane (this
          dashboard) authors signed policies and stores a tamper-evident audit
          log. The local daemon, <span className="font-mono text-foreground">leashd</span>,
          runs on your machine, verifies each policy signature, and gates every
          payment your agent attempts before it touches a rail.
        </p>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-lg font-semibold tracking-tight">
          The non-custodial model
        </h2>
        <p className="font-sans text-sm leading-relaxed text-muted-foreground">
          {BRAND} never holds your funds and never sees your keys. The dashboard
          stores only policies and the audit log. Enforcement happens locally in{" "}
          <span className="font-mono text-foreground">leashd</span>: it pulls
          the signed policy, verifies it, and authorises, caps, or denies each
          spend on the spot. If the control plane is unreachable,{" "}
          <span className="font-mono text-foreground">leashd</span> keeps
          enforcing the last verified policy — your agent is never unleashed by
          an outage.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-lg font-semibold tracking-tight">
          How it works
        </h2>
        <p className="font-sans text-sm leading-relaxed text-muted-foreground">
          Think of {BRAND} as a bouncer with a rulebook standing between your AI
          agent and your money. The agent wants to pay, the bouncer checks the
          rulebook (budget left? recipient allowed? under the limit? kill-switch
          off?), then lets it through or blocks it, and writes every decision in
          a logbook. The bouncer (<span className="font-mono text-foreground">leashd</span>)
          runs on your machine and holds your wallet connection locally. The
          rulebook and logbook live in this dashboard.
        </p>
        <p className="font-sans text-sm leading-relaxed text-muted-foreground">
          A concrete run: your research agent wants to pay 50 sat for an API
          call.
        </p>
        <ol className="flex list-decimal flex-col gap-2 pl-5 font-sans text-sm leading-relaxed text-muted-foreground">
          <li>
            The agent never gets your wallet. It gets a policy-gated{" "}
            <span className="font-mono text-foreground">pay</span> tool over MCP
            that points at <span className="font-mono text-foreground">leashd</span>.
          </li>
          <li>
            The agent calls{" "}
            <span className="font-mono text-foreground">pay 50 sat → api.foo.com</span>.
          </li>
          <li>
            <span className="font-mono text-foreground">leashd</span> checks your
            policy locally: allowlisted recipient, under the per-transaction max,
            daily budget remaining, kill-switch off.
          </li>
          <li>
            <span className="font-mono text-allow">Allowed</span> → leashd tells
            your own Lightning wallet (over NWC) to pay the invoice. The sats go
            directly from your wallet to the API. {BRAND} never touches them.
          </li>
          <li>
            <span className="font-mono text-deny">Denied</span> or{" "}
            <span className="font-mono text-capped">capped</span> → leashd returns
            a structured refusal to the agent. No money moves.
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
        <Code>{`  AI agent ──pay 50 sat──▶ leashd (your machine)
                              │  check policy (caps · allowlist · kill-switch)
                              ├─ allowed ─▶ your wallet (NWC) ──▶ api.foo.com
                              ├─ capped/denied ─▶ refusal back to agent
                              └─ signed audit event ──▶ dashboard feed`}</Code>
        <p className="font-sans text-sm leading-relaxed text-muted-foreground">
          That is the whole idea: a prepaid card with a hard limit and an
          itemised statement for your AI. Even a fully compromised agent, or a
          breach of {BRAND} itself, cannot move funds, because the keys never
          leave your machine.
        </p>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="font-mono text-lg font-semibold tracking-tight">
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
            and create your first agent. You will get a one-time token shown
            once — copy it now; it is the credential{" "}
            <span className="font-mono text-foreground">leashd</span> uses to
            authenticate.
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
            <span className="font-mono text-capped">capped</span>; an endpoint
            outside the allowlist is{" "}
            <span className="font-mono text-deny">denied</span>. The control
            plane signs the policy and{" "}
            <span className="font-mono text-foreground">leashd</span> verifies
            the signature before enforcing it.
          </p>
          <Code>{`{
  "caps": { "perTxnSat": 10000, "dailySat": 100000 },
  "allowlist": ["api.example.com", "*.lightning.dev"]
}`}</Code>
        </Step>

        <Step n={3} icon={Terminal} title="Install and run leashd">
          <p>
            Install the daemon and start it with your{" "}
            <span className="font-mono text-foreground">LEASH_*</span>{" "}
            environment. It connects out to the control plane, pulls the signed
            policy, and listens locally as an MCP server.
          </p>
          <Code>{`# install
curl -fsSL https://leashd.dev/install.sh | sh

# run with your env
LEASH_AGENT_TOKEN=lsh_live_xxxxxxxxxxxxxxxx \\
LEASH_API_URL=https://leashd.dev \\
leashd`}</Code>
          <p>
            Wire it into your agent stack. For Claude Code, add{" "}
            <span className="font-mono text-foreground">leashd</span> to your{" "}
            <span className="font-mono text-foreground">.mcp.json</span>:
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
        </Step>

        <Step n={4} icon={Cable} title="Spend is now policy-gated">
          <p>
            Every pay call your agent makes routes through{" "}
            <span className="font-mono text-foreground">leashd</span>, which
            authorises (<span className="font-mono text-allow">allowed</span>),
            throttles (<span className="font-mono text-capped">capped</span>),
            or blocks (<span className="font-mono text-deny">denied</span>) it
            against the verified policy. Each decision lands in your signed
            audit feed.
          </p>
          <Button asChild>
            <Link href="/dashboard/audit">View the Audit feed</Link>
          </Button>
        </Step>
      </section>

      <footer className="flex flex-col gap-2 border-t border-border pt-7">
        <p className="font-sans text-sm text-muted-foreground">
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
    </main>
  );
}
