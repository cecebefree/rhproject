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
      audit_log: {
        Row: {
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          operation: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          operation?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      bible_plan: {
        Row: {
          chapters: string
          content_group: string
          created_at: string
          day_n: number
          deleted_at: string | null
          id: string
          is_active: boolean
          tenant_id: string
          translation_name: string
          updated_at: string
        }
        Insert: {
          chapters: string
          content_group?: string
          created_at?: string
          day_n: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          tenant_id: string
          translation_name?: string
          updated_at?: string
        }
        Update: {
          chapters?: string
          content_group?: string
          created_at?: string
          day_n?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          translation_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bible_plan_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_devotional"
            referencedColumns: ["id"]
          },
        ]
      }
      book: {
        Row: {
          cover_image_url: string | null
          created_at: string
          curriculum_type: string
          ebook_available: boolean
          ebook_storage_path: string | null
          id: string
          isbn_13: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          curriculum_type: string
          ebook_available?: boolean
          ebook_storage_path?: string | null
          id?: string
          isbn_13?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          curriculum_type?: string
          ebook_available?: boolean
          ebook_storage_path?: string | null
          id?: string
          isbn_13?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      booklist: {
        Row: {
          child_id: string
          created_at: string
          id: string
          school_year: string
          tenant_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          id?: string
          school_year: string
          tenant_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          id?: string
          school_year?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booklist_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      booklist_item: {
        Row: {
          book_id: string | null
          booklist_id: string
          created_at: string
          id: string
          isbn: string | null
          permanent: boolean
          revoked_at: string | null
          source_id: string | null
          source_type: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          book_id?: string | null
          booklist_id: string
          created_at?: string
          id?: string
          isbn?: string | null
          permanent?: boolean
          revoked_at?: string | null
          source_id?: string | null
          source_type: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          book_id?: string | null
          booklist_id?: string
          created_at?: string
          id?: string
          isbn?: string | null
          permanent?: boolean
          revoked_at?: string | null
          source_id?: string | null
          source_type?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "booklist_item_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "book"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booklist_item_booklist_id_fkey"
            columns: ["booklist_id"]
            isOneToOne: false
            referencedRelation: "booklist"
            referencedColumns: ["id"]
          },
        ]
      }
      capacity_slots: {
        Row: {
          academic_group_id: string
          created_at: string
          grade: string
          id: string
          reserved_slots: number
          total_slots: number
          updated_at: string
          used_slots: number
        }
        Insert: {
          academic_group_id: string
          created_at?: string
          grade: string
          id?: string
          reserved_slots?: number
          total_slots: number
          updated_at?: string
          used_slots?: number
        }
        Update: {
          academic_group_id?: string
          created_at?: string
          grade?: string
          id?: string
          reserved_slots?: number
          total_slots?: number
          updated_at?: string
          used_slots?: number
        }
        Relationships: []
      }
      certificates: {
        Row: {
          cert_class: string
          created_at: string
          description: string | null
          file_url: string | null
          id: string
          issued_at: string
          signatory: string
          source_ref: string | null
          status: string
          supersede_old_id: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          cert_class: string
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string
          signatory: string
          source_ref?: string | null
          status?: string
          supersede_old_id?: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          cert_class?: string
          created_at?: string
          description?: string | null
          file_url?: string | null
          id?: string
          issued_at?: string
          signatory?: string
          source_ref?: string | null
          status?: string
          supersede_old_id?: string | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_supersede_old_id_fkey"
            columns: ["supersede_old_id"]
            isOneToOne: false
            referencedRelation: "certificates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chapter_progress: {
        Row: {
          chapter_id: string
          completed_at: string
          id: string
          student_id: string
        }
        Insert: {
          chapter_id: string
          completed_at?: string
          id?: string
          student_id: string
        }
        Update: {
          chapter_id?: string
          completed_at?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapter_progress_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapter_progress_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chapters: {
        Row: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          course_id: string
          created_at?: string
          description?: string | null
          id?: string
          order_index: number
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          course_id?: string
          created_at?: string
          description?: string | null
          id?: string
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      chat_preferences: {
        Row: {
          muted_conversations: string[]
          notification_level: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          muted_conversations?: string[]
          notification_level?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          muted_conversations?: string[]
          notification_level?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_preferences_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          consent_given: boolean
          consent_type: string
          created_at: string
          given_at: string
          id: string
          ip_address: string | null
          profile_id: string
          tenant_id: string
          updated_at: string
          withdrawn_at: string | null
        }
        Insert: {
          consent_given: boolean
          consent_type: string
          created_at?: string
          given_at?: string
          id?: string
          ip_address?: string | null
          profile_id: string
          tenant_id: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Update: {
          consent_given?: boolean
          consent_type?: string
          created_at?: string
          given_at?: string
          id?: string
          ip_address?: string | null
          profile_id?: string
          tenant_id?: string
          updated_at?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          created_at: string
          deleted_at: string | null
          end_date: string | null
          enrollment_id: string | null
          id: string
          registration_id: string | null
          signed_at: string | null
          signed_by: string | null
          start_date: string | null
          status: string
          student_id: string
          tenant_id: string
          terms: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          enrollment_id?: string | null
          id?: string
          registration_id?: string | null
          signed_at?: string | null
          signed_by?: string | null
          start_date?: string | null
          status?: string
          student_id: string
          tenant_id: string
          terms?: Json | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          end_date?: string | null
          enrollment_id?: string | null
          id?: string
          registration_id?: string | null
          signed_at?: string | null
          signed_by?: string | null
          start_date?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          terms?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_devotional"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          curriculum: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          stage: string
          tenant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          curriculum?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          stage: string
          tenant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          curriculum?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          stage?: string
          tenant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_devotional"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_verse: {
        Row: {
          content_group: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          tenant_id: string
          translation_name: string
          updated_at: string
          verse_date: string
          verse_reference: string
          verse_text: string
        }
        Insert: {
          content_group?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          tenant_id: string
          translation_name?: string
          updated_at?: string
          verse_date: string
          verse_reference: string
          verse_text: string
        }
        Update: {
          content_group?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          translation_name?: string
          updated_at?: string
          verse_date?: string
          verse_reference?: string
          verse_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_verse_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_devotional"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_order_history: {
        Row: {
          action: string
          created_at: string | null
          debit_order_id: string
          details: Json | null
          id: string
          status_after: string | null
          status_before: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          debit_order_id: string
          details?: Json | null
          id?: string
          status_after?: string | null
          status_before?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          debit_order_id?: string
          details?: Json | null
          id?: string
          status_after?: string | null
          status_before?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debit_order_history_debit_order_id_fkey"
            columns: ["debit_order_id"]
            isOneToOne: false
            referencedRelation: "debit_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      debit_orders: {
        Row: {
          amount: number
          bank_account_id: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          failed_attempts: number | null
          frequency: string
          id: string
          invoice_id: string | null
          last_debit_date: string | null
          mandate_reference: string | null
          max_retries: number | null
          next_debit_date: string | null
          retry_day: number | null
          start_date: string | null
          status: string
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          failed_attempts?: number | null
          frequency?: string
          id?: string
          invoice_id?: string | null
          last_debit_date?: string | null
          mandate_reference?: string | null
          max_retries?: number | null
          next_debit_date?: string | null
          retry_day?: number | null
          start_date?: string | null
          status?: string
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          failed_attempts?: number | null
          frequency?: string
          id?: string
          invoice_id?: string | null
          last_debit_date?: string | null
          mandate_reference?: string | null
          max_retries?: number | null
          next_debit_date?: string | null
          retry_day?: number | null
          start_date?: string | null
          status?: string
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "debit_orders_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      devotional_config: {
        Row: {
          branding: Json
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          retention_until: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          branding?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          retention_until?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          branding?: Json
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          retention_until?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotional_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenant_devotional"
            referencedColumns: ["id"]
          },
        ]
      }
      devotional_item: {
        Row: {
          created_at: string
          day: number
          deleted_at: string | null
          id: string
          is_active: boolean
          is_iframe: boolean
          retention_until: string | null
          tenant_id: string
          type: string
          updated_at: string
          url_or_text: string
        }
        Insert: {
          created_at?: string
          day: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_iframe?: boolean
          retention_until?: string | null
          tenant_id: string
          type: string
          updated_at?: string
          url_or_text: string
        }
        Update: {
          created_at?: string
          day?: number
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          is_iframe?: boolean
          retention_until?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
          url_or_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "devotional_item_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_devotional"
            referencedColumns: ["id"]
          },
        ]
      }
      ef_call_log: {
        Row: {
          action: string
          caller: string
          caller_ip: string | null
          created_at: string
          id: string
          method: string
          path: string
          receiver: string
          status_code: number
          tenant_id: string
        }
        Insert: {
          action: string
          caller: string
          caller_ip?: string | null
          created_at?: string
          id?: string
          method: string
          path: string
          receiver: string
          status_code: number
          tenant_id: string
        }
        Update: {
          action?: string
          caller?: string
          caller_ip?: string | null
          created_at?: string
          id?: string
          method?: string
          path?: string
          receiver?: string
          status_code?: number
          tenant_id?: string
        }
        Relationships: []
      }
      enrichment_meta: {
        Row: {
          completed: number
          created_at: string
          id: string
          note: string | null
          pace: string
          student_class_id: string
          tenant_id: string
          total: number
          updated_at: string
        }
        Insert: {
          completed?: number
          created_at?: string
          id?: string
          note?: string | null
          pace?: string
          student_class_id: string
          tenant_id: string
          total?: number
          updated_at?: string
        }
        Update: {
          completed?: number
          created_at?: string
          id?: string
          note?: string | null
          pace?: string
          student_class_id?: string
          tenant_id?: string
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrichment_meta_student_class_id_fkey"
            columns: ["student_class_id"]
            isOneToOne: true
            referencedRelation: "student_class"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollment_leads: {
        Row: {
          academic_group_id: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          academic_group_id: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          academic_group_id?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      family_child: {
        Row: {
          child_id: string
          created_at: string
          guardian_id: string
        }
        Insert: {
          child_id: string
          created_at?: string
          guardian_id: string
        }
        Update: {
          child_id?: string
          created_at?: string
          guardian_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_child_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_child_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      handle_changes: {
        Row: {
          changed_at: string
          id: string
          new_handle: string
          old_handle: string | null
          profile_id: string
          tenant_id: string
        }
        Insert: {
          changed_at?: string
          id?: string
          new_handle: string
          old_handle?: string | null
          profile_id: string
          tenant_id: string
        }
        Update: {
          changed_at?: string
          id?: string
          new_handle?: string
          old_handle?: string | null
          profile_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "handle_changes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          due_date: string
          id: string
          invoice_number: string
          paid_date: string | null
          status: string
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          due_date: string
          id?: string
          invoice_number: string
          paid_date?: string | null
          status?: string
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          paid_date?: string | null
          status?: string
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      log_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload?: Json
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          message_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          message_id: string
          profile_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          message_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          class_ids: string[] | null
          class_notification_scope: string
          clubs_enabled: boolean
          core_curriculum_enabled: boolean
          created_at: string | null
          email: boolean | null
          email_enabled: boolean
          hub_event_types: string[] | null
          id: string
          in_app: boolean | null
          in_app_enabled: boolean
          news_categories: string[] | null
          notification_type_id: string | null
          push_enabled: boolean
          sms: boolean | null
          sms_enabled: boolean
          student_id: string
          updated_at: string | null
        }
        Insert: {
          class_ids?: string[] | null
          class_notification_scope?: string
          clubs_enabled?: boolean
          core_curriculum_enabled?: boolean
          created_at?: string | null
          email?: boolean | null
          email_enabled?: boolean
          hub_event_types?: string[] | null
          id?: string
          in_app?: boolean | null
          in_app_enabled?: boolean
          news_categories?: string[] | null
          notification_type_id?: string | null
          push_enabled?: boolean
          sms?: boolean | null
          sms_enabled?: boolean
          student_id: string
          updated_at?: string | null
        }
        Update: {
          class_ids?: string[] | null
          class_notification_scope?: string
          clubs_enabled?: boolean
          core_curriculum_enabled?: boolean
          created_at?: string | null
          email?: boolean | null
          email_enabled?: boolean
          hub_event_types?: string[] | null
          id?: string
          in_app?: boolean | null
          in_app_enabled?: boolean
          news_categories?: string[] | null
          notification_type_id?: string | null
          push_enabled?: boolean
          sms?: boolean | null
          sms_enabled?: boolean
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_notification_type_id_fkey"
            columns: ["notification_type_id"]
            isOneToOne: false
            referencedRelation: "notification_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_preferences_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_types: {
        Row: {
          category: string | null
          channels: string[] | null
          created_at: string | null
          description: string | null
          id: string
          is_enabled: boolean | null
          name: string
          template_body: string | null
          template_subject: string | null
        }
        Insert: {
          category?: string | null
          channels?: string[] | null
          created_at?: string | null
          description?: string | null
          id: string
          is_enabled?: boolean | null
          name: string
          template_body?: string | null
          template_subject?: string | null
        }
        Update: {
          category?: string | null
          channels?: string[] | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_enabled?: boolean | null
          name?: string
          template_body?: string | null
          template_subject?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          channels: string[] | null
          created_at: string
          data: Json | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          max_retries: number | null
          metadata: Json | null
          notification_type_id: string | null
          read_at: string | null
          retry_count: number | null
          sent_at: string | null
          status: string | null
          student_id: string | null
          subject: string | null
          tenant_id: string
          title: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          channels?: string[] | null
          created_at?: string
          data?: Json | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json | null
          notification_type_id?: string | null
          read_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          student_id?: string | null
          subject?: string | null
          tenant_id: string
          title: string
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          channels?: string[] | null
          created_at?: string
          data?: Json | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          max_retries?: number | null
          metadata?: Json | null
          notification_type_id?: string | null
          read_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string | null
          student_id?: string | null
          subject?: string | null
          tenant_id?: string
          title?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_student_link: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          parent_id: string
          relationship: string
          student_id: string
          updated_at: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id: string
          relationship: string
          student_id: string
          updated_at?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          parent_id?: string
          relationship?: string
          student_id?: string
          updated_at?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "parent_student_link_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_student_link_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          primary_contact: boolean
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          primary_contact?: boolean
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          primary_contact?: boolean
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          debit_order_id: string | null
          id: string
          payment_type: string
          status: string
          stripe_payment_intent_id: string | null
          student_id: string
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          debit_order_id?: string | null
          id?: string
          payment_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          student_id: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          debit_order_id?: string | null
          id?: string
          payment_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          student_id?: string
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_debit_order_id_fkey"
            columns: ["debit_order_id"]
            isOneToOne: false
            referencedRelation: "debit_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_access: {
        Row: {
          access_ends_at: string | null
          access_starts_at: string | null
          created_at: string
          id: string
          platform: Database["public"]["Enums"]["platform_key"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          access_ends_at?: string | null
          access_starts_at?: string | null
          created_at?: string
          id?: string
          platform: Database["public"]["Enums"]["platform_key"]
          tenant_id: string
          user_id: string
        }
        Update: {
          access_ends_at?: string | null
          access_starts_at?: string | null
          created_at?: string
          id?: string
          platform?: Database["public"]["Enums"]["platform_key"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "platform_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_ends_at: string | null
          access_starts_at: string | null
          consent_given: boolean
          content_group: string
          created_at: string
          curriculum: string | null
          grade: string | null
          handle: string | null
          has_core: boolean
          id: string
          intake: string | null
          name: string
          registration_status: string
          role: string
          stage: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          access_ends_at?: string | null
          access_starts_at?: string | null
          consent_given?: boolean
          content_group?: string
          created_at?: string
          curriculum?: string | null
          grade?: string | null
          handle?: string | null
          has_core?: boolean
          id: string
          intake?: string | null
          name: string
          registration_status?: string
          role: string
          stage?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          access_ends_at?: string | null
          access_starts_at?: string | null
          consent_given?: boolean
          content_group?: string
          created_at?: string
          curriculum?: string | null
          grade?: string | null
          handle?: string | null
          has_core?: boolean
          id?: string
          intake?: string | null
          name?: string
          registration_status?: string
          role?: string
          stage?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_devotional"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_config: {
        Row: {
          burst_allowed: boolean
          caller_service: string
          calls_per_minute: number
          created_at: string
          enabled: boolean
          id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          burst_allowed?: boolean
          caller_service: string
          calls_per_minute?: number
          created_at?: string
          enabled?: boolean
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          burst_allowed?: boolean
          caller_service?: string
          calls_per_minute?: number
          created_at?: string
          enabled?: boolean
          id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      role_feature_access: {
        Row: {
          feature_area: string
          is_visible: boolean
          role: string
          tile_name: string
        }
        Insert: {
          feature_area: string
          is_visible?: boolean
          role: string
          tile_name: string
        }
        Update: {
          feature_area?: string
          is_visible?: boolean
          role?: string
          tile_name?: string
        }
        Relationships: []
      }
      schedule_slot: {
        Row: {
          course_id: string
          created_at: string
          days_of_week: number[]
          end_date: string | null
          end_time: string
          id: string
          is_active: boolean
          label: string | null
          recurrence: string
          start_date: string | null
          start_time: string
          tenant_id: string
          term_id: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          days_of_week: number[]
          end_date?: string | null
          end_time: string
          id?: string
          is_active?: boolean
          label?: string | null
          recurrence?: string
          start_date?: string | null
          start_time: string
          tenant_id: string
          term_id: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          days_of_week?: number[]
          end_date?: string | null
          end_time?: string
          id?: string
          is_active?: boolean
          label?: string | null
          recurrence?: string
          start_date?: string | null
          start_time?: string
          tenant_id?: string
          term_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_slot_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_course: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          staff_id: string
          tenant_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          staff_id: string
          tenant_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          staff_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_course_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_course_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_course_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_devotional"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_profiles: {
        Row: {
          created_at: string
          desk: string
          id: string
          is_active: boolean | null
          language: string | null
          max_capacity: number | null
          name: string
          role: string
          timezone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          desk?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          max_capacity?: number | null
          name: string
          role?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          desk?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          max_capacity?: number | null
          name?: string
          role?: string
          timezone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      student_class: {
        Row: {
          class_id: string
          deleted_at: string | null
          enrolled_at: string
          id: string
          is_active: boolean
          retention_until: string | null
          student_id: string
          tenant_id: string
        }
        Insert: {
          class_id: string
          deleted_at?: string | null
          enrolled_at?: string
          id?: string
          is_active?: boolean
          retention_until?: string | null
          student_id: string
          tenant_id: string
        }
        Update: {
          class_id?: string
          deleted_at?: string | null
          enrolled_at?: string
          id?: string
          is_active?: boolean
          retention_until?: string | null
          student_id?: string
          tenant_id?: string
        }
        Relationships: []
      }
      student_history: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          operation: string
          retention_expires: string
          snapshot: Json
          student_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          operation: string
          retention_expires?: string
          snapshot: Json
          student_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          operation?: string
          retention_expires?: string
          snapshot?: Json
          student_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          academic_group_id: string
          created_at: string
          created_by: string | null
          email: string | null
          enrollment_date: string | null
          enrollment_status: string
          first_name: string
          grade: string
          id: string
          last_name: string
          registration_id: string | null
          updated_at: string
          updated_by: string | null
          user_id: string | null
        }
        Insert: {
          academic_group_id: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          enrollment_date?: string | null
          enrollment_status?: string
          first_name: string
          grade: string
          id?: string
          last_name: string
          registration_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          academic_group_id?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          enrollment_date?: string | null
          enrollment_status?: string
          first_name?: string
          grade?: string
          id?: string
          last_name?: string
          registration_id?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      suppression_records: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          reason: string | null
          suppressed_at: string
          suppressed_by: string
          suppression_type: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          reason?: string | null
          suppressed_at?: string
          suppressed_by: string
          suppression_type?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          reason?: string | null
          suppressed_at?: string
          suppressed_by?: string
          suppression_type?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppression_records_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suppression_records_suppressed_by_fkey"
            columns: ["suppressed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_devotional: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          retention_until: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          retention_until?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          retention_until?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_lms: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          retention_until: string | null
          schedule_view_mode: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          retention_until?: string | null
          schedule_view_mode?: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          retention_until?: string | null
          schedule_view_mode?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      tenant_mobile: {
        Row: {
          created_at: string
          deleted_at: string | null
          devotional_enabled: boolean
          devotional_tenant_id: string | null
          id: string
          is_active: boolean
          name: string
          retention_until: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          devotional_enabled?: boolean
          devotional_tenant_id?: string | null
          id?: string
          is_active?: boolean
          name: string
          retention_until?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          devotional_enabled?: boolean
          devotional_tenant_id?: string | null
          id?: string
          is_active?: boolean
          name?: string
          retention_until?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_mobile_devotional_tenant_id_fkey"
            columns: ["devotional_tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_devotional"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_of_day: {
        Row: {
          content_group: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          tenant_id: string
          title: string | null
          updated_at: string
          video_date: string
          youtube_video_id: string
        }
        Insert: {
          content_group?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          tenant_id: string
          title?: string | null
          updated_at?: string
          video_date: string
          youtube_video_id: string
        }
        Update: {
          content_group?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          title?: string | null
          updated_at?: string
          video_date?: string
          youtube_video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_of_day_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_devotional"
            referencedColumns: ["id"]
          },
        ]
      }
      vlog: {
        Row: {
          content_group: string
          created_at: string
          deleted_at: string | null
          id: string
          is_active: boolean
          tenant_id: string
          title: string
          updated_at: string
          video_ref: string
          vlog_date: string
        }
        Insert: {
          content_group?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          tenant_id: string
          title: string
          updated_at?: string
          video_ref: string
          vlog_date: string
        }
        Update: {
          content_group?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          tenant_id?: string
          title?: string
          updated_at?: string
          video_ref?: string
          vlog_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "vlog_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_devotional"
            referencedColumns: ["id"]
          },
        ]
      }
      website_leads: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          message: string | null
          name: string | null
          turnstile_token: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          message?: string | null
          name?: string | null
          turnstile_token?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          message?: string | null
          name?: string | null
          turnstile_token?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      payment_history_view: {
        Row: {
          amount: number | null
          created_at: string | null
          debit_end_date: string | null
          debit_frequency: string | null
          debit_order_id: string | null
          debit_start_date: string | null
          id: string | null
          next_debit_date: string | null
          payment_type: string | null
          status: string | null
          student_id: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_debit_order_id_fkey"
            columns: ["debit_order_id"]
            isOneToOne: false
            referencedRelation: "debit_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_debit_order: {
        Args: { p_debit_order_id: string; p_mandate_reference: string }
        Returns: {
          error: string
          next_debit_date: string
          status: string
        }[]
      }
      archive_lead: {
        Args: {
          p_action: string
          p_lead_id: string
          p_notes?: string
          p_reason?:
            | "enrolled"
            | "withdrawn"
            | "inactive"
            | "duplicate"
            | "other"
        }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "leads"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_tenant_to_profile: {
        Args: { p_caller_id: string; p_profile_id: string; p_tenant_id: string }
        Returns: undefined
      }
      cancel_debit_order: {
        Args: { p_debit_order_id: string; p_reason: string }
        Returns: {
          error: string
          status: string
        }[]
      }
      chapters_read: {
        Args: { p_course_id: string }
        Returns: {
          course_id: string
          created_at: string
          description: string | null
          id: string
          order_index: number
          title: string
          updated_at: string
          video_url: string
        }[]
        SetofOptions: {
          from: "*"
          to: "chapters"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      check_rate_limit: {
        Args: { p_caller: string; p_tenant: string }
        Returns: boolean
      }
      create_debit_order: {
        Args: {
          p_amount: number
          p_bank_account_id: string
          p_end_date: string
          p_frequency: string
          p_invoice_id: string
          p_start_date: string
          p_student_id: string
        }
        Returns: {
          debit_order_id: string
          error: string
          next_debit_date: string
          status: string
        }[]
      }
      create_draft_report_card: {
        Args: {
          p_grade?: string
          p_student_id: string
          p_subject: string
          p_term: string
        }
        Returns: unknown
        SetofOptions: {
          from: "*"
          to: "report_cards"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_student_from_registration: {
        Args: { p_registration_id: string }
        Returns: {
          enrollment_id: string
          status: string
          student_id: string
        }[]
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      email_is_registered: { Args: { p_email: string }; Returns: boolean }
      escalate_inquiry: {
        Args: {
          p_escalation_reason: string
          p_escalation_target?: string
          p_inquiry_id: string
        }
        Returns: Json
      }
      fn_cleanup_student_history: { Args: never; Returns: undefined }
      fn_is_guardian_of_child: {
        Args: { p_child: string; p_guardian: string }
        Returns: boolean
      }
      generate_contract_from_enrollment: {
        Args: {
          p_enrollment_id?: string
          p_registration_id?: string
          p_student_id: string
        }
        Returns: string
      }
      generate_debit_orders_from_contract: {
        Args: {
          p_amount: number
          p_contract_id: string
          p_end_date?: string
          p_frequency?: string
          p_registration_id?: string
          p_start_date?: string
          p_student_id?: string
        }
        Returns: {
          debit_order_id: string
          status: string
        }[]
      }
      get_activity_timeline: {
        Args: { p_inquiry_id: string }
        Returns: {
          action: string
          desk: string
          details: Json
          notes: string
          performed_by: string
          ts: string
        }[]
      }
      get_announcements: {
        Args: never
        Returns: {
          audience_roles: string[]
          body: string
          created_at: string
          created_by: string
          expires_at: string
          id: string
          pinned: boolean
          publish_at: string
          tenant_id: string
          title: string
        }[]
      }
      get_bookshelf: {
        Args: { p_child_id: string }
        Returns: {
          child_id: string
          cover_image_url: string
          curriculum_type: string
          ebook_available: boolean
          id: string
          isbn_13: string
          item_created_at: string
          permanent: boolean
          school_year: string
          source_id: string
          source_type: string
          tenant_id: string
          title: string
        }[]
      }
      get_dashboard_metrics: {
        Args: { period?: string }
        Returns: {
          avg_response_time_seconds: number
          callbacks_scheduled: number
          conversion_percent: number
          inquiries_received: number
          show_rate_percent: number
        }[]
      }
      get_lead_pipeline: {
        Args: never
        Returns: {
          invoice_amount: number
          invoice_id: string
          invoice_status: string
          lead_created_at: string
          lead_email: string
          lead_id: string
          lead_name: string
          lead_status: string
          reg_status: string
          registration_id: string
          total_paid: number
        }[]
      }
      get_leads_by_status: {
        Args: never
        Returns: {
          count: number
          status: string
        }[]
      }
      get_or_create_notification_preferences: {
        Args: { p_student_id: string }
        Returns: {
          class_ids: string[] | null
          class_notification_scope: string
          clubs_enabled: boolean
          core_curriculum_enabled: boolean
          created_at: string | null
          email: boolean | null
          email_enabled: boolean
          hub_event_types: string[] | null
          id: string
          in_app: boolean | null
          in_app_enabled: boolean
          news_categories: string[] | null
          notification_type_id: string | null
          push_enabled: boolean
          sms: boolean | null
          sms_enabled: boolean
          student_id: string
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "notification_preferences"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_rate_limit_info: {
        Args: { p_caller: string; p_tenant: string }
        Returns: Json
      }
      get_revenue_by_month: {
        Args: never
        Returns: {
          count: number
          month: string
          total: number
        }[]
      }
      get_teacher_name: {
        Args: { p_teacher_id: string }
        Returns: {
          name: string
          role: string
        }[]
      }
      get_today_devotional: {
        Args: never
        Returns: {
          content: string
          day: number
          ref: string
          tile: string
          title: string
        }[]
      }
      get_unread_notification_count: {
        Args: never
        Returns: {
          count: number
        }[]
      }
      has_core_access: { Args: never; Returns: boolean }
      has_item_access: { Args: { p_course_id: string }; Returns: boolean }
      has_platform_access: {
        Args: { p_platform: Database["public"]["Enums"]["platform_key"] }
        Returns: boolean
      }
      insert_lead: {
        Args: {
          p_email: string
          p_existing_profile: boolean
          p_name: string
          p_notes: string
          p_phone: string
          p_source: string
          p_source_type: string
          p_status: string
          p_tags: string[]
          p_tenant_id: string
          p_time_zone: string
        }
        Returns: string
      }
      is_family_enrolled_in_course: {
        Args: { p_course_id: string }
        Returns: boolean
      }
      is_rls_enabled: {
        Args: { p_desc?: string; p_schema: unknown; p_table: unknown }
        Returns: boolean
      }
      jwt_content_group: { Args: never; Returns: string }
      jwt_tenant_id: { Args: never; Returns: string }
      make_timerange: {
        Args: { p_end: string; p_start: string }
        Returns: unknown
      }
      mark_notification_read: {
        Args: { p_notification_id: string }
        Returns: {
          error: string
          status: string
        }[]
      }
      materialize_booklist: {
        Args: { p_child_id: string; p_school_year: string; p_tenant_id: string }
        Returns: {
          book_id: string | null
          booklist_id: string
          created_at: string
          id: string
          isbn: string | null
          permanent: boolean
          revoked_at: string | null
          source_id: string | null
          source_type: string
          tenant_id: string
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "booklist_item"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      record_debit_order_payment: {
        Args: {
          p_amount: number
          p_debit_order_id: string
          p_status?: string
          p_stripe_payment_intent_id?: string
        }
        Returns: string
      }
      release_report_card: {
        Args: { p_card_id: string }
        Returns: {
          status: string
        }[]
      }
      schedule_callback: {
        Args: { p_inquiry_id: string; p_notes?: string; p_scheduled_at: string }
        Returns: Json
      }
      seed_profile_tenant: {
        Args: { p_tenant_id: string; p_user_id: string }
        Returns: undefined
      }
      send_inquiry_email: {
        Args: {
          p_body: string
          p_inquiry_id: string
          p_recipient_email: string
          p_subject: string
        }
        Returns: Json
      }
      send_notification: {
        Args: {
          p_metadata: Json
          p_notification_type_id: string
          p_student_id: string
        }
        Returns: {
          error: string
          notification_id: string
          status: string
        }[]
      }
      take_inquiry: {
        Args: { p_counselor_id: string; p_inquiry_id: string }
        Returns: Json
      }
      touch_enrollment_access: {
        Args: { p_course_id: string; p_student_id: string }
        Returns: undefined
      }
    }
    Enums: {
      platform_key: "core" | "enrichment" | "club" | "music" | "art"
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
      platform_key: ["core", "enrichment", "club", "music", "art"],
    },
  },
} as const

