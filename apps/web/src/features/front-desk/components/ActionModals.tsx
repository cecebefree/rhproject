import { useState } from 'react';
import type { Inquiry } from '../../../types/front-desk';
import { useInquiryActions } from '../hooks/useInquiryActions';

interface TakeInquiryModalProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  currentCounselorId: string;
}

export function TakeInquiryModal({ inquiry, isOpen, onClose, onSuccess, currentCounselorId }: TakeInquiryModalProps) {
  const { takeInquiry, loading, error } = useInquiryActions();

  const handleTake = async () => {
    if (!inquiry) return;
    try {
      await takeInquiry({ inquiry_id: inquiry.id, counselor_id: currentCounselorId });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !inquiry) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-bold mb-4">Take Inquiry</h2>
        <p className="text-gray-600 mb-6">Assign <span className="font-semibold">{inquiry.contact_name}</span> to yourself?</p>
        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50" disabled={loading}>Cancel</button>
          <button onClick={handleTake} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading}>{loading ? 'Taking...' : 'Take Inquiry'}</button>
        </div>
      </div>
    </div>
  );
}

interface ScheduleCallbackModalProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ScheduleCallbackModal({ inquiry, isOpen, onClose, onSuccess }: ScheduleCallbackModalProps) {
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const { scheduleCallback, loading, error } = useInquiryActions();

  const handleSchedule = async () => {
    if (!inquiry || !scheduledAt) return;
    try {
      await scheduleCallback({ inquiry_id: inquiry.id, scheduled_at: scheduledAt, notes: notes || undefined });
      onSuccess?.();
      onClose();
      setScheduledAt('');
      setNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !inquiry) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-bold mb-4">Schedule Callback</h2>
        <p className="text-gray-600 mb-4">Schedule callback with <span className="font-semibold">{inquiry.contact_name}</span></p>
        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date & Time</label>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call instructions, talking points, etc." className="w-full px-3 py-2 border border-gray-300 rounded h-20 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50" disabled={loading}>Cancel</button>
          <button onClick={handleSchedule} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50" disabled={loading || !scheduledAt}>{loading ? 'Scheduling...' : 'Schedule'}</button>
        </div>
      </div>
    </div>
  );
}

interface SendEmailModalProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendEmailModal({ inquiry, isOpen, onClose, onSuccess }: SendEmailModalProps) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const { sendEmail, loading, error } = useInquiryActions();

  const handleSend = async () => {
    if (!inquiry || !subject || !body) return;
    try {
      await sendEmail({ inquiry_id: inquiry.id, subject, body, recipient_email: inquiry.contact_email });
      onSuccess?.();
      onClose();
      setSubject('');
      setBody('');
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !inquiry) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
        <h2 className="text-lg font-bold mb-4">Send Email</h2>
        <p className="text-gray-600 mb-4">Send email to <span className="font-semibold">{inquiry.contact_email}</span></p>
        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Subject</label>
            <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" className="w-full px-3 py-2 border border-gray-300 rounded" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Message</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Email body" className="w-full px-3 py-2 border border-gray-300 rounded h-32 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50" disabled={loading}>Cancel</button>
          <button onClick={handleSend} className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50" disabled={loading || !subject || !body}>{loading ? 'Sending...' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}

interface EscalateModalProps {
  inquiry: Inquiry | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EscalateModal({ inquiry, isOpen, onClose, onSuccess }: EscalateModalProps) {
  const [reason, setReason] = useState('');
  const [target, setTarget] = useState<'senior_counselor' | 'manager' | 'director'>('manager');
  const { escalateInquiry, loading, error } = useInquiryActions();

  const handleEscalate = async () => {
    if (!inquiry || !reason) return;
    try {
      await escalateInquiry({ inquiry_id: inquiry.id, escalation_reason: reason, escalation_target: target });
      onSuccess?.();
      onClose();
      setReason('');
      setTarget('manager');
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen || !inquiry) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-lg font-bold mb-4">Escalate Inquiry</h2>
        <p className="text-gray-600 mb-4">Escalate <span className="font-semibold">{inquiry.contact_name}</span></p>
        {error && <div className="text-red-600 text-sm mb-4">{error}</div>}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Escalate To</label>
            <select value={target} onChange={(e) => setTarget(e.target.value as 'senior_counselor' | 'manager' | 'director')} className="w-full px-3 py-2 border border-gray-300 rounded">
              <option value="senior_counselor">Senior Counselor</option>
              <option value="manager">Manager</option>
              <option value="director">Director</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this inquiry being escalated?" className="w-full px-3 py-2 border border-gray-300 rounded h-24 resize-none" />
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50" disabled={loading}>Cancel</button>
          <button onClick={handleEscalate} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50" disabled={loading || !reason}>{loading ? 'Escalating...' : 'Escalate'}</button>
        </div>
      </div>
    </div>
  );
}
