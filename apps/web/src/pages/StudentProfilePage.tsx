import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import ContactPanel from '../components/ContactPanel';

const MOCK_STUDENT = {
  firstName: 'Theodore',
  lastName: 'Montgomery',
  initials: 'TM',
  studentId: 'STU-8821-B',
  familyId: 'ACC-9921-R',
  familyName: 'The Montgomery Family',
  dob: '14 Oct 2009',
  age: '14 Years',
  gender: 'Male',
  studentType: 'Online',
  country: 'United Kingdom',
  city: 'London',
  coreCurriculum: 'Cambridge',
  schoolStage: 'Senior School',
  status: 'Active',
  corePackages: 'Performer',
  subjects: '6 IGCSE',
  mainZone: 'Zone 3',
  secondaryZone: 'N/A',
  intakeGroup: 'Group A',
  currentGrade: 'Grade 9',
  enrollmentDate: '01 Sep 2021',
  yearsEnrolled: '3.5 Years',
  accessExpiry: '31 Aug 2024',
  classes: [
    { subject: 'Mathematics I', dayTime: 'Mon 09:00', staff: 'Dr. E. Vance', status: 'Enrolled' },
    { subject: 'Literature & Composition', dayTime: 'Tue 11:30', staff: 'Mr. A. Sterling', status: 'Enrolled' },
    { subject: 'Physical Sciences', dayTime: 'Wed 14:00', staff: 'Mrs. H. Lin', status: 'Enrolled' },
    { subject: 'History & Global Perspectives', dayTime: 'Thu 10:30', staff: 'Mr. D. Miller', status: 'Enrolled' },
    { subject: 'Computer Science', dayTime: 'Fri 09:00', staff: 'Ms. S. Patel', status: 'Enrolled' },
    { subject: 'Art & Visual Culture', dayTime: 'Fri 13:30', staff: 'Mrs. J. Wright', status: 'Enrolled' },
    { subject: 'Wellness Coach', dayTime: 'Wed 11:00', staff: 'Mr. J. Thompson', status: 'Scheduled' },
  ],
  reportCards: [
    { term: 'Term 1', available: true },
    { term: 'Term 2', available: true },
    { term: 'Term 3', available: false },
    { term: 'Term 4', available: false },
  ],
  lastDeliveredDate: 'Oct 15, 2023',
  academicStanding: { score: '4/5', status: 'On Track' },
  clubs: [
    { name: 'Varsity Soccer', dayTime: 'Mon 16:00', staff: 'Coach Miller', status: 'Enrolled' },
    { name: 'Chess Club', dayTime: 'Wed 15:30', staff: 'Mr. Sterling', status: 'Enrolled' },
    { name: 'Drama Society', dayTime: 'Thu 16:30', staff: 'Ms. Patel', status: 'Scheduled' },
  ],
  enrichmentCourses: [
    { name: 'AI & Robotics', level: 'Senior Level', status: 'Active' },
    { name: 'Conservation', level: 'Senior Level', status: 'Active' },
    { name: 'Finance 101', level: 'Senior Level', status: 'Active' },
  ],
  groups: [
    { name: 'Senior Group', type: 'Academic', status: 'Active' },
    { name: 'Grade 8 Group', type: 'Year Level', status: 'Active' },
    { name: 'UK Senior Group', type: 'Regional', status: 'Active' },
  ],
};

const TABS = ['Personal & Academic', 'Class & Staff', 'Reports & Exams', 'Clubs', 'Enrichment & Groups', 'Other'];

export default function StudentProfilePage() {
  const { familyId, studentId } = useParams();
  const s = MOCK_STUDENT;
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Personal & Academic');
  const [selectedReportCard, setSelectedReportCard] = useState<string | null>(null);

  const contactActivities = [
    { type: 'attendance' as const, label: 'ATTENDANCE NOTE', description: 'Marked Late (Excused) for 1st Period by Front Desk.', timestamp: 'Today, 09:15 AM' },
    { type: 'disciplinary' as const, label: 'DISCIPLINARY LOG', description: 'Minor uniform infraction. Noted by Mr. Sterling.', timestamp: 'Yesterday' },
    { type: 'medical' as const, label: 'MEDICAL RECORD UPDATE', description: 'Annual physical form uploaded by Parent Portal.', timestamp: '12 Oct 2023' },
  ];

  return (
    <AdminLayout activeDesk="crm">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link to="/service/crm" className="hover:underline" style={{ color: '#54626C' }}>CRM</Link>
        <span style={{ color: '#54626C' }}>/</span>
        <Link to={`/service/crm/family/${familyId}`} className="hover:underline" style={{ color: '#54626C' }}>{s.familyName}</Link>
        <span style={{ color: '#54626C' }}>/</span>
        <span style={{ color: '#1A242B' }}>Student Profile</span>
      </div>

      {/* Student Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-2 p-1 flex items-center justify-center"
            style={{ borderColor: '#E8A020', backgroundColor: '#273946' }}>
            <div className="w-full h-full rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#273946', color: '#E8A020', fontFamily: '"EB Garamond", serif', fontSize: '36px', fontWeight: 500 }}>
              {s.initials}
            </div>
          </div>
          <div>
            <h1 className="mb-1" style={{ fontFamily: '"EB Garamond", serif', fontSize: '36px', fontWeight: 500, lineHeight: '44px', color: '#1A242B', letterSpacing: '-0.01em' }}>
              {s.firstName} {s.lastName}
            </h1>
            <div className="flex flex-col gap-1">
              <p className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Student Profile</p>
              <p className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>ID: {s.studentId}</p>
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

      {/* Personal Information & Enrollment Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Information */}
        <div className="rounded-xl p-8 flex flex-col gap-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Personal Information</h3>
            <span className="material-symbols-outlined" style={{ color: '#73777c' }}>badge</span>
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            {[
              { label: 'First Name', value: s.firstName },
              { label: 'Surname', value: s.lastName },
              { label: 'Date of Birth', value: s.dob },
              { label: 'Current Age', value: s.age },
              { label: 'Student Type', value: s.studentType },
              { label: 'Gender', value: s.gender },
              { label: 'Country', value: s.country },
              { label: 'City', value: s.city },
              { label: 'Core Curriculum', value: s.coreCurriculum },
              { label: 'School Stage', value: s.schoolStage },
            ].map((item) => (
              <div key={item.label}>
                <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>{item.label}</label>
                <div style={{ fontSize: '16px', color: '#1A242B' }}>{item.value}</div>
                <div className="mt-1" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Enrollment & Academic */}
        <div className="rounded-xl p-8 flex flex-col gap-6 relative overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
          <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none">
            <svg style={{ color: 'rgba(39,57,70,0.1)' }} fill="none" height="160" viewBox="0 0 24 24" width="160">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3ZM12 17.18L5 13.36V16.18L12 20L19 16.18V13.36L12 17.18Z" fill="currentColor"></path>
            </svg>
          </div>
          <div className="flex items-center justify-between pb-4 relative z-10" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Enrollment & Academic</h3>
            <span className="px-2 py-1 rounded" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>Active</span>
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 relative z-10">
            {[
              { label: 'Core Packages', value: s.corePackages },
              { label: 'Subjects', value: s.subjects },
              { label: 'Main Zone', value: s.mainZone },
              { label: 'Secondary Zone', value: s.secondaryZone },
              { label: 'Intake Group', value: s.intakeGroup },
              { label: 'Current Grade', value: s.currentGrade },
              { label: 'Enrollment Date', value: s.enrollmentDate },
              { label: 'Years Enrolled', value: s.yearsEnrolled },
              { label: 'Family Account', value: s.familyId },
              { label: 'Access Expiry', value: s.accessExpiry },
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

      {/* Class & Staff Table */}
      <div className="rounded-xl p-8" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
        <div className="flex items-center justify-between pb-6 mb-6" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
          <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Class & Staff</h3>
          <button className="px-4 py-2 rounded flex items-center gap-2 transition-colors cursor-pointer"
            style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
            Edit Schedule
          </button>
        </div>
        <div className="w-full">
          <div className="grid grid-cols-12 gap-4 pb-2 uppercase" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
            <div className="col-span-3">Subject</div>
            <div className="col-span-3">Class Day & Time</div>
            <div className="col-span-3">Staff</div>
            <div className="col-span-3 text-right">Status</div>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
            {s.classes.map((cls) => (
              <div key={cls.subject} className="grid grid-cols-12 gap-4 py-4 items-center transition-colors" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                <div className="col-span-3 flex items-center gap-3" style={{ fontSize: '14px', color: '#1A242B' }}>{cls.subject}</div>
                <div className="col-span-3" style={{ fontSize: '12px', color: '#54626C' }}>{cls.dayTime}</div>
                <div className="col-span-3 flex items-center gap-2" style={{ fontSize: '12px', color: '#54626C' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#e3e2df', fontSize: '10px', color: '#54626C' }}>
                    {cls.staff.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <Link to={`/service/staff/${cls.staff.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '')}`} className="hover:underline" style={{ color: '#273946' }}>
                    {cls.staff}
                  </Link>
                </div>
                <div className="col-span-3 text-right">
                  <span className="inline-block px-2 py-1 rounded" style={{ backgroundColor: '#e9e8e5', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>{cls.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 pt-6 flex gap-6" style={{ borderTop: '1px solid rgba(39,57,70,0.05)' }}>
          <a href="#" className="flex items-center gap-2 hover:underline" style={{ color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history</span> Subject History
          </a>
          <button className="ml-auto px-4 py-2 rounded flex items-center gap-2 transition-colors cursor-pointer"
            style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>menu_book</span>Booklist
          </button>
        </div>
      </div>

      {/* Report Card & Exams */}
      <div className="rounded-xl p-12 flex flex-col gap-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
        <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
          <div className="flex items-center gap-3">
            {selectedReportCard && (
              <button onClick={() => setSelectedReportCard(null)} className="cursor-pointer flex items-center gap-1 hover:underline" style={{ color: '#54626C', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span> Back
              </button>
            )}
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Report Card & Exams</h3>
          </div>
          <span className="material-symbols-outlined" style={{ color: '#73777c' }}>description</span>
        </div>

        {selectedReportCard ? (
          /* Detailed Report Card View */
          <div className="flex flex-col gap-6">
            {/* Student Header */}
            <div className="flex items-start gap-6 pb-6" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)' }}>
              <div className="w-20 h-20 rounded-full border-2 p-1 flex items-center justify-center"
                style={{ borderColor: '#E8A020', backgroundColor: '#273946' }}>
                <div className="w-full h-full rounded-full flex items-center justify-center"
                  style={{ backgroundColor: '#273946', color: '#E8A020', fontFamily: '"EB Garamond", serif', fontSize: '28px', fontWeight: 500 }}>
                  {s.initials}
                </div>
              </div>
              <div className="flex-1">
                <h2 style={{ fontFamily: '"EB Garamond", serif', fontSize: '28px', fontWeight: 500, color: '#1A242B' }}>{s.firstName} {s.lastName}</h2>
                <div className="flex gap-4 mt-2">
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>Grade 9</span>
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>ID: {s.studentId}</span>
                  <span className="px-2 py-0.5 rounded" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>{s.status}</span>
                </div>
              </div>
              <div className="text-right">
                <div style={{ fontSize: '11px', color: '#54626C', letterSpacing: '0.12em', fontWeight: 600 }}>Report Card - {selectedReportCard}</div>
                <div style={{ fontSize: '11px', color: '#54626C', letterSpacing: '0.12em' }}>Date: Oct 15, 2023</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1">
              {['Cultural Input', 'Cultural Output'].map((tab) => (
                <button key={tab} className="px-4 py-2 rounded-t cursor-pointer"
                  style={{ backgroundColor: tab === 'Cultural Input' ? '#273946' : '#e9e8e5', color: tab === 'Cultural Input' ? '#ffffff' : '#54626C', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
                  {tab}
                </button>
              ))}
            </div>

            {/* Class Schedule Table */}
            <div>
              <h4 className="mb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Class Schedule</h4>
              <div className="grid grid-cols-12 gap-4 pb-2 uppercase" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
                <div className="col-span-2">Subject</div>
                <div className="col-span-2">Day & Time</div>
                <div className="col-span-3">Staff</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-3 text-right">Actions</div>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                {s.classes.map((cls) => (
                  <div key={cls.subject} className="grid grid-cols-12 gap-4 py-3 items-center" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                    <div className="col-span-2" style={{ fontSize: '13px', color: '#1A242B', fontWeight: 500 }}>{cls.subject}</div>
                    <div className="col-span-2" style={{ fontSize: '12px', color: '#54626C' }}>{cls.dayTime}</div>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#e3e2df', fontSize: '10px', color: '#54626C' }}>
                        {cls.staff.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span style={{ fontSize: '12px', color: '#54626C' }}>{cls.staff}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="px-2 py-0.5 rounded" style={{ backgroundColor: '#e9e8e5', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>{cls.status}</span>
                    </div>
                    <div className="col-span-3 text-right">
                      <Link to={`/service/staff/${cls.staff.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '')}`} className="hover:underline" style={{ color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
                        View Staff Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report Card Terms */}
            <div>
              <h4 className="mb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Report Card</h4>
              <div className="flex gap-4">
                {s.reportCards.map((rc) => (
                  <div key={rc.term} className={`flex flex-col items-center gap-2 ${!rc.available ? 'opacity-40 grayscale' : rc.term === selectedReportCard ? 'ring-2 ring-offset-2' : 'cursor-pointer group'}`}
                    style={rc.term === selectedReportCard ? { borderColor: '#E8A020' } : {}}>
                    <div className="w-14 h-14 rounded flex items-center justify-center transition-colors"
                      style={{ backgroundColor: rc.term === selectedReportCard ? '#273946' : rc.available ? 'rgba(39,57,70,0.05)' : '#e3e2df', color: rc.term === selectedReportCard ? '#ffffff' : rc.available ? '#273946' : '#54626C' }}>
                      <span className="material-symbols-outlined">{rc.available ? 'description' : 'lock'}</span>
                    </div>
                    <span style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: rc.term === selectedReportCard ? '#273946' : rc.available ? '#273946' : '#54626C' }}>{rc.term}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Enrichment Courses */}
            <div>
              <h4 className="mb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Enrichment Courses</h4>
              <div className="grid grid-cols-12 gap-4 pb-2 uppercase" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
                <div className="col-span-4">Course</div>
                <div className="col-span-3">Level</div>
                <div className="col-span-3">Status</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                {s.enrichmentCourses.map((c) => (
                  <div key={c.name} className="grid grid-cols-12 gap-4 py-3 items-center" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                    <div className="col-span-4" style={{ fontSize: '13px', color: '#1A242B', fontWeight: 500 }}>{c.name}</div>
                    <div className="col-span-3" style={{ fontSize: '12px', color: '#54626C' }}>{c.level}</div>
                    <div className="col-span-3">
                      <span className="px-2 py-0.5 rounded" style={{ backgroundColor: '#e9e8e5', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>{c.status}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <span style={{ fontSize: '11px', color: '#54626C' }}>View Details</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Clubs */}
            <div>
              <h4 className="mb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Clubs</h4>
              <div className="grid grid-cols-12 gap-4 pb-2 uppercase" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
                <div className="col-span-4">Club</div>
                <div className="col-span-3">Day & Time</div>
                <div className="col-span-3">Staff</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                {s.clubs.map((club) => (
                  <div key={club.name} className="grid grid-cols-12 gap-4 py-3 items-center" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                    <div className="col-span-4" style={{ fontSize: '13px', color: '#1A242B', fontWeight: 500 }}>{club.name}</div>
                    <div className="col-span-3" style={{ fontSize: '12px', color: '#54626C' }}>{club.dayTime}</div>
                    <div className="col-span-3 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: '#e3e2df', fontSize: '10px', color: '#54626C' }}>
                        {club.staff.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <span style={{ fontSize: '12px', color: '#54626C' }}>{club.staff}</span>
                    </div>
                    <div className="col-span-2 text-right">
                      <Link to={`/service/staff/${club.staff.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '')}`} className="hover:underline" style={{ color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
                        View Staff Profile
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Groups */}
            <div>
              <h4 className="mb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Groups</h4>
              <div className="grid grid-cols-12 gap-4 pb-2 uppercase" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
                <div className="col-span-4">Group</div>
                <div className="col-span-4">Type</div>
                <div className="col-span-4 text-right">Status</div>
              </div>
              <div className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                {s.groups.map((g) => (
                  <div key={g.name} className="grid grid-cols-12 gap-4 py-3 items-center" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                    <div className="col-span-4" style={{ fontSize: '13px', color: '#1A242B', fontWeight: 500 }}>{g.name}</div>
                    <div className="col-span-4" style={{ fontSize: '12px', color: '#54626C' }}>{g.type}</div>
                    <div className="col-span-4 text-right">
                      <span className="px-2 py-0.5 rounded" style={{ backgroundColor: '#e9e8e5', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>{g.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
        /* Report Card Overview */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="mb-8 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Report Card</h4>
            <div className="flex gap-4 mb-6 p-4">
              {s.reportCards.map((rc) => (
                <div key={rc.term} className={`flex flex-col items-center gap-2 ${!rc.available ? 'opacity-40 grayscale' : 'cursor-pointer group'}`}
                  onClick={() => rc.available && setSelectedReportCard(rc.term)}>
                  <div className="w-12 h-12 rounded flex items-center justify-center transition-colors"
                    style={{ backgroundColor: rc.available ? 'rgba(39,57,70,0.05)' : '#e3e2df', color: rc.available ? '#273946' : '#54626C' }}>
                    <span className="material-symbols-outlined">{rc.available ? 'description' : 'lock'}</span>
                  </div>
                  <span style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: rc.available ? '#273946' : '#54626C' }}>{rc.term}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-8 mb-4">
              <div>
                <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Current Year</label>
                <div style={{ fontSize: '16px', color: '#1A242B' }}>2024</div>
                <div className="mt-1" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
              </div>
              <div>
                <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Last Delivered Date</label>
                <div style={{ fontSize: '16px', color: '#1A242B' }}>{s.lastDeliveredDate}</div>
                <div className="mt-1" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
              </div>
            </div>
            <a href="#" className="flex items-center gap-2 hover:underline mt-10" style={{ color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>inventory_2</span> View Report Card History
            </a>
          </div>
          <div className="pl-8" style={{ borderLeft: '1px solid rgba(39,57,70,0.05)' }}>
            <h4 className="mb-8 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Exams</h4>
            <div className="space-y-6">
              <div className="mb-6">
                <label className="mb-3 uppercase block" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Current Exam Schedule</label>
                <div className="flex items-center gap-4 p-4 rounded cursor-pointer transition-colors" style={{ backgroundColor: 'rgba(39,57,70,0.05)' }}>
                  <div className="w-12 h-12 rounded flex items-center justify-center" style={{ backgroundColor: '#ffffff', color: '#273946', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <span className="material-symbols-outlined">picture_as_pdf</span>
                  </div>
                  <div>
                    <a href="#" className="font-medium hover:underline" style={{ fontSize: '14px', color: '#273946' }}>Download Schedule (PDF)</a>
                    <p className="uppercase mt-0.5" style={{ fontSize: '10px', color: '#54626C', letterSpacing: '0.1em' }}>Updated Oct 2023</p>
                  </div>
                </div>
                <div className="mt-4" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
              </div>
              <div className="space-y-4">
                <label className="block uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Performance Analytics</label>
                <p style={{ fontSize: '14px', color: '#54626C' }}>Integrated performance tracking from LMS data, class attendance, and report cards.</p>
                <a href="#" className="inline-block px-4 py-2 rounded transition-all" style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>View Performance Dashboard</a>
                <div style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
              </div>
              <div className="mt-6">
                <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Academic Standing</label>
                <div className="flex items-center justify-between">
                  <div style={{ fontSize: '16px', color: '#1A242B' }}>Support Status</div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: '"EB Garamond", serif', fontSize: '16px', color: '#E8A020' }}>{s.academicStanding.score}</span>
                    <span className="px-2 py-0.5 rounded-sm" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, border: '1px solid rgba(232,160,32,0.2)' }}>{s.academicStanding.status}</span>
                  </div>
                </div>
                <div className="mt-1" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
              </div>
            </div>
          </div>
        </div>
        )}
      </div>

      {/* Clubs Table */}
      <div className="rounded-xl p-8" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
        <div className="flex items-center justify-between pb-6 mb-6" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
          <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Clubs<span className="ml-2" style={{ fontSize: '16px', color: '#54626C', fontWeight: 400 }}>({s.clubs.length})</span></h3>
          <button className="px-4 py-2 rounded flex items-center gap-2 transition-colors cursor-pointer"
            style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>Edit Clubs
          </button>
        </div>
        <div className="w-full">
          <div className="grid grid-cols-12 gap-4 pb-2 uppercase" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
            <div className="col-span-3">Club</div>
            <div className="col-span-3">Class Day & Time</div>
            <div className="col-span-3">Staff</div>
            <div className="col-span-3 text-right">Status</div>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
            {s.clubs.map((club) => (
              <div key={club.name} className="grid grid-cols-12 gap-4 py-4 items-center transition-colors" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                <div className="col-span-3 flex items-center gap-3" style={{ fontSize: '14px', color: '#1A242B' }}>{club.name}</div>
                <div className="col-span-3" style={{ fontSize: '12px', color: '#54626C' }}>{club.dayTime}</div>
                <div className="col-span-3 flex items-center gap-2" style={{ fontSize: '12px', color: '#54626C' }}>
                  <div className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: '#e3e2df', fontSize: '10px', color: '#54626C' }}>
                    {club.staff.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <Link to={`/service/staff/${club.staff.toLowerCase().replace(/\s+/g, '-').replace(/\./g, '')}`} className="hover:underline" style={{ color: '#273946' }}>
                    {club.staff}
                  </Link>
                </div>
                <div className="col-span-3 text-right">
                  <span className="inline-block px-2 py-1 rounded" style={{ backgroundColor: '#e9e8e5', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>{club.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enrichment Courses & Groups */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Enrichment Courses */}
        <div className="rounded-xl p-8 flex flex-col gap-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Enrichment Courses<span className="ml-2" style={{ fontSize: '16px', color: '#54626C', fontWeight: 400 }}>({s.enrichmentCourses.length})</span></h3>
            <span className="material-symbols-outlined" style={{ color: '#73777c' }}>history_edu</span>
          </div>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Current Courses</label>
              <ul className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                {s.enrichmentCourses.map((course) => (
                  <li key={course.name} className="py-3 flex items-center justify-between" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                    <div className="flex flex-col">
                      <div className="font-medium" style={{ fontSize: '14px', color: '#1A242B' }}>{course.name}</div>
                      <div style={{ fontSize: '12px', color: '#54626C' }}>{course.level}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-sm" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, border: '1px solid rgba(232,160,32,0.2)' }}>{course.status}</span>
                  </li>
                ))}
              </ul>
            </div>
            <a href="#" className="underline mt-10" style={{ color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>View Enrichment Certificates</a>
          </div>
        </div>

        {/* Groups */}
        <div className="rounded-xl p-8 flex flex-col gap-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Groups<span className="ml-2" style={{ fontSize: '16px', color: '#54626C', fontWeight: 400 }}>({s.groups.length})</span></h3>
            <span className="material-symbols-outlined" style={{ color: '#73777c' }}>groups</span>
          </div>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Current Groups</label>
              <ul className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                {s.groups.map((group) => (
                  <li key={group.name} className="py-3 flex items-center justify-between" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                    <div className="flex flex-col">
                      <div className="font-medium" style={{ fontSize: '14px', color: '#1A242B' }}>{group.name}</div>
                      <div style={{ fontSize: '12px', color: '#54626C' }}>{group.type}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded-sm" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, border: '1px solid rgba(232,160,32,0.2)' }}>{group.status}</span>
                  </li>
                ))}
              </ul>
            </div>
            <a href="#" className="underline mt-10" style={{ color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>View All Group Memberships</a>
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
          <div>
            <label className="block mb-1" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Family Account</label>
            <a href={`/service/crm/family/${familyId}`} className="font-medium hover:underline" style={{ color: '#273946' }}>{s.familyId}</a>
            <p className="mt-1" style={{ fontSize: '12px', color: '#54626C' }}>Siblings: 2 in school</p>
          </div>
          <div>
            <label className="block mb-1" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Student Body</label>
            <div style={{ fontSize: '14px', color: '#1A242B' }}>Senior (Jnr/Snr)</div>
            <p className="mt-1" style={{ fontSize: '12px', color: '#54626C' }}>School Board: Yes</p>
          </div>
          <div>
            <label className="block mb-1" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Analytical Summary</label>
            <div className="flex flex-col gap-1">
              <span style={{ fontSize: '12px', color: '#1A242B' }}>Attendance: 95.1%</span>
              <span style={{ fontSize: '12px', color: '#1A242B' }}>Goals: 4/5 Met</span>
              <span style={{ fontSize: '12px', color: '#E8A020', fontWeight: 700 }}>Status: On Track</span>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 flex flex-wrap gap-4" style={{ borderTop: '1px solid rgba(39,57,70,0.05)' }}>
          <button className="px-4 py-2 rounded" style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>Booklist</button>
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
        profileName={`${s.firstName} ${s.lastName}`}
        profileType="Student"
        mainContact={{
          name: 'Sarah Montgomery',
          role: 'Primary Guardian',
          email: 'sarah.montgomery@gmail.com',
          phone: '+44 7700 123456',
        }}
        activities={contactActivities}
      />
    </AdminLayout>
  );
}
