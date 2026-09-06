// ContractDetail — shows full contract details with signing + date editing

import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { generateContractHTML, printPDF } from '../../lms/utils/pdfGenerator';

interface Contract {
  id: string;
  tenant_id: string;
  student_id: string;
  enrollment_id: string | null;
  registration_id: string | null;
  status: string;
  title: string;
  terms: Record<string, unknown>;
  start_date: string | null;
  end_date: string | null;
  signed_at: string | null;
  signed_by: string | null;
  created_at: string;
  students?: { first_name: string; last_name: string; email: string | null } | null;
}

interface ContractDetailProps {
  contract: Contract;
  onBack: () => void;
  onUpdated: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  pending_signature: 'Awaiting Signature',
  active: 'Active',
  expired: 'Expired',
  terminated: 'Terminated',
};

const STATUS_COLORS: Record<string, string> = {
  draft: '#e2e8f0',
  pending_signature: '#fef3c7',
  active: '#27ae60',
  expired: '#fee2e2',
  terminated: '#fee2e2',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateInput(iso: string | null): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

export function ContractDetail({ contract, onBack, onUpdated }: ContractDetailProps) {
  const [startDate, setStartDate] = useState(formatDateInput(contract.start_date));
  const [endDate, setEndDate] = useState(formatDateInput(contract.end_date));
  const [saving, setSaving] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSaveDates() {
    setSaving(true);
    setError(null);
    setSuccess(null);

    const { error: updateError } = await supabase.rpc('update_contract_dates', {
      p_contract_id: contract.id,
      p_start_date: startDate || null,
      p_end_date: endDate || null,
    });

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess('Dates updated');
      onUpdated();
    }
  }

  async function handleSign() {
    setSigning(true);
    setError(null);
    setSuccess(null);

    const { error: signError } = await supabase.rpc('sign_contract', {
      p_contract_id: contract.id,
    });

    setSigning(false);

    if (signError) {
      setError(signError.message);
    } else {
      setSuccess('Contract signed and activated');
      onUpdated();
    }
  }

  const canSign = contract.status === 'draft' || contract.status === 'pending_signature';
  const termsObj = contract.terms ?? {};

  return (
    <div>
      <button onClick={onBack} className="text-sm mb-4" style={{ color: '#2563EB' }}>
        ← Back to Contracts
      </button>

      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: '#1A242B' }}>
            {contract.title}
          </h2>
          <p className="text-sm mt-1" style={{ color: '#54626C' }}>
            {contract.students
              ? `${contract.students.first_name} ${contract.students.last_name}`
              : 'Unknown Student'}
          </p>
        </div>
        <span className="text-sm px-3 py-1 rounded-full font-medium"
          style={{ backgroundColor: STATUS_COLORS[contract.status], color: '#1A242B' }}>
          {STATUS_LABELS[contract.status]}
        </span>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-6">
        {/* Dates */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#1A242B' }}>Contract Dates</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: '#54626C' }}>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#54626C' }}>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded"
              />
            </div>
            <button
              onClick={handleSaveDates}
              disabled={saving}
              className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-100"
            >
              {saving ? 'Saving...' : 'Save Dates'}
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#1A242B' }}>Details</h3>
          <div className="space-y-2 text-sm" style={{ color: '#54626C' }}>
            <p>Created: {formatDate(contract.created_at)}</p>
            <p>Signed: {contract.signed_at ? formatDate(contract.signed_at) : 'Not yet signed'}</p>
            {contract.students?.email && <p>Email: {contract.students.email}</p>}
          </div>
        </div>
      </div>

      {/* Terms */}
      {Object.keys(termsObj).length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-semibold mb-3" style={{ color: '#1A242B' }}>Contract Terms</h3>
          <div className="text-sm" style={{ color: '#54626C' }}>
            <pre className="whitespace-pre-wrap font-sans">
              {JSON.stringify(termsObj, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Sign + PDF Buttons */}
      <div className="mt-6 flex gap-3">
        {canSign && (
          <>
            <button
              onClick={handleSign}
              disabled={signing}
              className="px-6 py-3 text-sm font-medium text-white rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#27ae60' }}
            >
              {signing ? 'Signing...' : 'Sign Contract'}
            </button>
            <p className="text-xs mt-2" style={{ color: '#54626C' }}>
              This will mark the contract as active and set the start date to today if not set.
            </p>
          </>
        )}
        <button
          onClick={() => {
            const html = generateContractHTML({
              contractId: contract.id,
              title: contract.title,
              terms: contract.terms,
              startDate: contract.start_date,
              endDate: contract.end_date,
              studentName: contract.students ? `${contract.students.first_name} ${contract.students.last_name}` : 'Unknown',
              studentEmail: contract.students?.email ?? '',
              courseName: (contract.terms as any)?.course_name ?? 'N/A',
              signedAt: contract.signed_at,
              signedBy: contract.signed_by,
            });
            printPDF(html, `contract-${contract.id}.pdf`);
          }}
          className="px-4 py-2 text-sm font-medium rounded-lg border"
          style={{ borderColor: '#d1d5db', color: '#374151' }}
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}
