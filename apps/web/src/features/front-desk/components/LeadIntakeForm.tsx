import { useState } from 'react';
import { insertLead } from '../services/supabase';

interface LeadIntakeFormProps {
  tenantId: string;
  onSuccess: () => void;
}

export function LeadIntakeForm({ tenantId, onSuccess }: LeadIntakeFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const { error: insertError } = await insertLead({
      tenant_id: tenantId,
      name: name || undefined,
      email: email || undefined,
      phone: phone || undefined,
      source: source || undefined,
      notes: notes || undefined,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess(true);
      setName('');
      setEmail('');
      setPhone('');
      setSource('');
      setNotes('');
      onSuccess();
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '400px' }}>
      <h2>Lead Intake</h2>

      {error && <div style={{ color: 'red', padding: '8px', background: '#fee' }}>{error}</div>}
      {success && <div style={{ color: 'green', padding: '8px', background: '#efe' }}>Lead created successfully</div>}

      <label>
        Name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </label>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </label>

      <label>
        Phone
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </label>

      <label>
        Source
        <input
          type="text"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g., website, referral, walk-in"
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </label>

      <label>
        Notes
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          style={{ width: '100%', padding: '8px', marginTop: '4px' }}
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        style={{ padding: '10px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? 'Creating...' : 'Create Lead'}
      </button>
    </form>
  );
}
