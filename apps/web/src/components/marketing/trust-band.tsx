import { ShieldCheck, KeyRound, Server } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Pillar {
  icon: LucideIcon;
  title: string;
  body: string;
}

const PILLARS: Pillar[] = [
  {
    icon: KeyRound,
    title: "Your keys stay yours",
    body: "Keys and seeds never leave your machine and never reach the control plane. leashd connects to your wallet locally: a revocable Lightning connection, or a dedicated agent wallet you fund. Settlement is between your wallet and the counterparty.",
  },
  {
    icon: Server,
    title: "leashd always runs locally",
    body: "The agent that holds rail credentials and moves money runs on your own machine, in both the hosted and self-hosted setup. The control plane only signs policy and aggregates audit; it never sees a credential.",
  },
  {
    icon: ShieldCheck,
    title: "Compromise-resistant",
    body: "Even a total compromise of the platform cannot move your funds, because the platform never holds the keys that can.",
  },
];

export function TrustBand() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[66rem] px-4 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="font-sans text-3xl font-bold tracking-tight">
            You hold the keys.{" "}
            <span className="text-primary">leashd holds the policy.</span>
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            This is non-custodial software. It sits in the policy path, not the
            custody path. leashd is not a bank, exchange, or money transmitter.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div key={pillar.title} className="flex flex-col gap-3">
                <Icon className="size-6 text-primary" aria-hidden />
                <h3 className="font-sans text-base font-bold">
                  {pillar.title}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {pillar.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
