import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2Icon, EyeIcon, Loader2Icon, PlusIcon, SearchIcon, Settings2Icon, Trash2Icon } from 'lucide-react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { getErrorMessage } from '@/lib/error-utils'
import { calculateActivityParticipant } from '../utils/activity-calculations'
import { useActivities, type ActividadGrupoRow, type ActividadParticipanteRow, type ActividadRow } from '../api/use-activities'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type PerfilRow = {
  id: string
  nombre_completo: string
  codigo_u: string | null
}

type CuotaRow = {
  id: string
  mes_nombre: string
  monto: number
}

type PagoRow = {
  id: string
  perfil_id: string | null
  cuota_id: string | null
  monto_pagado: number
}

type GroupDraft = {
  id: string
  nombre: string
  premio: string
  costo_premio: number | ''
  notas: string
}

type ParticipantDraft = {
  perfil: PerfilRow
  grupo_id: string
  unidades_vendidas: number | ''
  cuota_id: string
  aporte_premio: number | ''
}

interface FinalizeActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  activity: ActividadRow | null
}

const NO_GROUP = 'no-group'
const NO_QUOTA = 'no-quota'

const toNumber = (value: number | '') => Number(value || 0)

export function FinalizeActivityDialog({ open, onOpenChange, activity }: FinalizeActivityDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingGroups, setIsSavingGroups] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [groupManagerOpen, setGroupManagerOpen] = useState(false)
  const [participantSearch, setParticipantSearch] = useState('')
  const [groupFilter, setGroupFilter] = useState('all')
  const [groupAssignSearch, setGroupAssignSearch] = useState<Record<string, string>>({})
  const [quotas, setQuotas] = useState<CuotaRow[]>([])
  const [payments, setPayments] = useState<PagoRow[]>([])
  const [groups, setGroups] = useState<GroupDraft[]>([])
  const [participants, setParticipants] = useState<ParticipantDraft[]>([])
  const { updateActivity } = useActivities()
  const { mutate } = useSWRConfig()
  const isFinalized = activity?.estado === 'Finalizada'
  const skipNextDraftSaveRef = useRef(false)
  const draftSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open || !activity) return

    const load = async () => {
      setIsLoading(true)
      try {
        const [profilesRes, quotasRes, paymentsRes, groupsRes, participantsRes] = await Promise.all([
          supabase
            .from('perfiles')
            .select('id, nombre_completo, codigo_u, rol, inscripciones(id)')
            .eq('activo', true)
            .order('nombre_completo', { ascending: true }),
          supabase
            .from('config_cuotas')
            .select('id, mes_nombre, monto')
            .eq('activo', true)
            .order('created_at', { ascending: true }),
          supabase.from('pagos').select('id, perfil_id, cuota_id, monto_pagado'),
          supabase.from('actividad_grupos').select('*').eq('actividad_id', activity.id).order('created_at'),
          supabase.from('actividad_participantes').select('*').eq('actividad_id', activity.id),
        ])

        if (profilesRes.error) throw profilesRes.error
        if (quotasRes.error) throw quotasRes.error
        if (paymentsRes.error) throw paymentsRes.error
        if (groupsRes.error) throw groupsRes.error
        if (participantsRes.error) throw participantsRes.error

        const loadedProfiles = profilesRes.data
          .filter((profile) => {
            const inscription = Array.isArray(profile.inscripciones)
              ? profile.inscripciones[0]
              : profile.inscripciones
            return Boolean(inscription) || profile.rol === 'Presidente'
          })
          .map((profile) => ({
            id: profile.id,
            nombre_completo: profile.nombre_completo,
            codigo_u: profile.codigo_u,
          }))
        const savedParticipants = new Map(
          ((participantsRes.data ?? []) as ActividadParticipanteRow[]).map((participant) => [participant.perfil_id, participant])
        )

        setQuotas((quotasRes.data ?? []) as CuotaRow[])
        setPayments((paymentsRes.data ?? []) as PagoRow[])
        setGroups(
          ((groupsRes.data ?? []) as ActividadGrupoRow[]).map((group) => ({
            id: group.id,
            nombre: group.nombre,
            premio: group.premio ?? '',
            costo_premio: Number(group.costo_premio ?? 0),
            notas: group.notas ?? '',
          }))
        )
        skipNextDraftSaveRef.current = true
        setParticipants(
          loadedProfiles.map((perfil) => {
            const saved = savedParticipants.get(perfil.id)
            return {
              perfil,
              grupo_id: saved?.grupo_id ?? NO_GROUP,
              unidades_vendidas: saved ? Number(saved.unidades_vendidas) : '',
              cuota_id: saved?.cuota_id ?? NO_QUOTA,
              aporte_premio: saved ? Number(saved.aporte_premio) : '',
            }
          })
        )
      } catch (error) {
        toast.error(getErrorMessage(error, 'Error al cargar participantes'))
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [activity, open])

  useEffect(() => {
    return () => {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current)
      }
    }
  }, [])

  const paymentsMap = useMemo(() => {
    const map: Record<string, PagoRow> = {}
    payments.forEach((payment) => {
      if (payment.perfil_id && payment.cuota_id) {
        map[`${payment.perfil_id}-${payment.cuota_id}`] = payment
      }
    })
    return map
  }, [payments])

  const quotasMap = useMemo(() => {
    const map: Record<string, CuotaRow> = {}
    quotas.forEach((quota) => {
      map[quota.id] = quota
    })
    return map
  }, [quotas])

  const calculatedParticipants = useMemo(() => {
    if (!activity) return []

    return participants.map((participant) => {
      const quota = participant.cuota_id === NO_QUOTA ? null : quotasMap[participant.cuota_id]
      const payment = quota ? paymentsMap[`${participant.perfil.id}-${quota.id}`] : undefined
      const calculated = calculateActivityParticipant(activity, {
        unitsSold: toNumber(participant.unidades_vendidas),
        currentPaid: Number(payment?.monto_pagado ?? 0),
        quotaAmount: Number(quota?.monto ?? 0),
        hasQuota: Boolean(quota),
      })

      return { participant, quota, payment, calculated }
    })
  }, [activity, participants, paymentsMap, quotasMap])

  const totals = useMemo(() => {
    return calculatedParticipants.reduce(
      (acc, item) => {
        acc.gross += item.calculated.gross
        acc.promotion += item.calculated.promotion
        acc.benefit += item.calculated.benefit
        acc.applied += item.calculated.appliedBenefit
        acc.pending += item.calculated.pendingBenefit
        return acc
      },
      { gross: 0, promotion: 0, benefit: 0, applied: 0, pending: 0 }
    )
  }, [calculatedParticipants])

  const getAvailableQuotas = useCallback((participant: ParticipantDraft) => {
    return quotas.filter((quota) => {
      const paid = paymentsMap[`${participant.perfil.id}-${quota.id}`]?.monto_pagado ?? 0
      return Number(paid) < Number(quota.monto)
    })
  }, [paymentsMap, quotas])

  const validationErrors = useMemo(() => {
    if (!activity || isFinalized) return []

    const errors: string[] = []
    const missingUnits = participants.filter((participant) => participant.unidades_vendidas === '').length
    const qualifyingWithoutQuota = calculatedParticipants.filter(
      ({ participant, calculated }) =>
        calculated.benefit > 0 &&
        participant.cuota_id === NO_QUOTA &&
        getAvailableQuotas(participant).length > 0
    ).length
    const noGroups = activity.usa_grupos && groups.length === 0
    const incompleteGroups = activity.usa_grupos
      ? groups.filter((group) => !group.nombre.trim() || (activity.usa_premios && (!group.premio.trim() || toNumber(group.costo_premio) <= 0))).length
      : 0

    if (missingUnits > 0) errors.push(`${missingUnits} participantes no tienen unidades registradas. Usa 0 si no vendieron.`)
    if (qualifyingWithoutQuota > 0) errors.push(`${qualifyingWithoutQuota} participantes generaron beneficio y no tienen cuota destino.`)
    if (noGroups) errors.push('La actividad usa grupos, pero no hay grupos registrados.')
    if (incompleteGroups > 0) errors.push(`${incompleteGroups} grupos tienen nombre, premio o costo incompleto.`)
    if (totals.gross <= 0) errors.push('La actividad no tiene recaudacion registrada.')

    return errors
  }, [activity, calculatedParticipants, getAvailableQuotas, groups, isFinalized, participants, totals.gross])

  const visibleParticipants = useMemo(() => {
    const query = participantSearch.trim().toLowerCase()

    return calculatedParticipants.filter(({ participant }) => {
      const matchesText = query.length === 0 ||
        participant.perfil.nombre_completo.toLowerCase().includes(query) ||
        (participant.perfil.codigo_u ?? '').toLowerCase().includes(query)
      const matchesGroup = groupFilter === 'all' || participant.grupo_id === groupFilter
      return matchesText && matchesGroup
    })
  }, [calculatedParticipants, groupFilter, participantSearch])

  const updateParticipant = (profileId: string, patch: Partial<ParticipantDraft>) => {
    setParticipants((current) =>
      current.map((participant) =>
        participant.perfil.id === profileId ? { ...participant, ...patch } : participant
      )
    )
  }

  const saveParticipantDraft = useCallback(async () => {
    if (!activity || isFinalized || isLoading || participants.length === 0) return

    setIsSavingDraft(true)

    try {
      const draftPayload = calculatedParticipants.map(({ participant, calculated }) => ({
        actividad_id: activity.id,
        perfil_id: participant.perfil.id,
        grupo_id: participant.grupo_id === NO_GROUP || participant.grupo_id.startsWith('new-') ? null : participant.grupo_id,
        unidades_vendidas: toNumber(participant.unidades_vendidas),
        monto_bruto: calculated.gross,
        monto_promocion: calculated.promotion,
        monto_beneficio: calculated.benefit,
        monto_beneficio_aplicado: 0,
        monto_beneficio_pendiente: calculated.benefit,
        cuota_id: participant.cuota_id === NO_QUOTA ? null : participant.cuota_id,
        aporte_premio: activity.usa_premios ? toNumber(participant.aporte_premio) : 0,
      }))

      const { error } = await supabase
        .from('actividad_participantes')
        .upsert(draftPayload, { onConflict: 'actividad_id,perfil_id' })

      if (error) throw error

      setDraftSavedAt(new Date())
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo guardar el borrador de resultados'))
    } finally {
      setIsSavingDraft(false)
    }
  }, [activity, calculatedParticipants, isFinalized, isLoading, participants.length])

  useEffect(() => {
    if (!open || !activity || isFinalized || isLoading || participants.length === 0) return

    if (skipNextDraftSaveRef.current) {
      skipNextDraftSaveRef.current = false
      return
    }

    if (draftSaveTimerRef.current) {
      clearTimeout(draftSaveTimerRef.current)
    }

    draftSaveTimerRef.current = setTimeout(() => {
      void saveParticipantDraft()
    }, 700)
  }, [activity, isFinalized, isLoading, open, participants, saveParticipantDraft])

  const addGroup = () => {
    setGroups((current) => [
      ...current,
      {
        id: `new-${crypto.randomUUID()}`,
        nombre: `Grupo ${current.length + 1}`,
        premio: '',
        costo_premio: 50,
        notas: '',
      },
    ])
  }

  const updateGroup = (id: string, patch: Partial<GroupDraft>) => {
    setGroups((current) => current.map((group) => (group.id === id ? { ...group, ...patch } : group)))
  }

  const removeUnsavedGroup = (id: string) => {
    setGroups((current) => current.filter((group) => group.id !== id))
    setParticipants((current) =>
      current.map((participant) =>
        participant.grupo_id === id ? { ...participant, grupo_id: NO_GROUP } : participant
      )
    )
  }

  const getGroupCandidateParticipants = (groupId: string) => {
    const query = (groupAssignSearch[groupId] ?? '').trim().toLowerCase()
    if (!query) return []

    return participants
      .filter((participant) => participant.grupo_id !== groupId)
      .filter((participant) =>
        participant.perfil.nombre_completo.toLowerCase().includes(query) ||
        (participant.perfil.codigo_u ?? '').toLowerCase().includes(query)
      )
      .slice(0, 6)
  }

  const saveGroups = async (syncLocalState = false) => {
    if (!activity || !activity.usa_grupos) return new Map<string, string>()

    const groupIdMap = new Map<string, string>()
    const nextGroups: GroupDraft[] = []

    for (const group of groups) {
      if (!group.nombre.trim()) {
        throw new Error('Todos los grupos deben tener nombre antes de guardarse.')
      }

      if (group.id.startsWith('new-')) {
        const { data, error } = await supabase
          .from('actividad_grupos')
          .insert({
            actividad_id: activity.id,
            nombre: group.nombre.trim(),
            premio: group.premio.trim() || null,
            costo_premio: toNumber(group.costo_premio),
            notas: group.notas.trim() || null,
          })
          .select()
          .single()

        if (error) throw error
        groupIdMap.set(group.id, data.id)
        nextGroups.push({
          ...group,
          id: data.id,
          nombre: data.nombre,
          premio: data.premio ?? '',
          costo_premio: Number(data.costo_premio ?? 0),
          notas: data.notas ?? '',
        })
      } else {
        const { error } = await supabase
          .from('actividad_grupos')
          .update({
            nombre: group.nombre.trim(),
            premio: group.premio.trim() || null,
            costo_premio: toNumber(group.costo_premio),
            notas: group.notas.trim() || null,
          })
          .eq('id', group.id)

        if (error) throw error
        groupIdMap.set(group.id, group.id)
        nextGroups.push(group)
      }
    }

    if (syncLocalState) {
      setGroups(nextGroups)
      setParticipants((current) =>
        current.map((participant) => ({
          ...participant,
          grupo_id: participant.grupo_id === NO_GROUP
            ? NO_GROUP
            : groupIdMap.get(participant.grupo_id) ?? participant.grupo_id,
        }))
      )
    }

    return groupIdMap
  }

  const saveGroupDraft = async () => {
    if (!activity) return

    setIsSavingGroups(true)

    try {
      const groupIdMap = await saveGroups(true)
      const translatedParticipants = participants.map((participant) => ({
        ...participant,
        grupo_id: participant.grupo_id === NO_GROUP
          ? NO_GROUP
          : groupIdMap.get(participant.grupo_id) ?? participant.grupo_id,
      }))

      const draftPayload = translatedParticipants.map((participant) => {
        const quota = participant.cuota_id === NO_QUOTA ? null : quotasMap[participant.cuota_id]
        const payment = quota ? paymentsMap[`${participant.perfil.id}-${quota.id}`] : undefined
        const calculated = calculateActivityParticipant(activity, {
          unitsSold: toNumber(participant.unidades_vendidas),
          currentPaid: Number(payment?.monto_pagado ?? 0),
          quotaAmount: Number(quota?.monto ?? 0),
          hasQuota: Boolean(quota),
        })

        return {
          actividad_id: activity.id,
          perfil_id: participant.perfil.id,
          grupo_id: participant.grupo_id === NO_GROUP
            ? null
            : groupIdMap.get(participant.grupo_id) ?? participant.grupo_id,
          unidades_vendidas: toNumber(participant.unidades_vendidas),
          monto_bruto: calculated.gross,
          monto_promocion: calculated.promotion,
          monto_beneficio: calculated.benefit,
          monto_beneficio_aplicado: 0,
          monto_beneficio_pendiente: calculated.benefit,
          cuota_id: participant.cuota_id === NO_QUOTA ? null : participant.cuota_id,
          aporte_premio: activity.usa_premios ? toNumber(participant.aporte_premio) : 0,
        }
      })

      const { error } = await supabase
        .from('actividad_participantes')
        .upsert(draftPayload, { onConflict: 'actividad_id,perfil_id' })

      if (error) throw error

      setParticipants(translatedParticipants)
      toast.success('Grupos guardados')
      mutate('api/activities')
      setGroupManagerOpen(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudieron guardar los grupos'))
    } finally {
      setIsSavingGroups(false)
    }
  }

  const applyBenefit = async (
    perfilId: string,
    quota: CuotaRow,
    payment: PagoRow | undefined,
    amount: number,
    participantId: string
  ) => {
    if (!activity || amount <= 0) return

    const nextTotal = Number(payment?.monto_pagado ?? 0) + amount
    const nextState = nextTotal >= Number(quota.monto) ? 'Pagado' : 'Pendiente'
    let paymentId = payment?.id

    if (paymentId) {
      const { error } = await supabase
        .from('pagos')
        .update({
          monto_pagado: nextTotal,
          estado: nextState,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId)

      if (error) throw error
    } else {
      const { data, error } = await supabase
        .from('pagos')
        .insert({
          perfil_id: perfilId,
          cuota_id: quota.id,
          monto_pagado: amount,
          estado: nextState,
        })
        .select()
        .single()

      if (error) throw error
      paymentId = data.id
    }

    const { error } = await supabase.from('pago_movimientos').insert({
      pago_id: paymentId,
      perfil_id: perfilId,
      cuota_id: quota.id,
      actividad_id: activity.id,
      actividad_participante_id: participantId,
      origen: 'beneficio_actividad',
      monto: amount,
      nota: `Beneficio generado en ${activity.nombre}`,
    })

    if (error) throw error
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (isFinalized) return

    if (validationErrors.length > 0) {
      toast.error(validationErrors[0])
      return
    }

    setConfirmOpen(true)
  }

  const finalizeActivity = async () => {
    if (!activity) return

    setIsSubmitting(true)
    setConfirmOpen(false)

    try {
      const groupIdMap = await saveGroups()
      const participantPayloads = calculatedParticipants.map(({ participant, calculated }) => ({
        actividad_id: activity.id,
        perfil_id: participant.perfil.id,
        grupo_id: participant.grupo_id === NO_GROUP ? null : groupIdMap.get(participant.grupo_id) ?? participant.grupo_id,
        unidades_vendidas: toNumber(participant.unidades_vendidas),
        monto_bruto: calculated.gross,
        monto_promocion: calculated.promotion,
        monto_beneficio: calculated.benefit,
        monto_beneficio_aplicado: calculated.appliedBenefit,
        monto_beneficio_pendiente: calculated.pendingBenefit,
        cuota_id: participant.cuota_id === NO_QUOTA ? null : participant.cuota_id,
        aporte_premio: activity.usa_premios ? toNumber(participant.aporte_premio) : 0,
      }))

      const { data: savedParticipants, error: participantsError } = await supabase
        .from('actividad_participantes')
        .upsert(participantPayloads, { onConflict: 'actividad_id,perfil_id' })
        .select()

      if (participantsError) throw participantsError

      const savedByProfile = new Map(
        ((savedParticipants ?? []) as ActividadParticipanteRow[]).map((participant) => [participant.perfil_id, participant])
      )

      for (const item of calculatedParticipants) {
        if (!item.quota || item.calculated.appliedBenefit <= 0) continue
        const savedParticipant = savedByProfile.get(item.participant.perfil.id)
        if (!savedParticipant) continue

        await applyBenefit(
          item.participant.perfil.id,
          item.quota,
          item.payment,
          item.calculated.appliedBenefit,
          savedParticipant.id
        )
      }

      await updateActivity(activity.id, {
        estado: 'Finalizada',
        monto_recaudado: totals.promotion,
        total_bruto: totals.gross,
        total_promocion: totals.promotion,
        total_beneficio: totals.benefit,
        total_premios_externos: groups.reduce((acc, group) => acc + toNumber(group.costo_premio), 0),
      })

      toast.success(
        totals.pending > 0
          ? 'Actividad finalizada. Hay beneficio pendiente: configura la siguiente cuota para aplicarlo.'
          : 'Actividad finalizada y beneficios aplicados.'
      )
      mutate('api/activities')
      mutate('api/payments-matrix')
      mutate('api/dashboard-stats')
      mutate('api/expenses')
      onOpenChange(false)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Error al finalizar actividad'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!activity) return null

  const quotaLabel = (quotaId: string) => {
    if (quotaId === NO_QUOTA) return 'Sin aplicar'
    const quota = quotasMap[quotaId]
    return quota ? `${quota.mes_nombre} - S/ ${Number(quota.monto).toFixed(0)}` : 'Cuota no encontrada'
  }

  const groupLabel = (groupId: string) => {
    if (groupId === NO_GROUP) return 'Sin grupo'
    return groups.find((group) => group.id === groupId)?.nombre || 'Grupo sin nombre'
  }

  const upToDateCount = participants.filter((participant) => getAvailableQuotas(participant).length === 0).length

  const handleMainOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !isFinalized && participants.length > 0) {
      if (draftSaveTimerRef.current) {
        clearTimeout(draftSaveTimerRef.current)
        draftSaveTimerRef.current = null
      }
      void saveParticipantDraft()
    }

    onOpenChange(nextOpen)
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleMainOpenChange}>
      <DialogContent className="custom-scrollbar max-h-[92vh] overflow-y-auto sm:max-w-[1120px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <DialogTitle>{isFinalized ? 'Detalles de actividad' : 'Ver detalles y registrar resultados'}</DialogTitle>
                <DialogDescription>
                  {isFinalized
                    ? 'Consulta resultados, grupos, beneficios y montos registrados.'
                    : 'Revisa los datos y finaliza cuando todos los resultados esten completos.'}
                </DialogDescription>
              </div>
              {!isFinalized && (
                <Badge variant="outline" className="w-fit">
                  {isSavingDraft
                    ? 'Guardando borrador...'
                    : draftSavedAt
                      ? `Borrador guardado ${draftSavedAt.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Borrador automatico'}
                </Badge>
              )}
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              <Loader2Icon className="mr-2 h-5 w-5 animate-spin" />
              Cargando participantes...
            </div>
          ) : (
            <div className="space-y-5 py-4">
              <div className="grid gap-3 sm:grid-cols-5">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Bruto</p>
                  <p className="text-lg font-bold">S/ {totals.gross.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Promocion</p>
                  <p className="text-lg font-bold text-emerald-600">S/ {totals.promotion.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Beneficio</p>
                  <p className="text-lg font-bold text-blue-600">S/ {totals.benefit.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Aplicado</p>
                  <p className="text-lg font-bold">S/ {totals.applied.toFixed(2)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Pendiente</p>
                  <p className="text-lg font-bold text-amber-600">S/ {totals.pending.toFixed(2)}</p>
                </div>
              </div>

              {activity.usa_grupos && (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <Label>Grupos y premios</Label>
                      <p className="text-xs text-muted-foreground">
                        {groups.length} grupos configurados. El costo del premio queda como aporte externo.
                      </p>
                    </div>
                    <Button type="button" size="sm" variant="outline" className="gap-2" onClick={() => setGroupManagerOpen(true)}>
                      <Settings2Icon className="h-4 w-4" />
                      Gestionar grupos
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {groups.length === 0 ? (
                      <span className="text-sm text-muted-foreground">Aun no hay grupos.</span>
                    ) : (
                      groups.map((group) => (
                        <Badge key={group.id} variant="outline" className="gap-1">
                          {group.nombre || 'Grupo sin nombre'}
                          {group.premio ? ` · ${group.premio}` : ''}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
              )}

              {upToDateCount > 0 && !isFinalized && (
                <div className="rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
                  Hay {upToDateCount} alumnos al dia. Si generan beneficio, quedara pendiente hasta que actives la siguiente cuota en Configuracion.
                </div>
              )}

              <div className="flex flex-col gap-3 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                  <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar participante o codigo..."
                    value={participantSearch}
                    onChange={(event) => setParticipantSearch(event.target.value)}
                  />
                </div>
                {activity.usa_grupos && (
                  <Select value={groupFilter} onValueChange={(value) => setGroupFilter(value ?? 'all')}>
                    <SelectTrigger className="w-full sm:w-[220px]">
                      <span className="truncate">{groupFilter === 'all' ? 'Todos los grupos' : groupLabel(groupFilter)}</span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los grupos</SelectItem>
                      <SelectItem value={NO_GROUP}>Sin grupo</SelectItem>
                      {groups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.nombre || 'Grupo sin nombre'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="rounded-lg border">
                <div className="custom-scrollbar max-h-[460px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-secondary">
                      <TableRow>
                        <TableHead className="min-w-[220px]">Participante</TableHead>
                        {activity.usa_grupos && <TableHead className="min-w-[150px]">Grupo</TableHead>}
                        <TableHead className="w-[110px]">{activity.etiqueta_unidad}</TableHead>
                        <TableHead className="min-w-[150px]">Cuota destino</TableHead>
                        {activity.usa_premios && <TableHead className="w-[120px]">Aporte premio</TableHead>}
                        <TableHead className="text-right">Promocion</TableHead>
                        <TableHead className="text-right">Beneficio</TableHead>
                        <TableHead className="text-right">Pendiente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visibleParticipants.map(({ participant, calculated }) => {
                        const availableQuotas = getAvailableQuotas(participant)
                        const isUpToDate = availableQuotas.length === 0

                        return (
                        <TableRow key={participant.perfil.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{participant.perfil.nombre_completo}</span>
                              <span className="text-xs text-muted-foreground">{participant.perfil.codigo_u}</span>
                            </div>
                          </TableCell>
                          {activity.usa_grupos && (
                            <TableCell>
                              <Select
                                value={participant.grupo_id}
                                onValueChange={(value) => updateParticipant(participant.perfil.id, { grupo_id: value ?? NO_GROUP })}
                                disabled={isFinalized}
                              >
                                <SelectTrigger className="w-full min-w-[150px]">
                                  <span className="truncate">{groupLabel(participant.grupo_id)}</span>
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={NO_GROUP}>Sin grupo</SelectItem>
                                  {groups.map((group) => (
                                    <SelectItem key={group.id} value={group.id}>
                                      {group.nombre || 'Grupo sin nombre'}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          )}
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="1"
                              inputMode="numeric"
                              className="no-number-spinner"
                              value={participant.unidades_vendidas}
                              disabled={isFinalized}
                              onChange={(e) =>
                                updateParticipant(participant.perfil.id, {
                                  unidades_vendidas: e.target.value ? Number(e.target.value) : '',
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              value={participant.cuota_id}
                              onValueChange={(value) => updateParticipant(participant.perfil.id, { cuota_id: value ?? NO_QUOTA })}
                              disabled={isFinalized || isUpToDate}
                            >
                              <SelectTrigger className="w-full min-w-[150px]">
                                <span className="truncate">{isUpToDate ? 'Al dia - habilita siguiente cuota' : quotaLabel(participant.cuota_id)}</span>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={NO_QUOTA}>Sin aplicar</SelectItem>
                                {availableQuotas.map((quota) => (
                                  <SelectItem key={quota.id} value={quota.id}>
                                    {quota.mes_nombre} - S/ {Number(quota.monto).toFixed(0)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          {activity.usa_premios && (
                            <TableCell>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                inputMode="decimal"
                                className="no-number-spinner"
                                value={participant.aporte_premio}
                                disabled={isFinalized}
                                onChange={(e) =>
                                  updateParticipant(participant.perfil.id, {
                                    aporte_premio: e.target.value ? Number(e.target.value) : '',
                                  })
                                }
                              />
                            </TableCell>
                          )}
                          <TableCell className="text-right font-medium text-emerald-600">
                            S/ {calculated.promotion.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-blue-600">
                            S/ {calculated.benefit.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-amber-600">
                            S/ {calculated.pendingBenefit.toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )})}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {totals.pending > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                  Hay S/ {totals.pending.toFixed(2)} de beneficio sin aplicar. Configura o activa la siguiente cuota en Configuracion para poder usarlo.
                </div>
              )}
              {validationErrors.length > 0 && !isFinalized && (
                <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-100">
                  <p className="font-semibold">Faltan datos para finalizar</p>
                  <ul className="mt-1 list-disc pl-5">
                    {validationErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleMainOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            {!isFinalized && (
            <Button type="submit" disabled={isSubmitting || isLoading || validationErrors.length > 0} className="bg-emerald-600 text-white hover:bg-emerald-700">
              {isSubmitting ? (
                <>
                  <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  <CheckCircle2Icon className="mr-2 h-4 w-4" />
                  Finalizar actividad
                </>
              )}
            </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar finalizacion</AlertDialogTitle>
          <AlertDialogDescription>
            Estas seguro de finalizar esta actividad? Se guardaran los resultados, se sumara S/ {totals.promotion.toFixed(2)} a la promocion y se aplicaran S/ {totals.applied.toFixed(2)} como beneficio en cuotas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Seguir revisando</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              finalizeActivity()
            }}
            disabled={isSubmitting}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Finalizando...
              </>
            ) : (
              <>
                <EyeIcon className="mr-2 h-4 w-4" />
                Si, finalizar
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <Dialog open={groupManagerOpen} onOpenChange={(nextOpen) => {
      if (!nextOpen && !isFinalized) {
        void saveGroupDraft()
        return
      }
      setGroupManagerOpen(nextOpen)
    }}>
      <DialogContent className="custom-scrollbar max-h-[88vh] overflow-y-auto sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle>Gestionar grupos</DialogTitle>
          <DialogDescription>
            Crea grupos, define premios y asigna participantes sin llenar la pantalla principal.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">{groups.length} grupos</div>
            <Button type="button" size="sm" className="gap-2" onClick={addGroup} disabled={isFinalized || isSavingGroups}>
              <PlusIcon className="h-4 w-4" />
              Nuevo grupo
            </Button>
          </div>

          <div className="grid gap-3">
            {groups.map((group) => {
              const assignedCount = participants.filter((participant) => participant.grupo_id === group.id).length

              return (
                <div key={group.id} className="rounded-lg border bg-card p-3">
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_110px_36px]">
                    <Input value={group.nombre} onChange={(e) => updateGroup(group.id, { nombre: e.target.value })} placeholder="Grupo" disabled={isFinalized || isSavingGroups} />
                    <Input value={group.premio} onChange={(e) => updateGroup(group.id, { premio: e.target.value })} placeholder="Premio" disabled={isFinalized || isSavingGroups} />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      className="no-number-spinner"
                      value={group.costo_premio}
                      onChange={(e) => updateGroup(group.id, { costo_premio: e.target.value ? Number(e.target.value) : '' })}
                      placeholder="S/ 50"
                      disabled={isFinalized || isSavingGroups}
                    />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeUnsavedGroup(group.id)} disabled={isFinalized || isSavingGroups}>
                      <Trash2Icon className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Badge variant="outline">{assignedCount} integrantes</Badge>
                    <div className="relative w-full sm:w-[320px]">
                      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        className="pl-9"
                        placeholder="Buscar integrante..."
                        value={groupAssignSearch[group.id] ?? ''}
                        onChange={(event) =>
                          setGroupAssignSearch((current) => ({ ...current, [group.id]: event.target.value }))
                        }
                        disabled={isFinalized || isSavingGroups}
                      />
                    </div>
                  </div>
                  {getGroupCandidateParticipants(group.id).length > 0 && (
                    <div className="mt-3 grid gap-1">
                      {getGroupCandidateParticipants(group.id).map((participant) => (
                        <button
                          key={participant.perfil.id}
                          type="button"
                          className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                          onClick={() => {
                            updateParticipant(participant.perfil.id, { grupo_id: group.id })
                            setGroupAssignSearch((current) => ({ ...current, [group.id]: '' }))
                          }}
                          disabled={isFinalized || isSavingGroups}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium">{participant.perfil.nombre_completo}</span>
                            <span className="text-xs text-muted-foreground">{participant.perfil.codigo_u}</span>
                          </span>
                          <PlusIcon className="ml-3 h-4 w-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={saveGroupDraft} disabled={isFinalized || isSavingGroups}>
            {isSavingGroups ? (
              <>
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar y cerrar'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
