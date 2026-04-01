export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      config_cuotas: {
        Row: {
          activo: boolean | null
          created_at: string | null
          id: string
          mes_nombre: string
          monto: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          mes_nombre: string
          monto: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          id?: string
          mes_nombre?: string
          monto?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      egresos: {
        Row: {
          concepto: string
          created_at: string | null
          id: string
          monto: number
          perfil_id: string | null
          updated_at: string | null
        }
        Insert: {
          concepto: string
          created_at?: string | null
          id?: string
          monto: number
          perfil_id?: string | null
          updated_at?: string | null
        }
        Update: {
          concepto?: string
          created_at?: string | null
          id?: string
          monto?: number
          perfil_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "egresos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inscripciones: {
        Row: {
          created_at: string
          id: string
          metodo_pago: string | null
          monto: number
          perfil_id: string
          url_voucher: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          metodo_pago?: string | null
          monto?: number
          perfil_id: string
          url_voucher?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          metodo_pago?: string | null
          monto?: number
          perfil_id?: string
          url_voucher?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inscripciones_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: true
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          created_at: string | null
          cuota_id: string | null
          estado: Database["public"]["Enums"]["estado_pago"] | null
          id: string
          monto_pagado: number
          perfil_id: string | null
          updated_at: string | null
          url_voucher: string | null
        }
        Insert: {
          created_at?: string | null
          cuota_id?: string | null
          estado?: Database["public"]["Enums"]["estado_pago"] | null
          id?: string
          monto_pagado: number
          perfil_id?: string | null
          updated_at?: string | null
          url_voucher?: string | null
        }
        Update: {
          created_at?: string | null
          cuota_id?: string | null
          estado?: Database["public"]["Enums"]["estado_pago"] | null
          id?: string
          monto_pagado?: number
          perfil_id?: string | null
          updated_at?: string | null
          url_voucher?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pagos_cuota_id_fkey"
            columns: ["cuota_id"]
            isOneToOne: false
            referencedRelation: "config_cuotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          codigo_u: string
          created_at: string | null
          dni: string
          id: string
          nombre_completo: string
          rol: Database["public"]["Enums"]["user_role"] | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          codigo_u: string
          created_at?: string | null
          dni: string
          id: string
          nombre_completo: string
          rol?: Database["public"]["Enums"]["user_role"] | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          codigo_u?: string
          created_at?: string | null
          dni?: string
          id?: string
          nombre_completo?: string
          rol?: Database["public"]["Enums"]["user_role"] | null
          telefono?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      es_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      estado_pago: "Pendiente" | "Pagado" | "Rechazado"
      user_role:
        | "Presidente"
        | "Sub Presidente"
        | "Secretaria"
        | "Tesorero"
        | "Logistica"
        | "Redes"
        | "Alumno"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
    ? keyof (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never
