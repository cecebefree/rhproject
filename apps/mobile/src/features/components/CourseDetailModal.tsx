import React, { useState } from 'react';
import type { CourseWithInstructor } from '../types/lms';
import { useAuth } from '../hooks/useAuth';
import { purchaseCourse } from '../services/purchase';
import { getChaptersByCourse } from '../services/chapter';

interface CourseDetailModalProps {
  course: CourseWithInstructor;
  isEnrolled: boolean;
  onClose: () => void;
  onEnrollSuccess?: () => void;
}

export function CourseDetailModal({ course, isEnrolled, onClose, onEnrollSuccess }: CourseDetailModalProps) {
  const [chapters, setChapters] = useState<{ id: string; title: string; order_index: number }[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();

  React.useEffect(() => {
    const loadChapters = async () => {
      const data = await getChaptersByCourse(course.id);
      setChapters(data);
      setLoadingChapters(false);
    };
    loadChapters();
  }, [course.id]);

  const handlePurchase = async () => {
    if (!user) {
      setError('Please log in to purchase this course');
      return;
    }

    setPurchasing(true);
    setError(null);

    const result = await purchaseCourse(user.id, course.id);

    if (result.success) {
      onEnrollSuccess?.();
      onClose();
    } else {
      setError(result.error || 'Purchase failed');
    }

    setPurchasing(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Close</span>
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">{course.title}</h2>
            <p className="text-sm text-gray-500 mt-1">
              by {course.instructor?.name || 'Instructor'}
            </p>
          </div>

          {course.description && (
            <p className="text-gray-600 mb-6">{course.description}</p>
          )}

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Chapters ({chapters.length})</h3>
            {loadingChapters ? (
              <p className="text-gray-500">Loading chapters...</p>
            ) : (
              <ul className="space-y-2">
                {chapters.map((chapter, index) => (
                  <li key={chapter.id} className="flex items-center text-sm">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium mr-2">
                      {index + 1}
                    </span>
                    <span className="text-gray-700">{chapter.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center justify-between mb-6">
            <span className="text-2xl font-bold text-indigo-600">
              ${course.price.toFixed(2)}
            </span>
            {isEnrolled ? (
              <span className="text-green-600 font-medium">You're enrolled</span>
            ) : (
              <button
                onClick={handlePurchase}
                disabled={purchasing}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {purchasing ? 'Processing...' : 'Enroll Now'}
              </button>
            )}
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}