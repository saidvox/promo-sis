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
      actividades: {
        Row: {
          created_at: string | null
          descripcion: string | null
          estado: string
          etiqueta_unidad: string
          fecha_evento: string
          id: string
          minimo_unidades_beneficio: number
          monto_beneficio_unitario: number
          monto_promocion_unitario: number
          monto_recaudado: number
          nombre: string
          precio_unitario: number
          tipo_actividad: string
          total_beneficio: number
          total_bruto: number
          total_premios_externos: number
          total_promocion: number
          usa_grupos: boolean
          usa_premios: boolean
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string
          etiqueta_unidad?: string
          fecha_evento: string
          id?: string
          minimo_unidades_beneficio?: number
          monto_beneficio_unitario?: number
          monto_promocion_unitario?: number
          monto_recaudado?: number
          nombre: string
          precio_unitario?: number
          tipo_actividad?: string
          total_beneficio?: number
          total_bruto?: number
          total_premios_externos?: number
          total_promocion?: number
          usa_grupos?: boolean
          usa_premios?: boolean
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descripcion?: string | null
          estado?: string
          etiqueta_unidad?: string
          fecha_evento?: string
          id?: string
          minimo_unidades_beneficio?: number
          monto_beneficio_unitario?: number
          monto_promocion_unitario?: number
          monto_recaudado?: number
          nombre?: string
          precio_unitario?: number
          tipo_actividad?: string
          total_beneficio?: number
          total_bruto?: number
          total_premios_externos?: number
          total_promocion?: number
          usa_grupos?: boolean
          usa_premios?: boolean
          updated_at?: string | null
        }
        Relationships: []
      }
      actividad_grupos: {
        Row: {
          actividad_id: string
          costo_premio: number
          created_at: string
          id: string
          nombre: string
          notas: string | null
          premio: string | null
          updated_at: string
        }
        Insert: {
          actividad_id: string
          costo_premio?: number
          created_at?: string
          id?: string
          nombre: string
          notas?: string | null
          premio?: string | null
          updated_at?: string
        }
        Update: {
          actividad_id?: string
          costo_premio?: number
          created_at?: string
          id?: string
          nombre?: string
          notas?: string | null
          premio?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividad_grupos_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
        ]
      }
      actividad_participantes: {
        Row: {
          actividad_id: string
          aporte_premio: number
          created_at: string
          cuota_id: string | null
          grupo_id: string | null
          id: string
          monto_beneficio: number
          monto_beneficio_aplicado: number
          monto_beneficio_pendiente: number
          monto_bruto: number
          monto_promocion: number
          notas: string | null
          perfil_id: string
          unidades_vendidas: number
          updated_at: string
        }
        Insert: {
          actividad_id: string
          aporte_premio?: number
          created_at?: string
          cuota_id?: string | null
          grupo_id?: string | null
          id?: string
          monto_beneficio?: number
          monto_beneficio_aplicado?: number
          monto_beneficio_pendiente?: number
          monto_bruto?: number
          monto_promocion?: number
          notas?: string | null
          perfil_id: string
          unidades_vendidas?: number
          updated_at?: string
        }
        Update: {
          actividad_id?: string
          aporte_premio?: number
          created_at?: string
          cuota_id?: string | null
          grupo_id?: string | null
          id?: string
          monto_beneficio?: number
          monto_beneficio_aplicado?: number
          monto_beneficio_pendiente?: number
          monto_bruto?: number
          monto_promocion?: number
          notas?: string | null
          perfil_id?: string
          unidades_vendidas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "actividad_participantes_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_participantes_cuota_id_fkey"
            columns: ["cuota_id"]
            isOneToOne: false
            referencedRelation: "config_cuotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_participantes_grupo_id_fkey"
            columns: ["grupo_id"]
            isOneToOne: false
            referencedRelation: "actividad_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "actividad_participantes_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
          actividad_grupo_id: string | null
          actividad_id: string | null
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
          actividad_grupo_id?: string | null
          actividad_id?: string | null
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
          actividad_grupo_id?: string | null
          actividad_id?: string | null
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
            foreignKeyName: "egresos_actividad_grupo_id_fkey"
            columns: ["actividad_grupo_id"]
            isOneToOne: false
            referencedRelation: "actividad_grupos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "egresos_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
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
      pago_movimientos: {
        Row: {
          actividad_id: string | null
          actividad_participante_id: string | null
          created_at: string
          cuota_id: string
          id: string
          monto: number
          nota: string | null
          origen: string
          pago_id: string | null
          perfil_id: string
        }
        Insert: {
          actividad_id?: string | null
          actividad_participante_id?: string | null
          created_at?: string
          cuota_id: string
          id?: string
          monto: number
          nota?: string | null
          origen?: string
          pago_id?: string | null
          perfil_id: string
        }
        Update: {
          actividad_id?: string | null
          actividad_participante_id?: string | null
          created_at?: string
          cuota_id?: string
          id?: string
          monto?: number
          nota?: string | null
          origen?: string
          pago_id?: string | null
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pago_movimientos_actividad_id_fkey"
            columns: ["actividad_id"]
            isOneToOne: false
            referencedRelation: "actividades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_movimientos_actividad_participante_id_fkey"
            columns: ["actividad_participante_id"]
            isOneToOne: false
            referencedRelation: "actividad_participantes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_movimientos_cuota_id_fkey"
            columns: ["cuota_id"]
            isOneToOne: false
            referencedRelation: "config_cuotas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_movimientos_pago_id_fkey"
            columns: ["pago_id"]
            isOneToOne: false
            referencedRelation: "pagos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pago_movimientos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          avatar_url: string | null
          codigo_u: string
          created_at: string | null
          dni: string | null
          id: string
          nombre_completo: string
          rol: Database["public"]["Enums"]["user_role"] | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          activo?: boolean
          avatar_url?: string | null
          codigo_u: string
          created_at?: string | null
          dni?: string | null
          id?: string
          nombre_completo: string
          rol?: Database["public"]["Enums"]["user_role"] | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          activo?: boolean
          avatar_url?: string | null
          codigo_u?: string
          created_at?: string | null
          dni?: string | null
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
