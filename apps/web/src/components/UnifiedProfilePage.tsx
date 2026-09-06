// UnifiedProfilePage — ONE shared profile component for student/family/teacher
// Sections mounted by role + data presence. Inapplicable sections are HIDDEN, not greyed out.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import ContactPanel from './ContactPanel';

export type ProfileType = 'student' | 'family' | 'adult' | 'staff';

interface ProfileData {
  type: ProfileType;
  firstName: string;
  lastName: string;
  initials: string;
  id: string;
  status: string;
  email?: string;
  phone?: string;
  dob?: string;
  country?: string;
  city?: string;
  enrollmentDate?: string;
  yearsEnrolled?: string;
  grade?: string;
  curriculum?: string;
  schoolStage?: string;
  zone?: string;
  // Student-specific
  classes?: { subject: string; dayTime: string; staff: string; status: string }[];
  reportCards?: { term: string; date: string; status: string }[];
  subjects?: string;
  // Family-specific
  adults?: { name: string; role: string; status: string }[];
  students?: { name: string; grade: string; status: string }[];
  ledger?: { date: string; desc: string; type: string; amount: string; balance: string }[];
  // Staff-specific
  staffType?: string;
  clubs?: { name: string; dayTime: string }[];
  enrichmentCourses?: { name: string; level: string; status: string }[];
  groups?: { name: string; type: string; status: string }[];
  // Activities
  activities?: { id: number; actor: string; action: string; target: string; time: string; outcome?: string; status?: string; note?: string }[];
}

interface UnifiedProfilePageProps {
  data: ProfileData;
  onBack: string;
}

const SECTION_VISIBILITY: Record<ProfileType, string[]> = {
  student: ['personal', 'classes', 'reports', 'enrichment', 'other'],
  family: ['personal', 'members', 'ledger', 'activities'],
  adult: ['personal', 'students', 'enrichment', 'other'],
  staff: ['personal', 'classes', 'clubs', 'enrichment', 'groups'],
};

const SECTION_LABELS: Record<string, string> = {
  personal: 'Personal & Academic',
  classes: 'Class & Staff',
  reports: 'Reports & Exams',
  enrichment: 'Enrichment & Groups',
  other: 'Other',
  members: 'Family Members',
  ledger: 'Financial Ledger',
  activities: 'Recent Activity',
  clubs: 'Clubs',
  groups: 'Groups',
};

export default function UnifiedProfilePage({ data, onBack }: UnifiedProfilePageProps) {
  const [activeTab, setActiveTab] = useState(() => {
    const sections = SECTION_VISIBILITY[data.type];
    return sections[0] ?? 'personal';
  });
  const [contactPanelOpen, setContactPanelOpen] = useState(false);

  const sections = SECTION_VISIBILITY[data.type] ?? ['personal'];
  const sectionName = SECTION_LABELS[activeTab] ?? activeTab;

  const statusColor = data.status === 'Active' ? '#27ae60' : '#e74c3c';

  return (
    <div className="flex-1 flex flex-col min-w-0" style={{ fontFamily: '"Source Sans 3", sans-serif' }}>
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b" style={{ borderColor: 'rgba(195,199,204,0.3)', backgroundColor: '#ffffff' }}>
        <Link to={onBack} className="text-sm mb-2 inline-block" style={{ color: '#2563EB' }}>
          ← Back
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-lg font-medium"
            style={{ backgroundColor: '#273946' }}>
            {data.initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold" style={{ color: '#1A242B' }}>
              {data.firstName} {data.lastName}
            </h2>
            <div className="flex items-center gap-3 text-sm" style={{ color: '#54626C' }}>
              <span>{data.id}</span>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColor }} />
              <span>{data.status}</span>
              <span className="capitalize">{data.type}</span>
            </div>
          </div>
          <button
            onClick={() => setContactPanelOpen(true)}
            className="px-4 py-2 text-sm font-medium rounded-lg border"
            style={{ borderColor: '#273946', color: '#273946' }}
          >
            Contact
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto shrink-0 border-b" style={{ borderColor: 'rgba(195,199,204,0.3)' }}>
        <nav className="flex px-6">
          {sections.map((section) => {
            const isActive = section === activeTab;
            return (
              <button
                key={section}
                onClick={() => setActiveTab(section)}
                className="px-4 py-3 whitespace-nowrap text-sm font-medium transition-colors relative"
                style={{
                  color: isActive ? '#273946' : '#54626C',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                }}
              >
                {isActive && (
                  <span className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: '#E8A020' }} />
                )}
                {SECTION_LABELS[section] ?? section}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'personal' && <PersonalSection data={data} />}
        {activeTab === 'classes' && data.classes && <ClassesSection classes={data.classes} />}
        {activeTab === 'reports' && data.reportCards && <ReportsSection reports={data.reportCards} />}
        {activeTab === 'enrichment' && <EnrichmentSection data={data} />}
        {activeTab === 'members' && data.adults && data.students && (
          <MembersSection adults={data.adults} students={data.students} />
        )}
        {activeTab === 'ledger' && data.ledger && <LedgerSection ledger={data.ledger} />}
        {activeTab === 'activities' && data.activities && <ActivitiesSection activities={data.activities} />}
        {activeTab === 'clubs' && data.clubs && <ClubsSection clubs={data.clubs} />}
        {activeTab === 'groups' && data.groups && <GroupsSection groups={data.groups} />}
        {activeTab === 'other' && <OtherSection data={data} />}
      </div>

      {/* Contact Panel */}
      <ContactPanel
        isOpen={contactPanelOpen}
        onClose={() => setContactPanelOpen(false)}
        profileName={`${data.firstName} ${data.lastName}`}
        profileType={data.type === 'adult' || data.type === 'family' ? 'Parent' : data.type === 'staff' ? 'Guardian' : 'Student'}
        mainContact={{ name: `${data.firstName} ${data.lastName}`, role: data.type, email: data.email ?? '', phone: data.phone ?? '' }}
        activities={[]}
      />
    </div>
  );
}

// ─── Section Components ───────────────────────────────────────────────────────

function PersonalSection({ data }: { data: ProfileData }) {
  const fields = [
    { label: 'Date of Birth', value: data.dob },
    { label: 'Country', value: data.country },
    { label: 'City', value: data.city },
    { label: 'Email', value: data.email },
    { label: 'Phone', value: data.phone },
    { label: 'Enrolled', value: data.enrollmentDate },
    { label: 'Years Enrolled', value: data.yearsEnrolled },
    { label: 'Grade', value: data.grade },
    { label: 'Curriculum', value: data.curriculum },
    { label: 'School Stage', value: data.schoolStage },
    { label: 'Zone', value: data.zone },
    { label: 'Staff Type', value: data.staffType },
  ].filter((f) => f.value);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {fields.map((f) => (
        <div key={f.label} className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#9ca3af' }}>{f.label}</p>
          <p className="text-sm mt-1" style={{ color: '#1A242B' }}>{f.value}</p>
        </div>
      ))}
    </div>
  );
}

function ClassesSection({ classes }: { classes: ProfileData['classes'] }) {
  if (!classes?.length) return <p className="text-sm text-gray-500">No classes</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'rgba(195,199,204,0.3)' }}>
            <th className="text-left py-2 font-semibold" style={{ color: '#54626C' }}>Subject</th>
            <th className="text-left py-2 font-semibold" style={{ color: '#54626C' }}>Schedule</th>
            <th className="text-left py-2 font-semibold" style={{ color: '#54626C' }}>Staff</th>
            <th className="text-left py-2 font-semibold" style={{ color: '#54626C' }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((c, i) => (
            <tr key={i} className="border-b" style={{ borderColor: 'rgba(195,199,204,0.1)' }}>
              <td className="py-2" style={{ color: '#1A242B' }}>{c.subject}</td>
              <td className="py-2" style={{ color: '#54626C' }}>{c.dayTime}</td>
              <td className="py-2" style={{ color: '#54626C' }}>{c.staff}</td>
              <td className="py-2">
                <span className="text-xs px-2 py-0.5 rounded-full" style={{
                  backgroundColor: c.status === 'Enrolled' ? '#d1fae5' : '#fef3c7',
                  color: c.status === 'Enrolled' ? '#065f46' : '#92400e',
                }}>{c.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsSection({ reports }: { reports: ProfileData['reportCards'] }) {
  if (!reports?.length) return <p className="text-sm text-gray-500">No report cards</p>;
  return (
    <div className="space-y-2">
      {reports.map((r, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-sm font-medium" style={{ color: '#1A242B' }}>{r.term}</p>
            <p className="text-xs" style={{ color: '#54626C' }}>{r.date}</p>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{
            backgroundColor: r.status === 'Released' ? '#d1fae5' : '#e9e8e5',
            color: r.status === 'Released' ? '#065f46' : '#54626C',
          }}>{r.status}</span>
        </div>
      ))}
    </div>
  );
}

function EnrichmentSection({ data }: { data: ProfileData }) {
  return (
    <div className="space-y-4">
      {data.enrichmentCourses?.length ? (
        <div>
          <h4 className="text-sm font-semibold mb-2" style={{ color: '#273946' }}>Enrichment Courses</h4>
          {data.enrichmentCourses.map((e, i) => (
            <div key={i} className="flex items-center justify-between p-2 border-b" style={{ borderColor: 'rgba(195,199,204,0.1)' }}>
              <span className="text-sm" style={{ color: '#1A242B' }}>{e.name}</span>
              <span className="text-xs" style={{ color: '#54626C' }}>{e.level}</span>
            </div>
          ))}
        </div>
      ) : null}
      {!data.enrichmentCourses?.length && !data.students?.length && (
        <p className="text-sm text-gray-500">No enrichment data</p>
      )}
    </div>
  );
}

function MembersSection({ adults, students }: { adults: NonNullable<ProfileData['adults']>; students: NonNullable<ProfileData['students']> }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold mb-2" style={{ color: '#273946' }}>Adults</h4>
        {adults.map((a, i) => (
          <div key={i} className="flex items-center justify-between p-2 border-b" style={{ borderColor: 'rgba(195,199,204,0.1)' }}>
            <span className="text-sm" style={{ color: '#1A242B' }}>{a.name}</span>
            <span className="text-xs" style={{ color: '#54626C' }}>{a.role}</span>
          </div>
        ))}
      </div>
      <div>
        <h4 className="text-sm font-semibold mb-2" style={{ color: '#273946' }}>Students</h4>
        {students.map((s, i) => (
          <div key={i} className="flex items-center justify-between p-2 border-b" style={{ borderColor: 'rgba(195,199,204,0.1)' }}>
            <span className="text-sm" style={{ color: '#1A242B' }}>{s.name}</span>
            <span className="text-xs" style={{ color: '#54626C' }}>{s.grade}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LedgerSection({ ledger }: { ledger: NonNullable<ProfileData['ledger']> }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b" style={{ borderColor: 'rgba(195,199,204,0.3)' }}>
            <th className="text-left py-2 font-semibold" style={{ color: '#54626C' }}>Date</th>
            <th className="text-left py-2 font-semibold" style={{ color: '#54626C' }}>Description</th>
            <th className="text-left py-2 font-semibold" style={{ color: '#54626C' }}>Type</th>
            <th className="text-right py-2 font-semibold" style={{ color: '#54626C' }}>Amount</th>
            <th className="text-right py-2 font-semibold" style={{ color: '#54626C' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {ledger.map((l, i) => (
            <tr key={i} className="border-b" style={{ borderColor: 'rgba(195,199,204,0.1)' }}>
              <td className="py-2" style={{ color: '#54626C' }}>{l.date}</td>
              <td className="py-2" style={{ color: '#1A242B' }}>{l.desc}</td>
              <td className="py-2">
                <span className="text-xs px-2 py-0.5 rounded" style={{
                  backgroundColor: l.type === 'Credit' ? '#d1fae5' : '#fee2e2',
                  color: l.type === 'Credit' ? '#065f46' : '#991b1b',
                }}>{l.type}</span>
              </td>
              <td className="py-2 text-right" style={{ color: l.amount.startsWith('+') ? '#059669' : '#dc2626' }}>{l.amount}</td>
              <td className="py-2 text-right" style={{ color: '#54626C' }}>{l.balance}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActivitiesSection({ activities }: { activities: NonNullable<ProfileData['activities']> }) {
  return (
    <div className="space-y-3">
      {activities.map((a) => (
        <div key={a.id} className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: '#273946' }}>{a.actor}</span>
            <span className="text-sm" style={{ color: '#54626C' }}>{a.action}</span>
            <span className="text-sm font-medium" style={{ color: '#273946' }}>{a.target}</span>
            <span className="text-xs ml-auto" style={{ color: '#9ca3af' }}>{a.time}</span>
          </div>
          {a.outcome && <p className="text-xs mt-1" style={{ color: '#059669' }}>{a.outcome}</p>}
          {a.status && <p className="text-xs mt-1" style={{ color: '#D97706' }}>{a.status}</p>}
          {a.note && <p className="text-xs mt-1 italic" style={{ color: '#54626C' }}>{a.note}</p>}
        </div>
      ))}
    </div>
  );
}

function ClubsSection({ clubs }: { clubs: NonNullable<ProfileData['clubs']> }) {
  return (
    <div className="space-y-2">
      {clubs.map((c, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium" style={{ color: '#1A242B' }}>{c.name}</span>
          <span className="text-xs" style={{ color: '#54626C' }}>{c.dayTime}</span>
        </div>
      ))}
    </div>
  );
}

function GroupsSection({ groups }: { groups: NonNullable<ProfileData['groups']> }) {
  return (
    <div className="space-y-2">
      {groups.map((g, i) => (
        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <span className="text-sm font-medium" style={{ color: '#1A242B' }}>{g.name}</span>
          <span className="text-xs" style={{ color: '#54626C' }}>{g.type}</span>
        </div>
      ))}
    </div>
  );
}

function OtherSection({ data }: { data: ProfileData }) {
  return (
    <div className="text-sm text-gray-500">
      <p>No additional information for this profile type.</p>
    </div>
  );
}
