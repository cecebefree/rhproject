import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { RegistrationsTable } from '../components/RegistrationsTable';
import { ProgressReport } from '../components/ProgressReport';
import { getAllRegistrations, getAllProgress } from '../services/admin';
import type { RegistrationRecord, ProgressRecord } from '../services/admin';

export function AdminDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [progress, setProgress] = useState<ProgressRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'registrations' | 'progress'>('registrations');
  const [filterCourse, setFilterCourse] = useState<string>('');
  const [filterStudent, setFilterStudent] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      const [regs, prog] = await Promise.all([
        getAllRegistrations(),
        getAllProgress(),
      ]);
      setRegistrations(regs);
      setProgress(prog);
      setLoading(false);
    };
    loadData();
  }, []);

  if (profile?.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">You do not have admin access.</p>
      </div>
    );
  }

  const filteredRegistrations = registrations.filter(r => {
    if (filterCourse && r.course_id !== filterCourse) return false;
    if (filterStudent && r.student_id !== filterStudent) return false;
    return true;
  });

  const filteredProgress = progress.filter(p => {
    if (filterCourse && p.course_id !== filterCourse) return false;
    if (filterStudent && p.student_id !== filterStudent) return false;
    return true;
  });

  const uniqueCourses = [...new Map(registrations.map(r => [r.course_id, { id: r.course_id, title: r.course_title }])).values()];
  const uniqueStudents = [...new Map(registrations.map(r => [r.student_id, { id: r.student_id, name: r.student_name }])).values()];

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('registrations')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'registrations'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Registrations
        </button>
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'progress'
              ? 'border-b-2 border-indigo-500 text-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Student Progress
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Course</label>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Courses</option>
            {uniqueCourses.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Student</label>
          <select
            value={filterStudent}
            onChange={(e) => setFilterStudent(e.target.value)}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="">All Students</option>
            {uniqueStudents.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : activeTab === 'registrations' ? (
        <RegistrationsTable registrations={filteredRegistrations} />
      ) : (
        <ProgressReport progress={filteredProgress} />
      )}
    </div>
  );
}