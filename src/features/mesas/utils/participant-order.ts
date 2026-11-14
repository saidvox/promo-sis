type Participant = { rol: string | null; nombre_completo: string }
const priority: Record<string, number> = { Presidente: 0, 'Sub Presidente': 1, Tesorero: 2, Secretaria: 3, Logistica: 4, Redes: 5 }
export function sortParticipants<T extends Participant>(profiles: T[]): T[] {
  return [...profiles].sort((a, b) => (priority[a.rol ?? ''] ?? 6) - (priority[b.rol ?? ''] ?? 6)
    || a.nombre_completo.localeCompare(b.nombre_completo, 'es'))
}
