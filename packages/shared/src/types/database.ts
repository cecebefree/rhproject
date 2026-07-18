export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      announcement: {
        Row: {
          audience_roles: string[]
          body: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          pinned: boolean
          publish_at: string
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          audience_roles?: string[]
          body: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          pinned?: boolean
          publish_at?: string
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          audience_roles?: string[]
          body?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          pinned?: boolean
          publish_at?: string
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: [
          {
            foreignKeyName: "chapters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
      conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          profile_id: string
          role: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          profile_id: string
          role?: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          profile_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          category: string
          created_at: string
          created_by: string
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by: string
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          description: string | null
          id: string
          open_to_outside: boolean
          platform: Database["public"]["Enums"]["platform_key"]
          price: number
          status: string
          teacher_id: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          open_to_outside?: boolean
          platform?: Database["public"]["Enums"]["platform_key"]
          price: number
          status?: string
          teacher_id: string
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          open_to_outside?: boolean
          platform?: Database["public"]["Enums"]["platform_key"]
          price?: number
          status?: string
          teacher_id?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      enrollments: {
        Row: {
          course_id: string
          id: string
          payment_reference: string | null
          purchased_at: string
          student_id: string
        }
        Insert: {
          course_id: string
          id?: string
          payment_reference?: string | null
          purchased_at?: string
          student_id: string
        }
        Update: {
          course_id?: string
          id?: string
          payment_reference?: string | null
          purchased_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_reactions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          tenant_id: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          tenant_id?: string
          title?: string
          type?: string
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
          created_at: string
          handle: string | null
          has_core: boolean
          id: string
          name: string
          registration_status: string
          role: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          access_ends_at?: string | null
          access_starts_at?: string | null
          consent_given?: boolean
          created_at?: string
          handle?: string | null
          has_core?: boolean
          id: string
          name: string
          registration_status?: string
          role: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          access_ends_at?: string | null
          access_starts_at?: string | null
          consent_given?: boolean
          created_at?: string
          handle?: string | null
          has_core?: boolean
          id?: string
          name?: string
          registration_status?: string
          role?: string
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
      report_cards: {
        Row: {
          created_at: string
          created_by: string
          grade: string | null
          id: string
          released_at: string | null
          released_by: string | null
          status: string
          student_id: string
          subject: string
          tenant_id: string
          term: string
          updated_at: string
          visible_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          grade?: string | null
          id?: string
          released_at?: string | null
          released_by?: string | null
          status?: string
          student_id: string
          subject: string
          tenant_id: string
          term: string
          updated_at?: string
          visible_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          grade?: string | null
          id?: string
          released_at?: string | null
          released_by?: string | null
          status?: string
          student_id?: string
          subject?: string
          tenant_id?: string
          term?: string
          updated_at?: string
          visible_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_cards_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_released_by_fkey"
            columns: ["released_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_cards_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "schedule_slot_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_slot_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "terms"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "student_class_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      pg_all_foreign_keys: {
        Row: {
          fk_columns: unknown[] | null
          fk_constraint_name: unknown
          fk_schema_name: unknown
          fk_table_name: unknown
          fk_table_oid: unknown
          is_deferrable: boolean | null
          is_deferred: boolean | null
          match_type: string | null
          on_delete: string | null
          on_update: string | null
          pk_columns: unknown[] | null
          pk_constraint_name: unknown
          pk_index_name: unknown
          pk_schema_name: unknown
          pk_table_name: unknown
          pk_table_oid: unknown
        }
        Relationships: []
      }
      tap_funky: {
        Row: {
          args: string | null
          is_definer: boolean | null
          is_strict: boolean | null
          is_visible: boolean | null
          kind: unknown
          langoid: unknown
          name: unknown
          oid: unknown
          owner: unknown
          returns: string | null
          returns_set: boolean | null
          schema: unknown
          volatility: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _cleanup: { Args: never; Returns: boolean }
      _contract_on: { Args: { "": string }; Returns: unknown }
      _currtest: { Args: never; Returns: number }
      _db_privs: { Args: never; Returns: unknown[] }
      _extensions: { Args: never; Returns: unknown[] }
      _get: { Args: { "": string }; Returns: number }
      _get_latest: { Args: { "": string }; Returns: number[] }
      _get_note: { Args: { "": string }; Returns: string }
      _is_verbose: { Args: never; Returns: boolean }
      _prokind: { Args: { p_oid: unknown }; Returns: unknown }
      _query: { Args: { "": string }; Returns: string }
      _refine_vol: { Args: { "": string }; Returns: string }
      _retval: { Args: { "": string }; Returns: string }
      _table_privs: { Args: never; Returns: unknown[] }
      _temptypes: { Args: { "": string }; Returns: string }
      _todo: { Args: never; Returns: string }
      assign_tenant_to_profile: {
        Args: { p_caller_id: string; p_profile_id: string; p_tenant_id: string }
        Returns: undefined
      }
      col_is_null:
        | {
            Args: {
              column_name: unknown
              description?: string
              schema_name: unknown
              table_name: unknown
            }
            Returns: string
          }
        | {
            Args: {
              column_name: unknown
              description?: string
              table_name: unknown
            }
            Returns: string
          }
      col_not_null:
        | {
            Args: {
              column_name: unknown
              description?: string
              schema_name: unknown
              table_name: unknown
            }
            Returns: string
          }
        | {
            Args: {
              column_name: unknown
              description?: string
              table_name: unknown
            }
            Returns: string
          }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      diag:
        | {
            Args: { msg: unknown }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
        | {
            Args: { msg: string }
            Returns: {
              error: true
            } & "Could not choose the best candidate function between: public.diag(msg => text), public.diag(msg => anyelement). Try renaming the parameters or the function itself in the database so function overloading can be resolved"
          }
      diag_test_name: { Args: { "": string }; Returns: string }
      do_tap:
        | { Args: never; Returns: string[] }
        | { Args: { "": string }; Returns: string[] }
      fail:
        | { Args: never; Returns: string }
        | { Args: { "": string }; Returns: string }
      findfuncs: { Args: { "": string }; Returns: string[] }
      finish: { Args: { exception_on_failure?: boolean }; Returns: string[] }
      format_type_string: { Args: { "": string }; Returns: string }
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
      has_core_access: { Args: never; Returns: boolean }
      has_item_access: { Args: { p_course_id: string }; Returns: boolean }
      has_platform_access: {
        Args: { p_platform: Database["public"]["Enums"]["platform_key"] }
        Returns: boolean
      }
      has_unique: { Args: { "": string }; Returns: string }
      in_todo: { Args: never; Returns: boolean }
      is_empty: { Args: { "": string }; Returns: string }
      isnt_empty: { Args: { "": string }; Returns: string }
      lives_ok: { Args: { "": string }; Returns: string }
      make_timerange: {
        Args: { p_end: string; p_start: string }
        Returns: unknown
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
      no_plan: { Args: never; Returns: boolean[] }
      num_failed: { Args: never; Returns: number }
      os_name: { Args: never; Returns: string }
      pass:
        | { Args: never; Returns: string }
        | { Args: { "": string }; Returns: string }
      pg_version: { Args: never; Returns: string }
      pg_version_num: { Args: never; Returns: number }
      pgtap_version: { Args: never; Returns: number }
      runtests:
        | { Args: never; Returns: string[] }
        | { Args: { "": string }; Returns: string[] }
      skip:
        | { Args: { "": string }; Returns: string }
        | { Args: { how_many: number; why: string }; Returns: string }
      throws_ok: { Args: { "": string }; Returns: string }
      todo:
        | { Args: { how_many: number }; Returns: boolean[] }
        | { Args: { how_many: number; why: string }; Returns: boolean[] }
        | { Args: { why: string }; Returns: boolean[] }
        | { Args: { how_many: number; why: string }; Returns: boolean[] }
      todo_end: { Args: never; Returns: boolean[] }
      todo_start:
        | { Args: never; Returns: boolean[] }
        | { Args: { "": string }; Returns: boolean[] }
    }
    Enums: {
      platform_key: "core" | "enrichment" | "club" | "music" | "art"
    }
    CompositeTypes: {
      _time_trial_type: {
        a_time: number | null
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      platform_key: ["core", "enrichment", "club", "music", "art"],
    },
  },
} as const

