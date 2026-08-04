// ScheduleSlotList — read-only schedule view for School Desk
// D22: schedule writes are admin-only; teachers read via ss_teacher_read
// RLS: course ownership (c.teacher_id = auth.uid()) enforced by Supabase

import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

interface ScheduleSlot {
  id: string;
  course_id: string;
  label: string | null;
  start_time: string;
  end_time: string;
  days_of_week: number[];
  recurrence: string;
  course_title?: string;
}

interface ScheduleSlotListProps {
  tenantId: string | null;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function ScheduleSlotList({ tenantId }: ScheduleSlotListProps) {
  const [slots, setSlots] = useState<ScheduleSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSlots() {
      setLoading(true);
      setError(null);

      const { data, error: slotsError } = await supabase
        .from('schedule_slot')
        .select(`
          id,
          course_id,
          label,
          start_time,
          end_time,
          days_of_week,
          recurrence,
          courses!inner (title)
        `)
        .order('start_time');

      if (!cancelled) {
        if (slotsError) {
          setError(slotsError.message);
        } else {
          const mapped = (data ?? []).map((slot: Record<string, unknown>) => ({
            ...slot,
            course_title: slot.courses?.title,
          }));
          setSlots(mapped);
        }
        setLoading(false);
      }
    }

    loadSlots();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div style={styles.loading}>
        <p>Loading schedule...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.error}>
        <p>Unable to load schedule: {error}</p>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div style={styles.empty}>
        <h3>No schedule slots</h3>
        <p>No schedule slots are assigned to your courses yet.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={styles.sectionTitle}>Your Schedule ({slots.length} slots)</h2>
      <div style={styles.list}>
        {slots.map((slot) => (
          <div key={slot.id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.cardTitle}>{slot.course_title ?? 'Untitled Course'}</span>
              <span style={styles.badge}>{slot.recurrence}</span>
            </div>
            {slot.label && <p style={styles.cardLabel}>{slot.label}</p>}
            <p style={styles.cardTime}>
              {slot.start_time} — {slot.end_time}
            </p>
            <p style={styles.cardDays}>
              {slot.days_of_week.map((d) => DAY_NAMES[d - 1]).join(', ')}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  loading: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
  },
  error: {
    padding: '48px',
    textAlign: 'center',
    color: '#e53e3e',
  },
  empty: {
    padding: '48px',
    textAlign: 'center',
    color: '#718096',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2d3748',
    margin: '0 0 16px 0',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2d3748',
  },
  cardLabel: {
    fontSize: '14px',
    color: '#718096',
    margin: '0 0 4px 0',
  },
  cardTime: {
    fontSize: '14px',
    color: '#4a5568',
    margin: '4px 0',
  },
  cardDays: {
    fontSize: '13px',
    color: '#718096',
    margin: '4px 0 0 0',
  },
  badge: {
    backgroundColor: '#e2e8f0',
    color: '#4a5568',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
  },
};
