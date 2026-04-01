"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { useAuth } from "@/hooks/use-auth"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboardIcon, UsersIcon, BanknoteIcon, TrendingDownIcon, Settings2Icon, CommandIcon } from "lucide-react"

const data = {
  user: {
    name: "Admin",
    email: "admin@example.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "dashboard",
      icon: <LayoutDashboardIcon />,
    },
    {
      title: "Participantes",
      url: "students",
      icon: <UsersIcon />,
    },
    {
      title: "Pagos",
      url: "payments",
      icon: <BanknoteIcon />,
    },
    {
      title: "Egresos",
      url: "expenses",
      icon: <TrendingDownIcon />,
    },
    {
      title: "Configuración Cuotas",
      url: "settings",
      icon: <Settings2Icon />,
    },
  ],
}
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { session } = useAuth()

  const userData = session?.user ? {
    name: session.user.user_metadata?.nombre_completo || session.user.email?.split('@')[0] || "Administrador",
    email: session.user.email || "",
    avatar: "",
  } : data.user

  return (
    <Sidebar variant="inset" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="data-[slot=sidebar-menu-button]:p-1.5!"
              render={<a href="#" />}
            >
              <CommandIcon className="size-5!" />
              <span className="text-base font-semibold">Promoción Sistemas</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={userData} />
      </SidebarFooter>
    </Sidebar>
  )
}
