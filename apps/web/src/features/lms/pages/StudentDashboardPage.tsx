import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useEnrollment } from '../hooks/useEnrollment';
import { CourseProgressCard } from '../components/CourseProgressCard';
import { getStudentProgress } from '../services/progress';
import { getCourseById } from '../services/purchase';
import type { Course } from '../types/lms';

interface ProgressData {
  courseId: string;
  courseTitle: string;
  completedChapters: number;
  totalChapters: number;
  progressPercentage: number;
}

export function StudentDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { enrollments } = useEnrollment(user?.id || null);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [courses, setCourses] = useState<Record<string, Course>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProgress = async () => {
      if (!user) return;

      const progress = await getStudentProgress(user.id);
      setProgressData(progress);

      const courseMap: Record<string, Course> = {};
      for (const p of progress) {
        const course = await getCourseById(p.courseId);
        if (course) {
          courseMap[p.courseId] = course;
        }
      }
      setCourses(courseMap);
      setLoading(false);
    };

    loadProgress();
  }, [user]);

  if (!user) {
    navigate('/login');
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  const totalCourses = progressData.length;
  const completedCourses = progressData.filter(p => p.progressPercentage === 100).length;
  const averageProgress = totalCourses > 0
    ? Math.round(progressData.reduce((acc, p) => acc + p.progressPercentage, 0) / totalCourses)
    : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Learning Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-1">Enrolled Courses</p>
          <p className="text-3xl font-bold text-gray-900">{totalCourses}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-1">Completed</p>
          <p className="text-3xl font-bold text-green-600">{completedCourses}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500 mb-1">Average Progress</p>
          <p className="text-3xl font-bold text-indigo-600">{averageProgress}%</p>
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Courses</h2>

      {progressData.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 mb-4">You haven't started learning yet.</p>
          <a href="/catalog" className="text-indigo-600 hover:text-indigo-800 font-medium">
            Browse Courses
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {progressData.map((progress) => {
            const course = courses[progress.courseId];
            if (!course) return null;

            return (
              <CourseProgressCard
                key={progress.courseId}
                course={course}
                completedChapters={progress.completedChapters}
                totalChapters={progress.totalChapters}
                progressPercentage={progress.progressPercentage}
                onClick={() => navigate(`/course/${progress.courseId}`)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}