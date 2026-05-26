import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DOCS_URL } from "./brand";

interface Step {
  label: string;
  body: string;
}

const STEPS: Step[] = [
  {
    label: "Agent requests a payment",
    body: "Your agent calls a policy-gated pay tool over MCP. It never holds your wallet.",
  },
  {
    label: "leashd checks the policy",
    body: "Caps, allowlist, rate limits, and kill-switch are evaluated locally before any money moves.",
  },
  {
    label: "Decision is recorded",
    body: "Allow, cap, or deny. Either way a signed event lands in your audit feed.",
  },
];

export function HowItWorks() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[66rem] px-4 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-sans text-3xl font-bold tracking-tight">
            How it works
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            A bouncer with a rulebook, standing between your agent and your
            money.
          </p>
        </div>
        <div className="mb-12 overflow-hidden rounded-lg border border-border bg-card p-4 md:p-6">
          <img
            src="/illustrations/how-it-works.svg"
            alt="A network diagram over a stylized world map: an AI agent sends a payment request to the central leashd policy gate, which checks caps, allowlist, and rate limits, then settles over Lightning or Cashu ecash, while writing a signed entry to the audit log."
            width={1200}
            height={520}
            className="h-auto w-full"
          />
        </div>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.label}
              className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6"
            >
              <span className="font-mono text-sm tabular-nums text-primary">
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className="font-sans text-base font-bold">{step.label}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline">
            <Link href={DOCS_URL}>Read the docs</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
