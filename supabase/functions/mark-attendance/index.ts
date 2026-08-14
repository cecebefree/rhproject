// mark-attendance — Bulk upsert attendance for a class session (Row 73)
// POST body: { course_id, class_date, marks: [{ student_id, status, notes? }] }
// Uses service_role client for bulk operations (bypasses RLS)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface AttendanceMark {
  student_id: string;
  status: "present" | "absent" | "excused";
  notes?: string;
}

interface MarkAttendanceInput {
  course_id: string;
  class_date: string;
  marks: AttendanceMark[];
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  // Verify authentication
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Missing authorization", {
      status: 401,
      headers: corsHeaders,
    });
  }

  // Parse input
  let input: MarkAttendanceInput;
  try {
    input = await req.json();
  } catch {
    return new Response("Invalid JSON", {
      status: 400,
      headers: corsHeaders,
    });
  }

  const { course_id, class_date, marks } = input;

  // Validate required fields
  if (!course_id || !class_date || !marks || !Array.isArray(marks)) {
    return new Response(
      JSON.stringify({ error: "course_id, class_date, and marks[] are required" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  if (marks.length === 0) {
    return new Response(
      JSON.stringify({ error: "marks array cannot be empty" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Verify course exists and get tenant_id
  const { data: course, error: courseError } = await supabase
    .from("school_desk.courses")
    .select("id, tenant_id, teacher_id")
    .eq("id", course_id)
    .single();

  if (courseError || !course) {
    return new Response(
      JSON.stringify({ error: "Course not found" }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Verify the authenticated user is the teacher for this course
  // Extract user ID from JWT claims
  const token = authHeader.replace("Bearer ", "");
  const payload = JSON.parse(
    atob(token.split(".")[1])
  );
  const userId = payload.sub;

  if (course.teacher_id !== userId) {
    return new Response(
      JSON.stringify({ error: "Only the course teacher can mark attendance" }),
      {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Build upsert rows
  const rows = marks.map((mark) => ({
    tenant_id: course.tenant_id,
    course_id: course_id,
    student_id: mark.student_id,
    class_date: class_date,
    status: mark.status,
    marked_by: userId,
    marked_at: new Date().toISOString(),
    notes: mark.notes || null,
  }));

  // Bulk upsert with ON CONFLICT
  const { data, error: upsertError } = await supabase
    .from("school_desk.attendance")
    .upsert(rows, {
      onConflict: "course_id,student_id,class_date",
      ignoreDuplicates: false,
    })
    .select();

  if (upsertError) {
    console.error("Upsert error:", upsertError);
    return new Response(
      JSON.stringify({ error: upsertError.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  console.log(
    `Attendance marked: ${data?.length ?? 0} records for course ${course_id} on ${class_date}`
  );

  return new Response(
    JSON.stringify({
      success: true,
      count: data?.length ?? 0,
      records: data,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
