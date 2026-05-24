import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DOCS_URL, GET_STARTED_URL } from "./brand";

interface Step {
  body: string;
  code: string;
}

const STEPS: Step[] = [
  {
    body: "Create a workspace and agent in the dashboard. Copy the one-time token.",
    code: "LEASH_AGENT_TOKEN=lsh_live_...",
  },
  {
    body: "Set a policy: caps, allowlist, rate limits. The control plane signs it.",
    code: '{ "caps": { "dailySat": 100000 } }',
  },
  {
    body: "Install and run leashd. It verifies the policy and gates every spend.",
    code: "curl -fsSL leashd.dev/install.sh | sh",
  },
];

export function GetStarted() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[66rem] px-4 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-sans text-3xl font-bold tracking-tight">
            Get started in three steps
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Open core. The sidecar is free and open source. The hosted control
            plane has a paid tier.
          </p>
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.code}
              className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6"
            >
              <span className="font-mono text-sm tabular-nums text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
              <pre className="overflow-x-auto rounded-md border border-border px-3 py-2 font-mono text-xs leading-relaxed text-foreground">
                <code>{step.code}</code>
              </pre>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={GET_STARTED_URL}>Get started</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={DOCS_URL}>Read the docs</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
