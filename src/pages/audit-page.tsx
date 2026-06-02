import { useMemo, useState } from 'react'
import { ActivityIcon, ChevronDownIcon, SearchIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuditLogs, type AuditLog } from '@/features/audit/api/audit-events'
import { formatAuditDate } from '@/features/audit/utils/audit-format'

const ALL_VALUE = 'all'

function prettyJson(value: unknown) {
  if (value === null || value === undefined) return 'Sin datos'
  return JSON.stringify(value, null, 2)
}

function getUniqueValues(logs: AuditLog[] | undefined, field: keyof Pick<AuditLog, 'action' | 'entity_type' | 'actor_username'>) {
  return Array.from(new Set((logs ?? []).map((log) => log[field]).filter(Boolean))).sort()
}

export function AuditPage() {
  const { data: logs, isLoading, error } = useAuditLogs(300)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState(ALL_VALUE)
  const [entityType, setEntityType] = useState(ALL_VALUE)
  const [actor, setActor] = useState(ALL_VALUE)
  const [date, setDate] = useState('')

  const actions = getUniqueValues(logs, 'action')
  const entityTypes = getUniqueValues(logs, 'entity_type')
  const actors = getUniqueValues(logs, 'actor_username')

  const filteredLogs = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()
    return (logs ?? []).filter((log) => {
      const createdDate = log.created_at.slice(0, 10)
      const matchesSearch =
        normalizedSearch.length === 0 ||
        log.summary.toLowerCase().includes(normalizedSearch) ||
        log.actor_display_name.toLowerCase().includes(normalizedSearch) ||
        log.actor_username.toLowerCase().includes(normalizedSearch)

      return (
        matchesSearch &&
        (action === ALL_VALUE || log.action === action) &&
        (entityType === ALL_VALUE || log.entity_type === entityType) &&
        (actor === ALL_VALUE || log.actor_username === actor) &&
        (!date || createdDate === date)
      )
    })
  }, [action, actor, date, entityType, logs, search])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="text-center text-destructive">
          <h2 className="text-xl font-bold">Error cargando auditoria</h2>
          <p>No se pudo leer el historial de acciones.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 sm:p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ActivityIcon className="size-5" />
            </div>
            <div>
              <CardTitle>Auditoria del sistema</CardTitle>
              <CardDescription>Registro visible de acciones criticas realizadas por usuarios autenticados.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar resumen o usuario..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={action} onValueChange={(value) => setAction(value ?? ALL_VALUE)}>
              <SelectTrigger>
                <SelectValue placeholder="Accion" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todas las acciones</SelectItem>
                {actions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={entityType} onValueChange={(value) => setEntityType(value ?? ALL_VALUE)}>
              <SelectTrigger>
                <SelectValue placeholder="Modulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Todos los modulos</SelectItem>
                {entityTypes.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
          <Select value={actor} onValueChange={(value) => setActor(value ?? ALL_VALUE)}>
            <SelectTrigger className="max-w-sm">
              <SelectValue placeholder="Usuario" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>Todos los usuarios</SelectItem>
              {actors.map((item) => <SelectItem key={item} value={item}>@{item}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventos</CardTitle>
          <CardDescription>{filteredLogs.length} registros encontrados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}

          {!isLoading && filteredLogs.map((log) => (
            <details key={log.id} className="rounded-xl border border-border/70 bg-card/70">
              <summary className="flex w-full cursor-pointer list-none items-start justify-between gap-4 px-4 py-3 text-left">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">@{log.actor_username}</Badge>
                    <Badge variant="outline">{log.entity_type}</Badge>
                    <span className="text-xs text-muted-foreground">{formatAuditDate(log.created_at)}</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{log.summary}</p>
                  <p className="text-xs text-muted-foreground">{log.actor_display_name} · {log.action}</p>
                </div>
                <ChevronDownIcon className="mt-1 size-4 shrink-0 text-muted-foreground" />
              </summary>
              <div className="border-t border-border/60 px-4 py-3">
                <div className="grid gap-3 lg:grid-cols-3">
                  <pre className="max-h-72 overflow-auto rounded-lg bg-muted/50 p-3 text-xs">metadata{'\n'}{prettyJson(log.metadata)}</pre>
                  <pre className="max-h-72 overflow-auto rounded-lg bg-muted/50 p-3 text-xs">before{'\n'}{prettyJson(log.before_data)}</pre>
                  <pre className="max-h-72 overflow-auto rounded-lg bg-muted/50 p-3 text-xs">after{'\n'}{prettyJson(log.after_data)}</pre>
                </div>
              </div>
            </details>
          ))}

          {!isLoading && filteredLogs.length === 0 && (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No hay eventos que coincidan con los filtros.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
