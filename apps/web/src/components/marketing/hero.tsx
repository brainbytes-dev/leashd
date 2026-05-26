import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TerminalCard } from "./terminal-card";
import { DOCS_URL, GITHUB_URL } from "./brand";

export function Hero() {
  return (
    <section className="mx-auto max-w-[66rem] px-4 py-20 md:py-28">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
        <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Bitcoin-only. Non-custodial. MCP-native.
        </p>
        <h1 className="font-sans text-4xl font-bold leading-[1.2] tracking-tight sm:text-5xl">
          Give your AI agents money.
          <br />
          <span className="text-primary">Keep them on a leash.</span>
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
          <span className="text-foreground">You hold the keys. leashd holds the policy.</span>{" "}
          A non-custodial spend-governance layer for autonomous agents: budget
          caps, scoped credentials, allowlists, immutable audit, and a graded
          kill-switch over Bitcoin Lightning and Cashu ecash. Bitcoin only.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={DOCS_URL}>Install leashd</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <a href={GITHUB_URL} rel="noopener noreferrer">
              View on GitHub
            </a>
          </Button>
        </div>
      </div>
      <div className="mx-auto mt-16 max-w-2xl">
        <TerminalCard />
      </div>
    </section>
  );
}
