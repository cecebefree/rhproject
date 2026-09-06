import React, { useState, useEffect } from 'react';
import { getChildTranscript } from '../../lms/services/supabase';

interface TranscriptViewProps {
  studentId: string;
  studentName: string;
  onBack: () => void;
}

interface CourseTranscript {
  course_id: string;
  course_title: string;
  weighted_average: number | null;
  grade_letter: string | null;
  grade_count: number;
}

interface TranscriptData {
  courses: CourseTranscript[];
  overall_gpa: number | null;
}

export function TranscriptView({
  studentId,
  studentName,
  onBack,
}: TranscriptViewProps) {
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTranscript();
  }, [studentId]);

  async function loadTranscript() {
    setLoading(true);
    try {
      const { data, error } = await getChildTranscript(studentId);
      if (error) throw error;
      setTranscript(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load transcript');
    } finally {
      setLoading(false);
    }
  }

  function getGpaColor(gpa: number | null): string {
    if (gpa === null) return '#718096';
    if (gpa >= 70) return '#38a169';
    if (gpa >= 60) return '#d69e2e';
    return '#e53e3e';
  }

  function getLetterGrade(percentage: number): string {
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  function getGpaLabel(gpa: number): string {
    if (gpa >= 93) return '4.0 (A)';
    if (gpa >= 90) return '3.7 (A-)';
    if (gpa >= 87) return '3.3 (B+)';
    if (gpa >= 83) return '3.0 (B)';
    if (gpa >= 80) return '2.7 (B-)';
    if (gpa >= 77) return '2.3 (C+)';
    if (gpa >= 73) return '2.0 (C)';
    if (gpa >= 70) return '1.7 (C-)';
    if (gpa >= 67) return '1.3 (D+)';
    if (gpa >= 60) return '1.0 (D)';
    return '0.0 (F)';
  }

  function handleDownloadTranscript() {
    if (!transcript) return;

    // Generate transcript text
    let text = `ACADEMIC TRANSCRIPT\n`;
    text += `${'='.repeat(50)}\n\n`;
    text += `Student: ${studentName}\n`;
    text += `Date: ${new Date().toLocaleDateString()}\n\n`;
    text += `SUBJECTS\n`;
    text += `${'-'.repeat(50)}\n`;

    for (const course of transcript.courses) {
      text += `${course.course_title.padEnd(30)} `;
      text += `${(course.weighted_average !== null ? `${course.weighted_average}%` : '--').padEnd(10)} `;
      text += `${course.grade_letter || '--'}\n`;
    }

    text += `\n${'='.repeat(50)}\n`;
    text += `Overall GPA: ${transcript.overall_gpa !== null ? `${transcript.overall_gpa}% (${getGpaLabel(transcript.overall_gpa)})` : '--'}\n`;
    text += `\n${'='.repeat(50)}\n`;
    text += `This is an official academic transcript.\n`;

    // Download as text file
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${studentName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center py-8 text-gray-500">Loading transcript...</div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
            &larr; Back
          </button>
          <h2 className="text-lg font-medium text-gray-900">
            Transcript — {studentName}
          </h2>
        </div>
        <button
          onClick={handleDownloadTranscript}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Download Transcript
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Overall GPA Card */}
      {transcript && (
        <div className="mb-6 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg text-white">
          <div className="text-sm opacity-90">Overall GPA</div>
          <div className="text-4xl font-bold mt-1">
            {transcript.overall_gpa !== null
              ? getGpaLabel(transcript.overall_gpa)
              : '--'}
          </div>
          <div className="text-sm opacity-75 mt-2">
            {transcript.courses.length} subjects completed
          </div>
        </div>
      )}

      {/* Transcript Table */}
      {!transcript || transcript.courses.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No subjects or grades found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Weighted Average
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Letter Grade
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Graded Assignments
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transcript.courses.map((course) => (
                <tr key={course.course_id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {course.course_title}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {course.weighted_average !== null ? (
                      <span
                        className="font-medium"
                        style={{ color: getGpaColor(course.weighted_average) }}
                      >
                        {course.weighted_average}%
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm">
                    {course.grade_letter ? (
                      <span className="font-medium text-gray-900">
                        {course.grade_letter}
                      </span>
                    ) : (
                      <span className="text-gray-400">--</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {course.grade_count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Grade Scale</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs text-gray-600">
          <div>A: 93-100%</div>
          <div>B+: 87-92%</div>
          <div>C+: 77-82%</div>
          <div>D+: 67-76%</div>
          <div>F: Below 60%</div>
        </div>
      </div>
    </div>
  );
}
