import { ArmchairIcon, UsersIcon, XIcon } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { Button } from '@/components/ui/button'
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import type { MatrixData } from '@/features/payments/api/use-payments-matrix'
import type { SalonObjeto } from '@/types/mesas.types'
import type { MesasData } from '../api/use-mesas'
import { MesaFamilyPanel, type MesaAction } from './mesa-family-panel'
import { MesaObjectPanel } from './mesa-object-panel'
import { familyColor } from '../utils/salon-geometry'

export function MesaDetailDrawer({ object, open, onOpenChange, matrix, data, busy, onAction, onSave, onLocateObject }: {
  object?: SalonObjeto; open: boolean; onOpenChange: (open: boolean) => void
  matrix: MatrixData; data: MesasData; busy: boolean; onAction: MesaAction
  onSave: (object: SalonObjeto) => Promise<void>; onLocateObject: (id: string) => void
}) {
  const mobile = useIsMobile()
  const profile = matrix.perfilesInscritos.find((item) => item.id === object?.perfil_id)
  return (
    <Drawer open={open && Boolean(object)} onOpenChange={onOpenChange} showSwipeHandle={mobile} swipeDirection={mobile ? 'down' : 'right'}>
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:31rem] data-[swipe-axis=y]:[--drawer-content-max-height:92dvh]">
        <DrawerHeader className="relative gap-3 border-b p-5 text-left">
          <DrawerClose render={<Button variant="ghost" size="icon-sm" className="absolute top-4 right-4" aria-label="Cerrar detalle de mesa" />}><XIcon /></DrawerClose>
          <div className="flex items-center gap-3 pr-7">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border bg-muted/40" style={profile ? { color: familyColor(profile.rol) } : undefined}>
              {profile ? <UsersIcon className="size-5" /> : <ArmchairIcon className="size-5" />}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <DrawerTitle>{profile?.nombre_completo ?? object?.nombre ?? 'Detalle de mesa'}</DrawerTitle>
              <DrawerDescription>{profile ? profile.codigo_u + ' · ' + object?.nombre : object?.tipo === 'mesa_extras' ? 'Mesa compartida de ocho asientos' : 'Distribución del salón'}</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5">
          {object?.perfil_id ? (
            <MesaFamilyPanel key={object.perfil_id} profileId={object.perfil_id} matrix={matrix} data={data} busy={busy} onAction={onAction} onLocateObject={onLocateObject} />
          ) : object && <MesaObjectPanel key={object.id + '-' + object.version} object={object} data={data} matrix={matrix} busy={busy} onAction={onAction} onSave={onSave} />}
        </div>
        <DrawerFooter className="border-t p-4">
          <DrawerClose render={<Button variant="outline" />}>Cerrar detalle</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
