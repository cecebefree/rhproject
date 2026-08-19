// CourseSchedule — manage class dates/times for a course (Rows 99-101)
// Add/delete schedule slots with date, time, location, recurrence

import { useEffect, useState } from 'react';
import {
  listSchedule,
  addScheduleSlot,
  deleteScheduleSlot,
  type CourseSchedule as ScheduleType,
} from '../adminCoursesClient';

interface CourseScheduleProps {
  courseId: string;
  tenantId: string;
}

export function CourseSchedule({ courseId, tenantId }: CourseScheduleProps) {
  const [slots, setSlots] = useState<ScheduleType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form state
  const [classDate, setClassDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [recurring, setRecurring] = useState<'none' | 'weekly' | 'monthly'>('none');

  useEffect(() => {
    loadSlots();
  }, [courseId]);

  async function loadSlots() {
    setLoading(true);
    const { data } = await listSchedule(courseId);
    if (data) setSlots(data);
    setLoading(false);
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!classDate || !startTime || !endTime) return;

    setAdding(true);
    const { error } = await addScheduleSlot({
      tenant_id: tenantId,
      course_id: courseId,
      class_date: classDate,
      start_time: startTime,
      end_time: endTime,
      location: location || undefined,
      recurring,
    });

    if (!error) {
      await loadSlots();
      setShowForm(false);
      setClassDate('');
      setStartTime('09:00');
      setEndTime('10:00');
      setLocation('');
      setRecurring('none');
    }
    setAdding(false);
  };

  const handleDelete = async (slotId: string) => {
    if (!confirm('Remove this class session?')) return;
    await deleteScheduleSlot(slotId);
    setSlots((prev) => prev.filter((s) => s.id !== slotId));
  };

  function formatTime(time: string): string {
    const [h, m] = time.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  if (loading) {
    return <div style={styles.loading}>Loading schedule...</div>;
  }

  return (
    <div>
      <div style={styles.header}>
        <h3 style={styles.title}>Class Schedule</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          style={styles.addButton}
        >
          {showForm ? 'Cancel' : '+ Add Class'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleAdd} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.field}>
              <label style={styles.label}>Date *</label>
              <input
                type="date"
                value={classDate}
                onChange={(e) => setClassDate(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Start Time *</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                style={styles.input}
                required
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>End Time *</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                style={styles.input}
                required
              />
            </div>
          </div>
          <div style={styles.formRow}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Location (optional)</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Room 101, Online, etc."
                style={styles.input}
              />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Recurring</label>
              <select
                value={recurring}
                onChange={(e) => setRecurring(e.target.value as typeof recurring)}
                style={styles.select}
              >
                <option value="none">One-time</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          <div style={styles.formActions}>
            <button type="submit" disabled={adding} style={styles.saveButton}>
              {adding ? 'Adding...' : 'Add Class'}
            </button>
          </div>
        </form>
      )}

      {/* Schedule list */}
      {slots.length === 0 ? (
        <div style={styles.empty}>No classes scheduled yet. Add your first class session above.</div>
      ) : (
        <div style={styles.slotList}>
          {slots.map((slot) => (
            <div key={slot.id} style={styles.slotCard}>
              <div style={styles.slotInfo}>
                <div style={styles.slotDate}>{formatDate(slot.class_date)}</div>
                <div style={styles.slotTime}>
                  {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                </div>
                {slot.location && (
                  <div style={styles.slotLocation}>📍 {slot.location}</div>
                )}
                {slot.recurring !== 'none' && (
                  <span style={styles.recurringBadge}>{slot.recurring}</span>
                )}
              </div>
              <button
                onClick={() => handleDelete(slot.id)}
                style={styles.deleteButton}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
    margin: 0,
  },
  addButton: {
    padding: '6px 14px',
    backgroundColor: '#3182ce',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  form: {
    padding: '16px',
    background: '#f7fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    marginBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  formRow: {
    display: 'flex',
    gap: '12px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    minWidth: '140px',
  },
  label: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#4a5568',
  },
  input: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
  },
  select: {
    padding: '6px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '14px',
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  saveButton: {
    padding: '6px 14px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  slotList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  slotCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'white',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
  },
  slotInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  slotDate: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#2d3748',
  },
  slotTime: {
    fontSize: '13px',
    color: '#4a5568',
  },
  slotLocation: {
    fontSize: '13px',
    color: '#718096',
  },
  recurringBadge: {
    display: 'inline-block',
    padding: '1px 8px',
    background: '#ebf8ff',
    color: '#2b6cb0',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500',
    marginTop: '2px',
    alignSelf: 'flex-start',
  },
  deleteButton: {
    padding: '4px 10px',
    background: 'none',
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#e53e3e',
    cursor: 'pointer',
  },
  loading: {
    padding: '24px',
    textAlign: 'center',
    color: '#718096',
  },
  empty: {
    padding: '24px',
    textAlign: 'center',
    color: '#a0aec0',
    fontStyle: 'italic',
    fontSize: '14px',
  },
};
