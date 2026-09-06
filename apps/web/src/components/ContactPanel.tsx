import { useState } from 'react';

interface ContactActivity {
  type: 'attendance' | 'disciplinary' | 'medical' | 'general';
  label: string;
  description: string;
  timestamp: string;
  icon: string;
}

interface ContactPanelProps {
  isOpen: boolean;
  onClose: () => void;
  profileName: string;
  profileType: 'Student' | 'Parent' | 'Guardian';
  mainContact: {
    name: string;
    role: string;
    email: string;
    phone: string;
  };
  activities: ContactActivity[];
}

const ACTIVITY_ICONS: Record<ContactActivity['type'], { icon: string; bgColor: string; borderColor: string; iconColor: string }> = {
  attendance: { icon: 'event_note', bgColor: '#ffffff', borderColor: 'rgba(195,199,204,0.3)', iconColor: '#54626C' },
  disciplinary: { icon: 'gavel', bgColor: '#ffffff', borderColor: 'rgba(195,199,204,0.3)', iconColor: '#54626C' },
  medical: { icon: 'medical_services', bgColor: '#ffffff', borderColor: 'rgba(232,160,32,0.3)', iconColor: '#E8A020' },
  general: { icon: 'info', bgColor: '#ffffff', borderColor: 'rgba(195,199,204,0.3)', iconColor: '#54626C' },
};

export default function ContactPanel({ isOpen, onClose, profileName, profileType, mainContact, activities }: ContactPanelProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'OFFICE DESK' | 'SCHOOL DESK'>('ALL');

  const initials = mainContact.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ backgroundColor: 'rgba(39,57,70,0.2)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 h-full z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ width: '400px', maxWidth: '100vw', backgroundColor: '#F8F7F4' }}
      >
        {/* Header */}
        <div className="p-6 pt-12">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>{profileName}</h2>
              <p style={{ fontSize: '12px', color: '#54626C' }}>{profileType} Profile</p>
            </div>
            <button
              onClick={onClose}
              className="hover:opacity-70 transition-opacity cursor-pointer"
              style={{ color: '#54626C' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-6">
            {[
              { icon: 'mail', label: 'Email' },
              { icon: 'call', label: 'Call' },
              { icon: 'edit_note', label: 'Note' },
              { icon: 'more_horiz', label: 'More' },
            ].map((action) => (
              <button
                key={action.icon}
                className="flex-1 h-12 flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer"
                style={{ border: '1px solid rgba(195,199,204,0.5)', backgroundColor: '#ffffff', borderRadius: '4px' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#54626C' }}>{action.icon}</span>
              </button>
            ))}
          </div>

          {/* Log Activity Button */}
          <button
            className="w-full py-3 flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
            style={{ backgroundColor: '#273946', color: '#ffffff', borderRadius: '4px', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add_comment</span>
            LOG ACTIVITY
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b" style={{ borderColor: 'rgba(195,199,204,0.3)' }}>
          <div className="flex px-6">
            {(['ALL', 'OFFICE DESK', 'SCHOOL DESK'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="py-3 px-4 transition-colors cursor-pointer"
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  fontWeight: 600,
                  borderBottom: activeTab === tab ? '2px solid #273946' : '2px solid transparent',
                  color: activeTab === tab ? '#273946' : '#54626C',
                }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Main Contact Section */}
          <div className="mb-8">
            <h3 className="mb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Main Contact</h3>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded flex items-center justify-center"
                style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '12px', fontWeight: 700 }}>
                {initials}
              </div>
              <div>
                <p style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', fontWeight: 500, color: '#273946' }}>{mainContact.name}</p>
                <p style={{ fontSize: '12px', color: '#54626C' }}>{mainContact.role}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3" style={{ color: '#54626C' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mail</span>
                <span style={{ fontSize: '14px' }}>{mainContact.email}</span>
              </div>
              <div className="flex items-center gap-3" style={{ color: '#54626C' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>call</span>
                <span style={{ fontSize: '14px' }}>{mainContact.phone}</span>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="relative pl-8 space-y-6">
            {/* Timeline Line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px" style={{ backgroundColor: 'rgba(195,199,204,0.3)' }} />

            {activities.map((activity, i) => {
              const style = ACTIVITY_ICONS[activity.type];
              return (
                <div key={i} className="relative">
                  {/* Timeline Dot */}
                  <div
                    className="absolute -left-8 w-6 h-6 rounded-full flex items-center justify-center z-10"
                    style={{ backgroundColor: style.bgColor, border: `1px solid ${style.borderColor}` }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '14px', color: style.iconColor }}>{style.icon}</span>
                  </div>

                  {/* Activity Card */}
                  <div className="p-4 rounded" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(195,199,204,0.3)' }}>
                    <div className="flex justify-between items-start mb-1">
                      <span className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>{activity.label}</span>
                      <span style={{ fontSize: '10px', color: '#54626C' }}>{activity.timestamp}</span>
                    </div>
                    <p style={{ fontSize: '14px', color: '#1A242B' }}>{activity.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </aside>
    </>
  );
}
