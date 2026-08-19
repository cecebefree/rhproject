import { useState } from 'react';
import {
  InquiryQueue,
  Dashboard,
  Timeline,
  TakeInquiryModal,
  ScheduleCallbackModal,
  SendEmailModal,
  EscalateModal,
  ToastContainer,
  useKeyboardShortcuts,
} from '../../features/front-desk';
import type { Inquiry } from '../../types/front-desk';

export function FrontDeskAdmin() {
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [takeModalOpen, setTakeModalOpen] = useState(false);
  const [callbackModalOpen, setCallbackModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);

  useKeyboardShortcuts({
    onTake: () => selectedInquiry && setTakeModalOpen(true),
    onSchedule: () => selectedInquiry && setCallbackModalOpen(true),
    onEmail: () => selectedInquiry && setEmailModalOpen(true),
    onEscalate: () => selectedInquiry && setEscalateModalOpen(true),
  });

  const handleActionSuccess = () => {};

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm p-4">
        <h1 className="text-2xl font-bold text-navy">Front Desk Admin</h1>
        <p className="text-sm text-gray-600">Manage inquiries, view metrics, track activity</p>
        <div className="text-xs text-gray-400 mt-1">
          Shortcuts: Ctrl+T (Take) | Ctrl+S (Schedule) | Ctrl+E (Email) | Ctrl+X (Escalate)
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 flex flex-col gap-4 p-4">
        {/* Dashboard Row */}
        <div className="bg-white rounded-lg shadow-sm">
          <Dashboard showPeriodSelector={true} />
        </div>

        {/* Queue + Timeline Row */}
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Left: InquiryQueue */}
          <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden">
            <InquiryQueue onSelectInquiry={setSelectedInquiry} showDetailPanel={false} />
          </div>

          {/* Right: Timeline + Details */}
          <div className="w-96 flex flex-col gap-4 min-h-0">
            {selectedInquiry && (
              <div className="bg-white rounded-lg shadow-sm p-4 overflow-auto">
                <h3 className="font-bold text-lg mb-3">{selectedInquiry.contact_name}</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="font-semibold text-gray-700">Email:</span><p className="text-gray-600">{selectedInquiry.contact_email}</p></div>
                  <div><span className="font-semibold text-gray-700">Phone:</span><p className="text-gray-600">{selectedInquiry.contact_phone}</p></div>
                  <div><span className="font-semibold text-gray-700">Program:</span><p className="text-gray-600">{selectedInquiry.program_interest}</p></div>
                  <div><span className="font-semibold text-gray-700">Status:</span><p className="text-gray-600">{selectedInquiry.enrollment_status}</p></div>
                  <div>
                    <span className="font-semibold text-gray-700">AI Category:</span>
                    <span className={`ml-2 px-2 py-1 rounded text-white text-xs font-bold ${selectedInquiry.ai_category === 'hot' ? 'bg-red-500' : selectedInquiry.ai_category === 'warm' ? 'bg-orange-500' : selectedInquiry.ai_category === 'nurture' ? 'bg-yellow-500' : 'bg-gray-500'}`}>
                      {selectedInquiry.ai_category?.toUpperCase()}
                    </span>
                  </div>
                  <div><span className="font-semibold text-gray-700">Timezone:</span><p className="text-gray-600">{selectedInquiry.timezone}</p></div>
                </div>

                <div className="mt-4 space-y-2 border-t pt-4">
                  <button onClick={() => setTakeModalOpen(true)} className="w-full px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium">Take Inquiry</button>
                  <button onClick={() => setCallbackModalOpen(true)} className="w-full px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 font-medium">Schedule Callback</button>
                  <button onClick={() => setEmailModalOpen(true)} className="w-full px-3 py-2 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700 font-medium">Send Email</button>
                  <button onClick={() => setEscalateModalOpen(true)} className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-medium">Escalate</button>
                </div>
              </div>
            )}

            <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden">
              <Timeline inquiryId={selectedInquiry?.id || null} />
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TakeInquiryModal inquiry={selectedInquiry} isOpen={takeModalOpen} onClose={() => setTakeModalOpen(false)} onSuccess={handleActionSuccess} currentCounselorId="current-user-id" />
      <ScheduleCallbackModal inquiry={selectedInquiry} isOpen={callbackModalOpen} onClose={() => setCallbackModalOpen(false)} onSuccess={handleActionSuccess} />
      <SendEmailModal inquiry={selectedInquiry} isOpen={emailModalOpen} onClose={() => setEmailModalOpen(false)} onSuccess={handleActionSuccess} />
      <EscalateModal inquiry={selectedInquiry} isOpen={escalateModalOpen} onClose={() => setEscalateModalOpen(false)} onSuccess={handleActionSuccess} />

      <ToastContainer />
    </div>
  );
}
