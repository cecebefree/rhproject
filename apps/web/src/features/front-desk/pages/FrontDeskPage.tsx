import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { LeadIntakeForm } from '../components/LeadIntakeForm';
import { LeadList } from '../components/LeadList';
import { LeadDetail } from '../components/LeadDetail';

type Tab = 'intake' | 'list' | 'detail';

export function FrontDeskPage() {
  const [activeTab, setActiveTab] = useState<Tab>('intake');
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      setTenantId(profileData.tenant_id);
      setLoading(false);
    }

    loadProfile();
  }, []);

  const handleLeadCreated = () => {
    setActiveTab('list');
  };

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setActiveTab('detail');
  };

  const handleBackFromDetail = () => {
    setSelectedLeadId(null);
    setActiveTab('list');
  };

  if (loading) return <div style={{ padding: '24px' }}>Loading...</div>;
  if (error) return <div style={{ padding: '24px', color: 'red' }}>Error: {error}</div>;
  if (!tenantId) return <div style={{ padding: '24px' }}>No tenant associated</div>;

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1>Front Desk</h1>

      <nav style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid #ddd', paddingBottom: '8px' }}>
        <button
          onClick={() => setActiveTab('intake')}
          style={{ padding: '8px 16px', background: activeTab === 'intake' ? '#0070f3' : '#eee', color: activeTab === 'intake' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Intake
        </button>
        <button
          onClick={() => setActiveTab('list')}
          style={{ padding: '8px 16px', background: activeTab === 'list' ? '#0070f3' : '#eee', color: activeTab === 'list' ? 'white' : 'black', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Lead List
        </button>
      </nav>

      {activeTab === 'intake' && <LeadIntakeForm tenantId={tenantId} onSuccess={handleLeadCreated} />}
      {activeTab === 'list' && <LeadList tenantId={tenantId} onSelectLead={handleSelectLead} />}
      {activeTab === 'detail' && selectedLeadId && (
        <LeadDetail leadId={selectedLeadId} onBack={handleBackFromDetail} />
      )}
    </div>
  );
}
