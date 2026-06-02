import useSWR from 'swr'
import { supabase } from '@/lib/supabase/client'
import type { Database, Json } from '@/types/database.types'

export type AuditLog = Database['public']['Tables']['audit_logs']['Row']

export type AuditEventInput = {
  action: string
  entityType: string
  entityId?: string | null
  summary: string
  metadata?: Json
  beforeData?: Json | null
  afterData?: Json | null
}

export async function recordAuditEvent(event: AuditEventInput) {
  const { error } = await supabase.from('audit_logs').insert({
    action: event.action,
    entity_type: event.entityType,
    entity_id: event.entityId ?? null,
    summary: event.summary,
    metadata: event.metadata ?? {},
    before_data: event.beforeData ?? null,
    after_data: event.afterData ?? null,
  })

  if (error) {
    console.error('Audit log write failed:', error)
  }
}

async function fetchAuditLogs(limit: number) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data ?? []
}

export function useAuditLogs(limit = 200) {
  const { data, error, isLoading, mutate } = useSWR<AuditLog[], Error>(
    ['api/audit-logs', limit],
    () => fetchAuditLogs(limit)
  )

  return { data, error, isLoading, mutate }
}

export function useRecentAuditLogs(limit = 8) {
  const { data, error, isLoading, mutate } = useSWR<AuditLog[], Error>(
    ['api/recent-audit-logs', limit],
    () => fetchAuditLogs(limit)
  )

  return { data, error, isLoading, mutate }
}
