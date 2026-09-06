import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";

interface CompletionStats {
  courseTitle: string;
  completedChapters: number;
  totalChapters: number;
  completionPct: number;
}

interface CourseCongratulationsProps {
  studentId: string;
  courseId: string;
}

/**
 * T044 — Congratulations message on course completion
 * Shows a celebratory banner when all chapters are completed.
 */
export function CourseCongratulations({ studentId, courseId }: CourseCongratulationsProps) {
  const [stats, setStats] = useState<CompletionStats | null>(null);
  const [showCongrats, setShowCongrats] = useState(false);

  useEffect(() => {
    const checkCompletion = async () => {
      // Get chapters
      const { data: chapters } = await supabase
        .from("chapters" as any)
        .select("id, title")
        .eq("course_id", courseId);

      if (!chapters?.length) return;

      // Get progress (row presence = completed)
      const { data: progress } = await supabase
        .from("chapter_progress" as any)
        .select("chapter_id")
        .eq("student_id", studentId);

      const completedCount = new Set(
        (progress ?? []).map((p: any) => p.chapter_id)
      ).size;
      const totalChapters = chapters.length;
      const pct = Math.round((completedCount / totalChapters) * 100);

      // Get program title
      const { data: course } = await supabase
        .from("school_desk.programs" as any)
        .select("title")
        .eq("id", courseId)
        .single();

      const stats: CompletionStats = {
        courseTitle: course?.title ?? "Subject",
        completedChapters: completedCount,
        totalChapters,
        completionPct: pct,
      };

      setStats(stats);

      if (pct >= 100) {
        setShowCongrats(true);
      }
    };

    checkCompletion();
  }, [studentId, courseId]);

  if (!showCongrats || !stats) return null;

  return (
    <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 mb-6">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-3xl">🎉</span>
        <h3 className="text-lg font-bold text-green-800">
          Congratulations!
        </h3>
      </div>
      <p className="text-green-700 mb-2">
        You've completed <strong>{stats.courseTitle}</strong>! All{" "}
        {stats.totalChapters} chapters finished.
      </p>
      <p className="text-sm text-green-600">
        Great work on your learning journey. Keep it up!
      </p>
      <button
        onClick={() => setShowCongrats(false)}
        className="mt-3 text-sm text-green-600 hover:text-green-800 underline"
      >
        Dismiss
      </button>
    </div>
  );
}

/**
 * T045 — useLastAccessed hook
 * Tracks when a student last accessed a course.
 */
export function useLastAccessed(studentId: string | null, courseId: string | null) {
  const [lastAccessed, setLastAccessed] = useState<string | null>(null);

  useEffect(() => {
    if (!studentId || !courseId) return;

    const touch = async () => {
      await supabase.rpc("touch_enrollment_access" as any, {
        p_student_id: studentId,
        p_course_id: courseId,
      });

      setLastAccessed(new Date().toISOString());
    };

    touch();
  }, [studentId, courseId]);

  return lastAccessed;
}
