"use client"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"

const TITLES: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/agents": "Agents",
  "/dashboard/policies": "Policies",
  "/dashboard/audit": "Audit",
  "/dashboard/rails": "Rails",
  "/dashboard/team": "Team",
  "/dashboard/settings": "Settings",
  "/dashboard/settings/billing": "Billing",
}

function titleFor(pathname: string): string {
  if (TITLES[pathname]) return TITLES[pathname]
  const match = Object.keys(TITLES)
    .filter((key) => key !== "/dashboard" && pathname.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0]
  if (match) return TITLES[match]
  const last = pathname.split("/").filter(Boolean).pop() ?? "Dashboard"
  return last.charAt(0).toUpperCase() + last.slice(1)
}

export function DashboardBreadcrumb() {
  const pathname = usePathname()
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbPage className="font-mono text-sm font-medium tracking-tight">
            {titleFor(pathname)}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  )
}
