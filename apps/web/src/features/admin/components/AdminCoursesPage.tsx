// AdminCoursesPage — Admin course builder (Rows 99-101)
// Views: list → detail (with edit + schedule tabs)
// Standalone page — fetches its own profile

import { useEffect, useState } from 'react';
import { NotificationCenter } from '../../../components/NotificationCenter';
import { supabase } from '../../lms/services/supabase';
import { CourseList } from './CourseList';
import { CourseForm } from './CourseForm';
import { CourseSchedule } from './CourseSchedule';
import { getCourse, updateCourse, type Course, type CourseStatus } from '../adminCoursesClient';

interface Profile {
  id: string;
  name: string;
  role: string;
  tenant_id: string | null;
}

type ViewMode = 'list' | 'create' | 'edit' | 'detail';

export default function AdminCoursesPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      if (userErr || !user) {
        if (!cancelled) { setError('Not authenticated'); setLoading(false); }
        return;
      }
      const { data: p, error: pErr } = await supabase
        .from('profiles')
        .select('id, name, role, tenant_id')
        .eq('id', user.id)
        .single();
      if (!cancelled) {
        if (pErr) setError(pErr.message);
        else if (p.role !== 'admin') setError('Access denied. Admin only.');
        else setProfile(p);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'schedule'>('info');
  const [loadingCourse, setLoadingCourse] = useState(false);

  const handleSelect = async (course: Course) => {
    setLoadingCourse(true);
    const { data } = await getCourse(course.id);
    if (data) {
      setSelectedCourse(data);
      setViewMode('detail');
      setDetailTab('info');
    }
    setLoadingCourse(false);
  };

  const handleCreateNew = () => {
    setSelectedCourse(null);
    setViewMode('create');
  };

  const handleEdit = () => {
    setViewMode('edit');
  };

  const handleSave = () => {
    // Refresh course data
    if (selectedCourse) {
      getCourse(selectedCourse.id).then(({ data }) => {
        if (data) setSelectedCourse(data);
        setViewMode('detail');
      });
    } else {
      setViewMode('list');
    }
  };

  const handleBack = () => {
    setSelectedCourse(null);
    setViewMode('list');
  };

  const handleToggleStatus = async () => {
    if (!selectedCourse) return;
    const newStatus: CourseStatus = selectedCourse.status === 'published' ? 'draft' : 'published';
    const { error } = await updateCourse(selectedCourse.id, { status: newStatus });
    if (!error) {
      setSelectedCourse({ ...selectedCourse, status: newStatus });
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.centerMessage}>Loading...</div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div style={styles.container}>
        <div style={styles.centerMessage}>{error || 'Access denied'}</div>
      </div>
    );
  }

  const tenantId = profile.tenant_id ?? '';

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Course Management</h1>
          <p style={styles.subtitle}>Create and manage courses — {profile.name}</p>
        </div>
        <NotificationCenter userId={profile.id} />
      </header>

      <main style={styles.main}>
        {/* List view */}
        {viewMode === 'list' && (
          <CourseList
            tenantId={tenantId}
            onSelect={handleSelect}
            onCreateNew={handleCreateNew}
          />
        )}

        {/* Create form */}
        {viewMode === 'create' && (
          <div>
            <button onClick={handleBack} style={styles.backButton}>&larr; Back to courses</button>
            <CourseForm
              tenantId={tenantId}
              onSuccess={() => setViewMode('list')}
              onCancel={() => setViewMode('list')}
            />
          </div>
        )}

        {/* Edit form */}
        {viewMode === 'edit' && selectedCourse && (
          <div>
            <button onClick={() => setViewMode('detail')} style={styles.backButton}>&larr; Back to course</button>
            <CourseForm
              tenantId={tenantId}
              course={selectedCourse}
              onSuccess={handleSave}
              onCancel={() => setViewMode('detail')}
            />
          </div>
        )}

        {/* Detail view */}
        {viewMode === 'detail' && selectedCourse && (
          <div>
            <button onClick={handleBack} style={styles.backButton}>&larr; Back to courses</button>

            {/* Course header */}
            <div style={styles.detailHeader}>
              <div>
                <h2 style={styles.courseTitle}>{selectedCourse.title}</h2>
                <div style={styles.courseMeta}>
                  <span style={styles.metaItem}>by {selectedCourse.instructor_name}</span>
                  <span style={styles.metaItem}>${selectedCourse.price.toFixed(2)}</span>
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: selectedCourse.status === 'published' ? '#d1fae5' : '#e2e8f0',
                      color: selectedCourse.status === 'published' ? '#065f46' : '#4a5568',
                    }}
                  >
                    {selectedCourse.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                  <span style={styles.metaItem}>
                    {selectedCourse.enrollment_count ?? 0} enrolled
                    {selectedCourse.capacity ? ` / ${selectedCourse.capacity} capacity` : ''}
                  </span>
                </div>
              </div>
              <div style={styles.detailActions}>
                <button onClick={handleEdit} style={styles.editButton}>Edit</button>
                <button onClick={handleToggleStatus} style={styles.toggleButton}>
                  {selectedCourse.status === 'published' ? 'Unpublish' : 'Publish'}
                </button>
              </div>
            </div>

            {selectedCourse.description && (
              <p style={styles.description}>{selectedCourse.description}</p>
            )}

            {/* Tabs */}
            <div style={styles.tabs}>
              <button
                onClick={() => setDetailTab('info')}
                style={detailTab === 'info' ? styles.tabActive : styles.tab}
              >
                Info
              </button>
              <button
                onClick={() => setDetailTab('schedule')}
                style={detailTab === 'schedule' ? styles.tabActive : styles.tab}
              >
                Schedule
              </button>
            </div>

            {/* Tab content */}
            <div style={styles.tabContent}>
              {detailTab === 'info' && (
                <div style={styles.infoGrid}>
                  <div style={styles.infoCard}>
                    <span style={styles.infoLabel}>Instructor</span>
                    <span style={styles.infoValue}>{selectedCourse.instructor_name}</span>
                  </div>
                  <div style={styles.infoCard}>
                    <span style={styles.infoLabel}>Price</span>
                    <span style={styles.infoValue}>${selectedCourse.price.toFixed(2)}</span>
                  </div>
                  <div style={styles.infoCard}>
                    <span style={styles.infoLabel}>Capacity</span>
                    <span style={styles.infoValue}>{selectedCourse.capacity ?? 'Unlimited'}</span>
                  </div>
                  <div style={styles.infoCard}>
                    <span style={styles.infoLabel}>Enrolled</span>
                    <span style={styles.infoValue}>{selectedCourse.enrollment_count ?? 0}</span>
                  </div>
                  <div style={styles.infoCard}>
                    <span style={styles.infoLabel}>Created</span>
                    <span style={styles.infoValue}>
                      {new Date(selectedCourse.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={styles.infoCard}>
                    <span style={styles.infoLabel}>Status</span>
                    <span style={styles.infoValue}>
                      {selectedCourse.status === 'published' ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
              )}

              {detailTab === 'schedule' && (
                <CourseSchedule
                  courseId={selectedCourse.id}
                  tenantId={tenantId}
                />
              )}
            </div>
          </div>
        )}

        {loadingCourse && (
          <div style={styles.loadingOverlay}>Loading course details...</div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#1a365d',
    color: 'white',
    padding: '24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    opacity: 0.9,
    margin: '0',
  },
  main: {
    padding: '24px',
    position: 'relative',
  },
  backButton: {
    padding: '4px 8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#3182ce',
    marginBottom: '16px',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
  },
  courseTitle: {
    fontSize: '22px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 8px 0',
  },
  courseMeta: {
    display: 'flex',
    gap: '16px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  metaItem: {
    fontSize: '14px',
    color: '#718096',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500',
  },
  detailActions: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  toggleButton: {
    padding: '8px 16px',
    backgroundColor: '#4a5568',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  description: {
    fontSize: '14px',
    color: '#4a5568',
    lineHeight: '1.5',
    marginBottom: '20px',
    padding: '12px 16px',
    background: 'white',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    borderBottom: '2px solid #e2e8f0',
    marginBottom: '20px',
  },
  tab: {
    padding: '10px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#718096',
    borderBottom: '2px solid transparent',
    marginBottom: '-2px',
  },
  tabActive: {
    padding: '10px 20px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    color: '#3182ce',
    borderBottom: '2px solid #3182ce',
    marginBottom: '-2px',
  },
  tabContent: {
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '20px',
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '16px',
  },
  infoCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoValue: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#2d3748',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '16px',
    color: '#718096',
    zIndex: 10,
  },
  centerMessage: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
    fontSize: '16px',
  },
};
