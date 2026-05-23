import Link from "next/link";
import { Terminal } from "lucide-react";
import { BRAND, DOCS_URL, GITHUB_URL, OPERATOR } from "./brand";

const LINKS = [
  { label: "Docs", href: DOCS_URL, external: false },
  { label: "Privacy", href: "/privacy", external: false },
  { label: "Terms", href: "/terms", external: false },
  { label: "GitHub", href: GITHUB_URL, external: true },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-7 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-2 font-mono text-base font-semibold">
            <Terminal className="size-5 text-primary" aria-hidden />
            {BRAND}
          </span>
          <p className="text-sm text-muted-foreground">
            Non-custodial spend governance for AI agents.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {LINKS.map((link) =>
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-7">
          <p className="text-xs text-muted-foreground">{OPERATOR}</p>
        </div>
      </div>
    </footer>
  );
}
