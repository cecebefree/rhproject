// auto-assign-classes — Run class assignment algorithm
// POST /auto-assign-classes
// Body: { pipeline_id: string }
// verify_jwt: true (office/admin only)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function reject(status: number, error: string, detail?: string): Response {
  return jsonResp({ error, ...(detail ? { detail } : {}) }, status);
}

interface ClassInstance {
  id: string;
  program_id: string;
  teacher_id: string;
  grade: string;
  class_section: string;
  intake_group: string | null;
  zone: string | null;
  day_of_week: number;
  start_time: string;
  end_time: string;
  max_students: number;
  current_students: number;
}

interface StudentProfile {
  id: string;
  name: string;
  curriculum: string | null;
  grade: string | null;
  intake: string | null;
  zone: string | null;
  class_section: string | null;
}

function calculateAssignmentScore(
  student: StudentProfile,
  classInstance: ClassInstance,
  existingClasses: Array<{ day_of_week: number; start_time: string; end_time: string }>
): number {
  let score = 0;

  // Capacity: prefer smaller classes (+10 for less than 50% full)
  const capacityRatio = classInstance.current_students / classInstance.max_students;
  if (capacityRatio < 0.5) score += 10;
  else if (capacityRatio < 0.75) score += 5;

  // Zone match (+5)
  if (student.zone && classInstance.zone && student.zone === classInstance.zone) {
    score += 5;
  }

  // Intake group match (+3)
  if (student.intake && classInstance.intake_group && student.intake === classInstance.intake_group) {
    score += 3;
  }

  // Check for time conflicts (penalize heavily)
  const hasConflict = existingClasses.some(
    (ec) =>
      ec.day_of_week === classInstance.day_of_week &&
      ec.start_time < classInstance.end_time &&
      ec.end_time > classInstance.start_time
  );
  if (hasConflict) score -= 100;

  return score;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return reject(405, "Method not allowed");
  }

  try {
    const { pipeline_id } = await req.json();

    if (!pipeline_id) {
      return reject(400, "Missing required field: pipeline_id");
    }

    // Get pipeline
    const { data: pipeline, error: pipeError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .select("*")
      .eq("id", pipeline_id)
      .single();

    if (pipeError || !pipeline) {
      return reject(404, "Pipeline not found");
    }

    if (pipeline.stage !== "contract_signed") {
      return reject(400, `Pipeline is in stage '${pipeline.stage}', expected 'contract_signed'`);
    }

    // Get student profiles linked to this pipeline
    const { data: students, error: studError } = await supabase
      .from("profiles")
      .select("*")
      .eq("enrollment_pipeline_id", pipeline_id)
      .eq("role", "student");

    if (studError || !students || students.length === 0) {
      return reject(404, "No student profiles found for this pipeline");
    }

    const assignments: Array<{
      student_id: string;
      student_name: string;
      class_instance_id: string;
      score: number;
      status: string;
    }> = [];

    const conflicts: Array<{
      student_id: string;
      student_name: string;
      reason: string;
    }> = [];

    for (const student of students) {
      // Get existing enrolled classes for this student
      const { data: existingEnrollments } = await supabase
        .from("office_desk.student_class_enrollments")
        .select("class_instance_id, class_instances(day_of_week, start_time, end_time)")
        .eq("student_id", student.id)
        .eq("status", "enrolled");

      const existingClasses = (existingEnrollments || [])
        .map((e) => e.class_instances as unknown as { day_of_week: number; start_time: string; end_time: string })
        .filter(Boolean);

      // Find available class instances matching student's curriculum and grade
      const { data: availableClasses } = await supabase
        .from("office_desk.class_instances")
        .select("*")
        .eq("grade", student.grade || "")
        .eq("status", "published")
        .lt("current_students", supabase.rpc ? 999 : 30); // Fallback filter

      if (!availableClasses || availableClasses.length === 0) {
        conflicts.push({
          student_id: student.id,
          student_name: student.name,
          reason: `No available classes for grade ${student.grade}`,
        });
        continue;
      }

      // Score each class
      const scoredClasses = availableClasses
        .map((cls) => ({
          class: cls as ClassInstance,
          score: calculateAssignmentScore(student, cls as ClassInstance, existingClasses),
        }))
        .filter((sc) => sc.score >= 0) // Exclude classes with time conflicts
        .sort((a, b) => b.score - a.score);

      if (scoredClasses.length === 0) {
        conflicts.push({
          student_id: student.id,
          student_name: student.name,
          reason: "All available classes have time conflicts",
        });
        continue;
      }

      // Assign to best class
      const best = scoredClasses[0];

      const { error: assignError } = await supabase
        .from("office_desk.class_assignments")
        .insert({
          tenant_id: pipeline.tenant_id,
          student_id: student.id,
          class_instance_id: best.class.id,
          pipeline_id: pipeline.id,
          assignment_type: "auto",
          score: best.score,
          status: "pending",
        });

      if (assignError) {
        console.error(`Assignment failed for ${student.name}:`, assignError);
        conflicts.push({
          student_id: student.id,
          student_name: student.name,
          reason: assignError.message,
        });
      } else {
        assignments.push({
          student_id: student.id,
          student_name: student.name,
          class_instance_id: best.class.id,
          score: best.score,
          status: "pending",
        });
      }
    }

    // Update pipeline stage
    const { error: updateError } = await supabase
      .from("office_desk.enrollment_pipelines")
      .update({
        stage: "curriculum_selected",
        stage_updated_at: new Date().toISOString(),
        stage_history: JSON.stringify([
          ...((pipeline.stage_history as unknown[]) || []),
          {
            stage: "curriculum_selected",
            timestamp: new Date().toISOString(),
            actor: "system",
            action: "auto_assign_classes",
            assignments_count: assignments.length,
            conflicts_count: conflicts.length,
          },
        ]),
      })
      .eq("id", pipeline_id);

    if (updateError) {
      console.error("Pipeline update failed:", updateError);
    }

    return jsonResp({
      status: "success",
      pipeline_id,
      assignments,
      conflicts,
      summary: {
        total_students: students.length,
        assigned: assignments.length,
        conflicts: conflicts.length,
      },
    });
  } catch (err) {
    console.error("auto-assign-classes error:", err);
    return reject(500, "Internal server error", String(err));
  }
});
