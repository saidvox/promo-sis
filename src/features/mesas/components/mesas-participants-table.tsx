import { CheckCircle2Icon, Clock3Icon, LocateFixedIcon, UserRoundMinusIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { MatrixData } from '@/features/payments/api/use-payments-matrix'
import { formatMoney, getParticipantTotals } from '@/features/payments/utils/participant-totals'
import type { MesaResumen } from '@/types/mesas.types'
import { familyColor, isCommittee } from '../utils/salon-geometry'
import { getRoleColor } from '@/features/students/utils/get-role-color'
import { cn } from '@/lib/utils'

export function MesasParticipantsTable({ profiles, matrix, summaries, onDetail, onLocate }: {
  profiles: MatrixData['perfilesInscritos']; matrix: MatrixData; summaries: MesaResumen[]
  onDetail: (id: string) => void; onLocate: (id: string) => void
}) {
  const mesaMap = new Map(summaries.map((item) => [item.perfil_id, item]))
  return <div className="min-h-0 flex-1 overflow-auto rounded-xl border">
    <Table><TableHeader><TableRow>
      <TableHead>Participante</TableHead><TableHead>Promoción abonada</TableHead><TableHead>Extras</TableHead><TableHead>Extras abonados</TableHead><TableHead>Total abonado</TableHead><TableHead>Saldo total</TableHead><TableHead><span className="sr-only">Acciones</span></TableHead>
    </TableRow></TableHeader><TableBody>
      {profiles.map((profile) => {
        const totals = getParticipantTotals(matrix, profile.id)
        const mesa = mesaMap.get(profile.id)
        const paid = totals.totalDebt <= 0
        const hasExtras = Number(mesa?.extras_usados ?? 0) > 0
        return <TableRow key={profile.id}>
          <TableCell>
            <div className="flex items-center gap-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: familyColor(profile.rol) }} />
              <div className="flex flex-col items-start gap-1">
                <Button variant="ghost" className="h-auto justify-start whitespace-normal p-0 text-left" onClick={() => onDetail(profile.id)}>{profile.nombre_completo}</Button>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">{profile.codigo_u}{isCommittee(profile.rol) && <Badge className={getRoleColor(profile.rol)}>{profile.rol}</Badge>}{!profile.activo && <Badge variant="secondary"><UserRoundMinusIcon />Inactivo</Badge>}{!profile.inscrito && <Badge variant="secondary">Sin inscripción</Badge>}</span>
              </div>
            </div>
          </TableCell>
          <TableCell className="tabular-nums">{formatMoney(totals.promotionPaid)}<span className="mt-1 block text-[10px] text-muted-foreground">de {formatMoney(totals.promotionExpected)}</span></TableCell>
          <TableCell>
            <Badge variant={hasExtras ? 'outline' : 'secondary'} className={cn(hasExtras && 'border-event-extra/25 text-event-extra')}>{hasExtras ? mesa?.extras_usados + ' extras' : 'Sin extras'}</Badge>
            <span className="mt-1 block text-[10px] text-muted-foreground">{mesa?.disponibles ?? 2} cupos libres</span>
          </TableCell>
          <TableCell className="tabular-nums">{hasExtras ? <><span className="text-event-paid">{formatMoney(totals.extrasPaid)}</span><span className="mt-1 block text-[10px] text-muted-foreground">de {formatMoney(totals.extrasExpected)}</span></> : <span className="text-xs text-muted-foreground">Sin cargo</span>}</TableCell>
          <TableCell className="font-semibold tabular-nums">{formatMoney(totals.totalPaid)}</TableCell>
          <TableCell>
            <Badge variant="outline" className={paid ? 'border-event-paid/25 bg-event-paid/5 text-event-paid' : 'border-event-extra/25 bg-event-extra/5 text-event-extra'}>
              {paid ? <CheckCircle2Icon /> : <Clock3Icon />}{paid ? 'Pagado' : 'Pendiente'}
            </Badge>
            <span className={cn('mt-1 block text-xs font-medium tabular-nums', paid ? 'text-event-paid' : 'text-event-extra')}>{formatMoney(totals.totalDebt)}</span>
          </TableCell>
          <TableCell><Button variant="ghost" size="icon-sm" aria-label={'Localizar mesa de ' + profile.nombre_completo} onClick={() => onLocate(profile.id)}><LocateFixedIcon /></Button></TableCell>
        </TableRow>
      })}
    </TableBody></Table>
  </div>
}
