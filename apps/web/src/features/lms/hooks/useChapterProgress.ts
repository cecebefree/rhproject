import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";

/**
 * T019 — useChapterProgress hook
 * Returns chapter progress for a student in a specific course.
 * Shows which chapters are completed, the current chapter, and total progress.
 */
export function useChapterProgress(studentId: string | null, courseId: string | null) {
  const [chapters, setChapters] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentChapter, setCurrentChapter] = useState<any | null>(null);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (!studentId || !courseId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // Fetch chapters for this course
      const { data: chapterData } = await supabase
        .from("chapters" as any)
        .select("*")
        .eq("course_id", courseId)
        .order("position", { ascending: true });

      // Fetch progress for this student
      const { data: progressData } = await supabase
        .from("chapter_progress" as any)
        .select("*")
        .eq("student_id", studentId);

      const allChapters = chapterData ?? [];
      const allProgress = progressData ?? [];

      setChapters(allChapters);
      setProgress(allProgress);
      setTotalCount(allChapters.length);

      // Determine completed chapters (row presence = completed)
      const completedIds = new Set(
        allProgress.map((p: any) => p.chapter_id)
      );
      setCompletedCount(completedIds.size);

      // Find current chapter (first incomplete)
      const current = allChapters.find((ch: any) => !completedIds.has(ch.id));
      setCurrentChapter(current ?? allChapters[allChapters.length - 1] ?? null);

      setLoading(false);
    };

    fetchData();
  }, [studentId, courseId]);

  const isChapterUnlocked = (chapterId: string): boolean => {
    if (!chapters.length) return false;

    const chapterIndex = chapters.findIndex((ch: any) => ch.id === chapterId);
    if (chapterIndex === 0) return true;

    // Check if all previous chapters are completed
    const completedIds = new Set(
      progress.map((p: any) => p.chapter_id)
    );

    for (let i = 0; i < chapterIndex; i++) {
      if (!completedIds.has(chapters[i].id)) return false;
    }
    return true;
  };

  const markComplete = async (chapterId: string) => {
    // chapter_progress: row presence = completed (no completed column)
    const { error } = await supabase
      .from("chapter_progress" as any)
      .upsert(
        {
          student_id: studentId,
          chapter_id: chapterId,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "student_id,chapter_id" }
      );

    if (!error) {
      setProgress((prev) => [
        ...prev.filter((p: any) => p.chapter_id !== chapterId),
        { student_id: studentId, chapter_id: chapterId },
      ]);
      setCompletedCount((prev) => prev + 1);
    }

    return { error };
  };

  return {
    chapters,
    progress,
    loading,
    currentChapter,
    completedCount,
    totalCount,
    isChapterUnlocked,
    markComplete,
  };
}
