// AttendanceSection — Shows attendance summary and recent records
// Used in Profile tab for students and parents

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';
import {
  fetchStudentAttendance,
  getAttendanceStats,
  type AttendanceRecord,
} from '../lib/attendanceClient';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

interface Props {
  studentId?: string;
}

export function AttendanceSection({ studentId }: Props) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, present: 0, absent: 0, excused: 0, rate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [studentId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchStudentAttendance(studentId);
      setRecords(data);
      const s = await getAttendanceStats(data);
      setStats(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <EmptyState message={error} />;

  const statusColor = (status: string) => {
    switch (status) {
      case 'present': return '#16a34a';
      case 'absent': return '#dc2626';
      case 'excused': return '#d97706';
      default: return colors.charcoalLight;
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance</Text>

      {/* Stats summary */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{stats.present}</Text>
          <Text style={styles.statLabel}>Present</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#dc2626' }]}>{stats.absent}</Text>
          <Text style={styles.statLabel}>Absent</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: '#d97706' }]}>{stats.excused}</Text>
          <Text style={styles.statLabel}>Excused</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.rate}%</Text>
          <Text style={styles.statLabel}>Rate</Text>
        </View>
      </View>

      {/* Recent records */}
      {records.length === 0 ? (
        <EmptyState message="No attendance records yet." />
      ) : (
        records.slice(0, 10).map((record) => (
          <View key={record.id} style={styles.recordRow}>
            <View style={styles.recordLeft}>
              <Text style={styles.recordDate}>
                {new Date(record.class_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={styles.recordCourse}>{record.course_title}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor(record.status) + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor(record.status) }]}>
                {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.ivory,
    borderRadius: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
  },
  statLabel: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: 2,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  recordLeft: {
    flex: 1,
  },
  recordDate: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  recordCourse: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
  },
});
