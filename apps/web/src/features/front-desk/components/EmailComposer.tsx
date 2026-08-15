// EmailComposer — Modal for composing and sending emails to leads (Row 65)

import { useState } from 'react';
import { sendEmailToLead } from '../services/supabase';

interface EmailComposerProps {
  leadId: string;
  recipientEmail: string;
  leadName: string;
  onSent?: () => void;
  onCancel: () => void;
}

export function EmailComposer({ leadId, recipientEmail, leadName, onSent, onCancel }: EmailComposerProps) {
  const [to] = useState(recipientEmail);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required');
      return;
    }

    setSending(true);
    setError(null);

    const { data, error: sendError } = await sendEmailToLead(leadId, subject, body);

    setSending(false);

    if (sendError) {
      setError(sendError.message || 'Failed to send email');
    } else if (data?.success === false) {
      setError(data.error || 'Failed to send email');
    } else {
      setSuccess(true);
      setTimeout(() => {
        onSent?.();
      }, 1500);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>Email {leadName}</h3>
          <button onClick={onCancel} style={styles.closeButton}>&times;</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>Email sent successfully!</div>}

        <div style={styles.field}>
          <label style={styles.label}>To</label>
          <input
            type="email"
            value={to}
            disabled
            style={{ ...styles.input, backgroundColor: '#f7fafc', cursor: 'not-allowed' }}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Subject *</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Enter subject..."
            style={styles.input}
          />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Body *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={8}
            style={{ ...styles.input, resize: 'vertical' as const }}
          />
        </div>

        <div style={styles.actions}>
          <button onClick={onCancel} style={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending || success}
            style={{
              ...styles.sendButton,
              opacity: sending || success ? 0.6 : 1,
              cursor: sending || success ? 'not-allowed' : 'pointer',
            }}
          >
            {sending ? 'Sending...' : success ? 'Sent!' : 'Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '24px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#718096',
    padding: '0 4px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#4a5568',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    marginTop: '16px',
  },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    backgroundColor: 'white',
    fontSize: '14px',
    color: '#4a5568',
    cursor: 'pointer',
  },
  sendButton: {
    padding: '8px 16px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
  },
  error: {
    padding: '12px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
  },
  success: {
    padding: '12px',
    backgroundColor: '#d1fae5',
    color: '#065f46',
    borderRadius: '6px',
    fontSize: '14px',
    marginBottom: '16px',
  },
};
