export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      chapter_progress: {
        Row: {
          chapter_id: string;
          completed_at: string;
          id: string;
          student_id: string;
        };
        Insert: {
          chapter_id: string;
          completed_at?: string;
          id?: string;
          student_id: string;
        };
        Update: {
          chapter_id?: string;
          completed_at?: string;
          id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chapter_progress_chapter_id_fkey';
            columns: ['chapter_id'];
            isOneToOne: false;
            referencedRelation: 'chapters';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'chapter_progress_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      chapters: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          id: string;
          order_index: number;
          title: string;
          updated_at: string;
          video_url: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          order_index: number;
          title: string;
          updated_at?: string;
          video_url: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          order_index?: number;
          title?: string;
          updated_at?: string;
          video_url?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'chapters_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
        ];
      };
      courses: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          instructor_id: string;
          price: number;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          instructor_id: string;
          price: number;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          instructor_id?: string;
          price?: number;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'courses_instructor_id_fkey';
            columns: ['instructor_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      devotional_config: {
        Row: {
          branding: Json;
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_active: boolean;
          retention_until: string | null;
          tenant_id: string;
          updated_at: string;
        };
        Insert: {
          branding?: Json;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          retention_until?: string | null;
          tenant_id: string;
          updated_at?: string;
        };
        Update: {
          branding?: Json;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          retention_until?: string | null;
          tenant_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'devotional_config_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: true;
            referencedRelation: 'tenant_devotional';
            referencedColumns: ['id'];
          },
        ];
      };
      devotional_item: {
        Row: {
          created_at: string;
          day: number;
          deleted_at: string | null;
          id: string;
          is_active: boolean;
          is_iframe: boolean;
          retention_until: string | null;
          tenant_id: string;
          type: string;
          updated_at: string;
          url_or_text: string;
        };
        Insert: {
          created_at?: string;
          day: number;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          is_iframe?: boolean;
          retention_until?: string | null;
          tenant_id: string;
          type: string;
          updated_at?: string;
          url_or_text: string;
        };
        Update: {
          created_at?: string;
          day?: number;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          is_iframe?: boolean;
          retention_until?: string | null;
          tenant_id?: string;
          type?: string;
          updated_at?: string;
          url_or_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'devotional_item_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant_devotional';
            referencedColumns: ['id'];
          },
        ];
      };
      enrollments: {
        Row: {
          course_id: string;
          id: string;
          payment_reference: string | null;
          purchased_at: string;
          student_id: string;
        };
        Insert: {
          course_id: string;
          id?: string;
          payment_reference?: string | null;
          purchased_at?: string;
          student_id: string;
        };
        Update: {
          course_id?: string;
          id?: string;
          payment_reference?: string | null;
          purchased_at?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'enrollments_course_id_fkey';
            columns: ['course_id'];
            isOneToOne: false;
            referencedRelation: 'courses';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'enrollments_student_id_fkey';
            columns: ['student_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          role: string;
          tenant_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          name: string;
          role: string;
          tenant_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          role?: string;
          tenant_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant_devotional';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_devotional: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_active: boolean;
          name: string;
          retention_until: string | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          retention_until?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          retention_until?: string | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenant_lms: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          id: string;
          is_active: boolean;
          name: string;
          retention_until: string | null;
          schedule_view_mode: string;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          retention_until?: string | null;
          schedule_view_mode?: string;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          retention_until?: string | null;
          schedule_view_mode?: string;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenant_mobile: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          devotional_enabled: boolean;
          devotional_tenant_id: string | null;
          id: string;
          is_active: boolean;
          name: string;
          retention_until: string | null;
          slug: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          devotional_enabled?: boolean;
          devotional_tenant_id?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          retention_until?: string | null;
          slug: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          devotional_enabled?: boolean;
          devotional_tenant_id?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          retention_until?: string | null;
          slug?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_mobile_devotional_tenant_id_fkey';
            columns: ['devotional_tenant_id'];
            isOneToOne: false;
            referencedRelation: 'tenant_devotional';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json };
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
