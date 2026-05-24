import type { Metadata } from "next";
import { Github, GitPullRequest, MessageSquare, Unlock } from "lucide-react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Button } from "@/components/ui/button";
import { BRAND, GITHUB_URL, DOCS_URL } from "@/components/marketing/brand";

export const metadata: Metadata = {
  title: "Community",
  description:
    "leashd is open core. leashd is open source and non-custodial. Read the code, contribute, and try to break the leash.",
};

interface Block {
  icon: typeof Github;
  title: string;
  body: string;
}

const BLOCKS: Block[] = [
  {
    icon: Unlock,
    title: "Non-custodial by design",
    body: "leashd holds your wallet connection on your own machine and never moves funds on its own. The whole point is that you can verify this yourself. Read the code, run it locally, audit the policy path.",
  },
  {
    icon: GitPullRequest,
    title: "Contribute",
    body: "leashd is open source. New rails, policy primitives, and integrations are welcome. Open an issue to discuss a change, then send a pull request. Good first issues are tagged in the repo.",
  },
  {
    icon: Unlock,
    title: "Break the leash",
    body: "We want people trying to defeat the guardrails. If you find a way to make an agent spend past its policy, that is a bug worth reporting. Responsible disclosure beats a drained wallet.",
  },
  {
    icon: MessageSquare,
    title: "Where the community lives",
    body: "Discussion happens around the GitHub repository: issues, pull requests, and discussions. Follow along there for releases, design notes, and rail support.",
  },
];

export default function CommunityPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-[66rem] px-4 py-20">
          <header className="mx-auto max-w-2xl text-center">
            <h1 className="font-sans text-4xl font-bold tracking-tight">
              Open core. Open to scrutiny.
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              {BRAND} only works if you can trust it without trusting us. leashd
              is open source so you can read every line that stands between your
              agent and your money.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a href={GITHUB_URL} rel="noopener noreferrer">
                  <Github className="size-4" aria-hidden />
                  View on GitHub
                </a>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={DOCS_URL}>Read the docs</a>
              </Button>
            </div>
          </header>
          <div className="mt-16 grid gap-4 md:grid-cols-2">
            {BLOCKS.map((block) => {
              const Icon = block.icon;
              return (
                <div
                  key={block.title}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-card p-6"
                >
                  <Icon className="size-6 text-primary" aria-hidden />
                  <h2 className="font-sans text-base font-bold">
                    {block.title}
                  </h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {block.body}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
