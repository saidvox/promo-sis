"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

import { useNavigation, type PageView } from "@/hooks/use-navigation"

export function NavMain({
  items,
}: {
  items: {
    title: string
    url: string
    icon?: React.ReactNode
    badge?: string
  }[]
}) {
  const { currentPage, navigate } = useNavigation()

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton 
                tooltip={item.title}
                isActive={currentPage === item.url}
                onClick={() => navigate(item.url as PageView)}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {item.icon}
                  <span>{item.title}</span>
                </div>
                {item.badge && (
                  <span className="ml-auto flex h-5 w-fit items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary ring-1 ring-inset ring-primary/20">
                    {item.badge}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
