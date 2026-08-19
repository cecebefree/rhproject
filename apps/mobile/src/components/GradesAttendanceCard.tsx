// src/components/GradesAttendanceCard.tsx
// Row 98: Grades + attendance display per course

import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { AttendanceRecord, GradeRecord } from '../types/profile';

interface GradesAttendanceCardProps {
  grades: GradeRecord[];
  attendance: AttendanceRecord[];
}

function GradeRow({ grade }: { grade: GradeRecord }) {
  const pct =
    grade.max_score && grade.max_score > 0
      ? Math.round(((grade.avg_score ?? 0) / grade.max_score) * 100)
      : grade.avg_score != null
        ? Math.round(grade.avg_score)
        : null;

  return (
    <View style={styles.row}>
      <Text style={styles.courseName} numberOfLines={1}>
        {grade.course_title}
      </Text>
      <View style={styles.rowRight}>
        <Text style={styles.metricValue}>{pct != null ? `${pct}%` : '—'}</Text>
        <Text style={styles.caption}>{grade.assignment_count} graded</Text>
      </View>
    </View>
  );
}

function AttendanceRow({ record }: { record: AttendanceRecord }) {
  return (
    <View style={styles.row}>
      <Text style={styles.courseName} numberOfLines={1}>
        {record.course_title}
      </Text>
      <View style={styles.rowRight}>
        <Text style={styles.metricValue}>{record.attendance_pct}%</Text>
        <Text style={styles.caption}>
          {record.present_count}/{record.total_sessions} sessions
        </Text>
      </View>
    </View>
  );
}

export function GradesAttendanceCard({ grades, attendance }: GradesAttendanceCardProps) {
  const hasGrades = grades.length > 0;
  const hasAttendance = attendance.length > 0;

  if (!hasGrades && !hasAttendance) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Grades and attendance not yet available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {hasGrades && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grades</Text>
          {grades.map((g) => (
            <GradeRow key={g.course_id} grade={g} />
          ))}
        </View>
      )}

      {hasAttendance && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance</Text>
          {attendance.map((a) => (
            <AttendanceRow key={a.course_id} record={a} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.charcoalLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  courseName: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
    flex: 1,
    marginRight: spacing.sm,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  metricValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  caption: {
    fontSize: typography.sizes.badge,
    color: colors.charcoalLight,
    marginTop: 2,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
});
