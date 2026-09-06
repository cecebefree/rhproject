import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import ContactPanel from '../components/ContactPanel';

const MOCK_ADULT = {
  firstName: 'Sarah',
  lastName: 'Montgomery',
  initials: 'SM',
  adultId: 'ACC-9921-R',
  familyId: 'ACC-9921-R',
  familyName: 'The Montgomery Family',
  familyType: 'Mother',
  idType: 'SA ID',
  dob: '12 Oct 1985',
  country: 'United Kingdom',
  city: 'London',
  status: 'Active',
  enrollmentDate: '01 Sep 2021',
  yearsEnrolled: '3.5 Years',
  intakeGroup: 'Group A',
  schoolStage: 'Senior School',
  mainZone: 'Zone 3',
  secondaryZone: 'N/A',
  accessExpiry: '31 Aug 2024',
  students: [
    { name: 'Theodore Montgomery', grade: 'Grade 9', status: 'Enrolled' },
    { name: 'Eleanor Montgomery', grade: 'Grade 7', status: 'Enrolled' },
  ],
};

const TABS = ['Personal & Academic', 'Class & Staff', 'Reports & Exams', 'Clubs, Enrichment & Groups', 'Other'];

export default function AdultProfilePage() {
  const { familyId, adultId } = useParams();
  const adult = MOCK_ADULT;
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Personal & Academic');

  const contactActivities = [
    { type: 'attendance' as const, label: 'ACCOUNT NOTE', description: 'All paperwork verified and up to date for the current academic year.', timestamp: '15 May 2024' },
    { type: 'general' as const, label: 'ENROLLMENT CONFIRMED', description: 'Both students enrolled for Spring 2024 term. Tuition paid in full.', timestamp: '01 Sep 2023' },
    { type: 'medical' as const, label: 'MEDICAL RECORD UPDATE', description: 'Emergency contact details updated by Sarah Montgomery.', timestamp: '12 Oct 2023' },
  ];

  return (
    <AdminLayout activeDesk="crm">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link to="/service/crm" className="hover:underline" style={{ color: '#54626C' }}>CRM</Link>
        <span style={{ color: '#54626C' }}>/</span>
        <Link to={`/service/crm/family/${familyId}`} className="hover:underline" style={{ color: '#54626C' }}>{adult.familyName}</Link>
        <span style={{ color: '#54626C' }}>/</span>
        <span style={{ color: '#1A242B' }}>Adult Profile</span>
      </div>

      {/* Adult Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-2 p-1 flex items-center justify-center"
            style={{ borderColor: '#E8A020', backgroundColor: '#273946' }}>
            <div className="w-full h-full rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#273946', color: '#E8A020', fontFamily: '"EB Garamond", serif', fontSize: '36px', fontWeight: 500 }}>
              {adult.initials}
            </div>
          </div>
          <div>
            <h1 className="mb-1" style={{ fontFamily: '"EB Garamond", serif', fontSize: '36px', fontWeight: 500, lineHeight: '44px', color: '#1A242B', letterSpacing: '-0.01em' }}>
              {adult.firstName} {adult.lastName}
            </h1>
            <div className="flex flex-col gap-1">
              <p className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Adult Profile</p>
              <p className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>ID: {adult.adultId}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsContactPanelOpen(true)}
          className="flex items-center gap-2 px-4 py-3 rounded transition-colors duration-200 cursor-pointer"
          style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history</span>
          Activity Log
        </button>
      </div>

      {/* Tabs */}
      <div className="overflow-x-auto shrink-0 -mb-[1px]">
        <nav className="flex" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)' }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-6 py-3 whitespace-nowrap transition-colors relative"
                style={{
                  fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: '"Source Sans 3", sans-serif',
                  color: isActive ? '#273946' : '#54626C',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  borderTop: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderLeft: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderRight: isActive ? '1px solid rgba(39,57,70,0.1)' : '1px solid transparent',
                  borderRadius: isActive ? '0.25rem 0.25rem 0 0' : undefined,
                  zIndex: isActive ? 10 : undefined,
                }}>
                {isActive && (
                  <span className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: '#E8A020' }} />
                )}
                {tab}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Personal Information & Account Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Information */}
        <div className="rounded-xl p-8 flex flex-col gap-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Personal Information</h3>
            <span className="material-symbols-outlined" style={{ color: '#73777c' }}>badge</span>
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            {[
              { label: 'First Name', value: adult.firstName },
              { label: 'Surname', value: adult.lastName },
              { label: 'Family Type', value: adult.familyType },
              { label: 'Identification Type', value: adult.idType },
              { label: 'Date of Birth', value: adult.dob },
              { label: 'Country', value: adult.country },
              { label: 'City', value: adult.city },
            ].map((item) => (
              <div key={item.label}>
                <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>{item.label}</label>
                <div style={{ fontSize: '16px', color: '#1A242B' }}>{item.value}</div>
                <div className="mt-1" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Details */}
        <div className="rounded-xl p-8 flex flex-col gap-6 relative overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
          <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none">
            <svg style={{ color: 'rgba(39,57,70,0.1)' }} fill="none" height="160" viewBox="0 0 24 24" width="160">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3ZM12 17.18L5 13.36V16.18L12 20L19 16.18V13.36L12 17.18Z" fill="currentColor"></path>
            </svg>
          </div>
          <div className="flex items-center justify-between pb-4 relative z-10" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Account Details</h3>
            <span className="px-2 py-1 rounded" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>Active</span>
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 relative z-10">
            {[
              { label: 'Enrollment Date', value: adult.enrollmentDate },
              { label: 'Years Enrolled', value: adult.yearsEnrolled },
              { label: 'Intake Group', value: adult.intakeGroup },
              { label: 'School Stage', value: adult.schoolStage },
              { label: 'Main Zone', value: adult.mainZone },
              { label: 'Secondary Zone', value: adult.secondaryZone },
              { label: 'Family Account', value: adult.familyId },
              { label: 'Access Expiry', value: adult.accessExpiry },
            ].map((item) => (
              <div key={item.label}>
                <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>{item.label}</label>
                <div style={{ fontSize: '16px', color: '#1A242B' }}>{item.value}</div>
                <div className="mt-1" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Connections Table */}
      <div className="rounded-xl p-8" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
        <div className="flex items-center justify-between pb-6 mb-6" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
          <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Student Connections</h3>
          <button className="px-4 py-2 rounded flex items-center gap-2 transition-colors cursor-pointer"
            style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
            Edit Connections
          </button>
        </div>
        <div className="w-full">
          <div className="grid grid-cols-12 gap-4 pb-2 uppercase" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
            <div className="col-span-6">Student Name</div>
            <div className="col-span-3">Grade</div>
            <div className="col-span-3 text-right">Status</div>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
            {adult.students.map((student) => (
              <div key={student.name} className="grid grid-cols-12 gap-4 py-4 items-center hover:bg-surface-cream transition-colors" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                <div className="col-span-6 flex items-center gap-3" style={{ fontSize: '14px', color: '#273946' }}>
                  <Link to={`/service/crm/family/${familyId}/student/${student.name.toLowerCase().replace(/\s+/g, '-')}`} className="hover:underline" style={{ color: '#273946' }}>
                    {student.name}
                  </Link>
                </div>
                <div className="col-span-3" style={{ fontSize: '12px', color: '#54626C' }}>{student.grade}</div>
                <div className="col-span-3 text-right">
                  <span className="inline-block px-2 py-1 rounded" style={{ backgroundColor: '#e9e8e5', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>{student.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Administrative & Financial */}
      <div className="rounded-xl p-8 flex flex-col gap-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
        <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
          <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Administrative & Financial</h3>
          <span className="material-symbols-outlined" style={{ color: '#73777c' }}>account_balance_wallet</span>
        </div>
        <div className="grid grid-cols-3 gap-8">
          <div className="flex flex-col gap-3">
            <label className="block uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Family Account</label>
            <div style={{ fontFamily: '"EB Garamond", serif', fontSize: '20px', fontWeight: 500, color: '#273946' }}>{adult.familyId}</div>
            <div className="space-y-1">
              <p style={{ fontSize: '12px', color: '#54626C' }}>Adults in Account: 2</p>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="block uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Ledger & Contracts</label>
            <div className="flex flex-col gap-2">
              <a href="#" className="flex items-center gap-2 text-sm hover:underline" style={{ color: '#273946' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>receipt_long</span>
                View Account Ledger
              </a>
              <a href="#" className="flex items-center gap-2 text-sm hover:underline" style={{ color: '#273946' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
                View Contracts
              </a>
              <a href="#" className="flex items-center gap-2 text-sm hover:underline" style={{ color: '#273946' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>id_card</span>
                Account IDs
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="block uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Billing & Status</label>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '12px', color: '#54626C' }}>Latest Invoice</span>
                <span style={{ fontSize: '12px', color: '#1A242B', fontWeight: 500 }}>Paid</span>
              </div>
              <div className="flex justify-between items-center">
                <span style={{ fontSize: '12px', color: '#54626C' }}>Outstanding</span>
                <span style={{ fontSize: '12px', color: '#1A242B', fontWeight: 500 }}>None</span>
              </div>
              <div className="mt-2 pt-2 flex justify-between items-center" style={{ borderTop: '1px solid rgba(39,57,70,0.05)' }}>
                <span style={{ fontSize: '12px', color: '#54626C' }}>Status</span>
                <span className="px-2 py-0.5 rounded-sm" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, border: '1px solid rgba(232,160,32,0.2)' }}>Up to Date</span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 flex flex-wrap gap-4" style={{ borderTop: '1px solid rgba(39,57,70,0.05)' }}>
          <button className="px-4 py-2 rounded" style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>Account Statements</button>
          <button className="px-4 py-2 rounded" style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>School Desk Activity</button>
          <button className="px-4 py-2 rounded" style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>Office Desk Activity</button>
          <button className="px-4 py-2 rounded flex items-center gap-2 transition-colors cursor-pointer"
            style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>Profile Download
          </button>
        </div>
      </div>

      <ContactPanel
        isOpen={isContactPanelOpen}
        onClose={() => setIsContactPanelOpen(false)}
        profileName={`${adult.firstName} ${adult.lastName}`}
        profileType="Adult"
        mainContact={{
          name: 'Sarah Montgomery',
          role: 'Primary Contact',
          email: 'sarah.montgomery@gmail.com',
          phone: '+44 7700 123456',
        }}
        activities={contactActivities}
      />
    </AdminLayout>
  );
}
