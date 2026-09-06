import { useState } from 'react';

interface EditReportCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  studentInitials: string;
  grade: string;
  subject: string;
}

const TERMS = [
  { id: 1, label: 'Term 1', status: 'editable' as const },
  { id: 2, label: 'Term 2', status: 'editable' as const },
  { id: 3, label: 'Term 3', status: 'locked' as const },
  { id: 4, label: 'Term 4', status: 'locked' as const },
];

export default function EditReportCardModal({ isOpen, onClose, studentName, studentInitials, grade, subject }: EditReportCardModalProps) {
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [comment, setComment] = useState("Theodore has demonstrated exceptional analytical skills this term. His contributions to class discussions are consistently thoughtful and deeply engaged with the text. He shows a strong grasp of narrative structure and thematic development. Moving forward, I would encourage him to refine his thesis statements in written assignments to be more concise and pointed. Overall, an excellent start to the year.");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white border rounded-lg w-full max-w-3xl max-h-[85vh] flex flex-col mx-4"
        style={{ borderColor: 'rgba(39,57,70,0.1)' }}>

        {/* Header */}
        <div className="px-8 py-6 flex items-start justify-between shrink-0" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)', backgroundColor: '#F8F7F4' }}>
          <div>
            <h2 style={{ fontFamily: '"EB Garamond", serif', fontSize: '28px', fontWeight: 500, lineHeight: '36px', color: '#273946', margin: 0 }}>Edit Student Report</h2>
            <div className="flex items-center gap-3 mt-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ backgroundColor: '#273946', color: '#E8A020', fontFamily: '"EB Garamond", serif', fontSize: '14px', fontWeight: 500 }}>
                {studentInitials}
              </div>
              <p style={{ fontSize: '14px', color: '#54626C' }}>{studentName} · {grade} · {subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded" style={{ backgroundColor: 'rgba(200,40,30,0.1)', border: '1px solid rgba(200,40,30,0.2)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#C8281E' }}>calendar_today</span>
              <span style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#C8281E' }}>DUE: OCT 25, 2023</span>
            </div>
            <button onClick={onClose} className="p-2 rounded hover:bg-surface-container-low transition-colors">
              <span className="material-symbols-outlined" style={{ color: '#54626C' }}>close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 overflow-y-auto flex-grow" style={{ backgroundColor: '#faf9f6' }}>
          {/* Term Selector */}
          <div className="mb-8">
            <label className="block mb-3 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Select Term</label>
            <div className="flex gap-4" style={{ borderBottom: '1px solid rgba(39,57,70,0.1)' }}>
              {TERMS.map((term) => {
                const isSelected = selectedTerm === term.id;
                return (
                  <button key={term.id} onClick={() => setSelectedTerm(term.id)}
                    className="pb-3 transition-colors flex items-center gap-2"
                    style={{
                      borderBottom: isSelected ? '2px solid #E8A020' : '2px solid transparent',
                      color: isSelected ? '#273946' : '#54626C',
                      fontWeight: isSelected ? 500 : 400,
                      fontSize: '14px',
                    }}>
                    {term.status === 'submitted' ? (
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock</span>
                    ) : (
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        {term.id === 1 ? 'looks_one' : term.id === 2 ? 'looks_two' : term.id === 3 ? 'looks_3' : 'looks_4'}
                      </span>
                    )}
                    {term.label}
                    {term.status === 'submitted' && (
                      <span className="ml-1 px-2 py-0.5 rounded uppercase" style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', backgroundColor: 'rgba(39,57,70,0.1)', color: '#54626C' }}>
                        Submitted
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Report Comment */}
          <div className="mb-8">
            <div className="flex justify-between items-end mb-3">
              <label className="block uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Report Card Comment</label>
              <span style={{ fontSize: '12px', color: '#54626C' }}>{comment.length} / 1200 characters</span>
            </div>
            <div className="relative">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded p-4 resize-y focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all"
                style={{ border: '1px solid rgba(39,57,70,0.2)', fontSize: '14px', color: '#1A242B', backgroundColor: '#ffffff', outline: 'none' }}
                rows={8}
                placeholder="Enter detailed comments on student progress, engagement, and areas for improvement..."
              />
              <div className="absolute bottom-4 right-4 flex gap-2 bg-surface-cream border rounded px-2 py-1 shadow-sm" style={{ borderColor: 'rgba(39,57,70,0.1)' }}>
                <button className="p-1 hover:text-brand-navy" style={{ color: '#54626C' }} title="Bold">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>format_bold</span>
                </button>
                <button className="p-1 hover:text-brand-navy" style={{ color: '#54626C' }} title="Italic">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>format_italic</span>
                </button>
                <div className="w-px mx-1 my-1" style={{ backgroundColor: 'rgba(39,57,70,0.1)' }}></div>
                <button className="p-1 hover:text-brand-navy" style={{ color: '#54626C' }} title="Spellcheck">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>spellcheck</span>
                </button>
              </div>
            </div>
          </div>

          {/* Assessment Summary */}
          <div className="rounded p-4" style={{ backgroundColor: '#F8F7F4', border: '1px solid rgba(39,57,70,0.05)' }}>
            <h3 className="mb-4 uppercase" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 600, color: '#54626C' }}>Term {selectedTerm} Assessment Summary</h3>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <span className="block mb-1" style={{ fontSize: '12px', color: '#54626C' }}>Current Grade</span>
                <span style={{ fontFamily: '"EB Garamond", serif', fontSize: '22px', color: '#273946' }}>92%</span>
              </div>
              <div>
                <span className="block mb-1" style={{ fontSize: '12px', color: '#54626C' }}>Participation</span>
                <span style={{ fontFamily: '"EB Garamond", serif', fontSize: '22px', color: '#273946' }}>Excellent</span>
              </div>
              <div>
                <span className="block mb-1" style={{ fontSize: '12px', color: '#54626C' }}>Assignments</span>
                <span style={{ fontFamily: '"EB Garamond", serif', fontSize: '22px', color: '#273946' }}>4 / 4 Complete</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-4 flex justify-between items-center shrink-0" style={{ borderTop: '1px solid rgba(39,57,70,0.1)', backgroundColor: '#F8F7F4', borderRadius: '0 0 0.25rem 0.25rem' }}>
          <button className="flex items-center gap-2 transition-colors" style={{ color: '#54626C', fontSize: '14px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>history</span>
            View Report History
          </button>
          <div className="flex gap-4">
            <button className="px-6 py-2 rounded transition-colors" style={{ border: '1px solid #273946', color: '#273946', fontSize: '14px' }}>
              Save Draft
            </button>
            <button className="px-6 py-2 rounded transition-colors shadow-sm" style={{ backgroundColor: '#273946', color: '#ffffff', fontSize: '14px' }}>
              Submit Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
