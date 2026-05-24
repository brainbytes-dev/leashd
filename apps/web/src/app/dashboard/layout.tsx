import type { ReactNode, CSSProperties } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppSidebar, type SidebarUser } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/theme/theme-toggle";
import { DashboardBreadcrumb } from "./dashboard-breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

// Authed dashboard: never statically prerendered (the layout reads the session
// + DB at request time). Forces the whole /dashboard segment dynamic.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const sessionUser = session?.user as
    | { name?: string | null; email?: string | null; image?: string | null }
    | undefined;
  if (!sessionUser) redirect("/login");

  const user: SidebarUser = {
    name: sessionUser.name?.trim() || sessionUser.email || "Account",
    email: sessionUser.email ?? "",
    avatar: sessionUser.image ?? undefined,
  };

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as CSSProperties
      }
    >
      <AppSidebar variant="inset" user={user} />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border bg-background">
          <div className="flex w-full items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mx-1 data-[orientation=vertical]:h-4"
            />
            <DashboardBreadcrumb />
            <div className="ml-auto flex items-center gap-2">
              <ModeToggle />
            </div>
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
