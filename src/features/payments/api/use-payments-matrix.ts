import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type PerfilRow = Pick<Database['public']['Tables']['perfiles']['Row'], 'id' | 'nombre_completo' | 'dni' | 'rol' | 'codigo_u'>
type CuotaRow = Pick<Database['public']['Tables']['config_cuotas']['Row'], 'id' | 'mes_nombre' | 'monto' | 'fecha_vencimiento'>
type PagoRow = Database['public']['Tables']['pagos']['Row']

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
  // js-index-maps: Mapa de inscripciones (perfilId -> monto) para tratar Enero como Inscripción
  inscripcionesMap: Record<string, number>
}

/**
 * Hook para traer la Sábana de Pagos en bulk.
 * Cumple Vercel Best Practices: 
 * 1. async-parallel mediante Promise.all
 * 2. js-index-maps generando un mapa de O(1) en cliente para la Matriz.
 */
export const usePaymentsMatrix = () => {
  const fetcher = async (): Promise<MatrixData> => {
    const [perfilesResult, inscripcionesResult, cuotasResult, pagosResult] = await Promise.all([
      supabase
        .from('perfiles')
        .select('id, nombre_completo, dni, rol, codigo_u')
        .order('nombre_completo', { ascending: true }),
        
      supabase
        .from('inscripciones')
        .select('perfil_id, monto'),
        
      supabase
        .from('config_cuotas')
        .select('id, mes_nombre, monto, fecha_vencimiento')
        .eq('activo', true),

      supabase
        .from('pagos')
        .select('*')
    ])

    if (perfilesResult.error) throw perfilesResult.error
    if (inscripcionesResult.error) throw inscripcionesResult.error
    if (cuotasResult.error) throw cuotasResult.error
    if (pagosResult.error) throw pagosResult.error

    // Ahora consideramos A TODOS los perfiles, para tener una matriz total
    const perfilesInscritos = perfilesResult.data as PerfilRow[]

    const inscripciones = inscripcionesResult.data as any[]
    const cuotasArray = cuotasResult.data as CuotaRow[]
    const pagosArray = pagosResult.data as PagoRow[]

    // Construir diccionarios
    const cuotasPorMes: Record<string, CuotaRow> = {}
    for (const c of cuotasArray) {
      if (c.mes_nombre) {
        cuotasPorMes[c.mes_nombre] = c
      }
    }

    const pagosMap: Record<string, PagoRow> = {}
    for (const pago of pagosArray) {
      if (pago.perfil_id && pago.cuota_id) {
        pagosMap[`${pago.perfil_id}-${pago.cuota_id}`] = pago
      }
    }

    const inscripcionesMap: Record<string, number> = {}
    for (const i of inscripciones) {
      if (i.perfil_id) {
        // En caso de fallas de fetch cache, garantizamos un valor truthy
        inscripcionesMap[i.perfil_id] = i.monto || 100 
      }
    }

    return { perfilesInscritos, cuotasPorMes, pagosMap, inscripcionesMap }
  }

  const { data, error, isLoading, mutate } = useSWR<MatrixData, Error>(
    'api/payments-matrix',
    fetcher
  )

  return { data, error, isLoading, mutate }
}
