// Office Desk — Contacts page (child route of OfficeDeskPage)
// List view + detail view for contacts

import { useEffect, useState } from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { ContactDetail } from '../../office-desk/components/ContactDetail';
import { supabase } from '../../office-desk/services/supabase';

interface DeskContext {
  tenantId: string;
  deskId: string;
}

interface Contact {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  created_at: string;
}

export default function OfficeDeskContactsPage() {
  const { tenantId, deskId } = useOutletContext<DeskContext>();
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Load contacts
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data } = await supabase
        .from('office_desk.contacts')
        .select('id, name, email, phone, company, created_at')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('name');

      if (!cancelled && data) {
        setContacts(data);
        setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [tenantId]);

  // Detail view
  if (contactId) {
    return (
      <ContactDetail
        contactId={contactId}
        deskId={deskId}
        tenantId={tenantId}
        userId={userId}
        onBack={() => navigate('/service/office-desk/contacts')}
      />
    );
  }

  // List view
  return (
    <div>
      <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>Contacts</h2>

      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#718096' }}>Loading...</div>
      ) : contacts.length === 0 ? (
        <div style={{ padding: '48px', textAlign: 'center', color: '#a0aec0' }}>No contacts found.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 16px', backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', backgroundColor: '#f7fafc', borderBottom: '2px solid #e2e8f0', fontSize: '13px', fontWeight: '600', color: '#4a5568' }}>Company</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr
                key={c.id}
                onClick={() => navigate(`/service/office-desk/contacts/${c.id}`)}
                style={{ cursor: 'pointer', transition: 'background-color 0.15s' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '#f7fafc'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'transparent'; }}
              >
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f7fafc', fontSize: '14px', fontWeight: '500', color: '#2d3748' }}>{c.name || '—'}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f7fafc', fontSize: '14px', color: '#4a5568' }}>{c.email || '—'}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f7fafc', fontSize: '14px', color: '#4a5568' }}>{c.phone || '—'}</td>
                <td style={{ padding: '12px 16px', borderBottom: '1px solid #f7fafc', fontSize: '14px', color: '#4a5568' }}>{c.company || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
