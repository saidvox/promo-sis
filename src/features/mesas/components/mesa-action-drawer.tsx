import { ArrowLeftIcon, ChevronRightIcon, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import { cn } from '@/lib/utils'

export function MesaActionDrawer({ title, description, icon: Icon, tone, children, open, onOpenChange }: {
  title: string; description: string; icon: LucideIcon
  tone: 'extra' | 'paid' | 'transfer' | 'neutral'
  children: ReactNode; open: boolean; onOpenChange: (open: boolean) => void
}) {
  const mobile = useIsMobile()
  return (
    <Drawer showSwipeHandle={mobile} swipeDirection={mobile ? 'down' : 'right'} open={open} onOpenChange={onOpenChange}>
      <DrawerTrigger render={<Button variant="outline" className="h-auto w-full justify-start gap-3 whitespace-normal p-4 text-left" />}>
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', {
          'bg-event-extra/10 text-event-extra': tone === 'extra',
          'bg-event-paid/10 text-event-paid': tone === 'paid',
          'bg-event-transfer/10 text-event-transfer': tone === 'transfer',
          'bg-muted text-muted-foreground': tone === 'neutral',
        })}><Icon /></span>
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-sm font-semibold">{title}</span>
          <span className="text-xs font-normal text-muted-foreground">{description}</span>
        </span>
        <ChevronRightIcon className="text-muted-foreground" />
      </DrawerTrigger>
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:30rem] data-[swipe-axis=y]:[--drawer-content-max-height:92dvh]">
        <DrawerHeader className="gap-3 border-b p-5">
          <DrawerClose render={<Button variant="ghost" size="sm" className="w-fit" />}><ArrowLeftIcon data-icon="inline-start" />Volver al resumen</DrawerClose>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">{children}</div>
      </DrawerContent>
    </Drawer>
  )
}
