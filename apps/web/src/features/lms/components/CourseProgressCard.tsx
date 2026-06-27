import React from 'react';
import { ProgressBar } from './ProgressBar';
import type { Course } from '../types/lms';

interface CourseProgressCardProps {
  course: Course;
  completedChapters: number;
  totalChapters: number;
  progressPercentage: number;
  lastAccessedAt?: string;
  onClick?: () => void;
}

export function CourseProgressCard({
  course,
  completedChapters,
  totalChapters,
  progressPercentage,
  lastAccessedAt,
  onClick,
}: CourseProgressCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
          {lastAccessedAt && (
            <p className="text-sm text-gray-500">
              Last accessed: {new Date(lastAccessedAt).toLocaleDateString()}
            </p>
          )}
        </div>
        {progressPercentage === 100 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            ✓ Complete
          </span>
        )}
      </div>

      <ProgressBar percentage={progressPercentage} size="md" className="mb-2" />

      <p className="text-sm text-gray-600">
        {completedChapters} of {totalChapters} chapters completed
      </p>
    </div>
  );
}