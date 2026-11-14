const committeeColors: Record<string, string> = {
  Presidente: 'hsl(350 75% 60%)', 'Sub Presidente': 'hsl(190 70% 55%)',
  Tesorero: 'hsl(155 65% 48%)', Secretaria: 'hsl(215 75% 65%)',
  Logistica: 'hsl(38 85% 60%)', Redes: 'hsl(275 65% 65%)',
}
export function familyColor(role?: string | null) { return committeeColors[role ?? ''] ?? 'hsl(var(--foreground))' }
export function isCommittee(role?: string | null) { return Boolean(role && role in committeeColors) }

export function seatPoint(position: number) {
  const angle = (-157.5 + (position - 1) * 45) * Math.PI / 180
  return { x: 90 + Math.cos(angle) * 78, y: 90 + Math.sin(angle) * 78 }
}
export type SalonViewport = { x: number; y: number; scale: number }
export type SalonFocus = { id: string; request: number }
