import { useState } from 'react'
import { ChevronsUpDownIcon, LockKeyholeIcon, SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import type { MatrixData } from '@/features/payments/api/use-payments-matrix'
import { familyColor, isCommittee } from '../utils/salon-geometry'
import { sortParticipants } from '../utils/participant-order'
import { cn } from '@/lib/utils'

export function ParticipantPicker({ profiles, value, onSelect, disabled, label = 'Buscar participante…', className, details, disabledIds = [] }: {
  profiles: MatrixData['perfilesInscritos']
  value?: string
  onSelect: (id: string) => void
  disabled?: boolean
  label?: string
  className?: string
  details?: Record<string, string>
  disabledIds?: string[]
}) {
  const [open, setOpen] = useState(false)
  const selected = profiles.find((profile) => profile.id === value)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" disabled={disabled} className={cn('w-full justify-between sm:w-72', className)} role="combobox" aria-expanded={open} aria-label={label} />}>
        <span className="flex min-w-0 items-center gap-2">
          <SearchIcon className="shrink-0 text-muted-foreground" />
          <span className="truncate">{selected?.nombre_completo ?? label}</span>
        </span>
        <ChevronsUpDownIcon className="shrink-0 text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <Command>
          <CommandInput placeholder="Escribe nombre o código…" aria-label="Filtrar participantes" />
          <CommandList className="max-h-64">
            <CommandEmpty>No se encontraron participantes.</CommandEmpty>
            {[true, false].map((committee) => <CommandGroup key={String(committee)} heading={committee ? 'Comité' : 'Alumnos'}>
              {sortParticipants(profiles).filter((profile) => isCommittee(profile.rol) === committee).map((profile) => (
                <CommandItem key={profile.id} value={`${profile.nombre_completo} ${profile.codigo_u}`} disabled={disabledIds.includes(profile.id)} data-checked={profile.id === value} onSelect={() => {
                  setOpen(false)
                  onSelect(profile.id)
                }}>
                  <span className="size-2 shrink-0 rounded-full" style={{ background: familyColor(profile.rol) }} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-xs font-medium">{profile.nombre_completo}</span>
                    <span className="text-[10px] text-muted-foreground">{profile.codigo_u} · {profile.rol ?? 'Alumno'}{details?.[profile.id] ? ' · ' + details[profile.id] : ''}</span>
                  </span>
                  {disabledIds.includes(profile.id) && <LockKeyholeIcon className="shrink-0 text-muted-foreground" aria-label="Elección protegida" />}
                </CommandItem>
              ))}
            </CommandGroup>)}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
