import Link from "next/link";
import { Wordmark } from "./wordmark";
import {
  DOCS_URL,
  FAQ_URL,
  COMMUNITY_URL,
  GITHUB_URL,
  GET_STARTED_URL,
  OPERATOR,
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
