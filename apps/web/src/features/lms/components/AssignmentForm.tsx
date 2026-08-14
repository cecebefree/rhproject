import React, { useState, useEffect } from 'react';
import {
  insertAssignment,
  getTeacherCourses,
  type Assignment,
} from '../services/supabase';

interface AssignmentFormProps {
  tenantId: string;
  userId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface CourseOption {
  id: string;
  title: string;
}

export function AssignmentForm({
  tenantId,
  userId,
  onSuccess,
  onCancel,
}: AssignmentFormProps) {
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    courseId: '',
    title: '',
    description: '',
    maxScore: '100',
    weight: '1.0',
    dueDate: '',
  });

  useEffect(() => {
    loadCourses();
  }, [userId]);

  async function loadCourses() {
    try {
      const { data, error } = await getTeacherCourses(userId);
      if (error) throw error;
      setCourses(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load courses');
    }
  }

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function handleWeightChange(value: number) {
    setFormData((prev) => ({ ...prev, weight: value.toString() }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      if (!formData.courseId || !formData.title) {
        throw new Error('Course and title are required');
      }

      const maxScore = parseFloat(formData.maxScore) || 100;
      const weight = parseFloat(formData.weight) || 1.0;

      if (maxScore <= 0) throw new Error('Max score must be greater than 0');
      if (weight <= 0) throw new Error('Weight must be greater than 0');

      const { error: insertError } = await insertAssignment({
        tenant_id: tenantId,
        course_id: formData.courseId,
        title: formData.title,
        description: formData.description,
        max_score: maxScore,
        weight,
        due_date: formData.dueDate || undefined,
        created_by: userId,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setFormData({
        courseId: '',
        title: '',
        description: '',
        maxScore: '100',
        weight: '1.0',
        dueDate: '',
      });

      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  }

  const weightLabels: Record<number, string> = {
    0.25: 'Very Light (0.25)',
    0.5: 'Light (0.5)',
    1.0: 'Normal (1.0)',
    2.0: 'Heavy (2.0)',
    3.0: 'Very Heavy (3.0)',
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Create Assignment</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
          Assignment created successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Course *</label>
          <select
            name="courseId"
            value={formData.courseId}
            onChange={handleChange}
            required
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          >
            <option value="">Select course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="e.g. Midterm Exam, Homework 1"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Optional description or instructions"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Max Score</label>
            <input
              type="number"
              name="maxScore"
              value={formData.maxScore}
              onChange={handleChange}
              min="1"
              step="0.01"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Weight: {weightLabels[parseFloat(formData.weight)] || `${formData.weight}x`}
            </label>
            <input
              type="range"
              name="weight"
              value={formData.weight}
              onChange={(e) => handleWeightChange(parseFloat(e.target.value))}
              min="0.25"
              max="3"
              step="0.25"
              className="mt-1 block w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Light</span>
              <span>Normal</span>
              <span>Heavy</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Due Date</label>
          <input
            type="datetime-local"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleChange}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
}
