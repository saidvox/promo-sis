export const getRoleColor = (role: string | null) => {
  switch (role) {
    case 'Presidente': return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 border-transparent'
    case 'Sub Presidente': return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/25 border-transparent'
    case 'Tesorero': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border-transparent'
    case 'Secretaria': return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 border-transparent'
    case 'Logistica': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border-transparent'
    case 'Redes': return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 hover:bg-purple-500/25 border-transparent'
    case 'Alumno':
    default:
      return 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent'
  }
}
