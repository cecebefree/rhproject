import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useEnrollment } from '../hooks/useEnrollment';
import { CourseCard } from '../components/CourseCard';
import type { EnrollmentWithCourse } from '../types/lms';

export function MyCoursesPage() {
  const { user } = useAuth();
  const { enrollments, loading, error } = useEnrollment(user?.id || null);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Please log in to view your courses.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Loading your courses...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Courses</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error.message}
        </div>
      )}

      {enrollments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">You haven't enrolled in any courses yet.</p>
          <a href="/catalog" className="text-indigo-600 hover:text-indigo-800 font-medium">
            Browse Course Catalog
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrollments.map((enrollment) => (
            <CourseCard
              key={enrollment.id}
              course={enrollment.course as any}
              isEnrolled={true}
              progressPercentage={enrollment.progress_percentage}
              onClick={() => {
                window.location.href = `/course/${enrollment.course_id}`;
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}