// SettingsPage — Desk settings with team management, role management, and security

import { useState } from 'react';
import { TeamMembersList } from './TeamMembersList';
import { RoleManagementPage } from './RoleManagementPage';
import { TwoFactorManagementPage } from './TwoFactorManagementPage';

interface SettingsPageProps {
  deskId: string;
  tenantId: string;
  userId: string;
  email: string;
}

type SettingsTab = 'team' | 'roles' | 'general' | 'security';

const SETTINGS_TABS: Array<{ id: SettingsTab; label: string }> = [
  { id: 'team', label: 'Team Members' },
  { id: 'roles', label: 'Roles & Permissions' },
  { id: 'security', label: 'Security' },
  { id: 'general', label: 'General' },
];

export function SettingsPage({ deskId, tenantId, userId, email }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('team');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 24px', fontSize: '24px', fontWeight: '600', color: '#2d3748' }}>
        Desk Settings
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        {SETTINGS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #3182ce' : '2px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? '#3182ce' : '#718096',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '500' : '400',
              cursor: 'pointer',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'team' && (
        <TeamMembersList deskId={deskId} currentUserId={userId} />
      )}

      {activeTab === 'roles' && (
        <RoleManagementPage deskId={deskId} tenantId={tenantId} />
      )}

      {activeTab === 'security' && (
        <TwoFactorManagementPage userId={userId} tenantId={tenantId} email={email} />
      )}

      {activeTab === 'general' && (
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#718096' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>General settings coming soon</p>
        </div>
      )}
    </div>
  );
}
