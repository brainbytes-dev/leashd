"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, ScrollText, Terminal, Cable } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/dashboard/agents", label: "Agents", icon: Bot },
  { href: "/dashboard/policies", label: "Policies", icon: ScrollText },
  { href: "/dashboard/audit", label: "Audit", icon: Terminal },
  { href: "/dashboard/rails", label: "Rails", icon: Cable },
];

export function NavLeash() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Leash sections"
      className="flex items-center gap-2 border-b border-border pb-3"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 rounded-md px-3 py-2 font-sans text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
              active
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
