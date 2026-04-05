export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      abonos_egresos: {
        Row: {
          created_at: string
          egreso_id: string
          fecha_pago: string
          id: string
          monto_abono: number
        }
        Insert: {
          created_at?: string
          egreso_id: string
          fecha_pago?: string
          id?: string
          monto_abono?: number
        }
        Update: {
          created_at?: string
          egreso_id?: string
          fecha_pago?: string
          id?: string
          monto_abono?: number
        }
        Relationships: [
          {
            foreignKeyName: "abonos_egresos_egreso_id_fkey"
            columns: ["egreso_id"]
            isOneToOne: false
            referencedRelation: "egresos"
            referencedColumns: ["id"]
          },
        ]
      }
      config_cuotas: {
        Row: {
          activo: boolean | null
          created_at: string | null
          fecha_vencimiento: string | null
          id: string
          mes_nombre: string
          monto: number
          updated_at: string | null
        }
        Insert: {
          activo?: boolean | null
          created_at?: string | null
          fecha_vencimiento?: string | null
          id?: string
          mes_nombre: string
          monto: number
          updated_at?: string | null
        }
        Update: {
          activo?: boolean | null
          created_at?: string | null
          fecha_vencimiento?: string | null
          id?: string
          mes_nombre?: string
          monto?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      egresos: {
        Row: {
          categoria: string
          concepto: string
          created_at: string | null
          descripcion: string | null
          estado: string
          fecha_programada: string | null
          id: string
          monto: number
          perfil_id: string | null
          updated_at: string | null
        }
        Insert: {
          categoria?: string
          concepto: string
          created_at?: string | null
          descripcion?: string | null
          estado?: string
          fecha_programada?: string | null
          id?: string
          monto: number
          perfil_id?: string | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string
          concepto?: string
          created_at?: string | null
          descripcion?: string | null
          estado?: string
          fecha_programada?: string | null
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
          avatar_url: string | null
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
          avatar_url?: string | null
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
          avatar_url?: string | null
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
        | "Secretaria"
        | "Tesorero"
        | "Logistica"
        | "Redes"
        | "Alumno"
        | "Sub Presidente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      estado_pago: ["Pendiente", "Pagado", "Rechazado"],
      user_role: [
        "Presidente",
        "Secretaria",
        "Tesorero",
        "Logistica",
        "Redes",
        "Alumno",
        "Sub Presidente",
      ],
    },
  },
} as const
