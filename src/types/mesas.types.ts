export type Mesa = {
  perfil_id: string
  extras_usados: number
  notas: string
  version: number
  updated_at: string
}

export type MesaResumen = Mesa & {
  cedidos: number
  recibidos: number
  cupos_extra: number
  disponibles: number
  costo_extras: number
  abonado_extras: number
  saldo_extras: number
  asientos_asignados: number
}

export type SalonObjeto = {
  id: string
  perfil_id: string | null
  tipo: 'mesa_familiar' | 'mesa_extras' | 'zona'
  nombre: string
  x: number
  y: number
  ancho: number
  alto: number
  version: number
}

export type MesaAsiento = { objeto_id: string; posicion: number; perfil_id: string; invitado_posicion: number | null }
export type MesaInvitado = { perfil_id: string; posicion: number; nombres: string; apellidos: string }
export type MesaCuenta = { user_id: string; perfil_id: string; es_owner: boolean }
export type MesaCesion = {
  id: string
  origen_id: string
  destino_id: string
  cantidad: number
  anulada: boolean
  created_at: string
}
export type MesaAbono = {
  id: string
  perfil_id: string
  monto: number
  metodo: 'Efectivo' | 'Yape' | 'Plin' | 'Transferencia'
  referencia: string
  anulado: boolean
  created_at: string
  voucher_path: string | null
  voucher_filename: string | null
  voucher_mime_type: string | null
  voucher_size: number | null
}

export type MesaTable<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}
