"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserCog, CreditCard } from "lucide-react";

const TABS = [
  { label: "Account", href: "/dashboard/settings", icon: UserCog },
  { label: "Billing", href: "/dashboard/settings/billing", icon: CreditCard },
];

export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-6 px-4 py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and billing.
        </p>
      </div>

      <nav className="flex gap-1 border-b border-border">
        {TABS.map((tab) => {
          const active =
            tab.href === "/dashboard/settings"
              ? pathname === tab.href
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div>{children}</div>
    </div>
  );
}
