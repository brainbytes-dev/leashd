import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface Tier {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  cta: string;
  href: string;
  highlight: boolean;
}

const TIERS: Tier[] = [
  {
    name: "Free",
    price: "$0",
    blurb: "The open-source sidecar, plus one workspace on the control plane.",
    features: [
      "leashd, open source, self-hosted",
      "1 workspace",
      "Core policy: caps, scope, rate limits, kill-switch",
      "7-day audit retention",
    ],
    cta: "Start free",
    href: "/signup",
    highlight: false,
  },
  {
    name: "Pro",
    price: "Coming soon",
    blurb: "For developers running serious agent swarms.",
    features: [
      "More agents per workspace",
      "Long audit retention and export",
      "Approval workflows",
      "Alerting on policy events",
    ],
    cta: "Start free",
    href: "/signup",
    highlight: true,
  },
  {
    name: "Team",
    price: "Coming soon",
    blurb: "Shared policy and audit across a team.",
    features: [
      "Everything in Pro",
      "Team members and roles",
      "Workspace-wide policy",
      "Aggregated audit across agents",
    ],
    cta: "Get notified",
    href: "/signup",
    highlight: false,
  },
];

export function PricingTeaser() {
  return (
    <section id="pricing" className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-20">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-mono text-3xl font-bold tracking-tight">
            Open core. Start free.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            The sidecar is free and open source. The hosted control plane adds
            policy authoring, audit aggregation, and team features.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`flex flex-col gap-6 rounded-lg border bg-card p-6 ${
                tier.highlight ? "border-primary" : "border-border"
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-mono text-lg font-semibold">
                    {tier.name}
                  </h3>
                  {tier.highlight ? (
                    <Badge className="font-mono text-xs">Popular</Badge>
                  ) : null}
                </div>
                <p className="font-mono text-2xl font-bold tabular-nums">
                  {tier.price}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {tier.blurb}
                </p>
              </div>
              <ul className="flex flex-1 flex-col gap-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm leading-relaxed"
                  >
                    <Check
                      className="mt-0.5 size-4 shrink-0 text-allow"
                      aria-hidden
                    />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                className="w-full"
                variant={tier.highlight ? "default" : "outline"}
              >
                <Link href={tier.href}>{tier.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
