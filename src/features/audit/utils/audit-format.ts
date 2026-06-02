import type { Json } from '@/types/database.types'

export function toAuditJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value ?? null)) as Json
}

export function getMetadataValue(metadata: Json, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return undefined
  }

  return metadata[key]
}

export function formatAuditDate(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}
