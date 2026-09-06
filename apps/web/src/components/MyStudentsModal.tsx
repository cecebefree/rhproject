import { useState } from 'react';

interface Student {
  name: string;
  initials: string;
  grade: string;
  enrollmentStatus: string;
  familyId: string;
}

const MOCK_STUDENTS: Student[] = [
  { name: 'Theodore Montgomery', initials: 'TM', grade: 'Grade 9', enrollmentStatus: 'Active', familyId: 'ACC-9921-R' },
  { name: 'Eleanor Montgomery', initials: 'EM', grade: 'Grade 7', enrollmentStatus: 'Active', familyId: 'ACC-9921-R' },
  { name: 'Eleanor Vance', initials: 'EV', grade: 'Grade 11', enrollmentStatus: 'Active', familyId: 'ACC-1102-V' },
  { name: 'Julian Sorel', initials: 'JS', grade: 'Grade 10', enrollmentStatus: 'Active', familyId: 'ACC-2203-S' },
  { name: 'Dorian Gray', initials: 'DG', grade: 'Grade 12', enrollmentStatus: 'At Risk', familyId: 'ACC-3304-G' },
  { name: 'Emma Woodhouse', initials: 'EW', grade: 'Grade 11', enrollmentStatus: 'Active', familyId: 'ACC-4405-W' },
  { name: 'Oliver Bennett', initials: 'OB', grade: 'Grade 9', enrollmentStatus: 'Active', familyId: 'ACC-5506-B' },
  { name: 'Sophia Chen', initials: 'SC', grade: 'Grade 10', enrollmentStatus: 'Active', familyId: 'ACC-6607-C' },
  { name: 'Liam O\'Connor', initials: 'LO', grade: 'Grade 9', enrollmentStatus: 'Active', familyId: 'ACC-7708-O' },
  { name: 'Ava Patel', initials: 'AP', grade: 'Grade 11', enrollmentStatus: 'Active', familyId: 'ACC-8809-P' },
  { name: 'Noah Williams', initials: 'NW', grade: 'Grade 12', enrollmentStatus: 'Active', familyId: 'ACC-9910-W' },
  { name: 'Mia Johnson', initials: 'MJ', grade: 'Grade 10', enrollmentStatus: 'At Risk', familyId: 'ACC-1011-J' },
  { name: 'Ethan Brown', initials: 'EB', grade: 'Grade 9', enrollmentStatus: 'Active', familyId: 'ACC-1112-B' },
  { name: 'Isabella Davis', initials: 'ID', grade: 'Grade 11', enrollmentStatus: 'Active', familyId: 'ACC-1213-D' },
  { name: 'Lucas Martinez', initials: 'LM', grade: 'Grade 10', enrollmentStatus: 'Active', familyId: 'ACC-1314-M' },
  { name: 'Charlotte Wilson', initials: 'CW', grade: 'Grade 12', enrollmentStatus: 'Active', familyId: 'ACC-1415-W' },
  { name: 'James Taylor', initials: 'JT', grade: 'Grade 9', enrollmentStatus: 'Active', familyId: 'ACC-1516-T' },
  { name: 'Amelia Anderson', initials: 'AA', grade: 'Grade 10', enrollmentStatus: 'Active', familyId: 'ACC-1617-A' },
  { name: 'Henry Thomas', initials: 'HT', grade: 'Grade 11', enrollmentStatus: 'At Risk', familyId: 'ACC-1718-T' },
  { name: 'Grace Lee', initials: 'GL', grade: 'Grade 9', enrollmentStatus: 'Active', familyId: 'ACC-1819-L' },
];

interface MyStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: string;
  className: string;
  onEditReportCard: (student: Student) => void;
}

export default function MyStudentsModal({ isOpen, onClose, subject, className, onEditReportCard }: MyStudentsModalProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 15;
  const totalPages = Math.ceil(MOCK_STUDENTS.length / pageSize);
  const visibleStudents = MOCK_STUDENTS.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white border rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col mx-4"
        style={{ borderColor: 'rgba(39,57,70,0.1)' }}>

        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between shrink-0" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)' }}>
          <div>
            <h2 style={{ fontFamily: '"EB Garamond", serif', fontSize: '28px', fontWeight: 500, lineHeight: '36px', color: '#273946' }}>My Students</h2>
            <p className="mt-1" style={{ fontSize: '14px', color: '#54626C' }}>Class: {subject} - {className}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded hover:bg-surface-container-low transition-colors group">
            <span className="material-symbols-outlined text-text-muted group-hover:text-brand-navy">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(39,57,70,0.1)' }}>
                <th className="pb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Student Name</th>
                <th className="pb-4 uppercase px-4" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Grade</th>
                <th className="pb-4 uppercase px-4" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Enrollment Status</th>
                <th className="pb-4 uppercase text-right" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleStudents.map((student) => (
                <tr key={student.name} className="hover:bg-surface-cream transition-colors" style={{ borderBottom: '1px solid rgba(39,57,70,0.05)' }}>
                  <td className="py-3 pr-4 align-middle">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded flex items-center justify-center shrink-0"
                        style={{ backgroundColor: '#e9e8e5', fontSize: '11px', color: '#54626C', fontFamily: '"EB Garamond", serif' }}>
                        {student.initials}
                      </div>
                      <span style={{ fontSize: '13px', color: '#1A242B' }}>{student.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 align-middle" style={{ fontSize: '13px', color: '#54626C' }}>{student.grade}</td>
                  <td className="py-3 px-4 align-middle">
                    <span className="inline-flex items-center px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: student.enrollmentStatus === 'At Risk' ? 'rgba(200,40,30,0.05)' : 'rgba(39,57,70,0.05)',
                        color: student.enrollmentStatus === 'At Risk' ? '#C8281E' : '#273946',
                        fontSize: '10px', letterSpacing: '0.12em', fontWeight: 600,
                      }}>
                      {student.enrollmentStatus}
                    </span>
                  </td>
                  <td className="py-3 pl-4 align-middle text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => onEditReportCard(student)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded transition-colors"
                        style={{ borderColor: 'rgba(39,57,70,0.2)', color: '#273946', fontSize: '10px', letterSpacing: '0.12em', fontWeight: 600 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit_note</span>
                        Edit Report Card
                      </button>
                      <button className="inline-flex items-center gap-1.5 px-3 py-1.5 border rounded transition-colors"
                        style={{ borderColor: 'rgba(39,57,70,0.2)', color: '#273946', fontSize: '10px', letterSpacing: '0.12em', fontWeight: 600 }}>
                        View Profile
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 flex items-center justify-between shrink-0" style={{ borderTop: '1px solid rgba(39,57,70,0.1)', backgroundColor: '#F8F7F4', borderRadius: '0 0 0.25rem 0.25rem' }}>
          <span style={{ fontSize: '12px', color: '#54626C' }}>Showing {visibleStudents.length} of {MOCK_STUDENTS.length} students</span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="w-8 h-8 flex items-center justify-center border rounded transition-colors disabled:opacity-40"
              style={{ borderColor: 'rgba(39,57,70,0.2)', color: '#273946' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="w-8 h-8 flex items-center justify-center border rounded transition-colors disabled:opacity-40"
              style={{ borderColor: 'rgba(39,57,70,0.2)', color: '#273946' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
