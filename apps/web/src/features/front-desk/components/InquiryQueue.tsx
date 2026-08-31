import { useState } from 'react';
import { useInquiriesRealtime } from '../hooks/useInquiriesRealtime';
import { InquiryQueueSkeleton } from './InquiryQueueSkeleton';
import type { Inquiry } from '../../../types/front-desk';

interface InquiryQueueProps {
  onSelectInquiry?: (inquiry: Inquiry) => void;
  showDetailPanel?: boolean;
}

export function InquiryQueue({ onSelectInquiry, showDetailPanel = true }: InquiryQueueProps) {
  const [selectedInquiryId, setSelectedInquiryId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const { inquiries, loading, error } = useInquiriesRealtime({ enabled: true });

  const filteredInquiries = statusFilter === 'all'
    ? inquiries
    : inquiries.filter((inq) => inq.enrollment_status === statusFilter);

  const selectedInquiry = inquiries.find((inq) => inq.id === selectedInquiryId);

  const handleSelectInquiry = (inquiry: Inquiry) => {
    setSelectedInquiryId(inquiry.id);
    onSelectInquiry?.(inquiry);
  };

  if (error) {
    return <div className="text-red-600">Error: {error}</div>;
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Left: Filters + Table */}
      <div className="flex-1 flex flex-col">
        {/* Filters */}
        <div className="p-4 border-b">
          <h2 className="font-bold text-lg mb-3">Inquiry Queue</h2>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setSelectedInquiryId(null); }}
            className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Inquiries</option>
            <option value="pending">Pending</option>
            <option value="escalated">Escalated</option>
            <option value="offered">Offered</option>
            <option value="awaiting_docs">Awaiting Docs</option>
          </select>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <InquiryQueueSkeleton />
          ) : (
            <table className="w-full border-collapse text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="border p-2 text-left">Name</th>
                  <th className="border p-2 text-left">Age</th>
                  <th className="border p-2 text-left">Program</th>
                  <th className="border p-2 text-center">AI Score</th>
                  <th className="border p-2 text-left">Status</th>
                  <th className="border p-2 text-left">Timezone</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map((inq) => (
                  <tr
                    key={inq.id}
                    onClick={() => handleSelectInquiry(inq)}
                    className={`cursor-pointer hover:bg-blue-50 ${
                      selectedInquiryId === inq.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    <td className="border p-2">{inq.contact_name}</td>
                    <td className="border p-2">{inq.age_or_child_age}</td>
                    <td className="border p-2">{inq.program_interest}</td>
                    <td className="border p-2 text-center">
                      <span
                        className={`px-2 py-1 rounded text-white text-xs font-bold ${
                          inq.ai_category === 'hot_lead'
                            ? 'bg-red-500'
                            : inq.ai_category === 'warm'
                              ? 'bg-orange-500'
                              : inq.ai_category === 'nurture'
                                ? 'bg-yellow-500'
                                : 'bg-gray-500'
                        }`}
                      >
                        {inq.ai_category?.toUpperCase()}
                      </span>
                    </td>
                    <td className="border p-2 text-xs">{inq.enrollment_status}</td>
                    <td className="border p-2 text-xs">{inq.timezone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Right: Detail Panel */}
      {showDetailPanel && selectedInquiry && (
        <div className="w-80 border rounded p-4 overflow-auto bg-white shadow">
          <h2 className="font-bold text-lg mb-4">{selectedInquiry.contact_name}</h2>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-semibold">Email:</span> {selectedInquiry.contact_email}
            </div>
            <div>
              <span className="font-semibold">Phone:</span> {selectedInquiry.contact_phone}
            </div>
            <div>
              <span className="font-semibold">Program:</span> {selectedInquiry.program_interest}
            </div>
            <div>
              <span className="font-semibold">Timezone:</span> {selectedInquiry.timezone}
            </div>
            <div>
              <span className="font-semibold">Language:</span> {selectedInquiry.language}
            </div>
            <div>
              <span className="font-semibold">Status:</span> {selectedInquiry.enrollment_status}
            </div>
            <div>
              <span className="font-semibold">AI Category:</span>{' '}
              <span
                className={`px-2 py-1 rounded text-white text-xs font-bold ${
                  selectedInquiry.ai_category === 'hot_lead'
                    ? 'bg-red-500'
                    : selectedInquiry.ai_category === 'warm'
                      ? 'bg-orange-500'
                      : selectedInquiry.ai_category === 'nurture'
                        ? 'bg-yellow-500'
                        : 'bg-gray-500'
                }`}
              >
                {selectedInquiry.ai_category?.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="font-semibold">Call Scheduled:</span>{' '}
              {selectedInquiry.call_scheduled_at ? new Date(selectedInquiry.call_scheduled_at).toLocaleString() : 'No'}
            </div>
            <div>
              <span className="font-semibold">Call Outcome:</span> {selectedInquiry.call_outcome || 'Pending'}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 space-y-2 border-t pt-4">
            <button className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              Take Inquiry
            </button>
            <button className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700">
              Schedule Callback
            </button>
            <button className="w-full px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700">
              Send Email
            </button>
            <button className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700">
              Escalate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
