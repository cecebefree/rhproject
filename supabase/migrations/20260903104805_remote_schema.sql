SET local check_function_bodies = off;

REVOKE ALL ON SEQUENCE "public"."invoice_number_seq" FROM "anon";

COMMENT ON COLUMN "public"."ef_call_log"."action" IS NULL;

COMMENT ON COLUMN "public"."ef_call_log"."caller" IS NULL;

COMMENT ON COLUMN "public"."ef_call_log"."receiver" IS NULL;

COMMENT ON COLUMN "school_desk"."courses"."tenant_id" IS NULL;

COMMENT ON TABLE "public"."chapter_progress" IS NULL;

COMMENT ON TABLE "public"."notification_preferences" IS NULL;

ALTER PUBLICATION "supabase_realtime" DROP TABLE "public"."payment_webhooks";

ALTER PUBLICATION "supabase_realtime" DROP TABLE "public"."users";

DROP POLICY "leads_office_select" ON "front_desk"."leads";

DROP POLICY "addon_admin_all" ON "office_desk"."add_on_payments";

DROP POLICY "addon_parent_select" ON "office_desk"."add_on_payments";

DROP POLICY "dbo_admin_all" ON "office_desk"."debit_orders";

DROP POLICY "dbo_parent_select" ON "office_desk"."debit_orders";

DROP POLICY "dbo_student_select" ON "office_desk"."debit_orders";

DROP POLICY "desk_roles_admin_all" ON "office_desk"."desk_roles";

DROP POLICY "desk_roles_tenant_select" ON "office_desk"."desk_roles";

DROP POLICY "fa_admin_all" ON "office_desk"."family_accounts";

DROP POLICY "fam_admin_all" ON "office_desk"."family_activity";

DROP POLICY "fam_parent_select" ON "office_desk"."family_activity";

DROP POLICY "inv_admin_all" ON "office_desk"."invoices";

DROP POLICY "inv_parent_select" ON "office_desk"."invoices";

DROP POLICY "inv_school_desk_read" ON "office_desk"."invoices";

DROP POLICY "inv_tenant_select" ON "office_desk"."invoices";

DROP POLICY "pkg_admin_all" ON "office_desk"."packages";

DROP POLICY "pay_admin_all" ON "office_desk"."payments";

DROP POLICY "pay_parent_select" ON "office_desk"."payments";

DROP POLICY "pay_school_desk_read" ON "office_desk"."payments";

DROP POLICY "pay_tenant_select" ON "office_desk"."payments";

DROP POLICY "office_registrations_tenant_select" ON "office_desk"."registrations";

DROP POLICY "students_admin_all" ON "office_desk"."students";

DROP POLICY "students_own_select" ON "office_desk"."students";

DROP POLICY "students_parent_select" ON "office_desk"."students";

DROP POLICY "students_school_desk_read" ON "office_desk"."students";

DROP POLICY "users_admin_all" ON "office_desk"."users";

DROP POLICY "users_parent_select_children" ON "office_desk"."users";

DROP POLICY "teacher_submissions_select" ON "public"."assessment_submissions";

DROP POLICY "teacher_submissions_update" ON "public"."assessment_submissions";

DROP POLICY "cert_admin_all" ON "public"."certificates";

DROP POLICY "oda_chapter_progress_all" ON "public"."chapter_progress";

DROP POLICY "parent_chapter_progress_select" ON "public"."chapter_progress";

DROP POLICY "sda_chapter_progress_select" ON "public"."chapter_progress";

DROP POLICY "sda_chapter_progress_update" ON "public"."chapter_progress";

DROP POLICY "student_chapter_progress_select" ON "public"."chapter_progress";

DROP POLICY "teacher_chapter_progress_insert" ON "public"."chapter_progress";

DROP POLICY "teacher_chapter_progress_select" ON "public"."chapter_progress";

DROP POLICY "teacher_chapter_progress_update" ON "public"."chapter_progress";

DROP POLICY "parent_sessions_select" ON "public"."class_sessions";

DROP POLICY "student_sessions_select" ON "public"."class_sessions";

DROP POLICY "parent_progress_select_child" ON "public"."course_progress";

DROP POLICY "student_progress_select_own" ON "public"."course_progress";

DROP POLICY "teacher_progress_insert" ON "public"."course_progress";

DROP POLICY "teacher_progress_select" ON "public"."course_progress";

DROP POLICY "teacher_progress_update" ON "public"."course_progress";

DROP POLICY "service_role_manage_debit_orders" ON "public"."debit_orders";

DROP POLICY "students_view_own_debit_orders" ON "public"."debit_orders";

DROP POLICY "ef_call_log_insert_service_role" ON "public"."ef_call_log";

DROP POLICY "ef_call_log_select_admin" ON "public"."ef_call_log";

DROP POLICY "parent_meeting_links_select_child" ON "public"."meeting_links";

DROP POLICY "student_meeting_links_select_own" ON "public"."meeting_links";

DROP POLICY "notif_prefs_service_role_all" ON "public"."notification_preferences";

DROP POLICY "notif_prefs_student_insert" ON "public"."notification_preferences";

DROP POLICY "notif_prefs_student_select" ON "public"."notification_preferences";

DROP POLICY "notif_prefs_student_update" ON "public"."notification_preferences";

DROP POLICY "students_view_notification_types" ON "public"."notification_types";

DROP POLICY "ss_adult_read" ON "public"."schedule_slot";

DROP POLICY "teacher_attendance_insert" ON "public"."student_attendance";

DROP POLICY "teacher_attendance_select" ON "public"."student_attendance";

DROP POLICY "teacher_attendance_update" ON "public"."student_attendance";

DROP TRIGGER "trg_invoices_updated_at" ON "office_desk"."invoices";

DROP TRIGGER "trg_payments_updated_at" ON "office_desk"."payments";

DROP TRIGGER "on_debit_order_scheduled" ON "public"."debit_orders";

DROP TRIGGER "trg_notification_preferences_updated_at" ON "public"."notification_preferences";

DROP TRIGGER "on_payment_status_change" ON "public"."payments";

DROP TRIGGER "on_student_enrollment_activated" ON "public"."students";

DROP INDEX "office_desk"."idx_inv_due";

DROP INDEX "office_desk"."idx_inv_family";

DROP INDEX "office_desk"."idx_inv_number";

DROP INDEX "office_desk"."idx_inv_status";

DROP INDEX "office_desk"."idx_inv_tenant";

DROP INDEX "office_desk"."idx_inv_type";

DROP INDEX "office_desk"."idx_pay_date";

DROP INDEX "office_desk"."idx_pay_family";

DROP INDEX "office_desk"."idx_pay_ref";

DROP INDEX "office_desk"."idx_pay_status";

DROP INDEX "office_desk"."idx_pay_tenant";

DROP INDEX "office_desk"."idx_pay_type";

DROP INDEX "office_desk"."idx_reg_course_id";

DROP INDEX "office_desk"."idx_reg_payment_status";

DROP INDEX "office_desk"."idx_reg_reg_status";

DROP INDEX "office_desk"."idx_reg_school_year";

DROP INDEX "office_desk"."idx_reg_tenant_lms";

DROP INDEX "office_desk"."idx_registrations_payment_status";

DROP INDEX "office_desk"."idx_user_desk_roles_role";

DROP INDEX "office_desk"."idx_user_desk_roles_user";

DROP INDEX "public"."idx_chapter_progress_course";

DROP INDEX "public"."idx_chapter_progress_enrollment";

DROP INDEX "public"."idx_chapter_progress_org";

DROP INDEX "public"."idx_chapter_progress_status";

DROP INDEX "public"."idx_ef_call_log_caller";

DROP INDEX "public"."idx_ef_call_log_created_at";

DROP INDEX "public"."idx_ef_call_log_tenant_id";

DROP INDEX "public"."idx_notification_preferences_class_ids";

DROP INDEX "public"."idx_notification_preferences_student";

DROP INDEX "public"."idx_payments_paypal_txn";

DROP INDEX "public"."idx_payments_student_invoice";

ALTER TABLE "office_desk"."activity_log"
  DROP CONSTRAINT "activity_log_actor_profile_id_fkey";

ALTER TABLE "office_desk"."activity_log"
  DROP CONSTRAINT "activity_log_registration_id_fkey";

ALTER TABLE "office_desk"."add_on_payments"
  DROP CONSTRAINT "add_on_payments_family_account_id_fkey";

ALTER TABLE "office_desk"."add_on_payments"
  DROP CONSTRAINT "add_on_payments_invoice_id_fkey";

ALTER TABLE "office_desk"."add_on_payments"
  DROP CONSTRAINT "add_on_payments_student_id_fkey";

ALTER TABLE "office_desk"."add_on_payments"
  DROP CONSTRAINT "add_on_payments_tenant_id_fkey";

ALTER TABLE "office_desk"."bulk_operation_history"
  DROP CONSTRAINT "bulk_operation_history_tenant_id_fkey";

ALTER TABLE "office_desk"."bulk_operation_history"
  DROP CONSTRAINT "bulk_operation_history_undone_by_fkey";

ALTER TABLE "office_desk"."bulk_operation_history"
  DROP CONSTRAINT "bulk_operation_history_user_id_fkey";

ALTER TABLE "office_desk"."conversion_events"
  DROP CONSTRAINT "conversion_events_lead_id_fkey";

ALTER TABLE "office_desk"."conversion_events"
  DROP CONSTRAINT "conversion_events_tenant_id_fkey";

ALTER TABLE "office_desk"."debit_orders"
  DROP CONSTRAINT "debit_orders_family_account_id_fkey";

ALTER TABLE "office_desk"."debit_orders"
  DROP CONSTRAINT "debit_orders_invoice_id_fkey";

ALTER TABLE "office_desk"."debit_orders"
  DROP CONSTRAINT "debit_orders_package_id_fkey";

ALTER TABLE "office_desk"."debit_orders"
  DROP CONSTRAINT "debit_orders_student_id_fkey";

ALTER TABLE "office_desk"."debit_orders"
  DROP CONSTRAINT "debit_orders_tenant_id_fkey";

ALTER TABLE "office_desk"."desk_roles"
  DROP CONSTRAINT "desk_roles_registration_id_fkey";

ALTER TABLE "office_desk"."desk_roles"
  DROP CONSTRAINT "desk_roles_registration_id_name_key";

ALTER TABLE "office_desk"."email_template_usage"
  DROP CONSTRAINT "email_template_usage_template_id_fkey";

ALTER TABLE "office_desk"."email_template_usage"
  DROP CONSTRAINT "email_template_usage_tenant_id_fkey";

ALTER TABLE "office_desk"."email_templates"
  DROP CONSTRAINT "email_templates_created_by_fkey";

ALTER TABLE "office_desk"."email_templates"
  DROP CONSTRAINT "email_templates_tenant_id_fkey";

ALTER TABLE "office_desk"."failed_enrollments"
  DROP CONSTRAINT "failed_enrollments_resolved_by_fkey";

ALTER TABLE "office_desk"."failed_enrollments"
  DROP CONSTRAINT "failed_enrollments_tenant_id_fkey";

ALTER TABLE "office_desk"."family_accounts"
  DROP CONSTRAINT "family_accounts_tenant_id_fkey";

ALTER TABLE "office_desk"."family_activity"
  DROP CONSTRAINT "family_activity_debit_order_id_fkey";

ALTER TABLE "office_desk"."family_activity"
  DROP CONSTRAINT "family_activity_family_account_id_fkey";

ALTER TABLE "office_desk"."family_activity"
  DROP CONSTRAINT "family_activity_invoice_id_fkey";

ALTER TABLE "office_desk"."family_activity"
  DROP CONSTRAINT "family_activity_student_id_fkey";

ALTER TABLE "office_desk"."family_activity"
  DROP CONSTRAINT "family_activity_tenant_id_fkey";

ALTER TABLE "office_desk"."invoices"
  DROP CONSTRAINT "invoices_family_account_id_fkey";

ALTER TABLE "office_desk"."invoices"
  DROP CONSTRAINT "invoices_invoice_number_key";

ALTER TABLE "office_desk"."invoices"
  DROP CONSTRAINT "invoices_invoice_type_check";

ALTER TABLE "office_desk"."invoices"
  DROP CONSTRAINT "invoices_status_check";

ALTER TABLE "office_desk"."packages"
  DROP CONSTRAINT "packages_tenant_id_fkey";

ALTER TABLE "office_desk"."payments"
  DROP CONSTRAINT "payments_family_account_id_fkey";

ALTER TABLE "office_desk"."payments"
  DROP CONSTRAINT "payments_payment_type_check";

ALTER TABLE "office_desk"."refunds"
  DROP CONSTRAINT "refunds_registration_id_fkey";

ALTER TABLE "office_desk"."registrations"
  DROP CONSTRAINT "fk_reg_school_year";

ALTER TABLE "office_desk"."revenue_metrics"
  DROP CONSTRAINT "revenue_metrics_tenant_id_fkey";

ALTER TABLE "office_desk"."students"
  DROP CONSTRAINT "students_family_account_id_fkey";

ALTER TABLE "office_desk"."students"
  DROP CONSTRAINT "students_tenant_id_fkey";

ALTER TABLE "office_desk"."students"
  DROP CONSTRAINT "students_user_id_fkey";

ALTER TABLE "office_desk"."user_activity_log"
  DROP CONSTRAINT "user_activity_log_tenant_id_fkey";

ALTER TABLE "office_desk"."user_activity_log"
  DROP CONSTRAINT "user_activity_log_user_id_fkey";

ALTER TABLE "office_desk"."user_desk_roles"
  DROP CONSTRAINT "user_desk_roles_tenant_id_fkey";

ALTER TABLE "office_desk"."user_desk_roles"
  DROP CONSTRAINT "user_desk_roles_user_id_role_id_key";

ALTER TABLE "office_desk"."users"
  DROP CONSTRAINT "users_auth_user_id_fkey";

ALTER TABLE "office_desk"."users"
  DROP CONSTRAINT "users_family_account_id_fkey";

ALTER TABLE "office_desk"."users"
  DROP CONSTRAINT "users_tenant_id_fkey";

ALTER TABLE "office_desk"."webhook_events"
  DROP CONSTRAINT "webhook_events_tenant_id_fkey";

ALTER TABLE "office_desk"."webhook_events"
  DROP CONSTRAINT "webhook_events_webhook_id_fkey";

ALTER TABLE "office_desk"."webhook_notification_preferences"
  DROP CONSTRAINT "webhook_notification_preferences_tenant_id_fkey";

ALTER TABLE "office_desk"."webhooks"
  DROP CONSTRAINT "webhooks_created_by_fkey";

ALTER TABLE "office_desk"."webhooks"
  DROP CONSTRAINT "webhooks_tenant_id_fkey";

ALTER TABLE "public"."assessment_rubric_grades"
  DROP CONSTRAINT "assessment_rubric_grades_organization_id_fkey";

ALTER TABLE "public"."assessment_rubric_grades"
  DROP CONSTRAINT "assessment_rubric_grades_submission_id_fkey";

ALTER TABLE "public"."assessment_submissions"
  DROP CONSTRAINT "assessment_submissions_assessment_id_fkey";

ALTER TABLE "public"."assessment_submissions"
  DROP CONSTRAINT "assessment_submissions_enrollment_id_fkey";

ALTER TABLE "public"."assessment_submissions"
  DROP CONSTRAINT "assessment_submissions_graded_by_user_id_fkey";

ALTER TABLE "public"."assessment_submissions"
  DROP CONSTRAINT "assessment_submissions_organization_id_fkey";

ALTER TABLE "public"."assessment_submissions"
  DROP CONSTRAINT "assessment_submissions_student_id_fkey";

ALTER TABLE "public"."assessments"
  DROP CONSTRAINT "assessments_chapter_id_fkey";

ALTER TABLE "public"."assessments"
  DROP CONSTRAINT "assessments_course_id_fkey";

ALTER TABLE "public"."assessments"
  DROP CONSTRAINT "assessments_created_by_fkey";

ALTER TABLE "public"."assessments"
  DROP CONSTRAINT "assessments_organization_id_fkey";

ALTER TABLE "public"."attendance_audit_log"
  DROP CONSTRAINT "attendance_audit_log_changed_by_user_id_fkey";

ALTER TABLE "public"."attendance_audit_log"
  DROP CONSTRAINT "attendance_audit_log_organization_id_fkey";

ALTER TABLE "public"."attendance_audit_log"
  DROP CONSTRAINT "attendance_audit_log_student_attendance_id_fkey";

ALTER TABLE "public"."audit_log"
  DROP CONSTRAINT "audit_log_operation_check";

ALTER TABLE "public"."calendar"
  DROP CONSTRAINT "calendar_created_by_fkey";

ALTER TABLE "public"."calendar"
  DROP CONSTRAINT "calendar_organization_id_fkey";

ALTER TABLE "public"."calendar"
  DROP CONSTRAINT "calendar_updated_by_fkey";

ALTER TABLE "public"."calendar_sync_events"
  DROP CONSTRAINT "calendar_sync_events_calendar_id_fkey";

ALTER TABLE "public"."calendar_sync_events"
  DROP CONSTRAINT "calendar_sync_events_organization_id_fkey";

ALTER TABLE "public"."calendar_webhook_logs"
  DROP CONSTRAINT "calendar_webhook_logs_organization_id_fkey";

ALTER TABLE "public"."chapter_progress"
  DROP CONSTRAINT "chapter_progress_completion_percentage_check";

ALTER TABLE "public"."chapter_progress"
  DROP CONSTRAINT "chapter_progress_course_id_fkey";

ALTER TABLE "public"."chapter_progress"
  DROP CONSTRAINT "chapter_progress_enrollment_id_fkey";

ALTER TABLE "public"."chapter_progress"
  DROP CONSTRAINT "chapter_progress_organization_id_fkey";

ALTER TABLE "public"."chapter_progress"
  DROP CONSTRAINT "chapter_progress_status_check";

ALTER TABLE "public"."chapter_progress"
  DROP CONSTRAINT "chapter_progress_student_id_fkey";

ALTER TABLE "public"."chapter_progress"
  DROP CONSTRAINT "chapter_progress_time_spent_minutes_check";

ALTER TABLE "public"."chapter_progress"
  DROP CONSTRAINT "uq_enrollment_chapter";

ALTER TABLE "public"."class_sessions"
  DROP CONSTRAINT "class_sessions_calendar_sync_event_id_fkey";

ALTER TABLE "public"."class_sessions"
  DROP CONSTRAINT "class_sessions_course_id_fkey";

ALTER TABLE "public"."class_sessions"
  DROP CONSTRAINT "class_sessions_host_id_fkey";

ALTER TABLE "public"."class_sessions"
  DROP CONSTRAINT "class_sessions_meeting_link_id_fkey";

ALTER TABLE "public"."class_sessions"
  DROP CONSTRAINT "class_sessions_organization_id_fkey";

ALTER TABLE "public"."course_progress"
  DROP CONSTRAINT "course_progress_enrollment_id_fkey";

ALTER TABLE "public"."courses"
  DROP CONSTRAINT "courses_created_by_fkey";

ALTER TABLE "public"."courses"
  DROP CONSTRAINT "courses_organization_id_fkey";

ALTER TABLE "public"."courses"
  DROP CONSTRAINT "courses_updated_by_fkey";

ALTER TABLE "public"."debit_orders"
  DROP CONSTRAINT "debit_orders_invoice_id_fkey";

ALTER TABLE "public"."email_logs"
  DROP CONSTRAINT "email_logs_tenant_id_fkey";

ALTER TABLE "public"."meeting_links"
  DROP CONSTRAINT "meeting_links_calendar_sync_event_id_fkey";

ALTER TABLE "public"."notification_preferences"
  DROP CONSTRAINT "notification_preferences_class_notification_scope_check";

ALTER TABLE "public"."notifications"
  DROP CONSTRAINT "notifications_notification_type_id_fkey";

ALTER TABLE "public"."notifications"
  DROP CONSTRAINT "notifications_student_id_fkey";

ALTER TABLE "public"."notifications"
  DROP CONSTRAINT "notifications_type_check";

ALTER TABLE "public"."payments"
  DROP CONSTRAINT "payments_invoice_id_fkey";

ALTER TABLE "public"."payments"
  DROP CONSTRAINT "payments_payment_method_check";

ALTER TABLE "public"."profiles"
  DROP CONSTRAINT "profiles_role_check";

ALTER TABLE "public"."school_years"
  DROP CONSTRAINT "school_years_tenant_id_fkey";

ALTER TABLE "public"."slot_bookings"
  DROP CONSTRAINT "slot_bookings_booked_by_fkey";

ALTER TABLE "public"."slot_bookings"
  DROP CONSTRAINT "slot_bookings_calendar_id_fkey";

ALTER TABLE "public"."slot_bookings"
  DROP CONSTRAINT "slot_bookings_cancelled_by_fkey";

ALTER TABLE "public"."slot_bookings"
  DROP CONSTRAINT "slot_bookings_student_id_fkey";

ALTER TABLE "public"."student_attendance"
  DROP CONSTRAINT "student_attendance_class_session_id_fkey";

ALTER TABLE "public"."student_attendance"
  DROP CONSTRAINT "student_attendance_enrollment_id_fkey";

ALTER TABLE "public"."student_attendance"
  DROP CONSTRAINT "student_attendance_marked_by_user_id_fkey";

ALTER TABLE "public"."student_attendance"
  DROP CONSTRAINT "student_attendance_organization_id_fkey";

ALTER TABLE "public"."student_attendance"
  DROP CONSTRAINT "student_attendance_student_id_fkey";

ALTER TABLE "public"."student_enrollments"
  DROP CONSTRAINT "student_enrollments_course_id_fkey";

ALTER TABLE "public"."student_enrollments"
  DROP CONSTRAINT "student_enrollments_enrolled_by_fkey";

ALTER TABLE "public"."student_enrollments"
  DROP CONSTRAINT "student_enrollments_student_id_fkey";

ALTER TABLE "public"."user_2fa"
  DROP CONSTRAINT "user_2fa_tenant_id_fkey";

ALTER TABLE "public"."user_2fa"
  DROP CONSTRAINT "user_2fa_user_id_fkey";

ALTER TABLE "public"."users"
  DROP CONSTRAINT "users_created_by_fkey";

ALTER TABLE "public"."users"
  DROP CONSTRAINT "users_id_fkey";

ALTER TABLE "public"."users"
  DROP CONSTRAINT "users_organization_id_fkey";

ALTER TABLE "public"."users"
  DROP CONSTRAINT "users_parent_id_fkey";

ALTER TABLE "public"."users"
  DROP CONSTRAINT "users_student_id_fkey";

ALTER TABLE "public"."users"
  DROP CONSTRAINT "users_updated_by_fkey";

ALTER TABLE "school_desk"."course_schedule"
  DROP CONSTRAINT "course_schedule_course_id_fkey";

ALTER TABLE "school_desk"."courses"
  DROP CONSTRAINT "courses_capacity_check";

DROP FUNCTION "office_desk"."calculate_daily_metrics"(uuid, date);

DROP FUNCTION "office_desk"."fire_webhook_event"(uuid, text, jsonb);

DROP FUNCTION "office_desk"."log_user_activity"(uuid, uuid, text, text, text, text, text, jsonb);

DROP FUNCTION "office_desk"."record_conversion"(uuid, uuid, text, text, text, numeric, jsonb);

DROP FUNCTION "office_desk"."retry_webhook_events"(integer);

DROP FUNCTION "office_desk"."undo_bulk_operation"(uuid);

DROP FUNCTION "office_desk"."verify_webhook_signature"(text, text, text);

DROP FUNCTION "public"."cancel_calendar_event"(uuid, text);

DROP FUNCTION "public"."check_booking_conflict"(uuid, date, time WITHOUT time zone, integer);

DROP FUNCTION "public"."create_payment"(uuid, numeric, text);

DROP FUNCTION "public"."create_paypal_payment_intent"(uuid, uuid, numeric);

DROP FUNCTION "public"."create_stripe_payment_intent"(uuid, uuid, numeric);

DROP FUNCTION "public"."end_class_session"(uuid, text);

DROP FUNCTION "public"."enroll_student"(text, text, uuid);

DROP FUNCTION "public"."enroll_student_in_course"(uuid, uuid, uuid);

DROP FUNCTION "public"."fn_debit_order_scheduled"();

DROP FUNCTION "public"."fn_payment_status_change"();

DROP FUNCTION "public"."fn_student_enrollment_activated"();

DROP FUNCTION "public"."generate_calendar_slots"(uuid, text, integer, date, time WITHOUT time zone, integer, integer);

DROP FUNCTION "public"."generate_course_report"(uuid);

DROP FUNCTION "public"."generate_invoice"(uuid, numeric, date);

DROP FUNCTION "public"."generate_meeting_link"(uuid, text, text, text[]);

DROP FUNCTION "public"."get_assessment_grades_report"(uuid, uuid);

DROP FUNCTION "public"."get_available_slots"(uuid, text, date, date);

DROP FUNCTION "public"."get_course_attendance_summary"(uuid);

DROP FUNCTION "public"."get_or_create_notification_preferences"(uuid);

DROP FUNCTION "public"."get_org_calendar_events"(uuid, timestamp WITH time zone, timestamp WITH time zone);

DROP FUNCTION "public"."get_student_attendance_report"(uuid);

DROP FUNCTION "public"."get_student_progress"(uuid);

DROP FUNCTION "public"."get_student_progress_report"(uuid);

DROP FUNCTION "public"."grade_assessment"(uuid, integer, uuid, text);

DROP FUNCTION "public"."handle_auth_user_created"();

DROP FUNCTION "public"."handle_payment_webhook"(text, text, jsonb);

DROP FUNCTION "public"."increment_invoice_retry"(uuid);

DROP FUNCTION "public"."jwt_role"();

DROP FUNCTION "public"."mark_student_attendance"(uuid, uuid, text, text, uuid);

DROP FUNCTION "public"."process_webhook_safe"(text, text, text, text, jsonb);

DROP FUNCTION "public"."set_notification_preferences_updated_at"();

DROP FUNCTION "public"."start_class_session"(uuid);

DROP FUNCTION "public"."submit_assessment"(uuid, uuid, jsonb, jsonb);

DROP FUNCTION "public"."sync_calendar_event"(uuid, uuid, text, text, text, timestamp WITH time zone, timestamp WITH time zone, text, text, jsonb, text, timestamp WITH time zone);

DROP FUNCTION "public"."update_chapter_progress"(uuid, uuid, integer, text, integer);

DROP FUNCTION "public"."verify_webhook_signature"(text, text, text, text);

DROP FUNCTION "public"."withdraw_student_from_course"(uuid, uuid, text);

ALTER TABLE "office_desk"."desk_roles"
  DROP COLUMN "registration_id";

ALTER TABLE "office_desk"."invoices"
  DROP COLUMN "family_account_id";

ALTER TABLE "office_desk"."invoices"
  DROP COLUMN "invoice_type";

ALTER TABLE "office_desk"."invoices"
  DROP COLUMN "issued_date";

ALTER TABLE "office_desk"."invoices"
  DROP COLUMN "paid_date";

ALTER TABLE "office_desk"."invoices"
  DROP COLUMN "service_provider_invoice_url";

ALTER TABLE "office_desk"."payments"
  DROP COLUMN "bank_confirmation";

ALTER TABLE "office_desk"."payments"
  DROP COLUMN "family_account_id";

ALTER TABLE "office_desk"."payments"
  DROP COLUMN "payment_date";

ALTER TABLE "office_desk"."payments"
  DROP COLUMN "payment_type";

ALTER TABLE "office_desk"."payments"
  DROP COLUMN "reference_code";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "course_id";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "financial_status";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "internal_notes_lower";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "internal_notes";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "parent_email";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "parent_first_name";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "parent_last_name";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "parent_phone";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "payment_status";

DROP TYPE "office_desk"."registration_payment_status";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "reg_status";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "school_year_id";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "source";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "student_dob";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "student_first_name";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "student_last_name";

ALTER TABLE "office_desk"."registrations"
  DROP COLUMN "teacher_preference";

ALTER TABLE "office_desk"."user_desk_roles"
  DROP COLUMN "created_at";

ALTER TABLE "office_desk"."user_desk_roles"
  DROP COLUMN "tenant_id";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "completion_percentage";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "course_id";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "created_at";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "enrollment_id";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "notes";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "organization_id";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "resource_completion_count";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "started_at";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "status";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "time_spent_minutes";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "total_resources";

ALTER TABLE "public"."chapter_progress"
  DROP COLUMN "updated_at";

ALTER TABLE "public"."ef_call_log"
  DROP COLUMN "error_msg";

ALTER TABLE "public"."ef_call_log"
  DROP COLUMN "replay_check_passed";

ALTER TABLE "public"."ef_call_log"
  DROP COLUMN "request_hash";

ALTER TABLE "public"."ef_call_log"
  DROP COLUMN "signature_valid";

ALTER TABLE "public"."notification_preferences"
  DROP COLUMN "class_ids";

ALTER TABLE "public"."notification_preferences"
  DROP COLUMN "class_notification_scope";

ALTER TABLE "public"."notification_preferences"
  DROP COLUMN "clubs_enabled";

ALTER TABLE "public"."notification_preferences"
  DROP COLUMN "core_curriculum_enabled";

ALTER TABLE "public"."notification_preferences"
  DROP COLUMN "email_enabled";

ALTER TABLE "public"."notification_preferences"
  DROP COLUMN "hub_event_types";

ALTER TABLE "public"."notification_preferences"
  DROP COLUMN "in_app_enabled";

ALTER TABLE "public"."notification_preferences"
  DROP COLUMN "news_categories";

ALTER TABLE "public"."notification_preferences"
  DROP COLUMN "push_enabled";

ALTER TABLE "public"."notification_preferences"
  DROP COLUMN "sms_enabled";

ALTER TABLE "public"."payments"
  DROP COLUMN "invoice_id";

ALTER TABLE "public"."payments"
  DROP COLUMN "paid_date";

ALTER TABLE "public"."payments"
  DROP COLUMN "payment_method";

ALTER TABLE "public"."payments"
  DROP COLUMN "paypal_transaction_id";

ALTER TABLE "public"."student_class"
  DROP COLUMN "course_id";

ALTER TABLE "public"."student_class"
  DROP COLUMN "registration_id";

ALTER TABLE "public"."student_class"
  DROP COLUMN "status";

ALTER TABLE "school_desk"."courses"
  DROP COLUMN "capacity";

DROP TABLE "office_desk"."activity_log";

DROP TABLE "office_desk"."add_on_payments";

DROP TABLE "office_desk"."bulk_operation_history";

DROP TABLE "office_desk"."conversion_events";

DROP TABLE "office_desk"."debit_orders";

DROP TABLE "office_desk"."email_logs";

DROP TABLE "office_desk"."email_template_usage";

DROP TABLE "office_desk"."email_templates";

DROP FUNCTION "office_desk"."update_email_template_timestamp"();

DROP TABLE "office_desk"."failed_enrollments";

DROP TABLE "office_desk"."family_accounts";

DROP TABLE "office_desk"."family_activity";

DROP TABLE "office_desk"."packages";

DROP TABLE "office_desk"."refunds";

DROP TABLE "office_desk"."revenue_metrics";

DROP FUNCTION "office_desk"."update_analytics_timestamp"();

DROP TABLE "office_desk"."stripe_events";

DROP TABLE "office_desk"."students";

DROP TABLE "office_desk"."user_activity_log";

DROP TABLE "office_desk"."users";

DROP FUNCTION "office_desk"."set_updated_at"();

DROP FUNCTION "office_desk"."validate_family_account"();

DROP TABLE "office_desk"."webhook_events";

DROP TABLE "office_desk"."webhook_notification_preferences";

DROP TABLE "office_desk"."webhooks";

DROP FUNCTION "office_desk"."update_webhook_timestamp"();

DROP TABLE "public"."assessment_rubric_grades";

DROP TABLE "public"."assessment_submissions";

DROP FUNCTION "public"."update_course_average_on_grade"();

DROP TABLE "public"."assessments";

DROP TABLE "public"."attendance_audit_log";

DROP TABLE "public"."calendar_sync_events";

DROP FUNCTION "public"."on_sync_event_created"();

DROP TABLE "public"."calendar_webhook_logs";

DROP TABLE "public"."calendar";

DROP TABLE "public"."class_sessions";

DROP TABLE "public"."course_progress";

DROP FUNCTION "public"."update_progress_percentage"();

DROP TABLE "public"."courses";

DROP TABLE "public"."email_logs";

DROP TABLE "public"."meeting_links";

DROP FUNCTION "public"."on_meeting_link_created"();

DROP TABLE "public"."payment_webhooks";

DROP TABLE "public"."school_years";

DROP TABLE "public"."slot_bookings";

DROP FUNCTION "public"."on_slot_booking_cancelled"();

DROP FUNCTION "public"."on_slot_booking_created"();

DROP TABLE "public"."student_attendance";

DROP FUNCTION "public"."log_attendance_change"();

DROP TABLE "public"."student_enrollments";

DROP FUNCTION "public"."on_enrollment_created"();

DROP TABLE "public"."system_log";

DROP TABLE "public"."user_2fa";

DROP FUNCTION "public"."update_user_2fa_timestamp"();

DROP TABLE "public"."users";

DROP FUNCTION "public"."handle_role_change_notify"();

DROP FUNCTION "public"."handle_users_updated_at"();

DROP TABLE "school_desk"."course_schedule";

DROP FUNCTION "school_desk"."set_course_schedule_updated_at"();

CREATE SCHEMA "postgrest";

CREATE TABLE "office_desk"."desk_invites" (
  "id"          uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "desk_id"     uuid                     NOT NULL,
  "tenant_id"   uuid                     NOT NULL,
  "role_id"     uuid                     NOT NULL,
  "email"       text                     NOT NULL,
  "invited_by"  uuid                     NOT NULL,
  "token"       text                     NOT NULL,
  "status"      text                     NOT NULL DEFAULT 'pending'::text,
  "expires_at"  timestamp with time zone NOT NULL,
  "accepted_at" timestamp with time zone,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "desk_invites_pkey" PRIMARY KEY (id),
  CONSTRAINT "desk_invites_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'expired'::text, 'revoked'::text]))),
  CONSTRAINT "desk_invites_token_key" UNIQUE (token)
);

ALTER TABLE "office_desk"."desk_invites"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "office_desk"."permission_audit_log" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "desk_id"        uuid                     NOT NULL,
  "tenant_id"      uuid                     NOT NULL,
  "actor_id"       uuid                     NOT NULL,
  "action"         text                     NOT NULL,
  "target_user_id" uuid,
  "target_role_id" uuid,
  "details"        jsonb,
  "created_at"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "permission_audit_log_pkey" PRIMARY KEY (id)
);

ALTER TABLE "office_desk"."permission_audit_log"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "office_desk"."permissions"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "office_desk"."role_permissions"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "office_desk"."user_desk_roles"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."chapter_progress"
  REPLICA IDENTITY FULL;

ALTER TABLE "public"."notification_types"
  DISABLE ROW LEVEL SECURITY;

CREATE TABLE "school_desk"."__reload_trigger" (
  "id" integer NOT NULL,
  CONSTRAINT "__reload_trigger_pkey" PRIMARY KEY (id)
);

ALTER TABLE "office_desk"."desk_roles"
  ADD COLUMN "desk_id" uuid NOT NULL;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "issued_at" timestamp WITH time zone;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "deleted_at" timestamp WITH time zone;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "lead_id" uuid;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "amount_paid" numeric(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "stripe_payment_intent_id" text;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "stripe_charge_id" text;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "stripe_error_message" text;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "paypal_order_id" text;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "paypal_capture_id" text;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "paypal_error_message" text;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "payment_processor" text;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "payment_method" text;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "paid_at" timestamp WITH time zone;

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "version_id" uuid DEFAULT gen_random_uuid();

ALTER TABLE "office_desk"."invoices"
  ADD COLUMN "updated_by" uuid;

ALTER TABLE "office_desk"."payments"
  ADD COLUMN "invoice_id" uuid;

ALTER TABLE "office_desk"."payments"
  ADD COLUMN "payment_method" text;

ALTER TABLE "office_desk"."payments"
  ADD COLUMN "reference" text;

ALTER TABLE "office_desk"."payments"
  ADD COLUMN "paid_at" timestamp WITH time zone;

ALTER TABLE "office_desk"."payments"
  ADD COLUMN "deleted_at" timestamp WITH time zone;

ALTER TABLE "office_desk"."permissions"
  ADD COLUMN "name" text NOT NULL;

ALTER TABLE "office_desk"."permissions"
  ADD COLUMN "category" text NOT NULL DEFAULT 'general'::text;

ALTER TABLE "office_desk"."user_desk_roles"
  ADD COLUMN "desk_id" uuid NOT NULL;

ALTER TABLE "office_desk"."user_desk_roles"
  ADD COLUMN "assigned_by" uuid;

ALTER TABLE "office_desk"."user_desk_roles"
  ADD COLUMN "assigned_at" timestamp WITH time zone NOT NULL DEFAULT now();

ALTER TABLE "public"."notification_preferences"
  ADD COLUMN "notification_type_id" text NOT NULL;

ALTER TABLE "public"."notification_preferences"
  ADD COLUMN "email" boolean DEFAULT true;

ALTER TABLE "public"."notification_preferences"
  ADD COLUMN "sms" boolean DEFAULT false;

ALTER TABLE "public"."notification_preferences"
  ADD COLUMN "in_app" boolean DEFAULT true;

ALTER TABLE "public"."notifications"
  ADD COLUMN "subject" text;

ALTER TABLE "office_desk"."invoices"
  ALTER COLUMN "amount" DROP DEFAULT;

ALTER TABLE "office_desk"."invoices"
  ALTER COLUMN "amount" TYPE numeric(12,2) USING "amount"::numeric(12,2);

ALTER TABLE "office_desk"."invoices"
  ALTER COLUMN "due_date" DROP DEFAULT;

ALTER TABLE "office_desk"."invoices"
  ALTER COLUMN "due_date" TYPE timestamp WITH time zone USING "due_date"::timestamp WITH time zone;

ALTER TABLE "office_desk"."invoices"
  ALTER COLUMN "invoice_number" DROP NOT NULL;

ALTER TABLE "office_desk"."payments"
  ALTER COLUMN "amount" DROP DEFAULT;

ALTER TABLE "office_desk"."payments"
  ALTER COLUMN "amount" TYPE numeric(12,2) USING "amount"::numeric(12,2);

ALTER TABLE "public"."chapter_progress"
  ALTER COLUMN "completed_at" SET NOT NULL;

ALTER TABLE "public"."notification_preferences"
  ALTER COLUMN "created_at" DROP NOT NULL;

ALTER TABLE "public"."notification_preferences"
  ALTER COLUMN "created_at" DROP DEFAULT;

ALTER TABLE "public"."notification_preferences"
  ALTER COLUMN "created_at" TYPE timestamp WITHOUT time zone USING "created_at"::timestamp WITHOUT time zone;

ALTER TABLE "public"."notification_preferences"
  ALTER COLUMN "created_at" SET DEFAULT now();

ALTER TABLE "public"."notification_preferences"
  ALTER COLUMN "updated_at" DROP NOT NULL;

ALTER TABLE "public"."notification_preferences"
  ALTER COLUMN "updated_at" DROP DEFAULT;

ALTER TABLE "public"."notification_preferences"
  ALTER COLUMN "updated_at" TYPE timestamp WITHOUT time zone USING "updated_at"::timestamp WITHOUT time zone;

ALTER TABLE "public"."notification_preferences"
  ALTER COLUMN "updated_at" SET DEFAULT now();

ALTER TABLE "public"."chapter_progress"
  ALTER COLUMN "completed_at" SET DEFAULT now();

CREATE OR REPLACE FUNCTION office_desk.create_default_roles (
  p_desk_id   uuid,
  p_tenant_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
DECLARE
  v_admin_role_id uuid;
  v_manager_role_id uuid;
  v_agent_role_id uuid;
  v_viewer_role_id uuid;
BEGIN
  -- Admin role
  INSERT INTO office_desk.desk_roles (desk_id, tenant_id, name, description, is_system)
  VALUES (p_desk_id, p_tenant_id, 'admin', 'Full access to all features', true)
  RETURNING id INTO v_admin_role_id;

  -- Manager role
  INSERT INTO office_desk.desk_roles (desk_id, tenant_id, name, description, is_system)
  VALUES (p_desk_id, p_tenant_id, 'manager', 'Manage team and most features', true)
  RETURNING id INTO v_manager_role_id;

  -- Agent role
  INSERT INTO office_desk.desk_roles (desk_id, tenant_id, name, description, is_system)
  VALUES (p_desk_id, p_tenant_id, 'agent', 'Day-to-day desk operations', true)
  RETURNING id INTO v_agent_role_id;

  -- Viewer role
  INSERT INTO office_desk.desk_roles (desk_id, tenant_id, name, description, is_system)
  VALUES (p_desk_id, p_tenant_id, 'viewer', 'Read-only access', true)
  RETURNING id INTO v_viewer_role_id;

  -- Assign all permissions to admin
  INSERT INTO office_desk.role_permissions (role_id, permission_id)
  SELECT v_admin_role_id, id FROM office_desk.permissions;

  -- Manager permissions (everything except settings.billing and team.edit_roles)
  INSERT INTO office_desk.role_permissions (role_id, permission_id)
  SELECT v_manager_role_id, id FROM office_desk.permissions
  WHERE code NOT IN ('settings.billing', 'team.edit_roles');

  -- Agent permissions (contacts, leads, invoices, reports)
  INSERT INTO office_desk.role_permissions (role_id, permission_id)
  SELECT v_agent_role_id, id FROM office_desk.permissions
  WHERE category IN ('contacts', 'leads', 'invoices', 'reports')
     OR code IN ('team.view');

  -- Viewer permissions (view only)
  INSERT INTO office_desk.role_permissions (role_id, permission_id)
  SELECT v_viewer_role_id, id FROM office_desk.permissions
  WHERE code LIKE '%.view' OR code = 'team.view';
END;
$function$;

CREATE OR REPLACE FUNCTION office_desk.get_user_desk_permissions (
  p_user_id uuid,
  p_desk_id uuid
)
  RETURNS TABLE (
    permission_code text
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  AS $function$
BEGIN
  RETURN QUERY
  SELECT DISTINCT p.code
  FROM office_desk.user_desk_roles udr
  JOIN office_desk.role_permissions rp ON rp.role_id = udr.role_id
  JOIN office_desk.permissions p ON p.id = rp.permission_id
  WHERE udr.user_id = p_user_id AND udr.desk_id = p_desk_id;
END;
$function$;

CREATE OR REPLACE FUNCTION office_desk.get_user_desk_role (
  p_user_id uuid,
  p_desk_id uuid
)
  RETURNS TABLE (
    role_name text,
    role_id   uuid
  )
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  AS $function$
BEGIN
  RETURN QUERY
  SELECT dr.name, dr.id
  FROM office_desk.user_desk_roles udr
  JOIN office_desk.desk_roles dr ON dr.id = udr.role_id
  WHERE udr.user_id = p_user_id AND udr.desk_id = p_desk_id;
END;
$function$;

CREATE OR REPLACE FUNCTION office_desk.handle_new_desk_roles()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  PERFORM office_desk.create_default_roles(NEW.id, NEW.tenant_id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION office_desk.log_role_change()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO office_desk.permission_audit_log (desk_id, tenant_id, actor_id, action, target_user_id, target_role_id, details)
    VALUES (
      NEW.desk_id,
      (SELECT tenant_id FROM office_desk.office_desk WHERE id = NEW.desk_id),
      COALESCE(NEW.assigned_by, auth.uid()),
      'role_assigned',
      NEW.user_id,
      NEW.role_id,
      jsonb_build_object('assigned_at', NEW.assigned_at)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO office_desk.permission_audit_log (desk_id, tenant_id, actor_id, action, target_user_id, target_role_id, details)
    VALUES (
      OLD.desk_id,
      (SELECT tenant_id FROM office_desk.office_desk WHERE id = OLD.desk_id),
      auth.uid(),
      'role_removed',
      OLD.user_id,
      OLD.role_id,
      jsonb_build_object('removed_at', now())
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.role_id IS DISTINCT FROM NEW.role_id THEN
    INSERT INTO office_desk.permission_audit_log (desk_id, tenant_id, actor_id, action, target_user_id, target_role_id, details)
    VALUES (
      NEW.desk_id,
      (SELECT tenant_id FROM office_desk.office_desk WHERE id = NEW.desk_id),
      COALESCE(NEW.assigned_by, auth.uid()),
      'role_changed',
      NEW.user_id,
      NEW.role_id,
      jsonb_build_object('old_role_id', OLD.role_id, 'new_role_id', NEW.role_id)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;

CREATE OR REPLACE FUNCTION office_desk.user_has_permission (
  p_user_id         uuid,
  p_desk_id         uuid,
  p_permission_code text
)
  RETURNS boolean
  LANGUAGE plpgsql
  STABLE
  SECURITY DEFINER
  AS $function$
DECLARE
  v_has_permission boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM office_desk.user_desk_roles udr
    JOIN office_desk.role_permissions rp ON rp.role_id = udr.role_id
    JOIN office_desk.permissions p ON p.id = rp.permission_id
    WHERE udr.user_id = p_user_id
      AND udr.desk_id = p_desk_id
      AND p.code = p_permission_code
  ) INTO v_has_permission;

  RETURN v_has_permission;
END;
$function$;

CREATE OR REPLACE FUNCTION postgrest.pre_config()
  RETURNS void
  LANGUAGE plpgsql
  AS $function$ BEGIN PERFORM set_config('pgrst.db_schemas', 'public,graphql_public,school_desk,front_desk,office_desk', true); END; $function$;

CREATE OR REPLACE FUNCTION public.jwt_tenant_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SET search_path TO 'public'
  AS $function$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::uuid;
$function$;

CREATE OR REPLACE FUNCTION public.seed_profile_tenant (
  p_user_id   uuid,
  p_tenant_id uuid
)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $function$ BEGIN PERFORM set_config('app.tenant_assignment_bypass', 'true', true); UPDATE public.profiles SET tenant_id = p_tenant_id WHERE id = p_user_id; END; $function$;

ALTER TABLE "office_desk"."desk_invites"
  ADD CONSTRAINT "desk_invites_desk_id_fkey" FOREIGN KEY (desk_id) REFERENCES office_desk.office_desk(id) ON DELETE CASCADE;

ALTER TABLE "office_desk"."desk_invites"
  ADD CONSTRAINT "desk_invites_invited_by_fkey" FOREIGN KEY (invited_by) REFERENCES auth.users(id);

ALTER TABLE "office_desk"."desk_invites"
  ADD CONSTRAINT "desk_invites_role_id_fkey" FOREIGN KEY (role_id) REFERENCES office_desk.desk_roles(id) ON DELETE CASCADE;

ALTER TABLE "office_desk"."desk_invites"
  ADD CONSTRAINT "desk_invites_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenant_lms(id) ON DELETE CASCADE;

ALTER TABLE "office_desk"."desk_roles"
  ADD CONSTRAINT "desk_roles_desk_id_fkey" FOREIGN KEY (desk_id) REFERENCES office_desk.office_desk(id) ON DELETE CASCADE;

ALTER TABLE "office_desk"."desk_roles"
  ADD CONSTRAINT "desk_roles_desk_id_name_key" UNIQUE (desk_id, name);

ALTER TABLE "office_desk"."invoice_items"
  ADD CONSTRAINT "invoice_items_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES office_desk.invoices(id) ON DELETE CASCADE;

ALTER TABLE "office_desk"."invoices"
  ADD CONSTRAINT "invoices_lead_id_fkey" FOREIGN KEY (lead_id) REFERENCES front_desk.leads(id);

ALTER TABLE "office_desk"."invoices"
  ADD CONSTRAINT "invoices_payment_method_check" CHECK ((payment_method = ANY (ARRAY['card'::text, 'ach'::text, 'paypal'::text])));

ALTER TABLE "office_desk"."invoices"
  ADD CONSTRAINT "invoices_payment_processor_check" CHECK ((payment_processor = ANY (ARRAY['stripe'::text, 'paypal'::text])));

ALTER TABLE "office_desk"."invoices"
  ADD CONSTRAINT "invoices_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'sent'::text, 'paid'::text, 'overdue'::text, 'cancelled'::text, 'void'::text, 'issued'::text])));

ALTER TABLE "office_desk"."invoices"
  ADD CONSTRAINT "invoices_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE "office_desk"."payments"
  ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES office_desk.invoices(id);

ALTER TABLE "office_desk"."permission_audit_log"
  ADD CONSTRAINT "permission_audit_log_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id);

ALTER TABLE "office_desk"."permission_audit_log"
  ADD CONSTRAINT "permission_audit_log_desk_id_fkey" FOREIGN KEY (desk_id) REFERENCES office_desk.office_desk(id) ON DELETE CASCADE;

ALTER TABLE "office_desk"."permission_audit_log"
  ADD CONSTRAINT "permission_audit_log_target_role_id_fkey" FOREIGN KEY (target_role_id) REFERENCES office_desk.desk_roles(id);

ALTER TABLE "office_desk"."permission_audit_log"
  ADD CONSTRAINT "permission_audit_log_target_user_id_fkey" FOREIGN KEY (target_user_id) REFERENCES auth.users(id);

ALTER TABLE "office_desk"."permission_audit_log"
  ADD CONSTRAINT "permission_audit_log_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenant_lms(id) ON DELETE CASCADE;

ALTER TABLE "office_desk"."user_desk_roles"
  ADD CONSTRAINT "user_desk_roles_assigned_by_fkey" FOREIGN KEY (assigned_by) REFERENCES auth.users(id);

ALTER TABLE "office_desk"."user_desk_roles"
  ADD CONSTRAINT "user_desk_roles_desk_id_fkey" FOREIGN KEY (desk_id) REFERENCES office_desk.office_desk(id) ON DELETE CASCADE;

ALTER TABLE "office_desk"."user_desk_roles"
  ADD CONSTRAINT "user_desk_roles_user_id_desk_id_key" UNIQUE (user_id, desk_id);

ALTER TABLE "public"."audit_log"
  ADD CONSTRAINT "audit_log_operation_check" CHECK ((operation = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])));

ALTER TABLE "public"."chapter_progress"
  ADD CONSTRAINT "chapter_progress_student_id_chapter_id_key" UNIQUE (student_id, chapter_id);

ALTER TABLE "public"."chapter_progress"
  ADD CONSTRAINT "chapter_progress_student_id_fkey" FOREIGN KEY (student_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE "public"."notification_preferences"
  ADD CONSTRAINT "notification_preferences_notification_type_id_fkey" FOREIGN KEY (notification_type_id) REFERENCES public.notification_types(id);

ALTER TABLE "public"."notifications"
  ADD CONSTRAINT "notifications_type_check"
    CHECK
    ((type = ANY (ARRAY['announcement'::text, 'enrolment'::text, 'schedule'::text, 'system'::text, 'mention'::text, 'registration_approved'::text, 'grade_posted'::text,
    'attendance_logged'::text, 'message_received'::text])));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_role_check"
    CHECK
    ((role = ANY (ARRAY['student'::text, 'outside_student'::text, 'family'::text, 'alumni'::text, 'teacher'::text, 'expert'::text, 'guest'::text, 'admin'::text, 'learner'::text,
    'office'::text, 'front_desk'::text])));

ALTER TABLE "public"."profiles"
  ADD CONSTRAINT "profiles_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES public.tenant_devotional(id);

CREATE INDEX idx_desk_invites_desk_id ON office_desk.desk_invites USING btree (desk_id);

CREATE INDEX idx_desk_invites_email ON office_desk.desk_invites USING btree (email);

CREATE INDEX idx_desk_invites_status ON office_desk.desk_invites USING btree (status);

CREATE INDEX idx_desk_invites_token ON office_desk.desk_invites USING btree (token);

CREATE INDEX idx_desk_roles_desk_id ON office_desk.desk_roles USING btree (desk_id);

CREATE INDEX idx_desk_roles_tenant_id ON office_desk.desk_roles USING btree (tenant_id);

CREATE INDEX idx_invoices_description_fts ON office_desk.invoices USING gin (to_tsvector('english'::regconfig, COALESCE(description, ''::text)));

CREATE INDEX idx_invoices_lead ON office_desk.invoices USING btree (lead_id);

CREATE INDEX idx_invoices_number_fts ON office_desk.invoices USING gin (to_tsvector('english'::regconfig, COALESCE(invoice_number, ''::text)));

CREATE INDEX idx_invoices_paid_at ON office_desk.invoices USING btree (paid_at)
  WHERE (paid_at IS NOT NULL);

CREATE INDEX idx_invoices_paypal_order ON office_desk.invoices USING btree (paypal_order_id)
  WHERE (paypal_order_id IS NOT NULL);


CREATE INDEX idx_invoices_status ON office_desk.invoices USING btree (status);

CREATE INDEX idx_invoices_stripe_payment_intent ON office_desk.invoices USING btree (stripe_payment_intent_id)
  WHERE (stripe_payment_intent_id IS NOT NULL);

CREATE INDEX idx_invoices_tenant ON office_desk.invoices USING btree (tenant_id);

CREATE INDEX idx_invoices_version_id ON office_desk.invoices USING btree (version_id);

CREATE INDEX idx_payments_invoice ON office_desk.payments USING btree (invoice_id);

CREATE INDEX idx_payments_status ON office_desk.payments USING btree (status);

CREATE INDEX idx_payments_tenant ON office_desk.payments USING btree (tenant_id);

CREATE INDEX idx_permission_audit_log_created_at ON office_desk.permission_audit_log USING btree (created_at DESC);

CREATE INDEX idx_permission_audit_log_desk_id ON office_desk.permission_audit_log USING btree (desk_id);

CREATE INDEX idx_role_permissions_role_id ON office_desk.role_permissions USING btree (role_id);

CREATE INDEX idx_user_desk_roles_desk_id ON office_desk.user_desk_roles USING btree (desk_id);

CREATE INDEX idx_user_desk_roles_role_id ON office_desk.user_desk_roles USING btree (role_id);

CREATE INDEX idx_user_desk_roles_user_id ON office_desk.user_desk_roles USING btree (user_id);

CREATE INDEX idx_chapter_progress_chapter ON public.chapter_progress USING btree (chapter_id);

CREATE INDEX idx_chapter_progress_student ON public.chapter_progress USING btree (student_id);

CREATE INDEX idx_notification_preferences_student_id ON public.notification_preferences USING btree (student_id);

CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON office_desk.invoices
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.update_invoices_timestamp();

CREATE TRIGGER trg_new_desk_roles
  AFTER INSERT ON office_desk.office_desk
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.handle_new_desk_roles();

CREATE TRIGGER trg_role_change_log
  AFTER INSERT OR DELETE OR UPDATE ON office_desk.user_desk_roles
  FOR EACH ROW
  EXECUTE FUNCTION office_desk.log_role_change();

CREATE TRIGGER trg_chapter_progress_delete_guard
  BEFORE DELETE ON public.chapter_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_chapter_progress_delete_allowed();

CREATE TRIGGER trg_chapter_progress_sequence
  BEFORE INSERT ON public.chapter_progress
  FOR EACH ROW
  EXECUTE FUNCTION public.check_chapter_sequence_completion();

CREATE POLICY "leads_office_select" ON "front_desk"."leads"
  FOR SELECT
  TO "authenticated"
  USING (((tenant_id = (((auth.jwt() -> 'app_metadata'::text) ->> 'tenant_id'::text))::uuid) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'office'::text)))) AND (archived_at IS NULL)));

CREATE POLICY "desk_invites_insert" ON "office_desk"."desk_invites"
  FOR INSERT
  TO PUBLIC
  WITH
    CHECK
    ((office_desk.user_has_permission(auth.uid(), desk_id, 'team.invite'::text) AND (invited_by = auth.uid()) AND (tenant_id = ( SELECT ((auth.jwt() ->> 'tenant_id'::text))::uuid
    AS uuid))));

CREATE POLICY "desk_invites_select" ON "office_desk"."desk_invites"
  FOR SELECT
  TO PUBLIC
  USING (((desk_id IN ( SELECT ud.desk_id
   FROM office_desk.user_desks ud
  WHERE (ud.user_id = auth.uid()))) AND (tenant_id = ( SELECT ((auth.jwt() ->> 'tenant_id'::text))::uuid AS uuid))));

CREATE POLICY "desk_invites_update" ON "office_desk"."desk_invites"
  FOR UPDATE
  TO PUBLIC
  USING ((desk_id IN ( SELECT ud.desk_id
   FROM office_desk.user_desks ud
  WHERE (ud.user_id = auth.uid()))));

CREATE POLICY "desk_roles_insert" ON "office_desk"."desk_roles"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((desk_id IN ( SELECT udr.desk_id
   FROM (office_desk.user_desk_roles udr
     JOIN office_desk.desk_roles dr ON ((dr.id = udr.role_id)))
  WHERE ((udr.user_id = auth.uid()) AND (dr.name = ANY (ARRAY['admin'::text, 'manager'::text]))))) AND (tenant_id = ( SELECT ((auth.jwt() ->> 'tenant_id'::text))::uuid AS uuid))));

CREATE POLICY "desk_roles_select" ON "office_desk"."desk_roles"
  FOR SELECT
  TO PUBLIC
  USING (((desk_id IN ( SELECT ud.desk_id
   FROM office_desk.user_desks ud
  WHERE (ud.user_id = auth.uid()))) AND (tenant_id = ( SELECT ((auth.jwt() ->> 'tenant_id'::text))::uuid AS uuid))));

CREATE POLICY "inv_admin_all" ON "office_desk"."invoices"
  FOR ALL
  TO "authenticated"
  USING (((tenant_id = public.jwt_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))));

CREATE POLICY "inv_office_insert" ON "office_desk"."invoices"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((tenant_id = public.jwt_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['office'::text, 'admin'::text])))))));

CREATE POLICY "inv_office_select" ON "office_desk"."invoices"
  FOR SELECT
  TO "authenticated"
  USING (((tenant_id = public.jwt_tenant_id()) AND (deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['office'::text, 'admin'::text])))))));

CREATE POLICY "inv_office_update" ON "office_desk"."invoices"
  FOR UPDATE
  TO "authenticated"
  USING (((tenant_id = public.jwt_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = ANY (ARRAY['office'::text, 'admin'::text])))))));

CREATE POLICY "office_invoices_admin_select" ON "office_desk"."invoices"
  FOR SELECT
  TO "authenticated"
  USING (((tenant_id = public.jwt_tenant_id()) AND (deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))));

CREATE POLICY "office_invoices_office_select" ON "office_desk"."invoices"
  FOR SELECT
  TO "authenticated"
  USING (((tenant_id = public.jwt_tenant_id()) AND (deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'office'::text))))));

CREATE POLICY "office_payments_admin_select" ON "office_desk"."payments"
  FOR SELECT
  TO "authenticated"
  USING (((tenant_id = public.jwt_tenant_id()) AND (deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))));

CREATE POLICY "office_payments_office_select" ON "office_desk"."payments"
  FOR SELECT
  TO "authenticated"
  USING (((tenant_id = public.jwt_tenant_id()) AND (deleted_at IS NULL) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'office'::text))))));

CREATE POLICY "permission_audit_log_insert" ON "office_desk"."permission_audit_log"
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((desk_id IN ( SELECT ud.desk_id
   FROM office_desk.user_desks ud
  WHERE (ud.user_id = auth.uid()))) AND (tenant_id = ( SELECT ((auth.jwt() ->> 'tenant_id'::text))::uuid AS uuid)) AND (actor_id = auth.uid())));

CREATE POLICY "permission_audit_log_select" ON "office_desk"."permission_audit_log"
  FOR SELECT
  TO PUBLIC
  USING (((desk_id IN ( SELECT ud.desk_id
   FROM office_desk.user_desks ud
  WHERE (ud.user_id = auth.uid()))) AND (tenant_id = ( SELECT ((auth.jwt() ->> 'tenant_id'::text))::uuid AS uuid))));

CREATE POLICY "permissions_select" ON "office_desk"."permissions"
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "role_permissions_delete" ON "office_desk"."role_permissions"
  FOR DELETE
  TO PUBLIC
  USING ((role_id IN ( SELECT udr.desk_id
   FROM (office_desk.user_desk_roles udr
     JOIN office_desk.desk_roles dr ON ((dr.id = udr.role_id)))
  WHERE ((udr.user_id = auth.uid()) AND (dr.name = 'admin'::text)))));

CREATE POLICY "role_permissions_insert" ON "office_desk"."role_permissions"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((role_id IN ( SELECT udr.desk_id
   FROM (office_desk.user_desk_roles udr
     JOIN office_desk.desk_roles dr ON ((dr.id = udr.role_id)))
  WHERE ((udr.user_id = auth.uid()) AND (dr.name = 'admin'::text)))));

CREATE POLICY "role_permissions_select" ON "office_desk"."role_permissions"
  FOR SELECT
  TO PUBLIC
  USING ((role_id IN ( SELECT dr.id
   FROM office_desk.desk_roles dr
  WHERE (dr.desk_id IN ( SELECT ud.desk_id
           FROM office_desk.user_desks ud
          WHERE (ud.user_id = auth.uid()))))));

CREATE POLICY "user_desk_roles_delete" ON "office_desk"."user_desk_roles"
  FOR DELETE
  TO PUBLIC
  USING ((desk_id IN ( SELECT udr.desk_id
   FROM (office_desk.user_desk_roles udr
     JOIN office_desk.desk_roles dr ON ((dr.id = udr.role_id)))
  WHERE ((udr.user_id = auth.uid()) AND (dr.name = 'admin'::text)))));

CREATE POLICY "user_desk_roles_insert" ON "office_desk"."user_desk_roles"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((desk_id IN ( SELECT udr.desk_id
   FROM (office_desk.user_desk_roles udr
     JOIN office_desk.desk_roles dr ON ((dr.id = udr.role_id)))
  WHERE ((udr.user_id = auth.uid()) AND (dr.name = ANY (ARRAY['admin'::text, 'manager'::text]))))));

CREATE POLICY "user_desk_roles_select" ON "office_desk"."user_desk_roles"
  FOR SELECT
  TO PUBLIC
  USING ((desk_id IN ( SELECT ud.desk_id
   FROM office_desk.user_desks ud
  WHERE (ud.user_id = auth.uid()))));

CREATE POLICY "user_desk_roles_update" ON "office_desk"."user_desk_roles"
  FOR UPDATE
  TO PUBLIC
  USING ((desk_id IN ( SELECT udr.desk_id
   FROM (office_desk.user_desk_roles udr
     JOIN office_desk.desk_roles dr ON ((dr.id = udr.role_id)))
  WHERE ((udr.user_id = auth.uid()) AND (dr.name = 'admin'::text)))));

CREATE POLICY "cert_admin_all" ON "public"."certificates"
  FOR ALL
  TO "authenticated"
  USING (((tenant_id = public.jwt_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))))
  WITH CHECK (((tenant_id = public.jwt_tenant_id()) AND (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))));

CREATE POLICY "Admins can view all progress" ON "public"."chapter_progress"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));

CREATE POLICY "Students can view their own progress" ON "public"."chapter_progress"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = student_id));

CREATE POLICY "Teachers can view progress for their courses" ON "public"."chapter_progress"
  FOR SELECT
  TO PUBLIC
  USING ((EXISTS ( SELECT 1
   FROM ((school_desk.courses c
     JOIN public.profiles p ON ((c.teacher_id = p.id)))
     JOIN public.chapters ch ON ((ch.course_id = c.id)))
  WHERE ((ch.id = chapter_progress.chapter_id) AND (p.id = auth.uid()) AND (p.role = ANY (ARRAY['teacher'::text, 'admin'::text]))))));

CREATE POLICY "service_role_insert_preferences" ON "public"."notification_preferences"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.role() = 'service_role'::text));

CREATE POLICY "students_manage_preferences" ON "public"."notification_preferences"
  FOR ALL
  TO PUBLIC
  USING ((student_id = auth.uid()));

CREATE POLICY "service_role_insert_notifications" ON "public"."notifications"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.role() = 'service_role'::text));

CREATE POLICY "students_update_own_notifications" ON "public"."notifications"
  FOR UPDATE
  TO PUBLIC
  USING ((student_id = auth.uid()))
  WITH CHECK ((student_id = auth.uid()));

CREATE POLICY "students_view_own_notifications" ON "public"."notifications"
  FOR SELECT
  TO PUBLIC
  USING ((student_id = auth.uid()));

ALTER PUBLICATION "supabase_realtime" ADD TABLE "office_desk"."invoices";

COMMENT ON COLUMN "office_desk"."invoices"."amount_paid" IS 'Amount already paid toward this invoice';

COMMENT ON COLUMN "office_desk"."invoices"."due_date" IS 'Payment due date';

COMMENT ON COLUMN "office_desk"."invoices"."lead_id" IS 'Optional link to front_desk.leads for direct lead billing';

COMMENT ON COLUMN "office_desk"."invoices"."paid_at" IS 'Timestamp when payment was confirmed';

COMMENT ON COLUMN "office_desk"."invoices"."payment_method" IS 'Payment method: card, ach, or paypal';

COMMENT ON COLUMN "office_desk"."invoices"."payment_processor" IS 'Which processor handled this invoice: stripe or paypal';

COMMENT ON COLUMN "office_desk"."invoices"."paypal_capture_id" IS 'PayPal Capture ID on success';

COMMENT ON COLUMN "office_desk"."invoices"."paypal_error_message" IS 'Last PayPal payment error';

COMMENT ON COLUMN "office_desk"."invoices"."paypal_order_id" IS 'PayPal Order ID';

COMMENT ON COLUMN "office_desk"."invoices"."stripe_charge_id" IS 'Stripe Charge ID on success';

COMMENT ON COLUMN "office_desk"."invoices"."stripe_error_message" IS 'Last Stripe payment error';

COMMENT ON COLUMN "office_desk"."invoices"."stripe_payment_intent_id" IS 'Stripe PaymentIntent ID';

COMMENT ON SCHEMA "school_desk" IS 'LMS schema namespace';

COMMENT ON TABLE "office_desk"."invoices" IS 'Row 78: Manual/ad-hoc invoices for Office Desk billing';

COMMENT ON TABLE "public"."ef_call_log" IS 'Immutable audit log of EF-to-EF calls. Append-only. Used for rate limiting + compliance.';

GRANT EXECUTE ON FUNCTION "office_desk"."create_default_roles"(uuid, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "office_desk"."get_user_desk_permissions"(uuid, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "office_desk"."get_user_desk_role"(uuid, uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION "office_desk"."handle_new_desk_roles"() TO "postgres";

GRANT EXECUTE ON FUNCTION "office_desk"."log_role_change"() TO "postgres";

GRANT EXECUTE ON FUNCTION "office_desk"."user_has_permission"(uuid, uuid, text) TO "postgres";

GRANT EXECUTE ON FUNCTION "postgrest"."pre_config"() TO "authenticator", "postgres";

GRANT USAGE ON SCHEMA "postgrest" TO "anon", "authenticated", "authenticator";

GRANT CREATE, USAGE ON SCHEMA "postgrest" TO "postgres";

GRANT USAGE ON SCHEMA "postgrest" TO "service_role";

REVOKE ALL ON SEQUENCE "public"."invoice_number_seq" FROM "authenticated";

GRANT SELECT, USAGE ON SEQUENCE "public"."invoice_number_seq" TO "authenticated";

GRANT INSERT, SELECT, UPDATE ON TABLE "office_desk"."desk_invites" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "office_desk"."desk_invites" TO "postgres";

REVOKE ALL ON TABLE "office_desk"."desk_roles" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "office_desk"."desk_roles" TO "authenticated";

REVOKE ALL ON TABLE "office_desk"."invoices" FROM "authenticated";

GRANT INSERT, SELECT, UPDATE ON TABLE "office_desk"."invoices" TO "authenticated";

REVOKE ALL ON TABLE "office_desk"."invoices" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "office_desk"."invoices" TO "service_role";

REVOKE ALL ON TABLE "office_desk"."payments" FROM "authenticated";

GRANT SELECT ON TABLE "office_desk"."payments" TO "authenticated";

REVOKE ALL ON TABLE "office_desk"."payments" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "office_desk"."payments" TO "service_role";

GRANT INSERT, SELECT ON TABLE "office_desk"."permission_audit_log" TO "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "office_desk"."permission_audit_log" TO "postgres";

REVOKE ALL ON TABLE "office_desk"."permissions" FROM "authenticated";

GRANT SELECT ON TABLE "office_desk"."permissions" TO "authenticated";

REVOKE ALL ON TABLE "office_desk"."role_permissions" FROM "authenticated";

GRANT DELETE, INSERT, SELECT ON TABLE "office_desk"."role_permissions" TO "authenticated";

REVOKE ALL ON TABLE "office_desk"."user_desk_roles" FROM "authenticated";

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "office_desk"."user_desk_roles" TO "authenticated";

REVOKE ALL ON TABLE "public"."book" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."book" TO "service_role";

REVOKE ALL ON TABLE "public"."booklist" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."booklist" TO "service_role";

REVOKE ALL ON TABLE "public"."booklist_item" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."booklist_item" TO "service_role";

REVOKE ALL ON TABLE "public"."certificates" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."certificates" TO "service_role";

REVOKE ALL ON TABLE "public"."chapter_progress" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."chapter_progress" TO "service_role";

REVOKE ALL ON TABLE "public"."chat_preferences" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."chat_preferences" TO "service_role";

REVOKE ALL ON TABLE "public"."consent_records" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."consent_records" TO "service_role";

REVOKE ALL ON TABLE "public"."debit_orders" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."debit_orders" TO "authenticated";

REVOKE ALL ON TABLE "public"."devotional_config" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."devotional_config" TO "service_role";

REVOKE ALL ON TABLE "public"."devotional_item" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."devotional_item" TO "service_role";

REVOKE ALL ON TABLE "public"."enrichment_meta" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."enrichment_meta" TO "service_role";

REVOKE ALL ON TABLE "public"."family_child" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."family_child" TO "service_role";

REVOKE ALL ON TABLE "public"."handle_changes" FROM "service_role";

GRANT DELETE, MAINTAIN, SELECT, UPDATE ON TABLE "public"."handle_changes" TO "service_role";

REVOKE ALL ON TABLE "public"."invoices" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."invoices" TO "authenticated";

REVOKE ALL ON TABLE "public"."message_reactions" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."message_reactions" TO "service_role";

REVOKE ALL ON TABLE "public"."notification_preferences" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."notification_preferences" TO "service_role";

REVOKE ALL ON TABLE "public"."notifications" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."notifications" TO "service_role";

REVOKE ALL ON TABLE "public"."parents" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."parents" TO "authenticated";

REVOKE ALL ON TABLE "public"."payments" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."payments" TO "authenticated";

REVOKE ALL ON TABLE "public"."platform_access" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."platform_access" TO "service_role";

REVOKE ALL ON TABLE "public"."profiles" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."profiles" TO "service_role";

REVOKE ALL ON TABLE "public"."schedule_slot" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."schedule_slot" TO "service_role";

REVOKE ALL ON TABLE "public"."student_class" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."student_class" TO "service_role";

REVOKE ALL ON TABLE "public"."students" FROM "authenticated";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."students" TO "authenticated";

REVOKE ALL ON TABLE "public"."suppression_records" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."suppression_records" TO "service_role";

REVOKE ALL ON TABLE "public"."tenant_devotional" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."tenant_devotional" TO "service_role";

REVOKE ALL ON TABLE "public"."tenant_lms" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."tenant_lms" TO "service_role";

REVOKE ALL ON TABLE "public"."tenant_mobile" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."tenant_mobile" TO "service_role";

REVOKE ALL ON TABLE "public"."terms" FROM "service_role";

GRANT DELETE, INSERT, MAINTAIN, SELECT, UPDATE ON TABLE "public"."terms" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "school_desk"."__reload_trigger" TO "postgres";

