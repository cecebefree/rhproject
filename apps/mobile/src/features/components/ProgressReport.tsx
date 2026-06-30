import React from 'react';
import { ProgressBar } from './ProgressBar';
import type { ProgressRecord } from '../services/admin';

interface ProgressReportProps {
  progress: ProgressRecord[];
}

export function ProgressReport({ progress }: ProgressReportProps) {
  if (progress.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No progress data found.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {progress.map((record, index) => (
        <div key={index} className="bg-white shadow rounded-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">{record.student_name || 'Unknown Student'}</h3>
              <p className="text-sm text-gray-500">{record.course_title}</p>
            </div>
            <span className="text-lg font-bold text-indigo-600">
              {record.progress_percentage}%
            </span>
          </div>
          <ProgressBar percentage={record.progress_percentage} showLabel={false} size="md" />
          <div className="mt-2 text-sm text-gray-500">
            {record.completed_chapters} of {record.total_chapters} chapters completed
          </div>
        </div>
      ))}
    </div>
  );
}