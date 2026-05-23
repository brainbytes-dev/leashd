import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen } from "lucide-react";
import { TerminalCard } from "./terminal-card";

export function Hero() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 md:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col gap-6">
          <Badge variant="outline" className="w-fit font-mono text-xs">
            Non-custodial · MCP-native · BTC-first
          </Badge>
          <h1 className="font-mono text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl">
            Give your AI agents money.
            <br />
            <span className="text-primary">Keep them on a leash.</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            A non-custodial spend-governance layer for autonomous agents.
            Budget caps, scoped credentials, allowlists, immutable audit, and a
            graded kill-switch over Bitcoin Lightning and stablecoin rails. You
            hold the keys; Leash holds the policy.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/signup">
                Start free
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/docs">
                <BookOpen className="size-4" aria-hidden />
                Read the docs
              </Link>
            </Button>
          </div>
        </div>
        <TerminalCard />
      </div>
    </section>
  );
}
