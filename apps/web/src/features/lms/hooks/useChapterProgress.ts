import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { ChapterProgress, ChapterWithProgress } from '../types/lms';

interface UseChapterProgressReturn {
  progress: ChapterProgress[];
  loading: boolean;
  error: Error | null;
  isChapterComplete: (chapterId: string) => boolean;
  isChapterLocked: (chapterId: string, chapterOrderIndex: number, courseId: string, allChapters: { id: string; order_index: number }[]) => boolean;
  markChapterComplete: (chapterId: string) => Promise<{ error: Error | null }>;
  getChapterProgress: (chapterId: string) => ChapterProgress | undefined;
  getNextChapter: (currentChapterId: string, courseId: string, allChapters: { id: string; order_index: number }[]) => { id: string; order_index: number } | null;
}

export function useChapterProgress(studentId: string | null, courseId: string | null): UseChapterProgressReturn {
  const [progress, setProgress] = useState<ChapterProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProgress = useCallback(async () => {
    if (!studentId) {
      setProgress([]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from('chapter_progress')
      .select('*')
      .eq('student_id', studentId);

    if (courseId) {
      const { data: chapterIds } = await supabase
        .from('chapters')
        .select('id')
        .eq('course_id', courseId);

      if (chapterIds) {
        query = query.in('chapter_id', chapterIds.map(c => c.id));
      }
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError);
    } else {
      setProgress(data || []);
    }
    setLoading(false);
  }, [studentId, courseId]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const isChapterComplete = useCallback((chapterId: string) => {
    return progress.some(p => p.chapter_id === chapterId);
  }, [progress]);

  const isChapterLocked = useCallback((
    chapterId: string,
    chapterOrderIndex: number,
    courseId: string,
    allChapters: { id: string; order_index: number }[]
  ) => {
    if (chapterOrderIndex === 0) return false;

    const previousChapters = allChapters
      .filter(c => c.order_index < chapterOrderIndex)
      .sort((a, b) => b.order_index - a.order_index);

    if (previousChapters.length === 0) return false;

    const latestPrevious = previousChapters[0];
    return !isChapterComplete(latestPrevious.id);
  }, [isChapterComplete]);

  const markChapterComplete = async (chapterId: string) => {
    if (!studentId) return { error: new Error('Not authenticated') };

    const { error: insertError } = await supabase
      .from('chapter_progress')
      .insert({
        student_id: studentId,
        chapter_id: chapterId,
      });

    if (insertError) {
      return { error: new Error(insertError.message) };
    }

    await fetchProgress();
    return { error: null };
  };

  const getChapterProgress = useCallback((chapterId: string) => {
    return progress.find(p => p.chapter_id === chapterId);
  }, [progress]);

  const getNextChapter = useCallback((
    currentChapterId: string,
    courseId: string,
    allChapters: { id: string; order_index: number }[]
  ) => {
    const currentChapter = allChapters.find(c => c.id === currentChapterId);
    if (!currentChapter) return null;

    const nextChapter = allChapters
      .filter(c => c.order_index > currentChapter.order_index)
      .sort((a, b) => a.order_index - b.order_index)[0];

    return nextChapter || null;
  }, []);

  return {
    progress,
    loading,
    error,
    isChapterComplete,
    isChapterLocked,
    markChapterComplete,
    getChapterProgress,
    getNextChapter,
  };
}