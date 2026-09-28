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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      appointment_contacts: {
        Row: {
          appointment_id: string
          email: string | null
          mobile: string
          notes: string
          patient_name: string
        }
        Insert: {
          appointment_id: string
          email?: string | null
          mobile: string
          notes?: string
          patient_name: string
        }
        Update: {
          appointment_id?: string
          email?: string | null
          mobile?: string
          notes?: string
          patient_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_contacts_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          branch_id: string
          created_at: string
          dentist_id: string | null
          ends_at: string
          id: string
          reference: string | null
          service_id: string
          starts_at: string
          status: string
          version: number
        }
        Insert: {
          branch_id: string
          created_at?: string
          dentist_id?: string | null
          ends_at: string
          id?: string
          reference?: string | null
          service_id: string
          starts_at: string
          status?: string
          version?: number
        }
        Update: {
          branch_id?: string
          created_at?: string
          dentist_id?: string | null
          ends_at?: string
          id?: string
          reference?: string | null
          service_id?: string
          starts_at?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "appointments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_dentist_id_fkey"
            columns: ["dentist_id"]
            isOneToOne: false
            referencedRelation: "dentists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          active: boolean
          id: string
          name: string
          slug: string
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          slug: string
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      dentists: {
        Row: {
          about: string
          id: string
          name: string
          photo_url: string | null
          published: boolean
        }
        Insert: {
          about?: string
          id?: string
          name: string
          photo_url?: string | null
          published?: boolean
        }
        Update: {
          about?: string
          id?: string
          name?: string
          photo_url?: string | null
          published?: boolean
        }
        Relationships: []
      }
      services: {
        Row: {
          id: string
          name: string
          published: boolean
          sort_order: number
        }
        Insert: {
          id?: string
          name: string
          published?: boolean
          sort_order?: number
        }
        Update: {
          id?: string
          name?: string
          published?: boolean
          sort_order?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      move_appointment: {
        Args: { p_id: string; p_expected: number; p_start: string; p_dentist: string; p_reason: string }
        Returns: Json
      }
      appointment_action: {
        Args: {
          p_action: string
          p_dentist?: string
          p_expected: number
          p_id: string
        }
        Returns: Json
      }
      booking_gateway: {
        Args: { p_action: string; p_data: Json }
        Returns: Json
      }
      configure_schedule: {
        Args: { p_action: string; p_branch: string; p_data: Json }
        Returns: undefined
      }
      list_staff: { Args: never; Returns: Json }
      preview_availability: {
        Args: { p_branch: string; p_date: string; p_service: string }
        Returns: Json
      }
      schedule_context: { Args: { p_branch: string }; Returns: Json }
      set_staff_access: {
        Args: {
          p_active: boolean
          p_branch_ids: string[]
          p_role: string
          p_user_id: string
        }
        Returns: undefined
      }
      staff_context: { Args: never; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
