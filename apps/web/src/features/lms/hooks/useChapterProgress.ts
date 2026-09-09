import { useEffect, useState } from 'react';
import { supabaseUntyped as supabase } from '../services/supabase';

interface Chapter {
  id: string;
  course_id: string;
  title: string;
  position: number;
}

interface ChapterProgressRow {
  student_id: string;
  chapter_id: string;
  completed_at?: string;
}

/**
 * T019 — useChapterProgress hook
 * Returns chapter progress for a student in a specific course.
 * Shows which chapters are completed, the current chapter, and total progress.
 */
export function useChapterProgress(studentId: string | null, courseId: string | null) {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [progress, setProgress] = useState<ChapterProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
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
        .from('chapters' as never)
        .select('*')
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      // Fetch progress for this student
      const { data: progressData } = await supabase
        .from('chapter_progress' as never)
        .select('*')
        .eq('student_id', studentId);

      const allChapters = (chapterData ?? []) as Chapter[];
      const allProgress = (progressData ?? []) as ChapterProgressRow[];

      setChapters(allChapters);
      setProgress(allProgress);
      setTotalCount(allChapters.length);

      // Determine completed chapters (row presence = completed)
      const completedIds = new Set(allProgress.map((p) => p.chapter_id));
      setCompletedCount(completedIds.size);

      // Find current chapter (first incomplete)
      const current = allChapters.find((ch) => !completedIds.has(ch.id));
      setCurrentChapter(current ?? allChapters[allChapters.length - 1] ?? null);

      setLoading(false);
    };

    fetchData();
  }, [studentId, courseId]);

  const isChapterUnlocked = (chapterId: string): boolean => {
    if (!chapters.length) return false;

    const chapterIndex = chapters.findIndex((ch) => ch.id === chapterId);
    if (chapterIndex === 0) return true;

    // Check if all previous chapters are completed
    const completedIds = new Set(progress.map((p) => p.chapter_id));

    for (let i = 0; i < chapterIndex; i++) {
      if (!completedIds.has(chapters[i].id)) return false;
    }
    return true;
  };

  const markComplete = async (chapterId: string) => {
    // chapter_progress: row presence = completed (no completed column)
    const { error } = await supabase.from('chapter_progress' as never).upsert(
      {
        student_id: studentId,
        chapter_id: chapterId,
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,chapter_id' }
    );

    if (!error) {
      setProgress((prev) => [
        ...prev.filter((p) => p.chapter_id !== chapterId),
        { student_id: studentId ?? '', chapter_id: chapterId },
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
