import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { CourseForm } from '../components/CourseForm';
import { ChapterForm } from '../components/ChapterForm';
import { getCourseById, updateCourse, publishCourse } from '../services/course';
import { getChaptersByCourse, createChapter, deleteChapter, updateChapter } from '../services/chapter';
import type { Course, Chapter } from '../types/lms';
import type { CourseInput, ChapterInput } from '../validation/schemas';

export function EditCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showChapterForm, setShowChapterForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  useEffect(() => {
    const loadCourse = async () => {
      if (!courseId) return;

      const [courseData, chaptersData] = await Promise.all([
        getCourseById(courseId),
        getChaptersByCourse(courseId),
      ]);

      if (courseData && courseData.instructor_id === user?.id) {
        setCourse(courseData);
        setChapters(chaptersData);
      }
      setLoading(false);
    };

    loadCourse();
  }, [courseId, user]);

  const handleCourseUpdate = async (data: CourseInput) => {
    if (!courseId) return;
    setSaving(true);
    await updateCourse(courseId, data);
    const updated = await getCourseById(courseId);
    setCourse(updated);
    setSaving(false);
  };

  const handlePublish = async () => {
    if (!courseId) return;
    setSaving(true);
    await publishCourse(courseId);
    const updated = await getCourseById(courseId);
    setCourse(updated);
    setSaving(false);
  };

  const handleAddChapter = async (data: ChapterInput) => {
    if (!courseId) return;
    setSaving(true);
    await createChapter(courseId, data.title, data.description || null, data.video_url, data.order_index);
    const chaptersData = await getChaptersByCourse(courseId);
    setChapters(chaptersData);
    setShowChapterForm(false);
    setSaving(false);
  };

  const handleUpdateChapter = async (data: Partial<ChapterInput>) => {
    if (!editingChapter) return;
    setSaving(true);
    await updateChapter(editingChapter.id, {
      title: data.title,
      description: data.description,
      video_url: data.video_url,
    });
    const chaptersData = await getChaptersByCourse(editingChapter.course_id);
    setChapters(chaptersData);
    setEditingChapter(null);
    setSaving(false);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    if (!courseId) return;
    setSaving(true);
    await deleteChapter(chapterId);
    const chaptersData = await getChaptersByCourse(courseId);
    setChapters(chaptersData);
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Loading course...</p>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">Course not found or you don't have permission to edit it.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Edit Course</h1>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/instructor')}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Back to Dashboard
          </button>
          {course.status === 'draft' && (
            <button
              onClick={handlePublish}
              disabled={saving || chapters.length === 0}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Publish Course
            </button>
          )}
        </div>
      </div>

      {course.status === 'draft' && chapters.length === 0 && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6">
          Add at least one chapter before publishing.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Course Details</h2>
          <CourseForm
            initialData={{
              title: course.title,
              description: course.description || undefined,
              price: course.price,
            }}
            onSubmit={handleCourseUpdate}
            isLoading={saving}
            submitLabel="Update Course"
          />
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Chapters</h2>
            <button
              onClick={() => setShowChapterForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Add Chapter
            </button>
          </div>

          {chapters.length === 0 ? (
            <p className="text-gray-500">No chapters yet. Add your first chapter.</p>
          ) : (
            <ul className="space-y-4">
              {chapters.map((chapter, index) => (
                <li key={chapter.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-sm text-gray-500">Chapter {index + 1}</span>
                      <h3 className="font-medium text-gray-900">{chapter.title}</h3>
                      {chapter.description && (
                        <p className="text-sm text-gray-500 mt-1">{chapter.description}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingChapter(chapter)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteChapter(chapter.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {showChapterForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowChapterForm(false)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Add Chapter</h2>
              <ChapterForm
                courseId={courseId || ''}
                orderIndex={chapters.length}
                onSubmit={handleAddChapter}
                onCancel={() => setShowChapterForm(false)}
                isLoading={saving}
              />
            </div>
          </div>
        </div>
      )}

      {editingChapter && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setEditingChapter(null)} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-bold mb-4">Edit Chapter</h2>
              <ChapterForm
                courseId={editingChapter.course_id}
                initialData={{
                  title: editingChapter.title,
                  description: editingChapter.description || undefined,
                  video_url: editingChapter.video_url,
                  order_index: editingChapter.order_index,
                }}
                orderIndex={editingChapter.order_index}
                onSubmit={handleUpdateChapter}
                onCancel={() => setEditingChapter(null)}
                isLoading={saving}
                submitLabel="Update Chapter"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}