import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEnrollment } from '../hooks/useEnrollment';
import { useChapterProgress } from '../hooks/useChapterProgress';
import { VideoPlayer } from '../components/VideoPlayer';
import { ChapterList } from '../components/ChapterList';
import { getCourseWithInstructor } from '../services/purchase';
import { getChaptersByCourse } from '../services/chapter';
import type { CourseWithInstructor, Chapter, ChapterWithProgress } from '../types/lms';

export function CourseViewerPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEnrolled } = useEnrollment(user?.id || null);
  const { isChapterComplete, isChapterLocked, markChapterComplete, getNextChapter } = useChapterProgress(
    user?.id || null,
    courseId || null
  );

  const [course, setCourse] = useState<CourseWithInstructor | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [currentChapter, setCurrentChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnlockNotification, setShowUnlockNotification] = useState(false);

  useEffect(() => {
    const loadCourseData = async () => {
      if (!courseId) return;

      const [courseData, chaptersData] = await Promise.all([
        getCourseWithInstructor(courseId),
        getChaptersByCourse(courseId),
      ]);

      setCourse(courseData);
      setChapters(chaptersData);
      
      if (chaptersData.length > 0) {
        setCurrentChapter(chaptersData[0]);
      }
      
      setLoading(false);
    };

    loadCourseData();
  }, [courseId]);

  const handleChapterSelect = (chapter: ChapterWithProgress) => {
    setCurrentChapter(chapter as Chapter);
  };

  const handleVideoEnded = async () => {
    if (!currentChapter || !user) return;

    await markChapterComplete(currentChapter.id);

    const nextChapter = getNextChapter(
      currentChapter.id,
      courseId || '',
      chapters.map(c => ({ id: c.id, order_index: c.order_index }))
    );

    if (nextChapter) {
      setShowUnlockNotification(true);
      setTimeout(() => setShowUnlockNotification(false), 3000);
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  if (!isEnrolled(courseId || '')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>You need to enroll in this course to access the content.</p>
          <a href={`/course/${courseId}/enroll`} className="text-indigo-600 hover:underline mt-2 inline-block">
            Enroll Now
          </a>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Loading course...</p>
      </div>
    );
  }

  const chaptersWithProgress: ChapterWithProgress[] = chapters.map(chapter => ({
    ...chapter,
    completed: isChapterComplete(chapter.id),
    progress_id: null,
  }));

  const lockedChapterIds = new Set(
    chapters
      .filter(ch => isChapterLocked(ch.id, ch.order_index, ch.course_id, chapters))
      .map(ch => ch.id)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{course?.title}</h1>
      <p className="text-gray-500 mb-6">by {course?.instructor?.name}</p>

      {showUnlockNotification && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          🎉 Next chapter unlocked! You can continue watching.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {currentChapter ? (
            <div>
              <VideoPlayer
                videoUrl={currentChapter.video_url}
                onEnded={handleVideoEnded}
                autoPlay
              />
              <div className="mt-4">
                <h2 className="text-xl font-semibold text-gray-900">{currentChapter.title}</h2>
                {currentChapter.description && (
                  <p className="mt-2 text-gray-600">{currentChapter.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <p className="text-gray-500">Select a chapter to start watching</p>
            </div>
          )}
        </div>

        <div>
          <ChapterList
            chapters={chaptersWithProgress}
            currentChapterId={currentChapter?.id}
            onChapterSelect={handleChapterSelect}
            lockedChapters={lockedChapterIds}
          />
        </div>
      </div>
    </div>
  );
}