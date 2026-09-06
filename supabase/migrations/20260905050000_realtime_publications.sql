-- ============================================================================
-- Add realtime publications for key desk tables
-- ============================================================================

-- Office Desk: registrations, payments, activity
ALTER PUBLICATION supabase_realtime ADD TABLE office_desk.registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE office_desk.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE office_desk.family_accounts;

-- Front Desk: inquiries, activity_log
ALTER PUBLICATION supabase_realtime ADD TABLE front_desk.inquiries;
ALTER PUBLICATION supabase_realtime ADD TABLE front_desk.activity_log;

-- School Desk: courses, enrollments, conversations, messages, attendance
ALTER PUBLICATION supabase_realtime ADD TABLE school_desk.courses;
ALTER PUBLICATION supabase_realtime ADD TABLE school_desk.enrollments;
ALTER PUBLICATION supabase_realtime ADD TABLE school_desk.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE school_desk.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE school_desk.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE school_desk.conversation_members;
