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
    PostgrestVersion: "14.17"
  }
  front_desk: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          data: Json | null
          desk: string
          id: string
          inquiry_id: string
          performed_by: string | null
          timestamp: string
        }
        Insert: {
          action: string
          data?: Json | null
          desk: string
          id?: string
          inquiry_id: string
          performed_by?: string | null
          timestamp?: string
        }
        Update: {
          action?: string
          data?: Json | null
          desk?: string
          id?: string
          inquiry_id?: string
          performed_by?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      call_logs: {
        Row: {
          call_id: string | null
          created_at: string
          deleted_at: string | null
          direction: string
          duration_seconds: number | null
          id: string
          lead_id: string
          notes: string | null
          outcome: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          call_id?: string | null
          created_at?: string
          deleted_at?: string | null
          direction: string
          duration_seconds?: number | null
          id?: string
          lead_id: string
          notes?: string | null
          outcome?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          call_id?: string | null
          created_at?: string
          deleted_at?: string | null
          direction?: string
          duration_seconds?: number | null
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      callbacks: {
        Row: {
          created_at: string
          id: string
          inquiry_id: string
          notes: string | null
          scheduled_at: string
          status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_id: string
          notes?: string | null
          scheduled_at: string
          status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_id?: string
          notes?: string | null
          scheduled_at?: string
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "callbacks_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_log: {
        Row: {
          body: string | null
          channel: string
          delivery_status: string | null
          desk: string
          id: string
          inquiry_id: string
          recipient: string
          sent_at: string
          subject: string | null
        }
        Insert: {
          body?: string | null
          channel: string
          delivery_status?: string | null
          desk: string
          id?: string
          inquiry_id: string
          recipient: string
          sent_at?: string
          subject?: string | null
        }
        Update: {
          body?: string | null
          channel?: string
          delivery_status?: string | null
          desk?: string
          id?: string
          inquiry_id?: string
          recipient?: string
          sent_at?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "communication_log_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          body: string | null
          id: string
          inquiry_id: string
          recipient: string
          sent_at: string
          status: string | null
          subject: string
        }
        Insert: {
          body?: string | null
          id?: string
          inquiry_id: string
          recipient: string
          sent_at?: string
          status?: string | null
          subject: string
        }
        Update: {
          body?: string | null
          id?: string
          inquiry_id?: string
          recipient?: string
          sent_at?: string
          status?: string | null
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      escalations: {
        Row: {
          created_at: string
          id: string
          inquiry_id: string
          reason: string
          status: string | null
          target_level: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          inquiry_id: string
          reason: string
          status?: string | null
          target_level: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          inquiry_id?: string
          reason?: string
          status?: string | null
          target_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalations_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "inquiries"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          activity_log: Json | null
          age_or_child_age: number | null
          ai_category: string | null
          ai_reasoning: string | null
          ai_suggested_action: string | null
          assigned_at: string | null
          assigned_counselor_id: string | null
          call_duration_seconds: number | null
          call_ended_at: string | null
          call_outcome: string | null
          call_scheduled_at: string | null
          call_started_at: string | null
          contact_email: string
          contact_name: string
          contact_phone: string | null
          country_residence: string | null
          created_at: string
          email_consent_given: boolean | null
          email_consent_timestamp: string | null
          enrollment_status: string | null
          id: string
          intake_group: string | null
          language: string | null
          message_body: string | null
          moved_to_office_desk_at: string | null
          office_desk_owner_id: string | null
          program_interest: string | null
          sms_consent_given: boolean | null
          sms_consent_timestamp: string | null
          source: string | null
          timezone: string | null
          updated_at: string
          updated_by: string | null
          voip_call_logged: boolean | null
          voip_number_called: string | null
        }
        Insert: {
          activity_log?: Json | null
          age_or_child_age?: number | null
          ai_category?: string | null
          ai_reasoning?: string | null
          ai_suggested_action?: string | null
          assigned_at?: string | null
          assigned_counselor_id?: string | null
          call_duration_seconds?: number | null
          call_ended_at?: string | null
          call_outcome?: string | null
          call_scheduled_at?: string | null
          call_started_at?: string | null
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          country_residence?: string | null
          created_at?: string
          email_consent_given?: boolean | null
          email_consent_timestamp?: string | null
          enrollment_status?: string | null
          id?: string
          intake_group?: string | null
          language?: string | null
          message_body?: string | null
          moved_to_office_desk_at?: string | null
          office_desk_owner_id?: string | null
          program_interest?: string | null
          sms_consent_given?: boolean | null
          sms_consent_timestamp?: string | null
          source?: string | null
          timezone?: string | null
          updated_at?: string
          updated_by?: string | null
          voip_call_logged?: boolean | null
          voip_number_called?: string | null
        }
        Update: {
          activity_log?: Json | null
          age_or_child_age?: number | null
          ai_category?: string | null
          ai_reasoning?: string | null
          ai_suggested_action?: string | null
          assigned_at?: string | null
          assigned_counselor_id?: string | null
          call_duration_seconds?: number | null
          call_ended_at?: string | null
          call_outcome?: string | null
          call_scheduled_at?: string | null
          call_started_at?: string | null
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          country_residence?: string | null
          created_at?: string
          email_consent_given?: boolean | null
          email_consent_timestamp?: string | null
          enrollment_status?: string | null
          id?: string
          intake_group?: string | null
          language?: string | null
          message_body?: string | null
          moved_to_office_desk_at?: string | null
          office_desk_owner_id?: string | null
          program_interest?: string | null
          sms_consent_given?: boolean | null
          sms_consent_timestamp?: string | null
          source?: string | null
          timezone?: string | null
          updated_at?: string
          updated_by?: string | null
          voip_call_logged?: boolean | null
          voip_number_called?: string | null
        }
        Relationships: []
      }
      lead_archive_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          lead_id: string
          notes: string | null
          reason: Database["front_desk"]["Enums"]["archive_reason_type"] | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          lead_id: string
          notes?: string | null
          reason?: Database["front_desk"]["Enums"]["archive_reason_type"] | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          lead_id?: string
          notes?: string | null
          reason?: Database["front_desk"]["Enums"]["archive_reason_type"] | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_archive_log_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          archive_reason:
            | Database["front_desk"]["Enums"]["archive_reason_type"]
            | null
          archived_at: string | null
          callback_notes: string | null
          callback_scheduled_at: string | null
          callback_status:
            | Database["front_desk"]["Enums"]["callback_status_type"]
            | null
          company: string | null
          created_at: string
          email: string | null
          existing_profile: boolean
          id: string
          name: string | null
          notes: string | null
          phone: string | null
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version_id: string | null
        }
        Insert: {
          archive_reason?:
            | Database["front_desk"]["Enums"]["archive_reason_type"]
            | null
          archived_at?: string | null
          callback_notes?: string | null
          callback_scheduled_at?: string | null
          callback_status?:
            | Database["front_desk"]["Enums"]["callback_status_type"]
            | null
          company?: string | null
          created_at?: string
          email?: string | null
          existing_profile?: boolean
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version_id?: string | null
        }
        Update: {
          archive_reason?:
            | Database["front_desk"]["Enums"]["archive_reason_type"]
            | null
          archived_at?: string | null
          callback_notes?: string | null
          callback_scheduled_at?: string | null
          callback_status?:
            | Database["front_desk"]["Enums"]["callback_status_type"]
            | null
          company?: string | null
          created_at?: string
          email?: string | null
          existing_profile?: boolean
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      archive_reason_type:
        | "enrolled"
        | "withdrawn"
        | "inactive"
        | "duplicate"
        | "other"
      callback_status_type: "pending" | "completed" | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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
  office_desk: {
    Tables: {
      contact_activity_log: {
        Row: {
          action: string
          action_data: Json | null
          contact_id: string
          created_at: string
          desk_id: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          action: string
          action_data?: Json | null
          contact_id: string
          created_at?: string
          desk_id: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          action?: string
          action_data?: Json | null
          contact_id?: string
          created_at?: string
          desk_id?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_activity_log_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_activity_log_desk_id_fkey"
            columns: ["desk_id"]
            isOneToOne: false
            referencedRelation: "office_desk"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_note_attachments: {
        Row: {
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          note_id: string
          uploaded_at: string
        }
        Insert: {
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          note_id: string
          uploaded_at?: string
        }
        Update: {
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          note_id?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_note_attachments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "contact_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_note_mentions: {
        Row: {
          id: string
          mentioned_at: string
          note_id: string
          user_id: string
        }
        Insert: {
          id?: string
          mentioned_at?: string
          note_id: string
          user_id: string
        }
        Update: {
          id?: string
          mentioned_at?: string
          note_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_note_mentions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "contact_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_notes: {
        Row: {
          contact_id: string
          content: string
          content_html: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          desk_id: string
          id: string
          is_edited: boolean | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contact_id: string
          content: string
          content_html?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          desk_id: string
          id?: string
          is_edited?: boolean | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string
          content?: string
          content_html?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          desk_id?: string
          id?: string
          is_edited?: boolean | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_notes_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_notes_desk_id_fkey"
            columns: ["desk_id"]
            isOneToOne: false
            referencedRelation: "office_desk"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          category: string | null
          company: string | null
          created_at: string
          desk_id: string | null
          email: string | null
          id: string
          name: string | null
          notes: string | null
          phone: string | null
          priority: string | null
          status: string | null
          tags: string[] | null
          tenant_id: string
          title: string | null
          updated_at: string
          updated_by: string | null
          version_id: string | null
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          category?: string | null
          company?: string | null
          created_at?: string
          desk_id?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          version_id?: string | null
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          category?: string | null
          company?: string | null
          created_at?: string
          desk_id?: string | null
          email?: string | null
          id?: string
          name?: string | null
          notes?: string | null
          phone?: string | null
          priority?: string | null
          status?: string | null
          tags?: string[] | null
          tenant_id?: string
          title?: string | null
          updated_at?: string
          updated_by?: string | null
          version_id?: string | null
        }
        Relationships: []
      }
      desk_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          desk_id: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role_id: string
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          desk_id: string
          email: string
          expires_at: string
          id?: string
          invited_by: string
          role_id: string
          status?: string
          tenant_id: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          desk_id?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role_id?: string
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "desk_invites_desk_id_fkey"
            columns: ["desk_id"]
            isOneToOne: false
            referencedRelation: "office_desk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "desk_invites_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "desk_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      desk_roles: {
        Row: {
          created_at: string
          description: string | null
          desk_id: string
          id: string
          is_system: boolean | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          desk_id: string
          id?: string
          is_system?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          desk_id?: string
          id?: string
          is_system?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "desk_roles_desk_id_fkey"
            columns: ["desk_id"]
            isOneToOne: false
            referencedRelation: "office_desk"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          invoice_id: string
          quantity: number
          tenant_id: string
          total_price: number | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          tenant_id: string
          total_price?: number | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          tenant_id?: string
          total_price?: number | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          amount_paid: number
          created_at: string
          currency: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_number: string | null
          issued_at: string | null
          lead_id: string | null
          paid_at: string | null
          payment_method: string | null
          payment_processor: string | null
          paypal_capture_id: string | null
          paypal_error_message: string | null
          paypal_order_id: string | null
          registration_id: string
          status: string
          stripe_charge_id: string | null
          stripe_error_message: string | null
          stripe_payment_intent_id: string | null
          tenant_id: string
          updated_at: string
          updated_by: string | null
          version_id: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          lead_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_processor?: string | null
          paypal_capture_id?: string | null
          paypal_error_message?: string | null
          paypal_order_id?: string | null
          registration_id: string
          status?: string
          stripe_charge_id?: string | null
          stripe_error_message?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          version_id?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_number?: string | null
          issued_at?: string | null
          lead_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_processor?: string | null
          paypal_capture_id?: string | null
          paypal_error_message?: string | null
          paypal_order_id?: string | null
          registration_id?: string
          status?: string
          stripe_charge_id?: string | null
          stripe_error_message?: string | null
          stripe_payment_intent_id?: string | null
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      office_desk: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          deleted_at: string | null
          id: string
          invoice_id: string
          paid_at: string | null
          payment_method: string | null
          reference: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          invoice_id: string
          paid_at?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string
          paid_at?: string | null
          payment_method?: string | null
          reference?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      permission_audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          desk_id: string
          details: Json | null
          id: string
          target_role_id: string | null
          target_user_id: string | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          desk_id: string
          details?: Json | null
          id?: string
          target_role_id?: string | null
          target_user_id?: string | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          desk_id?: string
          details?: Json | null
          id?: string
          target_role_id?: string | null
          target_user_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permission_audit_log_desk_id_fkey"
            columns: ["desk_id"]
            isOneToOne: false
            referencedRelation: "office_desk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permission_audit_log_target_role_id_fkey"
            columns: ["target_role_id"]
            isOneToOne: false
            referencedRelation: "desk_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          course_name: string | null
          created_at: string
          deleted_at: string | null
          id: string
          lead_reference_id: string | null
          notes: string | null
          payment_attached_at: string | null
          paypal_transaction_id: string | null
          status: string
          stripe_charge_id: string | null
          stripe_customer_id: string | null
          student_email: string
          student_name: string
          student_phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          course_name?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          lead_reference_id?: string | null
          notes?: string | null
          payment_attached_at?: string | null
          paypal_transaction_id?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          student_email: string
          student_name: string
          student_phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          course_name?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          lead_reference_id?: string | null
          notes?: string | null
          payment_attached_at?: string | null
          paypal_transaction_id?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_customer_id?: string | null
          student_email?: string
          student_name?: string
          student_phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          entity_type: string
          error_message: string | null
          file_path: string | null
          file_size_bytes: number | null
          format: string
          id: string
          report_type: string
          row_count: number | null
          scheduled_report_id: string | null
          started_at: string | null
          status: Database["office_desk"]["Enums"]["report_log_status"]
          template_id: string | null
          tenant_id: string
          triggered_by: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          entity_type: string
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          format: string
          id?: string
          report_type: string
          row_count?: number | null
          scheduled_report_id?: string | null
          started_at?: string | null
          status?: Database["office_desk"]["Enums"]["report_log_status"]
          template_id?: string | null
          tenant_id: string
          triggered_by?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          entity_type?: string
          error_message?: string | null
          file_path?: string | null
          file_size_bytes?: number | null
          format?: string
          id?: string
          report_type?: string
          row_count?: number | null
          scheduled_report_id?: string | null
          started_at?: string | null
          status?: Database["office_desk"]["Enums"]["report_log_status"]
          template_id?: string | null
          tenant_id?: string
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_logs_scheduled_report_id_fkey"
            columns: ["scheduled_report_id"]
            isOneToOne: false
            referencedRelation: "scheduled_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      report_templates: {
        Row: {
          columns: Json
          created_at: string
          created_by: string | null
          description: string | null
          entity_type: string
          filters: Json
          group_by: string | null
          id: string
          is_default: boolean
          name: string
          report_type: string
          sort_by: string
          sort_order: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          columns?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type: string
          filters?: Json
          group_by?: string | null
          id?: string
          is_default?: boolean
          name: string
          report_type: string
          sort_by?: string
          sort_order?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          columns?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          entity_type?: string
          filters?: Json
          group_by?: string | null
          id?: string
          is_default?: boolean
          name?: string
          report_type?: string
          sort_by?: string
          sort_order?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string
          id: string
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string
          id?: string
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "desk_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          description: string | null
          entity_type: string
          filters: Json
          id: string
          is_default: boolean
          last_used_at: string | null
          name: string
          search_query: string | null
          sort_by: string
          sort_order: string
          tenant_id: string
          updated_at: string
          use_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_type: string
          filters?: Json
          id?: string
          is_default?: boolean
          last_used_at?: string | null
          name: string
          search_query?: string | null
          sort_by?: string
          sort_order?: string
          tenant_id: string
          updated_at?: string
          use_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_type?: string
          filters?: Json
          id?: string
          is_default?: boolean
          last_used_at?: string | null
          name?: string
          search_query?: string | null
          sort_by?: string
          sort_order?: string
          tenant_id?: string
          updated_at?: string
          use_count?: number
          user_id?: string
        }
        Relationships: []
      }
      scheduled_reports: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          filters: Json
          format: string
          frequency: Database["office_desk"]["Enums"]["report_frequency"]
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string
          recipients: Json
          template_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          format?: string
          frequency?: Database["office_desk"]["Enums"]["report_frequency"]
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at: string
          recipients?: Json
          template_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          filters?: Json
          format?: string
          frequency?: Database["office_desk"]["Enums"]["report_frequency"]
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string
          recipients?: Json
          template_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_reports_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "report_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          entity_type: string
          filters: Json
          id: string
          result_count: number
          search_query: string
          searched_at: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          entity_type: string
          filters?: Json
          id?: string
          result_count?: number
          search_query: string
          searched_at?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          entity_type?: string
          filters?: Json
          id?: string
          result_count?: number
          search_query?: string
          searched_at?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          billing_address_line1: string | null
          billing_address_line2: string | null
          billing_city: string | null
          billing_country: string | null
          billing_email: string | null
          billing_postal_code: string | null
          billing_state: string | null
          created_at: string
          id: string
          paypal_customer_id: string | null
          stripe_customer_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          created_at?: string
          id?: string
          paypal_customer_id?: string | null
          stripe_customer_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_address_line1?: string | null
          billing_address_line2?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_email?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          created_at?: string
          id?: string
          paypal_customer_id?: string | null
          stripe_customer_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount_monthly: number
          billing_interval: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          paypal_plan_id: string | null
          plan_id: string
          processor: string
          status: string
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_monthly: number
          billing_interval?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paypal_plan_id?: string | null
          plan_id: string
          processor: string
          status?: string
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_monthly?: number
          billing_interval?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          paypal_plan_id?: string | null
          plan_id?: string
          processor?: string
          status?: string
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_desk_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          desk_id: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          desk_id: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          desk_id?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_desk_roles_desk_id_fkey"
            columns: ["desk_id"]
            isOneToOne: false
            referencedRelation: "office_desk"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_desk_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "desk_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_desks: {
        Row: {
          created_at: string
          desk_id: string
          id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          desk_id: string
          id?: string
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          desk_id?: string
          id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_desks_desk_id_fkey"
            columns: ["desk_id"]
            isOneToOne: false
            referencedRelation: "office_desk"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_default_roles: {
        Args: { p_desk_id: string; p_tenant_id: string }
        Returns: undefined
      }
      get_scheduled_report_email_template: {
        Args: {
          p_date: string
          p_download_url: string
          p_entity_type: string
          p_frequency: string
          p_report_name: string
        }
        Returns: string
      }
      get_user_desk_permissions: {
        Args: { p_desk_id: string; p_user_id: string }
        Returns: {
          permission_code: string
        }[]
      }
      get_user_desk_role: {
        Args: { p_desk_id: string; p_user_id: string }
        Returns: {
          role_id: string
          role_name: string
        }[]
      }
      user_has_permission: {
        Args: {
          p_desk_id: string
          p_permission_code: string
          p_user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      report_frequency: "daily" | "weekly" | "monthly" | "quarterly"
      report_log_status: "pending" | "running" | "completed" | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
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
          created_at: string | null
          email: boolean | null
          id: string
          in_app: boolean | null
          notification_type_id: string
          sms: boolean | null
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: boolean | null
          id?: string
          in_app?: boolean | null
          notification_type_id: string
          sms?: boolean | null
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: boolean | null
          id?: string
          in_app?: boolean | null
          notification_type_id?: string
          sms?: boolean | null
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
          id: string
          payment_type: string
          status: string
          stripe_payment_intent_id: string | null
          student_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          payment_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          student_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          payment_type?: string
          status?: string
          stripe_payment_intent_id?: string | null
          student_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
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
      students: {
        Row: {
          academic_group_id: string
          created_at: string
          created_by: string | null
          enrollment_date: string | null
          enrollment_status: string
          first_name: string
          grade: string
          id: string
          last_name: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_group_id: string
          created_at?: string
          created_by?: string | null
          enrollment_date?: string | null
          enrollment_status?: string
          first_name: string
          grade: string
          id?: string
          last_name: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_group_id?: string
          created_at?: string
          created_by?: string | null
          enrollment_date?: string | null
          enrollment_status?: string
          first_name?: string
          grade?: string
          id?: string
          last_name?: string
          updated_at?: string
          updated_by?: string | null
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
    }
    Views: {
      [_ in never]: never
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
          p_reason?: Database["front_desk"]["Enums"]["archive_reason_type"]
        }
        Returns: Database["front_desk"]["Tables"]["leads"]["Row"]
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
        Returns: Database["school_desk"]["Tables"]["report_cards"]["Row"]
        SetofOptions: {
          from: "*"
          to: "report_cards"
          isOneToOne: true
          isSetofReturn: false
        }
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
      release_report_card: {
        Args: { p_card_id: string }
        Returns: Database["school_desk"]["Tables"]["report_cards"]["Row"]
        SetofOptions: {
          from: "*"
          to: "report_cards"
          isOneToOne: true
          isSetofReturn: false
        }
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
    }
    Enums: {
      platform_key: "core" | "enrichment" | "club" | "music" | "art"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  school_desk: {
    Tables: {
      __reload_trigger: {
        Row: {
          id: number
        }
        Insert: {
          id: number
        }
        Update: {
          id?: number
        }
        Relationships: []
      }
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
        Relationships: []
      }
      assignments: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          deleted_at: string | null
          description: string | null
          due_date: string | null
          id: string
          max_score: number
          tenant_id: string
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          max_score?: number
          tenant_id: string
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          max_score?: number
          tenant_id?: string
          title?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          class_date: string
          course_id: string
          created_at: string
          deleted_at: string | null
          id: string
          marked_at: string
          marked_by: string
          notes: string | null
          status: string
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          class_date: string
          course_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          marked_at?: string
          marked_by: string
          notes?: string | null
          status?: string
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          class_date?: string
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          marked_at?: string
          marked_by?: string
          notes?: string | null
          status?: string
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          created_at: string
          created_by: string
          deleted_at: string | null
          group_id: string
          id: string
          message: string
          sent_at: string | null
          tenant_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deleted_at?: string | null
          group_id: string
          id?: string
          message: string
          sent_at?: string | null
          tenant_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          group_id?: string
          id?: string
          message?: string
          sent_at?: string | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
        Relationships: []
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
          tenant_id: string | null
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
          tenant_id?: string | null
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
          tenant_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
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
        ]
      }
      gradebook: {
        Row: {
          assignment_id: string
          course_id: string
          created_at: string
          deleted_at: string | null
          feedback: string | null
          graded_at: string
          graded_by: string
          id: string
          score: number | null
          student_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          assignment_id: string
          course_id: string
          created_at?: string
          deleted_at?: string | null
          feedback?: string | null
          graded_at?: string
          graded_by: string
          id?: string
          score?: number | null
          student_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          assignment_id?: string
          course_id?: string
          created_at?: string
          deleted_at?: string | null
          feedback?: string | null
          graded_at?: string
          graded_by?: string
          id?: string
          score?: number | null
          student_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gradebook_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gradebook_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
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
        ]
      }
      news: {
        Row: {
          content: string
          created_at: string
          created_by: string
          deleted_at: string | null
          id: string
          published_at: string | null
          tenant_id: string
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          deleted_at?: string | null
          id?: string
          published_at?: string | null
          tenant_id: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          id?: string
          published_at?: string | null
          tenant_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_requests: {
        Row: {
          amount: number
          cancelled_at: string | null
          created_at: string
          created_by: string
          currency: string
          deleted_at: string | null
          description: string | null
          expired_at: string | null
          id: string
          paid_at: string | null
          registration_id: string
          status: string
          stripe_payment_url: string | null
          stripe_session_id: string | null
          tenant_id: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          created_at?: string
          created_by: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          expired_at?: string | null
          id?: string
          paid_at?: string | null
          registration_id: string
          status?: string
          stripe_payment_url?: string | null
          stripe_session_id?: string | null
          tenant_id: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          deleted_at?: string | null
          description?: string | null
          expired_at?: string | null
          id?: string
          paid_at?: string | null
          registration_id?: string
          status?: string
          stripe_payment_url?: string | null
          stripe_session_id?: string | null
          tenant_id?: string
        }
        Relationships: []
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
        Relationships: []
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
  front_desk: {
    Enums: {
      archive_reason_type: [
        "enrolled",
        "withdrawn",
        "inactive",
        "duplicate",
        "other",
      ],
      callback_status_type: ["pending", "completed", "cancelled"],
    },
  },
  graphql_public: {
    Enums: {},
  },
  office_desk: {
    Enums: {
      report_frequency: ["daily", "weekly", "monthly", "quarterly"],
      report_log_status: ["pending", "running", "completed", "failed"],
    },
  },
  public: {
    Enums: {
      platform_key: ["core", "enrichment", "club", "music", "art"],
    },
  },
  school_desk: {
    Enums: {},
  },
} as const
