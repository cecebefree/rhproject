import React, { useState, useEffect } from 'react';
import { CourseCard } from '../components/CourseCard';
import { CourseDetailModal } from '../components/CourseDetailModal';
import { getPublishedCoursesWithInstructors } from '../services/purchase';
import { useAuth } from '../hooks/useAuth';
import { useEnrollment } from '../hooks/useEnrollment';
import type { CourseWithInstructor } from '../types/lms';

export function CourseCatalogPage() {
  const [courses, setCourses] = useState<CourseWithInstructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<CourseWithInstructor | null>(null);
  
  const { user, isAuthenticated } = useAuth();
  const { isEnrolled, getEnrollment } = useEnrollment(user?.id || null);

  useEffect(() => {
    const loadCourses = async () => {
      const data = await getPublishedCoursesWithInstructors();
      setCourses(data);
      setLoading(false);
    };
    loadCourses();
  }, []);

  const handleCourseClick = (course: CourseWithInstructor) => {
    setSelectedCourse(course);
  };

  const handleCloseModal = () => {
    setSelectedCourse(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-gray-500">Loading courses...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Course Catalog</h1>
      
      {courses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No courses available yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              isEnrolled={isEnrolled(course.id)}
              progressPercentage={getEnrollment(course.id)?.progress_percentage}
              onClick={() => handleCourseClick(course)}
            />
          ))}
        </div>
      )}

      {selectedCourse && (
        <CourseDetailModal
          course={selectedCourse}
          isEnrolled={isEnrolled(selectedCourse.id)}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}