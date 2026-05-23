import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Terminal } from "lucide-react";
import { BRAND, DOCS_URL } from "./brand";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md font-mono text-lg font-semibold tracking-tight"
        >
          <Terminal className="size-5 text-primary" aria-hidden />
          {BRAND}
        </Link>
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="#capabilities">Capabilities</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="#pricing">Pricing</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href={DOCS_URL}>Docs</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Start free</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
