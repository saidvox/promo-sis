"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { useNavigation, type PageView } from "@/hooks/use-navigation"
import { Badge } from "@/components/ui/badge"

export function NavMain({
  items,
}: {
  readonly items: {
    readonly title: string
    readonly url: string
    readonly icon?: React.ReactNode
    readonly badge?: string
  }[]
}) {
  const { currentPage, navigate } = useNavigation()
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                tooltip={item.title}
                isActive={currentPage === item.url}
                onClick={() => { navigate(item.url as PageView); if (isMobile) setOpenMobile(false) }}
                aria-current={currentPage === item.url ? "page" : undefined}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <Badge variant="secondary" className="ml-auto text-[10px]">{item.badge}</Badge>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
