import { Syringe, Repeat, FileX2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Point {
  icon: LucideIcon;
  title: string;
  body: string;
}

const POINTS: Point[] = [
  {
    icon: Syringe,
    title: "Prompt-injection drain",
    body: "A poisoned tool description or hostile web page convinces an agent to pay an attacker. With an unbounded wallet, that is your whole balance gone.",
  },
  {
    icon: Repeat,
    title: "Runaway loops",
    body: "An agent stuck in a retry loop can fire thousands of micropayments before anyone notices. Probabilistic guardrails do not stop deterministic spend.",
  },
  {
    icon: FileX2,
    title: "No audit trail",
    body: "When money moves autonomously, you need a verifiable record of which agent paid whom, for how much, and why. Most setups have none.",
  },
];

export function Problem() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-mono text-3xl font-bold tracking-tight">
            An agent with an open wallet is a liability.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Agents now discover services, buy compute, and pay other agents on
            their own. Hand one an unconstrained wallet and three failure modes
            become catastrophic.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {POINTS.map((point) => {
            const Icon = point.icon;
            return (
              <div
                key={point.title}
                className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6"
              >
                <Icon className="size-6 text-deny" aria-hidden />
                <h3 className="font-mono text-base font-semibold">
                  {point.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {point.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
