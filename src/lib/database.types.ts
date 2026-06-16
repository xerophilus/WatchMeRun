// Generated from the live database schema:
//   supabase gen types typescript --project-id cmfzwltdllvyrtkrzyhv
// (regenerate after schema changes). Do not edit by hand.

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
      app_secrets: {
        Row: {
          key: string
          runner_id: string
          value: string
        }
        Insert: {
          key: string
          runner_id: string
          value: string
        }
        Update: {
          key?: string
          runner_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_secrets_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
            referencedColumns: ["id"]
          },
        ]
      }
      live_positions: {
        Row: {
          id: string
          lat: number
          lng: number
          recorded_at: string
          run_id: string | null
          runner_id: string
        }
        Insert: {
          id?: string
          lat: number
          lng: number
          recorded_at?: string
          run_id?: string | null
          runner_id: string
        }
        Update: {
          id?: string
          lat?: number
          lng?: number
          recorded_at?: string
          run_id?: string | null
          runner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_positions_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
            referencedColumns: ["id"]
          },
        ]
      }
      push_tokens: {
        Row: {
          created_at: string | null
          id: string
          label: string | null
          runner_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label?: string | null
          runner_id: string
          token: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string | null
          runner_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_tokens_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
            referencedColumns: ["id"]
          },
        ]
      }
      races: {
        Row: {
          created_at: string | null
          distance: string | null
          id: string
          is_a_race: boolean | null
          location: string | null
          name: string
          notes: string | null
          race_date: string
          runner_id: string
        }
        Insert: {
          created_at?: string | null
          distance?: string | null
          id?: string
          is_a_race?: boolean | null
          location?: string | null
          name: string
          notes?: string | null
          race_date: string
          runner_id: string
        }
        Update: {
          created_at?: string | null
          distance?: string | null
          id?: string
          is_a_race?: boolean | null
          location?: string | null
          name?: string
          notes?: string | null
          race_date?: string
          runner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "races_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
            referencedColumns: ["id"]
          },
        ]
      }
      run_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          run_id: string | null
          runner_id: string
          track_snapshot: Json | null
          workout_label: string | null
          workout_type: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          run_id?: string | null
          runner_id: string
          track_snapshot?: Json | null
          workout_label?: string | null
          workout_type?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          run_id?: string | null
          runner_id?: string
          track_snapshot?: Json | null
          workout_label?: string | null
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "run_events_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
            referencedColumns: ["id"]
          },
        ]
      }
      runner_tokens: {
        Row: {
          created_at: string | null
          id: string
          label: string | null
          revoked_at: string | null
          runner_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          label?: string | null
          revoked_at?: string | null
          runner_id: string
          token: string
        }
        Update: {
          created_at?: string | null
          id?: string
          label?: string | null
          revoked_at?: string | null
          runner_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "runner_tokens_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
            referencedColumns: ["id"]
          },
        ]
      }
      runners: {
        Row: {
          created_at: string | null
          handle: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          handle?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          handle?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      weekly_schedule: {
        Row: {
          created_at: string | null
          day_date: string
          detail: string | null
          id: string
          runner_id: string
          title: string
          week_start: string
          workout_type: string | null
        }
        Insert: {
          created_at?: string | null
          day_date: string
          detail?: string | null
          id?: string
          runner_id: string
          title: string
          week_start: string
          workout_type?: string | null
        }
        Update: {
          created_at?: string | null
          day_date?: string
          detail?: string | null
          id?: string
          runner_id?: string
          title?: string
          week_start?: string
          workout_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedule_runner_id_fkey"
            columns: ["runner_id"]
            isOneToOne: false
            referencedRelation: "runners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
