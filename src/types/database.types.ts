export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.4';
  };
  public: {
    Tables: {
      biomarker_definitions: {
        Row: {
          category: string;
          critical_high: number | null;
          critical_low: number | null;
          description: string | null;
          display_name: string;
          name_normalized: string;
          ref_range_high: number | null;
          ref_range_low: number | null;
          unit: string;
        };
        Insert: {
          category: string;
          critical_high?: number | null;
          critical_low?: number | null;
          description?: string | null;
          display_name: string;
          name_normalized: string;
          ref_range_high?: number | null;
          ref_range_low?: number | null;
          unit: string;
        };
        Update: {
          category?: string;
          critical_high?: number | null;
          critical_low?: number | null;
          description?: string | null;
          display_name?: string;
          name_normalized?: string;
          ref_range_high?: number | null;
          ref_range_low?: number | null;
          unit?: string;
        };
        Relationships: [];
      };
      biomarkers: {
        Row: {
          category: string | null;
          created_at: string | null;
          id: string;
          name: string;
          name_normalized: string;
          profile_id: string;
          report_date: string | null;
          report_id: string;
          unit: string;
          user_id: string;
          value: number;
        };
        Insert: {
          category?: string | null;
          created_at?: string | null;
          id?: string;
          name: string;
          name_normalized: string;
          profile_id: string;
          report_date?: string | null;
          report_id: string;
          unit: string;
          user_id: string;
          value: number;
        };
        Update: {
          category?: string | null;
          created_at?: string | null;
          id?: string;
          name?: string;
          name_normalized?: string;
          profile_id?: string;
          report_date?: string | null;
          report_id?: string;
          unit?: string;
          user_id?: string;
          value?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'biomarkers_name_normalized_fkey';
            columns: ['name_normalized'];
            isOneToOne: false;
            referencedRelation: 'biomarker_definitions';
            referencedColumns: ['name_normalized'];
          },
          {
            foreignKeyName: 'biomarkers_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'biomarkers_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'biomarkers_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      lhm_history: {
        Row: {
          created_at: string | null;
          id: string;
          markdown: string;
          profile_id: string;
          version: number;
        };
        Insert: {
          created_at?: string | null;
          id?: string;
          markdown: string;
          profile_id: string;
          version: number;
        };
        Update: {
          created_at?: string | null;
          id?: string;
          markdown?: string;
          profile_id?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'lhm_history_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_prefs: {
        Row: {
          digest_frequency: string | null;
          email_digest_enabled: boolean | null;
          last_sent_at: string | null;
          user_id: string;
        };
        Insert: {
          digest_frequency?: string | null;
          email_digest_enabled?: boolean | null;
          last_sent_at?: string | null;
          user_id: string;
        };
        Update: {
          digest_frequency?: string | null;
          email_digest_enabled?: boolean | null;
          last_sent_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_prefs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string | null;
          dob: string | null;
          gender: string | null;
          id: string;
          is_default: boolean | null;
          name: string;
          relationship: string;
          user_id: string;
        };
        Insert: {
          created_at?: string | null;
          dob?: string | null;
          gender?: string | null;
          id?: string;
          is_default?: boolean | null;
          name: string;
          relationship?: string;
          user_id: string;
        };
        Update: {
          created_at?: string | null;
          dob?: string | null;
          gender?: string | null;
          id?: string;
          is_default?: boolean | null;
          name?: string;
          relationship?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      report_embeddings: {
        Row: {
          chunk_text: string;
          created_at: string | null;
          embedding: string | null;
          id: string;
          profile_id: string;
          report_id: string;
          user_id: string;
        };
        Insert: {
          chunk_text: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          profile_id: string;
          report_id: string;
          user_id: string;
        };
        Update: {
          chunk_text?: string;
          created_at?: string | null;
          embedding?: string | null;
          id?: string;
          profile_id?: string;
          report_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'report_embeddings_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_embeddings_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'report_embeddings_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          file_url: string;
          id: string;
          processing_status: string | null;
          profile_id: string;
          raw_ocr_markdown: string | null;
          report_date: string | null;
          uploaded_at: string | null;
          user_id: string;
        };
        Insert: {
          file_url: string;
          id?: string;
          processing_status?: string | null;
          profile_id: string;
          raw_ocr_markdown?: string | null;
          report_date?: string | null;
          uploaded_at?: string | null;
          user_id: string;
        };
        Update: {
          file_url?: string;
          id?: string;
          processing_status?: string | null;
          profile_id?: string;
          raw_ocr_markdown?: string | null;
          report_date?: string | null;
          uploaded_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'reports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      user_health_markdown: {
        Row: {
          last_report_date: string | null;
          last_updated_at: string | null;
          markdown: string;
          profile_id: string;
          tokens_approx: number | null;
          user_id: string;
          version: number | null;
        };
        Insert: {
          last_report_date?: string | null;
          last_updated_at?: string | null;
          markdown: string;
          profile_id: string;
          tokens_approx?: number | null;
          user_id: string;
          version?: number | null;
        };
        Update: {
          last_report_date?: string | null;
          last_updated_at?: string | null;
          markdown?: string;
          profile_id?: string;
          tokens_approx?: number | null;
          user_id?: string;
          version?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_health_markdown_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: true;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'user_health_markdown_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          created_at: string | null;
          email: string;
          id: string;
          name: string | null;
          supabase_user_id: string;
        };
        Insert: {
          created_at?: string | null;
          email: string;
          id?: string;
          name?: string | null;
          supabase_user_id: string;
        };
        Update: {
          created_at?: string | null;
          email?: string;
          id?: string;
          name?: string | null;
          supabase_user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
