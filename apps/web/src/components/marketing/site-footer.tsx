import Link from "next/link";
import { Zap } from "lucide-react";
import { Wordmark } from "./wordmark";
import {
  DOCS_URL,
  FAQ_URL,
  COMMUNITY_URL,
  GITHUB_URL,
  GET_STARTED_URL,
  OPERATOR,
  DONATE_LIGHTNING,
} from "./brand";

interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

const COLUMNS: FooterColumn[] = [
  {
    title: "Product",
    links: [
      { label: "Docs", href: DOCS_URL },
      { label: "FAQ", href: FAQ_URL },
      { label: "Get started", href: GET_STARTED_URL },
    ],
  },
  {
    title: "Project",
    links: [
      { label: "GitHub", href: GITHUB_URL, external: true },
      { label: "Community", href: COMMUNITY_URL },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-[66rem] gap-12 px-4 py-12 md:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div className="flex flex-col gap-3">
          <Wordmark className="text-lg" />
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
            Non-custodial spend governance for autonomous AI agents.
          </p>
          <a
            href={`lightning:${DONATE_LIGHTNING}`}
            className="mt-1 inline-flex w-fit items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            title={DONATE_LIGHTNING}
          >
            <Zap className="size-4 text-primary" aria-hidden />
            Donate sats
          </a>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title} className="flex flex-col gap-3">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {column.title}
            </span>
            <nav className="flex flex-col gap-2">
              {column.links.map((link) =>
                link.external ? (
                  <a
                    key={link.label}
                    href={link.href}
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
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-[66rem] px-4 py-7">
          <p className="text-xs text-muted-foreground">{OPERATOR}</p>
        </div>
      </div>
    </footer>
  );
}
