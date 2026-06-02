import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type PerfilRow = Pick<Database['public']['Tables']['perfiles']['Row'], 'id' | 'nombre_completo' | 'dni' | 'rol' | 'codigo_u' | 'activo'>
type CuotaRow = Pick<Database['public']['Tables']['config_cuotas']['Row'], 'id' | 'mes_nombre' | 'monto' | 'fecha_vencimiento'>
type PagoRow = Database['public']['Tables']['pagos']['Row']
export type InscripcionLiteRow = Pick<
  Database['public']['Tables']['inscripciones']['Row'],
  'id' | 'perfil_id' | 'monto' | 'metodo_pago' | 'url_voucher' | 'created_at'
>

export type PaymentMovement = Database['public']['Tables']['pago_movimientos']['Row'] & {
  actividades?: { nombre: string } | null
}

export const MESES_DEL_ANO = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
] as const

export type MesAno = typeof MESES_DEL_ANO[number]

export type MatrixData = {
  perfilesInscritos: PerfilRow[]
  // js-index-maps: Mapa para verificar rápidamente si el mes tiene una cuota configurada.
  cuotasPorMes: Record<string, CuotaRow> 
  // js-index-maps: Hash Map O(1) cruzando perfilId-cuotaId
  pagosMap: Record<string, PagoRow> 
  paymentMovementsMap: Record<string, PaymentMovement[]>
  // js-index-maps: Mapa de inscripciones (perfilId -> monto) para tratar Enero como Inscripción
  inscripcionesMap: Record<string, number>
  inscripcionesDetailMap: Record<string, InscripcionLiteRow>
}

function buildQuotasMap(quotas: CuotaRow[]) {
  const quotasMap: Record<string, CuotaRow> = {}
  for (const quota of quotas) {
    if (quota.mes_nombre) quotasMap[quota.mes_nombre] = quota
  }
  return quotasMap
}

function buildPaymentsMap(payments: PagoRow[]) {
  const paymentsMap: Record<string, PagoRow> = {}
  for (const payment of payments) {
    if (payment.perfil_id && payment.cuota_id) {
      paymentsMap[`${payment.perfil_id}-${payment.cuota_id}`] = payment
    }
  }
  return paymentsMap
}

function buildMovementsMap(movements: PaymentMovement[]) {
  const movementsMap: Record<string, PaymentMovement[]> = {}
  for (const movement of movements) {
    if (movement.perfil_id && movement.cuota_id) {
      const key = `${movement.perfil_id}-${movement.cuota_id}`
      movementsMap[key] = [...(movementsMap[key] ?? []), movement]
    }
  }
  return movementsMap
}

function buildEnrollmentMaps(enrollments: InscripcionLiteRow[]) {
  const enrollmentAmounts: Record<string, number> = {}
  const enrollmentDetails: Record<string, InscripcionLiteRow> = {}
  for (const enrollment of enrollments) {
    if (enrollment.perfil_id) {
      enrollmentAmounts[enrollment.perfil_id] = enrollment.monto || 100
      enrollmentDetails[enrollment.perfil_id] = enrollment
    }
  }
  return { enrollmentAmounts, enrollmentDetails }
}

/**
 * Hook para traer la Sábana de Pagos en bulk.
 * Cumple Vercel Best Practices: 
 * 1. async-parallel mediante Promise.all
 * 2. js-index-maps generando un mapa de O(1) en cliente para la Matriz.
 */
export const usePaymentsMatrix = () => {
  const fetcher = async (): Promise<MatrixData> => {
    const [perfilesResult, inscripcionesResult, cuotasResult, pagosResult, movementsResult] = await Promise.all([
      supabase
        .from('perfiles')
        .select('id, nombre_completo, dni, rol, codigo_u, activo')
        .order('nombre_completo', { ascending: true }),
        
      supabase
        .from('inscripciones')
        .select('id, perfil_id, monto, metodo_pago, url_voucher, created_at'),
        
      supabase
        .from('config_cuotas')
        .select('id, mes_nombre, monto, fecha_vencimiento')
        .eq('activo', true),

      supabase
        .from('pagos')
        .select('*'),

      supabase
        .from('pago_movimientos')
        .select('*, actividades(nombre)')
        .order('created_at', { ascending: true })
    ])

    if (perfilesResult.error) throw perfilesResult.error
    if (inscripcionesResult.error) throw inscripcionesResult.error
    if (cuotasResult.error) throw cuotasResult.error
    if (pagosResult.error) throw pagosResult.error
    if (movementsResult.error) throw movementsResult.error

    // Ahora consideramos A TODOS los perfiles, para tener una matriz total
    const perfilesInscritos = perfilesResult.data as PerfilRow[]

    const inscripciones = (inscripcionesResult.data ?? []) as InscripcionLiteRow[]
    const cuotasArray = cuotasResult.data as CuotaRow[]
    const pagosArray = pagosResult.data as PagoRow[]
    const movementsArray = (movementsResult.data ?? []) as PaymentMovement[]

    const cuotasPorMes = buildQuotasMap(cuotasArray)
    const pagosMap = buildPaymentsMap(pagosArray)
    const paymentMovementsMap = buildMovementsMap(movementsArray)
    const { enrollmentAmounts: inscripcionesMap, enrollmentDetails: inscripcionesDetailMap } =
      buildEnrollmentMaps(inscripciones)

    return { perfilesInscritos, cuotasPorMes, pagosMap, paymentMovementsMap, inscripcionesMap, inscripcionesDetailMap }
  }

  const { data, error, isLoading, mutate } = useSWR<MatrixData, Error>(
    'api/payments-matrix',
    fetcher
  )

  return { data, error, isLoading, mutate }
}
