import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/theme/theme-toggle";
import {
  BRAND,
  DOCS_URL,
  FAQ_URL,
  COMMUNITY_URL,
  GITHUB_URL,
  GET_STARTED_URL,
} from "./brand";

const NAV = [
  { label: "Docs", href: DOCS_URL },
  { label: "FAQ", href: FAQ_URL },
  { label: "Community", href: COMMUNITY_URL },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-[66rem] items-center justify-between px-4">
        <Link
          href="/"
          className="rounded-md font-sans text-lg font-bold tracking-tight"
        >
          {BRAND}
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => (
            <Button key={item.label} asChild variant="ghost" size="sm">
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a href={GITHUB_URL} rel="noopener noreferrer">
              GitHub
            </a>
          </Button>
          <ModeToggle />
          <Button asChild size="sm">
            <Link href={GET_STARTED_URL}>Get started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
