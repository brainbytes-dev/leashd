import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BRAND } from "@/components/marketing/brand";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about leashd: custody, where your keys live, supported rails, pricing, leashd, offline behaviour, money-transmitter status, and MCP integration.",
};

interface QA {
  q: string;
  a: string;
}

const FAQS: QA[] = [
  {
    q: "Is leashd custodial?",
    a: "No. leashd never takes custody of your funds. Settlement happens on your own rail, between your wallet and the counterparty. The platform sits in the policy path, not the custody path.",
  },
  {
    q: "Where do my keys live?",
    a: "On your own machine. leashd holds the wallet connection and any secrets locally. The hosted control plane signs policy and aggregates audit, and never sees a credential.",
  },
  {
    q: "Which rails are supported?",
    a: "Bitcoin Lightning and L402, Cashu ecash, and stablecoins over x402. Bind rails with priority and fall back when one is unavailable. leashd is multi-rail and BTC-first.",
  },
  {
    q: "Does it cost anything?",
    a: "Open-source leashd is free. The hosted control plane has a free workspace plus a paid tier for larger swarms, longer audit retention, approval workflows, and alerting.",
  },
  {
    q: "What is leashd?",
    a: "leashd is the free open-source program that runs on your own machine, right next to your agent. It holds the wallet connection locally, verifies the signed policy, and enforces every rule before a payment touches a rail. It never moves funds on its own and never exposes your keys.",
  },
  {
    q: "Does it work offline?",
    a: "Yes. If the control plane is unreachable, leashd keeps enforcing the last verified policy. Your agent is never unleashed by an outage.",
  },
  {
    q: "Is leashd a money transmitter?",
    a: "No. leashd is non-custodial software that evaluates policy. It is not a bank, exchange, or money transmitter, because it never holds the funds or keys that could move money.",
  },
  {
    q: "How does it plug into my agent?",
    a: "Over MCP. leashd ships as an MCP server exposing a policy-gated pay tool, plus check_policy and get_budget. Drop it into Claude Code or any MCP host. No SDK to wire up.",
  },
];

export default function FaqPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-[44rem] px-4 py-20">
          <header className="mb-12 text-center">
            <h1 className="font-sans text-4xl font-bold tracking-tight">
              Frequently asked questions
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Everything you need to know about how {BRAND} handles your money,
              your keys, and your agents.
            </p>
          </header>
          <div className="flex flex-col gap-3">
            {FAQS.map((item) => (
              <details
                key={item.q}
                className="group rounded-lg border border-border bg-card p-6 transition-colors hover:border-primary [&_summary]:list-none"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 rounded-md font-sans text-base font-bold">
                  {item.q}
                  <Plus
                    className="size-5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45"
                    aria-hidden
                  />
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
