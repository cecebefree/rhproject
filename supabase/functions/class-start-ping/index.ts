// class-start-ping -- Send class reminder notifications 5 min before start
// Scheduled via pg_cron every 5 minutes
// Checks for classes starting in the next 5 minutes
//
// Preference logic (migration 190):
// 1. Fetch notification_preferences for student
// 2. Skip if class_notification_scope = 'off'
// 3. Query course type (core | club) from courses table
// 4. If core -> check core_curriculum_enabled
// 5. If club -> check clubs_enabled
// 6. If scope = 'custom' -> verify course_id in class_ids
// 7. Skip during quiet_hours (22:00-08:00 local)
// 8. Send via enabled channels (push/email/sms/in-app)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const ZADARMA_USER_KEY = Deno.env.get("ZADARMA_USER_KEY");
const ZADARMA_SECRET_KEY = Deno.env.get("ZADARMA_SECRET_KEY");

// Quiet hours check: 22:00-08:00 (local time)
function isQuietHours(now: Date): boolean {
  const hour = now.getHours();
  return hour >= 22 || hour < 8;
}

// Preference gate: should we send a class-start-ping?
function shouldNotify(
  prefs: {
    class_notification_scope: string;
    core_curriculum_enabled: boolean;
    clubs_enabled: boolean;
    class_ids: string[] | null;
  } | null,
  courseType: string,
  courseId: string,
): boolean {
  if (!prefs) return true;
  if (prefs.class_notification_scope === "off") return false;
  if (courseType === "core" && !prefs.core_curriculum_enabled) return false;
  if ((courseType === "club" || courseType === "enrichment") && !prefs.clubs_enabled) return false;
  if (prefs.class_notification_scope === "custom") {
    const ids = prefs.class_ids ?? [];
    if (!ids.includes(courseId)) return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (handleCors(req)) return handleCors(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
  const now = new Date();
  const fiveMinLater = new Date(now.getTime() + 5 * 60 * 1000);

  if (isQuietHours(now)) {
    return jsonResponse({
      success: true,
      notifications_sent: 0,
      message: "Quiet hours active (22:00-08:00), skipping",
    });
  }

  try {
    const { data: upcomingSlots, error: slotErr } = await supabase
      .from("schedule_slot")
      .select("id, tenant_id, course_id, start_time, title")
      .gte("start_time", now.toISOString())
      .lte("start_time", fiveMinLater.toISOString());

    if (slotErr) {
      console.error("[class-start-ping] Failed to fetch slots:", slotErr.message);
      return jsonResponse({ error: "Failed to fetch schedule" }, 500);
    }

    if (!upcomingSlots || upcomingSlots.length === 0) {
      return jsonResponse({
        success: true,
        notifications_sent: 0,
        message: "No classes starting in next 5 minutes",
      });
    }

    let notificationsSent = 0;
    let skippedByPrefs = 0;
    const errors: string[] = [];

    const courseIds = [...new Set(upcomingSlots.map((s) => s.course_id))];
    const { data: courses } = await supabase
      .from("courses")
      .select("id, type")
      .in("id", courseIds);

    const courseTypeMap = new Map<string, string>(
      (courses ?? []).map((c) => [c.id, c.type ?? "core"]),
    );

    for (const slot of upcomingSlots) {
      const courseType = courseTypeMap.get(slot.course_id) ?? "core";

      const { data: enrollments, error: enrollErr } = await supabase
        .from("student_class")
        .select("student_id, students!inner(id, family_account_id, user_id)")
        .eq("class_id", slot.course_id)
        .eq("tenant_id", slot.tenant_id)
        .is("deleted_at", null);

      if (enrollErr || !enrollments || enrollments.length === 0) {
        console.log(`[class-start-ping] No enrollments for slot ${slot.id}`);
        continue;
      }

      const studentIds = enrollments
        .map((e) => e.students?.id)
        .filter(Boolean) as string[];

      const { data: prefsRows } = await supabase
        .from("notification_preferences")
        .select("student_id, class_notification_scope, core_curriculum_enabled, clubs_enabled, class_ids, push_enabled, email_enabled, sms_enabled, in_app_enabled")
        .in("student_id", studentIds);

      const prefsMap = new Map(
        (prefsRows ?? []).map((p) => [p.student_id, p]),
      );

      for (const enrollment of enrollments) {
        const student = enrollment.students;
        if (!student || !student.user_id) continue;

        const prefs = prefsMap.get(student.id) ?? null;

        if (!shouldNotify(prefs, courseType, slot.course_id)) {
          skippedByPrefs++;
          continue;
        }

        const channels: string[] = [];
        if (prefs?.in_app_enabled ?? true) channels.push("in_app");
        if (prefs?.push_enabled ?? false) channels.push("push");
        if (prefs?.email_enabled ?? false) channels.push("email");
        if (prefs?.sms_enabled ?? false) channels.push("sms");

        if (channels.length === 0) {
          skippedByPrefs++;
          continue;
        }

        if (channels.includes("in_app")) {
          const { error: notifErr } = await supabase
            .from("notifications")
            .insert({
              user_id: student.user_id,
              tenant_id: slot.tenant_id,
              type: "schedule",
              title: "Class Starting Soon",
              body: `Your class "${slot.title || "Session"}" starts in 5 minutes.`,
            });

          if (notifErr) {
            console.error(`[class-start-ping] Notification failed for student ${student.id}:`, notifErr.message);
            errors.push(`notif_${student.id}: ${notifErr.message}`);
            continue;
          }
        }

        await supabase.from("family_activity").insert({
          family_account_id: student.family_account_id,
          activity_type: "class_reminder_sent",
          details: {
            student_id: student.id,
            slot_id: slot.id,
            course_id: slot.course_id,
            course_type: courseType,
            class_title: slot.title,
            channels,
            scope: prefs?.class_notification_scope ?? "all",
            function_name: "class-start-ping",
          },
        });

        if (channels.includes("sms") && ZADARMA_USER_KEY && ZADARMA_SECRET_KEY) {
          try {
            const { data: userData } = await supabase
              .from("users")
              .select("phone")
              .eq("id", student.user_id)
              .single();

            if (userData?.phone) {
              const smsResult = await sendSmsViaZadarma({
                to: userData.phone,
                message: `Redhouse: Your class "${slot.title || "Session"}" starts in 5 minutes.`,
              });

              await supabase.from("family_activity").insert({
                family_account_id: student.family_account_id,
                activity_type: "sms_sent",
                details: {
                  student_id: student.id,
                  slot_id: slot.id,
                  channel: "sms",
                  recipient: userData.phone,
                  status: smsResult.success ? "sent" : "failed",
                  error: smsResult.error,
                  function_name: "class-start-ping",
                },
              });
            }
          } catch (smsErr) {
            console.error(`[class-start-ping] SMS failed for student ${student.id}:`, smsErr);
          }
        }

        notificationsSent++;
      }
    }

    await supabase.from("system_log").insert({
      function_name: "class-start-ping",
      status: errors.length > 0 ? "warning" : "success",
      details: {
        notifications_sent: notificationsSent,
        skipped_by_prefs: skippedByPrefs,
        slots_checked: upcomingSlots.length,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

    return jsonResponse({
      success: true,
      notifications_sent: notificationsSent,
      skipped_by_prefs: skippedByPrefs,
      timestamp: now.toISOString(),
    });
  } catch (err) {
    console.error("[class-start-ping] Fatal error:", err);

    await supabase.from("system_log").insert({
      function_name: "class-start-ping",
      status: "error",
      details: { error: String(err) },
    });

    return jsonResponse({ error: "Class ping failed" }, 500);
  }
});

// SMS SENDING VIA ZADARMA

async function sendSmsViaZadarma(params: {
  to: string;
  message: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!ZADARMA_USER_KEY || !ZADARMA_SECRET_KEY) {
    return { success: true };
  }

  try {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const paramsEncoded = new URLSearchParams({
      to: params.to,
      message: params.message,
    });

    const sortedParams = Array.from(paramsEncoded.entries())
      .sort()
      .map(([k, v]) => `${k}=${v}`)
      .join("&");

    const md5 = await crypto.subtle.digest(
      "MD5",
      new TextEncoder().encode(`${ZADARMA_USER_KEY}:${sortedParams}:${ZADARMA_SECRET_KEY}:${timestamp}`),
    );
    const signature = Array.from(new Uint8Array(md5))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const res = await fetch("https://api.zadarma.com/v1/sms/send/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ZADARMA_USER_KEY}:${signature}:${timestamp}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: paramsEncoded.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: `Zadarma SMS error ${res.status}: ${errText}` };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
