import React from 'react';
import type { CourseWithInstructor } from '../types/lms';

interface CourseCardProps {
  course: CourseWithInstructor;
  isEnrolled?: boolean;
  progressPercentage?: number;
  onClick?: () => void;
}

export function CourseCard({ course, isEnrolled, progressPercentage, onClick }: CourseCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
    >
      <div className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{course.title}</h3>
            <p className="text-sm text-gray-500">by {course.instructor?.name || 'Instructor'}</p>
          </div>
          <span className="text-lg font-bold text-indigo-600">
            ${course.price.toFixed(2)}
          </span>
        </div>

        {course.description && (
          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
            {course.description}
          </p>
        )}

        {isEnrolled && typeof progressPercentage === 'number' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Progress</span>
              <span>{progressPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-600 h-2 rounded-full"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {isEnrolled ? (
          <span className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
            Enrolled
          </span>
        ) : (
          <span className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
            Available
          </span>
        )}
      </div>
    </div>
  );
}