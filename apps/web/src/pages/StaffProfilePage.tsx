import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import ContactPanel from '../components/ContactPanel';
import MyStudentsModal from '../components/MyStudentsModal';
import EditReportCardModal from '../components/EditReportCardModal';

const STAFF_DATA: Record<string, { firstName: string; lastName: string; initials: string; staffId: string; staffType: string; dob: string; registrationYearAge: string; enrollmentDate: string; yearsEnrolled: string; mainZone: string; status: string; classes: { subject: string; stage: string; grades: string; curriculum: string; students: string[] }[]; clubs: { name: string; dayTime: string; students: string[] }[]; enrichmentCourses: { name: string; level: string; status: string }[]; groups: { name: string; type: string; status: string }[] }> = {
  'dr-e-vance': { firstName: 'Dr. E.', lastName: 'Vance', initials: 'EV', staffId: 'STF-1101-A', staffType: 'Teacher', dob: '15 Mar 1978', registrationYearAge: '46', enrollmentDate: '01 Sep 2010', yearsEnrolled: '13 Years', mainZone: 'Senior Campus', status: 'Active',
    classes: [
      { subject: 'Mathematics I', stage: 'Senior School', grades: 'Grade 9', curriculum: 'Cambridge', students: ['Theodore Montgomery'] },
      { subject: 'Physical Sciences', stage: 'Senior School', grades: 'Grade 9', curriculum: 'Cambridge', students: ['Theodore Montgomery', 'Eleanor Montgomery'] },
    ],
    clubs: [
      { name: 'Chess Club', dayTime: 'Wed 15:30', students: ['Theodore Montgomery'] },
    ],
    enrichmentCourses: [
      { name: 'AI & Robotics', level: 'Senior Level', status: 'Active' },
    ],
    groups: [
      { name: 'Senior Group', type: 'Academic', status: 'Active' },
    ],
  },
  'mr-a-sterling': { firstName: 'Mr. A.', lastName: 'Sterling', initials: 'AS', staffId: 'STF-1103-C', staffType: 'Teacher', dob: '22 Jul 1982', registrationYearAge: '42', enrollmentDate: '01 Sep 2012', yearsEnrolled: '11 Years', mainZone: 'Senior Campus', status: 'Active',
    classes: [
      { subject: 'Literature & Composition', stage: 'Senior School', grades: 'Grade 9', curriculum: 'Cambridge', students: ['Theodore Montgomery'] },
    ],
    clubs: [
      { name: 'Chess Club', dayTime: 'Wed 15:30', students: ['Theodore Montgomery'] },
    ],
    enrichmentCourses: [],
    groups: [
      { name: 'Senior Group', type: 'Academic', status: 'Active' },
    ],
  },
  'mrs-h-lin': { firstName: 'Mrs. H.', lastName: 'Lin', initials: 'HL', staffId: 'STF-1104-D', staffType: 'Teacher', dob: '08 Nov 1980', registrationYearAge: '43', enrollmentDate: '01 Sep 2011', yearsEnrolled: '12 Years', mainZone: 'Senior Campus', status: 'Active',
    classes: [
      { subject: 'Physical Sciences', stage: 'Senior School', grades: 'Grade 9', curriculum: 'Cambridge', students: ['Theodore Montgomery', 'Eleanor Montgomery'] },
    ],
    clubs: [],
    enrichmentCourses: [],
    groups: [],
  },
  'mr-d-miller': { firstName: 'Mr. D.', lastName: 'Miller', initials: 'DM', staffId: 'STF-1105-E', staffType: 'Teacher', dob: '30 Jan 1975', registrationYearAge: '49', enrollmentDate: '01 Sep 2008', yearsEnrolled: '15 Years', mainZone: 'Senior Campus', status: 'Active',
    classes: [
      { subject: 'History & Global Perspectives', stage: 'Senior School', grades: 'Grade 9', curriculum: 'Cambridge', students: ['Theodore Montgomery'] },
    ],
    clubs: [
      { name: 'Varsity Soccer', dayTime: 'Mon 16:00', students: ['Theodore Montgomery'] },
    ],
    enrichmentCourses: [],
    groups: [],
  },
  'ms-s-patel': { firstName: 'Ms. S.', lastName: 'Patel', initials: 'SP', staffId: 'STF-1106-F', staffType: 'Teacher', dob: '17 Jun 1988', registrationYearAge: '36', enrollmentDate: '01 Sep 2016', yearsEnrolled: '7 Years', mainZone: 'Senior Campus', status: 'Active',
    classes: [
      { subject: 'Computer Science', stage: 'Senior School', grades: 'Grade 9', curriculum: 'Cambridge', students: ['Theodore Montgomery'] },
    ],
    clubs: [
      { name: 'Drama Society', dayTime: 'Thu 16:30', students: ['Theodore Montgomery'] },
    ],
    enrichmentCourses: [],
    groups: [],
  },
  'mrs-j-wright': { firstName: 'Mrs. J.', lastName: 'Wright', initials: 'JW', staffId: 'STF-1107-G', staffType: 'Teacher', dob: '05 Sep 1983', registrationYearAge: '40', enrollmentDate: '01 Sep 2013', yearsEnrolled: '10 Years', mainZone: 'Senior Campus', status: 'Active',
    classes: [
      { subject: 'Art & Visual Culture', stage: 'Senior School', grades: 'Grade 9', curriculum: 'Cambridge', students: ['Theodore Montgomery'] },
    ],
    clubs: [],
    enrichmentCourses: [],
    groups: [],
  },
  'mr-j-thompson': { firstName: 'Mr. J.', lastName: 'Thompson', initials: 'JT', staffId: 'STF-1108-H', staffType: 'Wellness Coach', dob: '12 Apr 1979', registrationYearAge: '45', enrollmentDate: '01 Sep 2009', yearsEnrolled: '14 Years', mainZone: 'Senior Campus', status: 'Active',
    classes: [
      { subject: 'Wellness Coach', stage: 'Senior School', grades: 'Grade 9', curriculum: 'Cambridge', students: ['Theodore Montgomery'] },
    ],
    clubs: [],
    enrichmentCourses: [],
    groups: [],
  },
  'coach-miller': { firstName: 'Coach', lastName: 'Miller', initials: 'CM', staffId: 'STF-1109-I', staffType: 'Coach', dob: '25 Dec 1981', registrationYearAge: '42', enrollmentDate: '01 Sep 2011', yearsEnrolled: '12 Years', mainZone: 'Sports Campus', status: 'Active',
    classes: [],
    clubs: [
      { name: 'Varsity Soccer', dayTime: 'Mon 16:00', students: ['Theodore Montgomery'] },
    ],
    enrichmentCourses: [],
    groups: [],
  },
  'sarah-r': { firstName: 'Sarah', lastName: 'R.', initials: 'SR', staffId: 'STF-1102-B', staffType: 'Teacher', dob: '12 Oct 1985', registrationYearAge: '38', enrollmentDate: '01 Sep 2015', yearsEnrolled: '8 Years', mainZone: 'Senior Campus', status: 'Active',
    classes: [
      { subject: 'Physics HL', stage: 'Senior School', grades: 'Multi (10, 11, 12)', curriculum: 'IB Diploma', students: ['Theodore Montgomery', 'Eleanor Montgomery', 'Eleanor Vance'] },
      { subject: 'Chemistry SL', stage: 'Senior School', grades: 'Multi (10, 11, 12)', curriculum: 'IB Diploma', students: ['Julian Sorel', 'Dorian Gray'] },
    ],
    clubs: [
      { name: 'Varsity Soccer', dayTime: 'Mon 16:00', students: ['Theodore Montgomery', 'Julian Sorel'] },
      { name: 'Chess Club', dayTime: 'Wed 15:30', students: ['Eleanor Montgomery'] },
      { name: 'Drama Society', dayTime: 'Thu 16:30', students: ['Emma Woodhouse', 'Theodore Montgomery'] },
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
  },
};

const TABS = ['Personal & Academic', 'Class & Staff', 'Reports & Exams', 'Clubs, Enrichment & Groups', 'Other'];

export default function StaffProfilePage() {
  const { staffId } = useParams();
  const staff = STAFF_DATA[staffId || 'sarah-r'] || STAFF_DATA['sarah-r'];
  const [isContactPanelOpen, setIsContactPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Personal & Academic');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [isMyStudentsOpen, setIsMyStudentsOpen] = useState(false);
  const [isEditReportOpen, setIsEditReportOpen] = useState(false);
  const [myStudentsSubject, setMyStudentsSubject] = useState({ subject: '', className: '' });
  const [editReportStudent, setEditReportStudent] = useState({ name: '', initials: '', grade: '', subject: '' });

  const contactActivities = [
    { type: 'general' as const, label: 'EMPLOYMENT UPDATE', description: 'Annual contract renewed for 2024 academic year.', timestamp: '01 Sep 2023' },
    { type: 'attendance' as const, label: 'TRAINING COMPLETE', description: 'First Aid Certification completed. Valid until Dec 2024.', timestamp: '15 Jul 2023' },
  ];

  const handleOpenMyStudents = (subject: string) => {
    setMyStudentsSubject({ subject, className: 'Fall Semester' });
    setIsMyStudentsOpen(true);
  };

  const handleEditReportCard = (student: { name: string; initials: string; grade: string }) => {
    setIsMyStudentsOpen(false);
    setEditReportStudent({ ...student, subject: 'Physics HL' });
    setIsEditReportOpen(true);
  };

  return (
    <AdminLayout activeDesk="crm">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-6">
        <Link to="/service/crm" className="hover:underline" style={{ color: '#54626C' }}>CRM</Link>
        <span style={{ color: '#54626C' }}>/</span>
        <span style={{ color: '#1A242B' }}>Staff Profile</span>
      </div>

      {/* Staff Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-full border-2 p-1 flex items-center justify-center"
            style={{ borderColor: '#E8A020', backgroundColor: '#273946' }}>
            <div className="w-full h-full rounded-full flex items-center justify-center"
              style={{ backgroundColor: '#273946', color: '#E8A020', fontFamily: '"EB Garamond", serif', fontSize: '36px', fontWeight: 500 }}>
              {staff.initials}
            </div>
          </div>
          <div>
            <h1 className="mb-1" style={{ fontFamily: '"EB Garamond", serif', fontSize: '36px', fontWeight: 500, lineHeight: '44px', color: '#1A242B', letterSpacing: '-0.01em' }}>
              {staff.firstName} {staff.lastName}
            </h1>
            <div className="flex flex-col gap-1">
              <p className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Staff | {staff.staffType}</p>
              <p className="uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Staff ID: {staff.staffId}</p>
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

      {/* Personal Information & Employment Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Information */}
        <div className="rounded-xl p-8 flex flex-col gap-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
          <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Personal Information</h3>
            <span className="material-symbols-outlined" style={{ color: '#73777c' }}>badge</span>
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            {[
              { label: 'First Name', value: staff.firstName },
              { label: 'Surname', value: staff.lastName },
              { label: 'ID', value: staff.staffId },
              { label: 'Date of Birth', value: staff.dob },
              { label: 'Registration Year Age', value: staff.registrationYearAge },
            ].map((item) => (
              <div key={item.label}>
                <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>{item.label}</label>
                <div style={{ fontSize: '16px', color: '#1A242B' }}>{item.value}</div>
                <div className="mt-1" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
              </div>
            ))}
          </div>
        </div>

        {/* Employment Details */}
        <div className="rounded-xl p-8 flex flex-col gap-6 relative overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
          <div className="absolute -right-12 -top-12 opacity-5 pointer-events-none">
            <svg style={{ color: 'rgba(39,57,70,0.1)' }} fill="none" height="160" viewBox="0 0 24 24" width="160">
              <path d="M12 3L1 9L12 15L21 10.09V17H23V9L12 3ZM12 17.18L5 13.36V16.18L12 20L19 16.18V13.36L12 17.18Z" fill="currentColor"></path>
            </svg>
          </div>
          <div className="flex items-center justify-between pb-4 relative z-10" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Employment Details</h3>
            <span className="px-2 py-1 rounded" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>{staff.status}</span>
          </div>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4 relative z-10">
            {[
              { label: 'Staff Type', value: staff.staffType },
              { label: 'Date of Enrollment', value: staff.enrollmentDate },
              { label: 'Years Enrolled', value: staff.yearsEnrolled },
              { label: 'Main Zone', value: staff.mainZone },
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

      {/* Class Table */}
      <div className="rounded-xl p-8" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
        <div className="flex items-center justify-between pb-6 mb-6" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
          <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Class</h3>
          <button className="px-4 py-2 rounded flex items-center gap-2 transition-colors cursor-pointer"
            style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>Edit Schedule
          </button>
        </div>
        <div className="w-full">
          <div className="grid grid-cols-12 gap-4 pb-2 uppercase" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
            <div className="col-span-3">Subject</div>
            <div className="col-span-3">Current School Stage</div>
            <div className="col-span-2">Current Grade(s)</div>
            <div className="col-span-2 text-right">Core Curriculum</div>
            <div className="col-span-2 text-right">Students</div>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
            {staff.classes.map((cls) => (
              <div key={cls.subject} className="grid grid-cols-12 gap-4 py-4 items-center hover:bg-surface-cream transition-colors" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                <div className="col-span-3 flex items-center gap-3" style={{ fontSize: '14px', color: '#1A242B' }}>
                  <span className="px-2 py-1 rounded" style={{ backgroundColor: '#f4f3f0', color: '#273946', fontSize: '12px' }}>{cls.subject}</span>
                </div>
                <div className="col-span-3" style={{ fontSize: '12px', color: '#54626C' }}>{cls.stage}</div>
                <div className="col-span-2" style={{ fontSize: '12px', color: '#54626C' }}>{cls.grades}</div>
                <div className="col-span-2 text-right" style={{ fontSize: '12px', color: '#54626C' }}>{cls.curriculum}</div>
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => handleOpenMyStudents(cls.subject)}
                    className="inline-block px-4 py-1 rounded transition-colors cursor-pointer"
                    style={{ backgroundColor: '#e9e8e5', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
                    My Students
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Report Card & Exams */}
      <div className="rounded-xl p-12 flex flex-col gap-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
        <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
          <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Report Card & Exams</h3>
          <span className="material-symbols-outlined" style={{ color: '#73777c' }}>description</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="mb-8 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Report Card</h4>
            <div className="space-y-4 mb-8">
              <div className="relative">
                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded appearance-none cursor-pointer hover:border-brand-gold transition-colors"
                  style={{ backgroundColor: '#f4f3f0', border: '1px solid rgba(39,57,70,0.1)', color: '#1A242B', fontSize: '14px' }}>
                  <option value="">Select Student</option>
                  {staff.classes.flatMap(c => c.students).filter((v, i, a) => a.indexOf(v) === i).map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#54626C' }}>expand_more</span>
              </div>
              <button
                disabled={!selectedStudent}
                onClick={() => {
                  if (selectedStudent) {
                    const initials = selectedStudent.split(' ').map(n => n[0]).join('');
                    handleEditReportCard({ name: selectedStudent, initials, grade: 'Grade 9', subject: 'Physics HL' });
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
                Edit Report Card
              </button>
            </div>
            <div className="flex gap-8 mb-4">
              <div>
                <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Current Year</label>
                <div style={{ fontSize: '16px', color: '#1A242B' }}>2024</div>
                <div className="mt-1" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
              </div>
              <div>
                <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Last Delivered Date</label>
                <div style={{ fontSize: '16px', color: '#1A242B' }}>Oct 15, 2023</div>
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
                    <span style={{ fontFamily: '"EB Garamond", serif', fontSize: '16px', color: '#E8A020' }}>4/5</span>
                    <span className="px-2 py-0.5 rounded-sm" style={{ backgroundColor: 'rgba(232,160,32,0.1)', color: '#E8A020', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, border: '1px solid rgba(232,160,32,0.2)' }}>On Track</span>
                  </div>
                </div>
                <div className="mt-1" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clubs Table */}
      <div className="rounded-xl p-8" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(39,57,70,0.1)' }}>
        <div className="flex items-center justify-between pb-6 mb-6" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
          <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Clubs</h3>
          <button className="px-4 py-2 rounded flex items-center gap-2 transition-colors cursor-pointer"
            style={{ border: '1px solid rgba(39,57,70,0.2)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>Edit Clubs
          </button>
        </div>
        <div className="w-full">
          <div className="grid grid-cols-12 gap-4 pb-2 uppercase" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>
            <div className="col-span-5">Club</div>
            <div className="col-span-4">Class Day & Time</div>
            <div className="col-span-3 text-right">Students</div>
          </div>
          <div className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
            {staff.clubs.map((club) => (
              <div key={club.name} className="grid grid-cols-12 gap-4 py-4 items-center hover:bg-surface-cream transition-colors" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                <div className="col-span-5 flex items-center gap-3" style={{ fontSize: '14px', color: '#1A242B' }}>{club.name}</div>
                <div className="col-span-4" style={{ fontSize: '12px', color: '#54626C' }}>{club.dayTime}</div>
                <div className="col-span-3 flex justify-end">
                  <button
                    onClick={() => handleOpenMyStudents(club.name)}
                    className="inline-block px-4 py-1 rounded transition-colors cursor-pointer"
                    style={{ backgroundColor: '#e9e8e5', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
                    My Students
                  </button>
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
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Enrichment Courses<span className="ml-2" style={{ fontSize: '16px', color: '#54626C', fontWeight: 400 }}>({staff.enrichmentCourses.length})</span></h3>
            <span className="material-symbols-outlined" style={{ color: '#73777c' }}>history_edu</span>
          </div>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Current Courses</label>
              <ul className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                {staff.enrichmentCourses.map((course) => (
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
            <h3 style={{ fontFamily: '"EB Garamond", serif', fontSize: '24px', fontWeight: 500, color: '#273946' }}>Groups<span className="ml-2" style={{ fontSize: '16px', color: '#54626C', fontWeight: 400 }}>({staff.groups.length})</span></h3>
            <span className="material-symbols-outlined" style={{ color: '#73777c' }}>groups</span>
          </div>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Current Groups</label>
              <ul className="divide-y" style={{ borderColor: 'rgba(39,57,70,0.05)' }}>
                {staff.groups.map((group) => (
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
            <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Access Status</label>
            <div className="inline-flex items-center gap-2 px-2 py-1 rounded" style={{ backgroundColor: '#e3e2df', border: '1px solid rgba(39,57,70,0.1)', color: '#273946', fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600 }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#273946' }}></span> Active
            </div>
            <div className="mt-2" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
          </div>
          <div>
            <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Access Expiry Date</label>
            <div style={{ fontSize: '16px', color: '#1A242B' }}>Auto roll over</div>
            <div className="mt-2" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
          </div>
          <div>
            <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Departments</label>
            <div style={{ fontSize: '16px', color: '#1A242B' }}>Multi (Science, Mathematics)</div>
            <div className="mt-2" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
          </div>
          <div>
            <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Staff Contracts</label>
            <a href="#" className="flex items-center gap-1 hover:underline" style={{ color: '#273946', fontSize: '16px', fontWeight: 500 }}>
              View Contract <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span>
            </a>
            <div className="mt-2" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
          </div>
          <div>
            <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Payroll ID</label>
            <div style={{ fontSize: '16px', color: '#1A242B', fontFamily: 'monospace' }}>PR-9928-X</div>
            <div className="mt-2" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
          </div>
          <div>
            <label className="block mb-1 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Tax Category</label>
            <div style={{ fontSize: '16px', color: '#1A242B' }}>Standard (Full-Time)</div>
            <div className="mt-2" style={{ height: '1px', backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
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
        profileName={`${staff.firstName} ${staff.lastName}`}
        profileType="Staff"
        mainContact={{
          name: 'Sarah Montgomery',
          role: 'Staff Member',
          email: 'sarah.montgomery@redhouse.edu',
          phone: '+44 7700 123456',
        }}
        activities={contactActivities}
      />

      <MyStudentsModal
        isOpen={isMyStudentsOpen}
        onClose={() => setIsMyStudentsOpen(false)}
        subject={myStudentsSubject.subject}
        className={myStudentsSubject.className}
        onEditReportCard={handleEditReportCard}
      />

      <EditReportCardModal
        isOpen={isEditReportOpen}
        onClose={() => setIsEditReportOpen(false)}
        studentName={editReportStudent.name}
        studentInitials={editReportStudent.initials}
        grade={editReportStudent.grade}
        subject={editReportStudent.subject}
      />
    </AdminLayout>
  );
}
