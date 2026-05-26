import Link from "next/link";
import { DOCS_URL } from "./brand";

export function Explainer() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-[66rem] px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-sans text-3xl font-bold tracking-tight">
            What is leashd?
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            leashd is a deterministic gate between your agent and the rail.
            Policy is evaluated before settlement, locally, and cannot be
            bypassed by prompt manipulation. The free open-source{" "}
            <span className="font-mono text-foreground">leashd</span> runs on
            your own machine, holds the wallet connection locally, and enforces
            every rule. Your keys and seed never leave your machine and never
            reach the control plane, which only authors signed policy and
            aggregates a tamper-evident audit trail.
          </p>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Read the{" "}
            <Link
              href={DOCS_URL}
              className="rounded text-primary underline-offset-2 hover:underline"
            >
              full quickstart
            </Link>{" "}
            to see how it plugs into your stack.
          </p>
        </div>
      </div>
    </section>
  );
}
