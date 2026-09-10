/**
 * EnrollmentPipeline — Kanban board showing enrollment pipelines by stage.
 */

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface Pipeline {
  id: string;
  pipeline_type: 'family' | 'teacher';
  stage: string;
  status: string;
  form_sent_at: string | null;
  form_submitted_at: string | null;
  contract_id: string | null;
  access_approved_at: string | null;
  created_at: string;
  updated_at: string;
  registration?: {
    id: string;
    student_name: string;
    student_email: string;
    course_name: string;
  };
  family_account?: {
    id: string;
    family_code: string;
    contact_email: string;
  };
}

// ═══════════════════════════════════════════════════════════
// PIPELINE STAGES
// ═══════════════════════════════════════════════════════════

const FAMILY_STAGES = [
  { key: 'registration_confirmed', label: 'Registration', color: 'bg-blue-100 border-blue-300', headerColor: 'bg-blue-200' },
  { key: 'form_sent', label: 'Form Sent', color: 'bg-yellow-100 border-yellow-300', headerColor: 'bg-yellow-200' },
  { key: 'form_submitted', label: 'Form Submitted', color: 'bg-orange-100 border-orange-300', headerColor: 'bg-orange-200' },
  { key: 'profiles_created', label: 'Profiles Created', color: 'bg-purple-100 border-purple-300', headerColor: 'bg-purple-200' },
  { key: 'contract_sent', label: 'Contract Sent', color: 'bg-indigo-100 border-indigo-300', headerColor: 'bg-indigo-200' },
  { key: 'contract_signed', label: 'Contract Signed', color: 'bg-teal-100 border-teal-300', headerColor: 'bg-teal-200' },
  { key: 'curriculum_selected', label: 'Curriculum Selected', color: 'bg-cyan-100 border-cyan-300', headerColor: 'bg-cyan-200' },
  { key: 'debit_verified', label: 'Debit Verified', color: 'bg-emerald-100 border-emerald-300', headerColor: 'bg-emerald-200' },
  { key: 'human_review', label: 'Human Review', color: 'bg-amber-100 border-amber-300', headerColor: 'bg-amber-200' },
  { key: 'access_approved', label: 'Approved', color: 'bg-green-100 border-green-300', headerColor: 'bg-green-200' },
  { key: 'active', label: 'Active', color: 'bg-green-50 border-green-200', headerColor: 'bg-green-100' },
];

const TEACHER_STAGES = [
  { key: 'application_received', label: 'Application', color: 'bg-blue-100 border-blue-300', headerColor: 'bg-blue-200' },
  { key: 'profile_created', label: 'Profile Created', color: 'bg-purple-100 border-purple-300', headerColor: 'bg-purple-200' },
  { key: 'contract_sent', label: 'Contract Sent', color: 'bg-indigo-100 border-indigo-300', headerColor: 'bg-indigo-200' },
  { key: 'contract_signed', label: 'Contract Signed', color: 'bg-teal-100 border-teal-300', headerColor: 'bg-teal-200' },
  { key: 'subjects_assigned', label: 'Subjects Assigned', color: 'bg-cyan-100 border-cyan-300', headerColor: 'bg-cyan-200' },
  { key: 'human_review', label: 'Human Review', color: 'bg-amber-100 border-amber-300', headerColor: 'bg-amber-200' },
  { key: 'access_approved', label: 'Approved', color: 'bg-green-100 border-green-300', headerColor: 'bg-green-200' },
  { key: 'active', label: 'Active', color: 'bg-green-50 border-green-200', headerColor: 'bg-green-100' },
];

// ═══════════════════════════════════════════════════════════
// PIPELINE CARD
// ═══════════════════════════════════════════════════════════

interface PipelineCardProps {
  pipeline: Pipeline;
  onClick: () => void;
}

function PipelineCard({ pipeline, onClick }: PipelineCardProps) {
  const studentName = pipeline.registration?.student_name || 'Unknown';
  const email = pipeline.registration?.student_email || '';
  const familyCode = pipeline.family_account?.family_code || '';

  return (
    <button
      onClick={onClick}
      className="bg-white p-3 rounded shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow text-left w-full"
    >
      <div className="font-medium text-sm">{studentName}</div>
      {email && <div className="text-xs text-gray-500 truncate">{email}</div>}
      {familyCode && <div className="text-xs text-blue-600 mt-1">{familyCode}</div>}
      <div className="text-xs text-gray-400 mt-1">
        {new Date(pipeline.created_at).toLocaleDateString('en-ZA')}
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

interface EnrollmentPipelineProps {
  onSelectPipeline?: (pipelineId: string) => void;
}

export default function EnrollmentPipeline({ onSelectPipeline }: EnrollmentPipelineProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'family' | 'teacher'>('all');
  const [search, setSearch] = useState('');

  const stages = filter === 'teacher' ? TEACHER_STAGES : FAMILY_STAGES;

  const fetchPipelines = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('office_desk.enrollment_pipelines')
        .select(`
          *,
          registration:office_desk.registrations(id, student_name, student_email, course_name),
          family_account:office_desk.family_accounts(id, family_code, contact_email)
        `)
        .in('status', ['active', 'on_hold'])
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('pipeline_type', filter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch pipelines:', error);
        return;
      }

      setPipelines((data as unknown as Pipeline[]) || []);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const filteredPipelines = pipelines.filter((p) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      p.registration?.student_name?.toLowerCase().includes(searchLower) ||
      p.registration?.student_email?.toLowerCase().includes(searchLower) ||
      p.family_account?.family_code?.toLowerCase().includes(searchLower)
    );
  });

  const getPipelinesForStage = (stageKey: string) =>
    filteredPipelines.filter((p) => p.stage === stageKey);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Enrollment Pipeline</h2>
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="border rounded px-3 py-1.5 text-sm"
            >
              <option value="all">All Pipelines</option>
              <option value="family">Family Only</option>
              <option value="teacher">Teacher Only</option>
            </select>
            <input
              type="text"
              placeholder="Search by name, email, or family code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded px-3 py-1.5 text-sm w-64"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 text-sm text-gray-600">
          <span>Total: {filteredPipelines.length}</span>
          <span>Family: {filteredPipelines.filter((p) => p.pipeline_type === 'family').length}</span>
          <span>Teacher: {filteredPipelines.filter((p) => p.pipeline_type === 'teacher').length}</span>
        </div>
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">Loading...</div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-3 min-w-max">
            {stages.map((stage) => {
              const stagePipelines = getPipelinesForStage(stage.key);
              return (
                <div
                  key={stage.key}
                  className={`w-64 flex-shrink-0 rounded-lg border ${stage.color}`}
                >
                  <div className={`p-3 rounded-t ${stage.headerColor}`}>
                    <div className="font-medium text-sm">{stage.label}</div>
                    <div className="text-xs text-gray-600">{stagePipelines.length}</div>
                  </div>
                  <div className="p-2 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                    {stagePipelines.map((pipeline) => (
                      <PipelineCard
                        key={pipeline.id}
                        pipeline={pipeline}
                        onClick={() => onSelectPipeline?.(pipeline.id)}
                      />
                    ))}
                    {stagePipelines.length === 0 && (
                      <div className="text-xs text-gray-400 text-center py-4">No pipelines</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
