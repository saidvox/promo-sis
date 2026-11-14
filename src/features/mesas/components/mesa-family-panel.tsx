import { useEffect, useRef, useState } from 'react'
import { ArrowDownLeftIcon, ArrowRightLeftIcon, ArrowUpRightIcon, ArmchairIcon, BanknoteIcon, CheckCircle2Icon, Clock3Icon, HistoryIcon, ImageIcon, PaperclipIcon, ReceiptTextIcon, SaveIcon, UsersIcon, XIcon } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { formatMoney, getParticipantTotals } from '@/features/payments/utils/participant-totals'
import type { MatrixData } from '@/features/payments/api/use-payments-matrix'
import type { MesasData } from '../api/use-mesas'
import { getMesaVoucherUrl, registerMesaPayment, validateMesaVoucher, VOUCHER_TYPES } from '../api/mesa-vouchers'
import { MesaActionDrawer } from './mesa-action-drawer'
import { QuantityStepper } from './quantity-stepper'
import { ParticipantPicker } from './participant-picker'
import { MesaAssignmentControl } from './mesa-assignment-control'
import { FamilyGuestsContent } from './family-guests-drawer'
import { cn } from '@/lib/utils'

export type MesaAction = (operation: () => PromiseLike<{ error: { message: string } | null }>, message: string) => Promise<boolean>

type Props = {
  profileId: string; matrix: MatrixData; data: MesasData; busy: boolean
  onAction: MesaAction; onLocateObject: (id: string) => void
}

export function MesaFamilyPanel({ profileId, matrix, data, busy, onAction, onLocateObject }: Props) {
  const mesa = data.resumen.find((item) => item.perfil_id === profileId)!
  const profile = matrix.perfilesInscritos.find((item) => item.id === profileId)!
  const totals = getParticipantTotals(matrix, profileId)
  const [action, setAction] = useState<'extras' | 'cesion' | 'abono' | 'historial' | 'asignacion' | 'invitados' | null>(null)
  const [extras, setExtras] = useState(mesa.extras_usados)
  const [extrasVersion, setExtrasVersion] = useState(mesa.version)
  const [recipient, setRecipient] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Efectivo')
  const [reference, setReference] = useState('')
  const [toAnnul, setToAnnul] = useState<{ type: 'cesion' | 'abono'; id: string } | null>(null)
  const [voucher, setVoucher] = useState<{ file: File; preview: string } | null>(null)
  const [viewingVoucher, setViewingVoucher] = useState<{ url: string; name: string } | null>(null)
  const [loadingVoucher, setLoadingVoucher] = useState<string | null>(null)
  const voucherInput = useRef<HTMLInputElement>(null)
  const transferId = useRef(crypto.randomUUID())
  const paymentId = useRef(crypto.randomUUID())
  const profiles = new Map(matrix.perfilesInscritos.map((item) => [item.id, item]))
  const transfers = data.cesiones.filter((item) => item.origen_id === profileId || item.destino_id === profileId)
  const payments = data.abonos.filter((item) => item.perfil_id === profileId)
  const seats = data.asientos.filter((item) => item.perfil_id === profileId)
  const paid = totals.totalDebt <= 0
  const minimumExtras = Math.ceil(Number(mesa.abonado_extras) / 40)
  const progress = Math.min(100, totals.totalExpected > 0 ? totals.totalPaid / totals.totalExpected * 100 : 0)
  const pending = Number(mesa.saldo_extras)
  const amountNumber = Number(amount)
  const validAmount = Number.isFinite(amountNumber) && amountNumber > 0 && amountNumber <= pending
  const assignedTable = data.objetos.find((object) => object.perfil_id === profileId)

  useEffect(() => () => { if (voucher) URL.revokeObjectURL(voucher.preview) }, [voucher])

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary"><UsersIcon data-icon="inline-start" />8 incluidos</Badge>
        <Badge variant="outline" className="border-event-extra/25 text-event-extra"><ArmchairIcon data-icon="inline-start" />{mesa.extras_usados} extras</Badge>
        <Badge variant="outline" className={paid ? 'border-event-paid/25 text-event-paid' : 'border-event-extra/25 text-event-extra'}>
          {paid ? <CheckCircle2Icon /> : <Clock3Icon />}{paid ? 'Pagado' : 'Saldo pendiente'}
        </Badge>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-event-paid/20 bg-event-paid/5 p-4">
          <span className="flex items-center gap-2 text-xs text-event-paid"><BanknoteIcon className="size-4" />Total abonado</span>
          <p className="mt-2 text-xl font-semibold tabular-nums">{formatMoney(totals.totalPaid)}</p>
        </div>
        <div className={cn('rounded-xl border p-4', paid ? 'bg-muted/30' : 'border-event-extra/20 bg-event-extra/5')}>
          <span className="flex items-center gap-2 text-xs text-muted-foreground"><ReceiptTextIcon className="size-4" />Falta pagar</span>
          <p className={cn('mt-2 text-xl font-semibold tabular-nums', !paid && 'text-event-extra')}>{formatMoney(totals.totalDebt)}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs text-muted-foreground"><span>Promoción + extras utilizados</span><span>{Math.round(progress)}% abonado</span></div>
        <Progress value={progress} aria-label="Porcentaje abonado" />
      </div>
      <dl className="flex flex-col gap-2 rounded-lg bg-muted/30 p-3 text-xs tabular-nums">
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Promoción abonada</dt><dd>{formatMoney(totals.promotionPaid)} / {formatMoney(totals.promotionExpected)}</dd></div>
        <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Extras abonados</dt><dd>{formatMoney(totals.extrasPaid)} / {formatMoney(totals.extrasExpected)}</dd></div>
      </dl>
      <div className="flex flex-col gap-2">
        <h3 className="mb-1 text-xs font-medium text-muted-foreground">Gestionar esta familia</h3>
        <MesaActionDrawer title="Familia e invitados" description={'Nombres de sus 7 familiares y ' + mesa.extras_usados + ' extras'} icon={UsersIcon} tone="neutral" open={action === 'invitados'} onOpenChange={(open) => setAction(open ? 'invitados' : null)}>
          <FamilyGuestsContent profile={profile} open={action === 'invitados'} />
        </MesaActionDrawer>
        {assignedTable && <MesaActionDrawer title="Asignación de mesa" description={assignedTable.nombre + ' · cambiar o dejar libre'} icon={UsersIcon} tone="neutral" open={action === 'asignacion'} onOpenChange={(open) => setAction(open ? 'asignacion' : null)}>
          <p className="text-sm text-muted-foreground">Cambia la familia que ocupa esta mesa. Los pagos y extras siempre permanecen con cada persona.</p>
          <MesaAssignmentControl key={assignedTable.version} object={assignedTable} objects={data.objetos} profiles={matrix.perfilesInscritos} busy={busy} onAction={onAction} />
        </MesaActionDrawer>}
        <MesaActionDrawer title="Extras y asientos" description={mesa.extras_usados + ' registrados · ' + mesa.disponibles + ' cupos libres'} icon={ArmchairIcon} tone="extra" open={action === 'extras'} onOpenChange={(open) => {
          if (open) { setExtras(mesa.extras_usados); setExtrasVersion(mesa.version) }
          setAction(open ? 'extras' : null)
        }}>
          <div className="flex flex-wrap gap-2"><Badge variant="secondary">2 iniciales</Badge><Badge variant="outline" className="text-event-transfer">+{mesa.recibidos} recibidos</Badge><Badge variant="outline">−{mesa.cedidos} cedidos</Badge></div>
          <form className="flex flex-col gap-5" onSubmit={async (event) => {
            event.preventDefault()
            const ok = await onAction(() => supabase.rpc('actualizar_mesa_evento', {
              p_perfil_id: profileId, p_version: extrasVersion, p_extras: extras, p_notas: mesa.notas,
            }), 'Extras y asientos actualizados')
            if (ok) setAction(null)
          }}>
            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-medium">Extras que utilizará</h4>
              <QuantityStepper value={extras} min={minimumExtras} max={mesa.cupos_extra} onChange={setExtras} disabled={busy || !profile.activo} label="Extras que utilizará" />
              <p className="text-xs text-muted-foreground">{mesa.cupos_extra} cupos disponibles · S/40 por persona adicional.</p>
              {minimumExtras > 0 && <p className="text-xs text-muted-foreground">Los abonos registrados cubren al menos {minimumExtras} extras.</p>}
            </div>
            <div className="flex items-center justify-between rounded-xl border border-event-extra/20 bg-event-extra/5 p-4"><span className="text-sm">Costo de los extras</span><strong className="text-xl tabular-nums text-event-extra">{formatMoney(extras * 40)}</strong></div>
            <Button type="submit" disabled={busy || !profile.activo || extras < minimumExtras || extras > mesa.cupos_extra}><SaveIcon data-icon="inline-start" />Guardar extras</Button>
          </form>
          <div className="flex flex-col gap-2">
            <h4 className="text-sm font-medium">Ubicación de sus adicionales</h4>
            <p className="text-xs text-muted-foreground">{assignedTable ? 'Al guardar, se eligen asientos cercanos a su mesa familiar. Selecciona una mesa para verla en el plano.' : 'Los extras se conservan con esta persona. Sus asientos se ubicarán cuando le asignes una mesa familiar.'}</p>
            {seats.length === 0 ? <p className="py-3 text-sm text-muted-foreground">Aún no tiene asientos adicionales asignados.</p> : (
              <div className="flex flex-wrap gap-2">{seats.map((seat) => <Button key={seat.objeto_id + '-' + seat.posicion} variant="outline" size="sm" onClick={() => onLocateObject(seat.objeto_id)}><ArmchairIcon data-icon="inline-start" />{data.objetos.find((object) => object.id === seat.objeto_id)?.nombre} · {seat.posicion}</Button>)}</div>
            )}
          </div>
        </MesaActionDrawer>
        <MesaActionDrawer title="Ceder cupos" description={mesa.disponibles + ' disponibles para otra familia'} icon={ArrowRightLeftIcon} tone="transfer" open={action === 'cesion'} onOpenChange={(open) => {
          if (open) setQuantity(mesa.disponibles > 0 ? 1 : 0)
          setAction(open ? 'cesion' : null)
        }}>
          <p className="text-sm text-muted-foreground">Los cupos libres pasan a la familia que elijas. Esa familia pagará S/40 por cada extra que utilice.</p>
          <Badge variant="outline" className="w-fit border-event-transfer/25 text-event-transfer">{mesa.disponibles} cupos libres</Badge>
          <form className="flex flex-col gap-5" onSubmit={async (event) => {
            event.preventDefault()
            const ok = await onAction(() => supabase.rpc('ceder_cupos_mesa', {
              p_id: transferId.current, p_origen: profileId, p_destino: recipient, p_cantidad: quantity,
            }), 'Cupos cedidos correctamente')
            if (ok) { transferId.current = crypto.randomUUID(); setRecipient(''); setAction(null) }
          }}>
            <FieldGroup>
              <Field><FieldLabel>Familia que recibe</FieldLabel><ParticipantPicker profiles={matrix.perfilesInscritos.filter((item) => item.activo && item.id !== profileId)} value={recipient} onSelect={setRecipient} disabled={busy || mesa.disponibles === 0} label="Elegir participante" className="sm:w-full" /></Field>
              <Field><FieldLabel>Cantidad de cupos</FieldLabel><QuantityStepper value={quantity} min={mesa.disponibles > 0 ? 1 : 0} max={mesa.disponibles} onChange={setQuantity} disabled={busy || mesa.disponibles === 0} label="Cantidad de cupos" /></Field>
            </FieldGroup>
            <Button type="submit" disabled={busy || !recipient || quantity <= 0 || quantity > mesa.disponibles || !profile.activo}><ArrowRightLeftIcon data-icon="inline-start" />Confirmar cesión</Button>
          </form>
        </MesaActionDrawer>
        <MesaActionDrawer title="Pago de extras" description={pending > 0 ? formatMoney(pending) + ' pendiente en extras' : 'Extras sin saldo pendiente'} icon={BanknoteIcon} tone="paid" open={action === 'abono'} onOpenChange={(open) => {
          if (open && !amount) setAmount(pending > 0 ? pending.toFixed(2) : '')
          setAction(open ? 'abono' : null)
        }}>
          <p className="text-sm text-muted-foreground">Registra un pago total o parcial de los invitados adicionales. Este pago reduce únicamente el saldo de extras.</p>
          <div className="flex justify-between rounded-xl border bg-muted/30 p-4"><span className="text-sm">Pendiente de extras</span><strong className="tabular-nums text-event-extra">{formatMoney(mesa.saldo_extras)}</strong></div>
          <form className="flex flex-col gap-5" onSubmit={async (event) => {
            event.preventDefault()
            if (!validAmount) return
            const ok = await onAction(() => registerMesaPayment({
              id: paymentId.current, profileId, amount: amountNumber, method, reference: reference.trim(), file: voucher?.file ?? null,
            }), 'Pago de extras registrado')
            if (ok) { paymentId.current = crypto.randomUUID(); setAmount(''); setReference(''); setVoucher(null); setAction(null) }
          }}>
            <FieldGroup>
              <Field><FieldLabel htmlFor="abono-extras">Importe a pagar (S/)</FieldLabel>
                <Input id="abono-extras" type="text" inputMode="decimal" autoComplete="off" required value={amount} onChange={(event) => {
                  const next = event.target.value.trim().replace(',', '.')
                  if (!/^\d*(\.\d{0,2})?$/.test(next)) return
                  setAmount(Number(next) > pending ? pending.toFixed(2) : next)
                }} placeholder="0.00" disabled={busy || pending <= 0} aria-describedby="abono-maximo" aria-invalid={amount !== '' && !validAmount} />
                <div className="flex flex-wrap items-center justify-between gap-2"><p id="abono-maximo" className="text-xs text-muted-foreground">Máximo: {formatMoney(pending)}</p><Button type="button" size="xs" variant="ghost" disabled={busy || pending <= 0} onClick={() => setAmount(pending.toFixed(2))}>Pagar saldo completo</Button></div>
                {amount !== '' && !validAmount && <p className="text-xs text-destructive">Ingresa un importe entre S/0.01 y {formatMoney(pending)}.</p>}
              </Field>
              <Field><FieldLabel>Método de pago</FieldLabel>
                <Select value={method} onValueChange={(value) => setMethod(value ?? 'Efectivo')} disabled={busy}>
                  <SelectTrigger className="w-full" aria-label="Método del abono"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectGroup>{['Efectivo', 'Yape', 'Plin', 'Transferencia'].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectGroup></SelectContent>
                </Select>
              </Field>
              <Field><FieldLabel htmlFor="referencia-extras">Número de operación (opcional)</FieldLabel><Input id="referencia-extras" value={reference} onChange={(event) => setReference(event.target.value)} maxLength={200} disabled={busy} placeholder="Código de Yape, Plin o transferencia" /></Field>
              <Field><FieldLabel>Imagen del comprobante (opcional)</FieldLabel>
                <input ref={voucherInput} type="file" className="sr-only" accept={VOUCHER_TYPES} aria-label="Imagen del comprobante" disabled={busy || pending <= 0} onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  const error = validateMesaVoucher(file)
                  if (error) { toast.error(error); return }
                  setVoucher({ file, preview: URL.createObjectURL(file) })
                }} />
                <Button type="button" variant="outline" disabled={busy || pending <= 0} onClick={() => voucherInput.current?.click()}><PaperclipIcon data-icon="inline-start" />{voucher ? 'Cambiar imagen' : 'Adjuntar imagen'}</Button>
                <p className="text-xs text-muted-foreground">JPG, PNG o WebP · hasta 5 MB. Se guardará con este pago.</p>
                {voucher && <div className="overflow-hidden rounded-xl border"><img src={voucher.preview} alt="Vista previa del comprobante" className="max-h-48 w-full bg-muted/30 object-contain" /><div className="flex items-center gap-2 p-3"><ImageIcon className="size-4 shrink-0 text-event-paid" /><span className="min-w-0 flex-1 truncate text-xs">{voucher.file.name}</span><Button type="button" size="icon-xs" variant="ghost" aria-label="Quitar imagen" disabled={busy} onClick={() => setVoucher(null)}><XIcon /></Button></div></div>}
              </Field>
            </FieldGroup>
            <Button type="submit" disabled={busy || !validAmount}><BanknoteIcon data-icon="inline-start" />{busy ? 'Guardando pago…' : 'Registrar pago'}</Button>
          </form>
        </MesaActionDrawer>
        <MesaActionDrawer title="Historial de movimientos" description={payments.length + ' abonos · ' + transfers.length + ' cesiones'} icon={HistoryIcon} tone="neutral" open={action === 'historial'} onOpenChange={(open) => setAction(open ? 'historial' : null)}>
          <h4 className="text-sm font-semibold">Cesiones de cupos</h4>
          {transfers.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay cesiones.</p>}
          <ul className="flex flex-col gap-3">{transfers.map((transfer) => {
            const sending = transfer.origen_id === profileId
            return <li key={transfer.id} className="flex items-start gap-3 rounded-xl border p-3 text-xs">
              <span className="mt-0.5 text-event-transfer">{sending ? <ArrowUpRightIcon className="size-4" /> : <ArrowDownLeftIcon className="size-4" />}</span>
              <div className="flex min-w-0 flex-1 flex-col gap-1"><span className="font-medium">{transfer.cantidad} cupos {sending ? 'a' : 'de'} {profiles.get(sending ? transfer.destino_id : transfer.origen_id)?.nombre_completo ?? 'Participante'}</span><span className="text-muted-foreground">{new Date(transfer.created_at).toLocaleDateString('es-PE')}</span>{transfer.anulada && <Badge variant="secondary" className="w-fit">Anulada</Badge>}</div>
              {!transfer.anulada && <Button size="xs" variant="ghost" disabled={busy} onClick={() => setToAnnul({ type: 'cesion', id: transfer.id })}>Anular</Button>}
            </li>
          })}</ul>
          <h4 className="text-sm font-semibold">Abonos de extras</h4>
          {payments.length === 0 && <p className="text-sm text-muted-foreground">Todavía no hay abonos.</p>}
          <ul className="flex flex-col gap-3">{payments.map((payment) => <li key={payment.id} className="flex items-start gap-3 rounded-xl border p-3 text-xs">
            <BanknoteIcon className="mt-0.5 size-4 shrink-0 text-event-paid" />
            <div className="flex min-w-0 flex-1 flex-col gap-1"><span className="font-medium">{formatMoney(payment.monto)} · {payment.metodo}</span><span className="text-muted-foreground">{new Date(payment.created_at).toLocaleDateString('es-PE')} {payment.referencia}</span>{payment.anulado && <Badge variant="secondary" className="w-fit">Anulado</Badge>}
              {payment.voucher_path && <Button variant="outline" size="xs" className="mt-1 w-fit" disabled={loadingVoucher === payment.id} onClick={async () => {
                setLoadingVoucher(payment.id)
                try { setViewingVoucher({ url: await getMesaVoucherUrl(payment.voucher_path!), name: payment.voucher_filename ?? 'Comprobante de pago' }) }
                catch { toast.error('No se pudo abrir el comprobante. Intenta de nuevo.') }
                finally { setLoadingVoucher(null) }
              }}><ImageIcon data-icon="inline-start" />Ver comprobante</Button>}
            </div>
            {!payment.anulado && <Button variant="ghost" size="xs" disabled={busy} onClick={() => setToAnnul({ type: 'abono', id: payment.id })}>Anular</Button>}
          </li>)}</ul>
        </MesaActionDrawer>
      </div>
      <AlertDialog open={toAnnul !== null} onOpenChange={(open) => { if (!open && !busy) setToAnnul(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{toAnnul?.type === 'cesion' ? '¿Anular esta cesión?' : '¿Anular este abono?'}</AlertDialogTitle>
            <AlertDialogDescription>{toAnnul?.type === 'cesion' ? 'Los cupos regresarán a la familia de origen. Deben estar libres para poder anular la cesión.' : 'Este importe dejará de contar como abonado. El movimiento permanecerá en el historial como anulado.'}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Conservar registro</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={busy} onClick={async () => {
              if (!toAnnul) return
              const ok = await onAction(() => supabase.rpc('anular_registro_mesa', { p_tipo: toAnnul.type, p_id: toAnnul.id }), 'Registro anulado')
              if (ok) setToAnnul(null)
            }}>Anular registro</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={viewingVoucher !== null} onOpenChange={(open) => { if (!open) setViewingVoucher(null) }}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Comprobante del pago</DialogTitle><DialogDescription>{viewingVoucher?.name}</DialogDescription></DialogHeader>
          {viewingVoucher && <img src={viewingVoucher.url} alt="Comprobante del pago de extras" className="max-h-[65dvh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
