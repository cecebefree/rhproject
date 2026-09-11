/**
 * PipelineDetail — Detailed view of an enrollment pipeline with timeline and actions.
 */

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface PipelineDetail {
  id: string;
  pipeline_type: 'family' | 'teacher';
  stage: string;
  status: string;
  form_token: string | null;
  form_sent_at: string | null;
  form_submitted_at: string | null;
  contract_id: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  access_approved_at: string | null;
  access_approved_by: string | null;
  stage_history: Array<{
    stage: string;
    timestamp: string;
    actor: string;
    action: string;
    notes?: string;
  }>;
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
    contact_phone: string;
    payment_method: string;
  };
}

// ═══════════════════════════════════════════════════════════
// STAGE LABELS
// ═══════════════════════════════════════════════════════════

const STAGE_LABELS: Record<string, string> = {
  registration_confirmed: 'Registration Confirmed',
  form_sent: 'Enrollment Form Sent',
  form_submitted: 'Enrollment Form Submitted',
  profiles_created: 'Profiles Created',
  contract_sent: 'Contract Sent',
  contract_signed: 'Contract Signed',
  curriculum_selected: 'Curriculum & Schedule Selected',
  debit_verified: 'Debit Order Verified',
  human_review: 'Human Review',
  access_approved: 'Access Approved',
  active: 'Active',
  application_received: 'Application Received',
  profile_created: 'Profile Created',
  subjects_assigned: 'Subjects Assigned',
  schedule_paired: 'Schedule Paired',
};

const STAGE_ACTIONS: Record<string, Array<{ label: string; action: string; requiresInput?: boolean }>> = {
  registration_confirmed: [
    { label: 'Send Enrollment Form', action: 'send_form' },
  ],
  form_submitted: [
    { label: 'Process Enrollment', action: 'process' },
  ],
  profiles_created: [
    { label: 'Generate Contract', action: 'generate_contract' },
  ],
  contract_sent: [],
  contract_signed: [
    { label: 'Auto-Assign Classes', action: 'assign_classes' },
  ],
  curriculum_selected: [
    { label: 'Verify Debit Order', action: 'verify_debit' },
  ],
  debit_verified: [
    { label: 'Move to Human Review', action: 'start_review' },
  ],
  human_review: [
    { label: 'Approve Enrollment', action: 'approve', requiresInput: true },
  ],
};

// ═══════════════════════════════════════════════════════════
// TIMELINE COMPONENT
// ═══════════════════════════════════════════════════════════

function Timeline({ history }: { history: PipelineDetail['stage_history'] }) {
  if (!history || history.length === 0) {
    return <div className="text-sm text-gray-500">No history yet</div>;
  }

  return (
    <div className="space-y-3">
      {history.map((entry, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            {i < history.length - 1 && <div className="w-0.5 flex-1 bg-gray-200" />}
          </div>
          <div className="pb-4">
            <div className="text-sm font-medium">{STAGE_LABELS[entry.stage] || entry.stage}</div>
            <div className="text-xs text-gray-500">
              {new Date(entry.timestamp).toLocaleString('en-ZA')}
              {entry.actor && ` — ${entry.actor}`}
            </div>
            {entry.notes && <div className="text-xs text-gray-600 mt-1">{entry.notes}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

interface PipelineDetailProps {
  pipelineId: string;
  onBack: () => void;
  onRefresh: () => void;
}

export default function PipelineDetail({ pipelineId, onBack, onRefresh }: PipelineDetailProps) {
  const [pipeline, setPipeline] = useState<PipelineDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    async function fetchPipeline() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('office_desk.enrollment_pipelines')
          .select(`
            *,
            registration:office_desk.registrations(id, student_name, student_email, course_name),
            family_account:office_desk.family_accounts(id, family_code, contact_email, contact_phone, payment_method)
          `)
          .eq('id', pipelineId)
          .single();

        if (error) {
          console.error('Failed to fetch pipeline:', error);
          return;
        }

        setPipeline(data as unknown as PipelineDetail);
      } finally {
        setLoading(false);
      }
    }

    fetchPipeline();
  }, [pipelineId]);

  async function handleAction(action: string) {
    setActionLoading(true);
    try {
      let functionName = '';
      const body: Record<string, unknown> = { pipeline_id: pipelineId };

      switch (action) {
        case 'send_form':
          functionName = 'send-enrollment-form';
          break;
        case 'process':
          functionName = 'process-enrollment';
          break;
        case 'generate_contract':
          functionName = 'generate-contract';
          break;
        case 'assign_classes':
          functionName = 'auto-assign-classes';
          break;
        case 'verify_debit':
          functionName = 'verify-debit-order';
          break;
        case 'start_review':
          // Manual stage move
          functionName = 'send-pipeline-email';
          body.stage = 'human_review';
          break;
        case 'approve':
          functionName = 'approve-enrollment';
          body.notes = reviewNotes;
          break;
        default:
          return;
      }

      const { error } = await supabase.functions.invoke(functionName, { body });

      if (error) {
        console.error(`Action ${action} failed:`, error);
        alert(`Action failed: ${error.message}`);
        return;
      }

      // Refresh pipeline data
      const { data: updated } = await supabase
        .from('office_desk.enrollment_pipelines')
        .select(`
          *,
          registration:office_desk.registrations(id, student_name, student_email, course_name),
          family_account:office_desk.family_accounts(id, family_code, contact_email, contact_phone, payment_method)
        `)
        .eq('id', pipelineId)
        .single();

      if (updated) {
        setPipeline(updated as unknown as PipelineDetail);
      }

      onRefresh();
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>
    );
  }

  if (!pipeline) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">Pipeline not found</div>
    );
  }

  const actions = STAGE_ACTIONS[pipeline.stage] || [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
            ← Back
          </button>
          <div>
            <h2 className="text-lg font-semibold">
              {pipeline.registration?.student_name || 'Unknown Student'}
            </h2>
            <div className="text-sm text-gray-500">
              {pipeline.pipeline_type === 'family' ? 'Family' : 'Teacher'} Enrollment
              {' · '}
              <span className="font-medium">{STAGE_LABELS[pipeline.stage] || pipeline.stage}</span>
            </div>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          Created: {new Date(pipeline.created_at).toLocaleDateString('en-ZA')}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Registration Info */}
            {pipeline.registration && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-3">Registration Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Student Name:</span>
                    <div className="font-medium">{pipeline.registration.student_name}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <div>{pipeline.registration.student_email}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Course:</span>
                    <div>{pipeline.registration.course_name || 'Not specified'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <div className="font-medium">{pipeline.status}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Family Account Info */}
            {pipeline.family_account && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-3">Family Account</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Family Code:</span>
                    <div className="font-medium">{pipeline.family_account.family_code}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Contact Email:</span>
                    <div>{pipeline.family_account.contact_email}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Contact Phone:</span>
                    <div>{pipeline.family_account.contact_phone || 'Not set'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Payment Method:</span>
                    <div>{pipeline.family_account.payment_method || 'Not set'}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Info */}
            {pipeline.form_token && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-3">Enrollment Form</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Form Token:</span>
                    <div className="font-mono text-xs">{pipeline.form_token}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Sent:</span>
                    <div>{pipeline.form_sent_at ? new Date(pipeline.form_sent_at).toLocaleString('en-ZA') : 'Not sent'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Submitted:</span>
                    <div>{pipeline.form_submitted_at ? new Date(pipeline.form_submitted_at).toLocaleString('en-ZA') : 'Not submitted'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Actions & Timeline */}
          <div className="space-y-6">
            {/* Actions */}
            {actions.length > 0 && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-medium mb-3">Actions</h3>
                <div className="space-y-2">
                  {actions.map((action) => (
                    <div key={action.action}>
                      {action.requiresInput && showNotes ? (
                        <div className="space-y-2">
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            placeholder="Review notes (optional)"
                            className="w-full border rounded px-3 py-2 text-sm"
                            rows={3}
                          />
                          <button
                            onClick={() => handleAction(action.action)}
                            disabled={actionLoading}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {actionLoading ? 'Processing...' : action.label}
                          </button>
                        </div>
                      ) : action.requiresInput ? (
                        <button
                          onClick={() => setShowNotes(true)}
                          className="w-full bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700"
                        >
                          {action.label}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAction(action.action)}
                          disabled={actionLoading}
                          className="w-full bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                        >
                          {actionLoading ? 'Processing...' : action.label}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-medium mb-3">Timeline</h3>
              <Timeline history={pipeline.stage_history || []} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
