import { supabase } from './supabase';
import type { Chapter } from '../types/lms';
import { validateChapterInput, validateEmail } from '../validation/schemas';

export async function getChaptersByCourse(courseId: string): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  if (error) return [];
  return (data || []) as Chapter[];
}

export async function getChapterById(chapterId: string): Promise<Chapter | null> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('id', chapterId)
    .single();

  if (error) return null;
  return data as Chapter;
}

export async function createChapter(
  courseId: string,
  title: string,
  description: string | null,
  videoUrl: string,
  orderIndex: number
): Promise<{ success: boolean; chapterId?: string; error: string | null }> {
  try {
    const { data, error } = await supabase
      .from('chapters')
      .insert({
        course_id: courseId,
        title,
        description: description || null,
        video_url: videoUrl,
        order_index: orderIndex,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, chapterId: data.id, error: null };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create chapter' };
  }
}

export async function updateChapter(
  chapterId: string,
  updates: { title?: string; description?: string; video_url?: string }
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('chapters')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chapterId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function deleteChapter(chapterId: string): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('chapters')
    .delete()
    .eq('id', chapterId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: null };
}

export async function getChapterCount(courseId: string): Promise<number> {
  const { count, error } = await supabase
    .from('chapters')
    .select('*', { count: 'exact', head: true })
    .eq('course_id', courseId);

  if (error) return 0;
  return count || 0;
}

export async function reorderChapters(
  courseId: string,
  chapterIds: string[]
): Promise<{ success: boolean; error: string | null }> {
  const updates = chapterIds.map((id, index) =>
    supabase
      .from('chapters')
      .update({ order_index: index, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('course_id', courseId)
  );

  const results = await Promise.all(updates);
  const error = results.find(r => r.error);

  if (error) {
    return { success: false, error: error.error?.message || 'Failed to reorder chapters' };
  }

  return { success: true, error: null };
}