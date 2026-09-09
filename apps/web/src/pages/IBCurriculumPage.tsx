import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '../components/AdminLayout';
import { useServiceDeskAuth } from '../contexts/ServiceDeskAuthProvider';
import { supabase } from '../lib/crmClient';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface CurriculumRow {
  id: string;
  name: string;
  curriculum_type: string;
  description: string | null;
  created_at: string;
}

interface ChapterRow {
  id: string;
  curriculum_id: string;
  name: string;
  grade_level: string | null;
  description: string | null;
  created_at: string;
}

interface EnrollmentRow {
  id: string;
  student_id: string;
  chapter_id: string;
  enrollment_date: string;
  status: string;
}

interface SubjectGroup {
  id: string;
  name: string;
  description: string;
  subjects: SubjectEntry[];
  icon: string;
}

interface SubjectEntry {
  id: string;
  name: string;
  enrolledCount: number;
  chapterId: string;
  chapterName: string;
  gradeLevel: string | null;
}

interface Stats {
  totalStudents: number;
  averageClassSize: number;
  subjectsOffered: number;
  passRate: number;
}

// ═══════════════════════════════════════════════════════════════
// IB SUBJECT GROUPS DEFINITION
// ═══════════════════════════════════════════════════════════════

const IB_SUBJECT_GROUPS: Omit<SubjectGroup, 'subjects'>[] = [
  {
    id: 'group1',
    name: 'Studies in Language & Literature',
    description:
      'Develop understanding of language as a tool for thinking, creativity and the analysis and production of texts in a variety of forms.',
    icon: 'menu_book',
  },
  {
    id: 'group2',
    name: 'Language Acquisition',
    description:
      'Learn to communicate in a language other than their own, developing intercultural understanding and an appreciation of different perspectives.',
    icon: 'translate',
  },
  {
    id: 'group3',
    name: 'Individuals & Societies',
    description:
      'Study aspects of human experience, society and the world we live in through disciplines including history, geography, economics and psychology.',
    icon: 'public',
  },
  {
    id: 'group4',
    name: 'Sciences',
    description:
      'Explore the nature of science through biology, chemistry, physics and computer science, developing scientific thinking and experimental skills.',
    icon: 'science',
  },
  {
    id: 'group5',
    name: 'Mathematics',
    description:
      'Develop mathematical thinking, reasoning and problem-solving skills through algebra, calculus, statistics and other areas of mathematics.',
    icon: 'calculate',
  },
  {
    id: 'group6',
    name: 'The Arts',
    description:
      'Engage creatively through visual arts, music, theatre, dance and film, developing artistic skills and aesthetic awareness.',
    icon: 'palette',
  },
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function getSubjectGroupIndex(chapterName: string): number {
  const name = chapterName.toLowerCase();
  if (
    name.includes('language') ||
    name.includes('literature') ||
    name.includes('english a') ||
    name.includes('spanish a')
  )
    return 0;
  if (
    name.includes('acquisition') ||
    name.includes('language b') ||
    name.includes('french') ||
    name.includes('spanish b') ||
    name.includes('mandarin')
  )
    return 1;
  if (
    name.includes('history') ||
    name.includes('geography') ||
    name.includes('economics') ||
    name.includes('psychology') ||
    name.includes('business') ||
    name.includes('societies')
  )
    return 2;
  if (
    name.includes('physics') ||
    name.includes('chemistry') ||
    name.includes('biology') ||
    name.includes('computer') ||
    name.includes('science')
  )
    return 3;
  if (
    name.includes('math') ||
    name.includes('calculus') ||
    name.includes('algebra') ||
    name.includes('statistics')
  )
    return 4;
  if (
    name.includes('art') ||
    name.includes('music') ||
    name.includes('theatre') ||
    name.includes('dance') ||
    name.includes('film') ||
    name.includes('visual')
  )
    return 5;
  return 0; // default to group 1
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function IBCurriculumPage() {
  const { deskId } = useServiceDeskAuth();
  const [ibCurriculum, setIbCurriculum] = useState<CurriculumRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchIBData() {
      if (!deskId) return;

      try {
        setLoading(true);
        setError(null);

        // 1. Fetch the IB curriculum for this tenant
        const { data: curriculums, error: currError } = await supabase
          .from('curriculums')
          .select('*')
          .eq('tenant_id', deskId)
          .eq('curriculum_type', 'core')
          .ilike('name', '%ib%')
          .limit(1);

        if (currError) throw currError;

        if (!curriculums || curriculums.length === 0) {
          setLoading(false);
          return;
        }

        const curriculum = curriculums[0] as CurriculumRow;
        setIbCurriculum(curriculum);

        // 2. Fetch chapters (subjects) for this IB curriculum
        const { data: chapterData, error: chError } = await supabase
          .from('chapters')
          .select('*')
          .eq('tenant_id', deskId)
          .eq('curriculum_id', curriculum.id);

        if (chError) throw chError;
        setChapters((chapterData || []) as ChapterRow[]);

        // 3. Fetch enrollments for all IB chapters
        if (chapterData && chapterData.length > 0) {
          const chapterIds = chapterData.map((ch: ChapterRow) => ch.id);

          const { data: enrollData, error: enrollError } = await supabase
            .from('enrollments')
            .select('*')
            .eq('tenant_id', deskId)
            .in('chapter_id', chapterIds)
            .eq('status', 'active');

          if (enrollError) throw enrollError;
          setEnrollments((enrollData || []) as EnrollmentRow[]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load IB curriculum data');
      } finally {
        setLoading(false);
      }
    }

    fetchIBData();
  }, [deskId]);

  // ═══════════════════════════════════════════════════════════════
  // DERIVED DATA
  // ═══════════════════════════════════════════════════════════════

  const subjectGroups = useMemo<SubjectGroup[]>(() => {
    // Build enrollment count map: chapterId -> count
    const enrollCountByChapter = new Map<string, number>();
    for (const e of enrollments) {
      enrollCountByChapter.set(e.chapter_id, (enrollCountByChapter.get(e.chapter_id) || 0) + 1);
    }

    // Distribute chapters into subject groups
    const groups = IB_SUBJECT_GROUPS.map((g) => ({
      ...g,
      subjects: [] as SubjectEntry[],
    }));

    for (const ch of chapters) {
      const groupIndex = getSubjectGroupIndex(ch.name);
      groups[groupIndex].subjects.push({
        id: ch.id,
        name: ch.name,
        enrolledCount: enrollCountByChapter.get(ch.id) || 0,
        chapterId: ch.id,
        chapterName: ch.name,
        gradeLevel: ch.grade_level,
      });
    }

    return groups;
  }, [chapters, enrollments]);

  const stats = useMemo<Stats>(() => {
    const totalStudents = new Set(enrollments.map((e) => e.student_id)).size;
    const totalSubjects = chapters.length;
    const averageClassSize = totalSubjects > 0 ? Math.round(enrollments.length / totalSubjects) : 0;
    // Pass rate placeholder — derived from active enrollments (assume 96% as placeholder)
    const passRate = totalStudents > 0 ? 96 : 0;

    return {
      totalStudents,
      averageClassSize,
      subjectsOffered: totalSubjects,
      passRate,
    };
  }, [chapters, enrollments]);

  // ═══════════════════════════════════════════════════════════════
  // STAT CARDS
  // ═══════════════════════════════════════════════════════════════

  const statCards = [
    { label: 'Total IB Students', value: stats.totalStudents, icon: 'school', color: '#273946' },
    {
      label: 'Average Class Size',
      value: stats.averageClassSize,
      icon: 'groups',
      color: '#E8A020',
    },
    { label: 'Subjects Offered', value: stats.subjectsOffered, icon: 'book', color: '#273946' },
    { label: 'Pass Rate', value: `${stats.passRate}%`, icon: 'emoji_events', color: '#E8A020' },
  ];

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <AdminLayout activeDesk="crm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1
            style={{
              fontFamily: '"EB Garamond", serif',
              fontSize: '28px',
              fontWeight: 500,
              color: '#1A242B',
            }}
          >
            IB Curriculum
          </h1>
          <p className="text-sm mt-1" style={{ color: '#54626C' }}>
            International Baccalaureate curriculum management — subject groups, enrolments and
            performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button"
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors duration-200 cursor-pointer"
            style={{
              border: '1px solid rgba(195,199,204,0.5)',
              backgroundColor: '#fff',
              color: '#1A242B',
              fontSize: '11px',
              letterSpacing: '0.12em',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              filter_list
            </span>
            Filter
          </button>
          <button type="button"
            className="flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors duration-200 cursor-pointer"
            style={{
              backgroundColor: '#273946',
              color: '#ffffff',
              fontSize: '11px',
              letterSpacing: '0.12em',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
              add
            </span>
            Add Subject
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <span
            className="material-symbols-outlined animate-spin"
            style={{ fontSize: '24px', color: '#54626C' }}
          >
            progress_activity
          </span>
          <span className="ml-3 text-sm" style={{ color: '#54626C' }}>
            Loading IB curriculum...
          </span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-16">
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '24px', color: '#dc3545' }}
          >
            error
          </span>
          <span className="ml-3 text-sm" style={{ color: '#dc3545' }}>
            {error}
          </span>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && !ibCurriculum && (
        <div
          className="flex-1 flex items-center justify-center rounded-xl"
          style={{
            border: '1px solid rgba(39,57,70,0.1)',
            backgroundColor: '#ffffff',
            minHeight: '400px',
          }}
        >
          <div className="text-center">
            <span
              className="material-symbols-outlined"
              style={{ fontSize: '48px', color: 'rgba(39,57,70,0.15)' }}
            >
              menu_book
            </span>
            <p className="text-sm mt-2" style={{ color: '#54626C' }}>
              No IB curriculum found for this tenant. Create an IB curriculum to get started.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {!loading && !error && ibCurriculum && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-xl p-5"
                style={{
                  border: '1px solid rgba(39,57,70,0.1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  backgroundColor: '#ffffff',
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="inline-flex items-center justify-center w-10 h-10 rounded-lg"
                    style={{
                      backgroundColor: `${card.color}08`,
                      border: `1px solid ${card.color}15`,
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{ fontSize: '20px', color: card.color }}
                    >
                      {card.icon}
                    </span>
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: '"EB Garamond", serif',
                    fontSize: '28px',
                    fontWeight: 500,
                    color: '#1A242B',
                  }}
                >
                  {card.value}
                </div>
                <div
                  className="mt-1"
                  style={{
                    fontSize: '11px',
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                    color: '#54626C',
                    textTransform: 'uppercase',
                  }}
                >
                  {card.label}
                </div>
              </div>
            ))}
          </div>

          {/* Curriculum Info Banner */}
          {ibCurriculum.description && (
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: '#faf9f6', border: '1px solid rgba(195,199,204,0.2)' }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="material-symbols-outlined mt-0.5"
                  style={{ fontSize: '20px', color: '#E8A020' }}
                >
                  info
                </span>
                <div>
                  <h3
                    style={{
                      fontFamily: '"EB Garamond", serif',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#1A242B',
                    }}
                  >
                    {ibCurriculum.name}
                  </h3>
                  <p className="text-sm mt-1" style={{ color: '#54626C' }}>
                    {ibCurriculum.description}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subject Groups Grid */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2
                style={{
                  fontFamily: '"EB Garamond", serif',
                  fontSize: '20px',
                  fontWeight: 500,
                  color: '#1A242B',
                }}
              >
                IB Subject Groups
              </h2>
              <span
                className="uppercase"
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  fontWeight: 600,
                  color: '#54626C',
                }}
              >
                {subjectGroups.reduce((sum, g) => sum + g.subjects.length, 0)} subjects across{' '}
                {subjectGroups.length} groups
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {subjectGroups.map((group) => (
                <div
                  key={group.id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    border: '1px solid rgba(39,57,70,0.1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    backgroundColor: '#ffffff',
                  }}
                >
                  {/* Group Header */}
                  <div
                    className="px-6 py-4 flex items-center gap-3"
                    style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}
                  >
                    <span
                      className="inline-flex items-center justify-center w-9 h-9 rounded-lg"
                      style={{
                        backgroundColor: 'rgba(39,57,70,0.05)',
                        border: '1px solid rgba(39,57,70,0.1)',
                      }}
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '18px', color: '#273946' }}
                      >
                        {group.icon}
                      </span>
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3
                        style={{
                          fontFamily: '"EB Garamond", serif',
                          fontSize: '16px',
                          fontWeight: 600,
                          color: '#1A242B',
                        }}
                      >
                        {group.name}
                      </h3>
                      <p className="text-xs truncate" style={{ color: '#54626C' }}>
                        {group.description}
                      </p>
                    </div>
                  </div>

                  {/* Subjects List */}
                  <div className="px-6 py-3">
                    {group.subjects.length > 0 ? (
                      <div className="space-y-3">
                        {group.subjects.map((subject) => (
                          <Link
                            key={subject.id}
                            to={`/service/crm/family/${subject.chapterId}`}
                            className="block rounded-lg px-4 py-3 transition-colors duration-150 no-underline"
                            style={{
                              border: '1px solid rgba(195,199,204,0.15)',
                              backgroundColor: '#faf9f6',
                            }}
                            onMouseEnter={(e) => {
                              (e.currentTarget as HTMLElement).style.backgroundColor = '#f4f3f0';
                              (e.currentTarget as HTMLElement).style.borderColor =
                                'rgba(195,199,204,0.3)';
                            }}
                            onMouseLeave={(e) => {
                              (e.currentTarget as HTMLElement).style.backgroundColor = '#faf9f6';
                              (e.currentTarget as HTMLElement).style.borderColor =
                                'rgba(195,199,204,0.15)';
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm" style={{ color: '#1A242B' }}>
                                  {subject.name}
                                </div>
                                {subject.gradeLevel && (
                                  <div className="text-xs mt-0.5" style={{ color: '#54626C' }}>
                                    {subject.gradeLevel}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-3 shrink-0">
                                <span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                                  style={{
                                    fontSize: '11px',
                                    backgroundColor:
                                      subject.enrolledCount > 0
                                        ? 'rgba(39,57,70,0.05)'
                                        : 'rgba(195,199,204,0.1)',
                                    color: subject.enrolledCount > 0 ? '#273946' : '#54626C',
                                    border: `1px solid ${subject.enrolledCount > 0 ? 'rgba(39,57,70,0.1)' : 'rgba(195,199,204,0.2)'}`,
                                  }}
                                >
                                  <span
                                    className="material-symbols-outlined"
                                    style={{ fontSize: '12px' }}
                                  >
                                    person
                                  </span>
                                  {subject.enrolledCount}
                                </span>
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <div className="py-6 text-center">
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: '28px', color: 'rgba(39,57,70,0.1)' }}
                        >
                          library_add
                        </span>
                        <p className="text-xs mt-2" style={{ color: '#54626C' }}>
                          No subjects in this group yet.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Group Footer */}
                  <div
                    className="px-6 py-3 flex items-center justify-between"
                    style={{
                      borderTop: '1px solid rgba(195,199,204,0.15)',
                      backgroundColor: '#faf9f6',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#54626C',
                        letterSpacing: '0.12em',
                      }}
                    >
                      {group.subjects.length} SUBJECT{group.subjects.length !== 1 ? 'S' : ''}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: '#54626C',
                        letterSpacing: '0.12em',
                      }}
                    >
                      {group.subjects.reduce((sum, s) => sum + s.enrolledCount, 0)} ENROLLED
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Enrolments Summary Table */}
          {chapters.length > 0 && (
            <section>
              <div
                className="rounded-xl overflow-hidden"
                style={{
                  border: '1px solid rgba(39,57,70,0.1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}
              >
                <div
                  className="px-8 py-6 flex justify-between items-center"
                  style={{ borderBottom: '1px solid rgba(195,199,204,0.2)' }}
                >
                  <h2
                    style={{
                      fontFamily: '"EB Garamond", serif',
                      fontSize: '20px',
                      fontWeight: 500,
                      color: '#1A242B',
                    }}
                  >
                    IB Enrolment Overview
                  </h2>
                  <span
                    className="uppercase"
                    style={{
                      fontSize: '11px',
                      letterSpacing: '0.12em',
                      fontWeight: 600,
                      color: '#54626C',
                    }}
                  >
                    Total Enrolments: {enrollments.length}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr>
                        {['Subject', 'Group', 'Grade Level', 'Enrolled Students'].map((h) => (
                          <th
                            key={h}
                            className="px-8 py-4 uppercase"
                            style={{
                              fontSize: '11px',
                              letterSpacing: '0.12em',
                              fontWeight: 600,
                              color: '#54626C',
                              borderBottom: '1px solid rgba(195,199,204,0.2)',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {chapters.map((ch, i) => {
                        const groupIdx = getSubjectGroupIndex(ch.name);
                        const enrolledCount = enrollments.filter(
                          (e) => e.chapter_id === ch.id
                        ).length;
                        return (
                          <tr
                            key={ch.id}
                            className="hover:bg-gray-50 transition-colors duration-150"
                            style={{
                              borderBottom:
                                i < chapters.length - 1
                                  ? '1px solid rgba(195,199,204,0.1)'
                                  : undefined,
                              height: '52px',
                            }}
                          >
                            <td className="px-8 py-4">
                              <div className="font-medium text-sm" style={{ color: '#273946' }}>
                                {ch.name}
                              </div>
                            </td>
                            <td className="px-8 py-4 text-sm" style={{ color: '#54626C' }}>
                              {IB_SUBJECT_GROUPS[groupIdx]?.name || 'Uncategorized'}
                            </td>
                            <td className="px-8 py-4 text-sm" style={{ color: '#54626C' }}>
                              {ch.grade_level || '—'}
                            </td>
                            <td className="px-8 py-4">
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium"
                                style={{
                                  backgroundColor:
                                    enrolledCount > 0
                                      ? 'rgba(39,57,70,0.05)'
                                      : 'rgba(195,199,204,0.1)',
                                  color: enrolledCount > 0 ? '#273946' : '#54626C',
                                  border: `1px solid ${enrolledCount > 0 ? 'rgba(39,57,70,0.1)' : 'rgba(195,199,204,0.2)'}`,
                                }}
                              >
                                {enrolledCount}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </AdminLayout>
  );
}
