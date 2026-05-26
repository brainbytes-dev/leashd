"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bot,
  Cable,
  LayoutDashboard,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  BellRing,
} from "lucide-react"

import { NavUser } from "@/components/nav-user"
import { Wordmark } from "@/components/marketing/wordmark"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navMain = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agents", url: "/dashboard/agents", icon: Bot },
  { title: "Policies", url: "/dashboard/policies", icon: ShieldCheck },
  { title: "Audit", url: "/dashboard/audit", icon: ScrollText },
  { title: "Alerts", url: "/dashboard/alerts", icon: BellRing },
  { title: "Rails", url: "/dashboard/rails", icon: Cable },
] as const

const navSecondary = [
  { title: "Team", url: "/dashboard/team", icon: Users },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
] as const

export type SidebarUser = {
  name: string
  email: string
  avatar?: string
}

function isActive(pathname: string, url: string) {
  if (url === "/dashboard") return pathname === "/dashboard"
  return pathname === url || pathname.startsWith(`${url}/`)
}

export function AppSidebar({
  user,
  ...props
}: React.ComponentProps<typeof Sidebar> & { user: SidebarUser }) {
  const pathname = usePathname()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link href="/dashboard">
                <Wordmark className="text-base" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent className="flex flex-col gap-2">
            <SidebarMenu>
              {navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(pathname, item.url)}
                  >
                    <Link href={item.url}>
                      <item.icon aria-hidden />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {navSecondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isActive(pathname, item.url)}
                  >
                    <Link href={item.url}>
                      <item.icon aria-hidden />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
