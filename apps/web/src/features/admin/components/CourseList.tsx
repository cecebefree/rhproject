// CourseList — Table view of courses with search, filter, actions (Rows 99-101)

import { useEffect, useState } from 'react';
import {
  listCourses,
  listInstructors,
  deleteCourse,
  updateCourse,
  type Course,
  type CourseStatus,
  type Instructor,
} from '../adminCoursesClient';

interface CourseListProps {
  tenantId: string;
  onSelect: (course: Course) => void;
  onCreateNew: () => void;
}

export function CourseList({ tenantId, onSelect, onCreateNew }: CourseListProps) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<CourseStatus | ''>('');
  const [instructorFilter, setInstructorFilter] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [tenantId, search, statusFilter, instructorFilter]);

  async function loadData() {
    setLoading(true);
    const [coursesResult, instructorsResult] = await Promise.all([
      listCourses({
        search: search || undefined,
        status: (statusFilter as CourseStatus) || undefined,
        instructorId: instructorFilter || undefined,
      }),
      listInstructors(tenantId),
    ]);

    if (coursesResult.data) setCourses(coursesResult.data);
    if (instructorsResult.data) setInstructors(instructorsResult.data);
    setLoading(false);
  }

  const handleDelete = async (courseId: string) => {
    if (!confirm('Delete this course? This cannot be undone.')) return;
    setDeleting(courseId);
    const { error } = await deleteCourse(courseId);
    if (error) {
      alert(error.message);
    } else {
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    }
    setDeleting(null);
  };

  const handleToggleStatus = async (course: Course) => {
    const newStatus: CourseStatus = course.status === 'published' ? 'draft' : 'published';
    const { error } = await updateCourse(course.id, { status: newStatus });
    if (!error) {
      setCourses((prev) =>
        prev.map((c) => (c.id === course.id ? { ...c, status: newStatus } : c)),
      );
    }
  };

  return (
    <div>
      {/* Controls */}
      <div style={styles.controls}>
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CourseStatus | '')}
          style={styles.filterSelect}
        >
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
        <select
          value={instructorFilter}
          onChange={(e) => setInstructorFilter(e.target.value)}
          style={styles.filterSelect}
        >
          <option value="">All Instructors</option>
          {instructors.map((i) => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
        <button onClick={onCreateNew} style={styles.createButton}>
          + New Course
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={styles.loading}>Loading courses...</div>
      ) : courses.length === 0 ? (
        <div style={styles.empty}>No courses found. Create your first course to get started.</div>
      ) : (
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Course Name</th>
              <th style={styles.th}>Instructor</th>
              <th style={styles.th}>Price</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Enrolled</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr
                key={course.id}
                style={styles.row}
                onClick={() => onSelect(course)}
              >
                <td style={styles.td}>
                  <div style={styles.courseName}>{course.title}</div>
                  {course.description && (
                    <div style={styles.courseDesc}>{course.description.slice(0, 60)}...</div>
                  )}
                </td>
                <td style={styles.td}>{course.instructor_name}</td>
                <td style={styles.td}>${course.price.toFixed(2)}</td>
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: course.status === 'published' ? '#d1fae5' : '#e2e8f0',
                      color: course.status === 'published' ? '#065f46' : '#4a5568',
                    }}
                  >
                    {course.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td style={styles.td}>
                  {course.enrollment_count ?? 0}
                  {course.capacity ? ` / ${course.capacity}` : ''}
                </td>
                <td style={styles.td} onClick={(e) => e.stopPropagation()}>
                  <div style={styles.actions}>
                    <button
                      onClick={() => handleToggleStatus(course)}
                      style={styles.actionBtn}
                    >
                      {course.status === 'published' ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      onClick={() => handleDelete(course.id)}
                      disabled={deleting === course.id || (course.enrollment_count ?? 0) > 0}
                      style={{
                        ...styles.actionBtn,
                        color: (course.enrollment_count ?? 0) > 0 ? '#a0aec0' : '#e53e3e',
                        cursor: (course.enrollment_count ?? 0) > 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {deleting === course.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  controls: {
    display: 'flex',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  searchInput: {
    flex: 1,
    minWidth: '200px',
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
    minWidth: '150px',
  },
  createButton: {
    padding: '8px 16px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    background: 'white',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #e2e8f0',
  },
  th: {
    textAlign: 'left',
    padding: '12px 16px',
    backgroundColor: '#f7fafc',
    borderBottom: '2px solid #e2e8f0',
    fontSize: '13px',
    fontWeight: '600',
    color: '#4a5568',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  td: {
    padding: '12px 16px',
    borderBottom: '1px solid #f7fafc',
    fontSize: '14px',
    color: '#2d3748',
  },
  row: {
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  courseName: {
    fontWeight: '500',
    color: '#2d3748',
  },
  courseDesc: {
    fontSize: '13px',
    color: '#718096',
    marginTop: '2px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionBtn: {
    padding: '4px 10px',
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    color: '#4a5568',
  },
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: '#a0aec0',
    fontStyle: 'italic',
  },
};
