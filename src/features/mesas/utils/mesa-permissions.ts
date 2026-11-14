import { createContext, useContext } from 'react'
import type { MesaCuenta } from '@/types/mesas.types'

export function createMesaPermissions(accounts: MesaCuenta[], userId: string | undefined) {
  const mine = accounts.filter((account) => account.user_id === userId)
  const isOwner = mine.some((account) => account.es_owner)
  const protectedProfiles = new Set(accounts.map((account) => account.perfil_id))
  const ownProfiles = new Set(mine.map((account) => account.perfil_id))
  return {
    isOwner,
    isProtected: (profileId?: string | null) => Boolean(profileId && protectedProfiles.has(profileId)),
    canManage: (profileId?: string | null) => Boolean(userId && (isOwner || !profileId || !protectedProfiles.has(profileId) || ownProfiles.has(profileId))),
  }
}

export const MesaPermissionsContext = createContext<ReturnType<typeof createMesaPermissions> | null>(null)
export function useMesaPermissions() {
  const permissions = useContext(MesaPermissionsContext)
  if (!permissions) throw new Error('Mesa permissions must be provided by the workspace.')
  return permissions
}
