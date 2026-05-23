import type { ReactNode } from "react";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";

interface LegalPageProps {
  title: string;
  updated: string;
  children: ReactNode;
}

// Shared shell for /privacy and /terms. The @tailwindcss/typography plugin is
// not installed, so the prose primitives below carry their own utility classes.
export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <h1 className="font-mono text-4xl font-bold tracking-tight">
            {title}
          </h1>
          <p className="mt-3 font-mono text-sm text-muted-foreground">
            Last updated: {updated}
          </p>
          <div className="prose mt-12 flex flex-col gap-6 text-[15px] leading-relaxed text-foreground">
            {children}
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-6 scroll-mt-20 font-mono text-2xl font-bold tracking-tight">
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-mono text-lg font-semibold tracking-tight">
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-6 text-muted-foreground marker:text-primary">
      {children}
    </ul>
  );
}

export function OL({ children }: { children: ReactNode }) {
  return (
    <ol className="flex list-decimal flex-col gap-2 pl-6 text-muted-foreground marker:font-mono marker:text-muted-foreground">
      {children}
    </ol>
  );
}

export function LI({ children }: { children: ReactNode }) {
  return <li className="leading-relaxed">{children}</li>;
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-foreground">{children}</strong>;
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <blockquote className="rounded-r-md border-l-2 border-primary bg-muted/40 px-4 py-3 text-muted-foreground">
      {children}
    </blockquote>
  );
}

// Operator address block, reused at the top and bottom of legal pages.
export function OperatorBlock() {
  return (
    <address className="not-italic font-mono text-sm leading-relaxed text-muted-foreground">
      HR Online Consulting LLC (DBA Leash)
      <br />
      550 Kings Mountain
      <br />
      Kings Mountain, NC 28086, United States
      <br />
      Email:{" "}
      <a
        href="mailto:support@leash.money"
        className="text-primary hover:underline"
      >
        support@leash.money
      </a>
      <br />
      Web: leash.money
    </address>
  );
}
