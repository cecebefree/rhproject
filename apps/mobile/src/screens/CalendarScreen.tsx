// src/screens/CalendarScreen.tsx
// Monthly calendar + day schedule list

import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useHomeFilter } from '../hooks/useHomeFilter';

interface Props {
  onBack?: () => void;
  onNavigateToClass?: () => void;
  onNavigateToProfile?: () => void;
}

export function CalendarScreen({ onBack, onNavigateToClass, onNavigateToProfile }: Props) {
  const { classes, loading } = useHomeFilter();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthName = currentMonth.toLocaleString('default', { month: 'long' }).toUpperCase();
  const year = currentMonth.getFullYear();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startPad = firstDay.getDay();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(startPad).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  const daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  const navigateMonth = (dir: number) => {
    const next = new Date(currentMonth);
    next.setMonth(next.getMonth() + dir);
    setCurrentMonth(next);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My School Calendar</Text>
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={() => navigateMonth(-1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.navArrow}>{'‹'}</Text>
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthName} {year}</Text>
            <TouchableOpacity onPress={() => navigateMonth(1)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.navArrow}>{'›'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.calendarCard}>
          <View style={styles.dayHeaderRow}>
            {daysOfWeek.map((d, i) => (
              <View key={i} style={styles.dayHeaderCell}>
                <Text style={styles.dayHeaderText}>{d}</Text>
              </View>
            ))}
          </View>
          {weeks.map((weekRow, wi) => (
            <View key={wi} style={styles.weekRow}>
              {weekRow.map((day, di) => {
                if (day === null) return <View key={di} style={styles.dayCell} />;
                const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, today);
                return (
                  <TouchableOpacity key={di} style={styles.dayCell} onPress={() => setSelectedDate(date)}>
                    <View style={[isSelected && styles.daySelected, isToday && !isSelected && styles.dayToday]}>
                      <Text style={[styles.dayText, isSelected && styles.dayTextSelected, isToday && !isSelected && styles.dayTextToday]}>
                        {day}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.selectedDayLabel}>
          <Text style={styles.selectedDayName}>
            {selectedDate.toLocaleString('default', { weekday: 'long' }).toUpperCase()}
          </Text>
          <Text style={styles.selectedDayMonth}>
            {selectedDate.toLocaleString('default', { month: 'long' }).toUpperCase()}
          </Text>
        </View>

        <View style={styles.scheduleSection}>
          <Text style={styles.scheduleSectionTitle}>SCHEDULE</Text>
          {loading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : classes.length > 0 ? (
            classes.map((cls, idx) => (
              <View key={cls.id} style={styles.scheduleCard}>
                <View style={[styles.scheduleBar, { backgroundColor: getBarColor(idx) }]} />
                <View style={styles.scheduleInfo}>
                  <Text style={styles.scheduleTitle}>{cls.title}</Text>
                  <Text style={styles.scheduleTeacher}>{cls.teacher_name ?? 'Teacher'}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No classes scheduled</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom nav bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={onBack}>
          <Text style={styles.navIcon}>⌂</Text>
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={onNavigateToClass}>
          <Text style={styles.navIcon}>▣</Text>
          <Text style={styles.navLabel}>Class</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navItem} onPress={onNavigateToProfile}>
          <Text style={styles.navIcon}>◎</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function getBarColor(idx: number): string {
  const palette = ['#C8281E', '#E8A020', '#273946', '#3a3a3e'];
  return palette[idx % palette.length];
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F7F4' },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: 16, paddingTop: 60, paddingBottom: 20 },
  headerTitle: { fontSize: 22, color: '#273946', fontWeight: '500', marginBottom: 16 },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  navArrow: { fontSize: 28, color: '#273946', fontWeight: '300', width: 32, height: 32, textAlign: 'center', lineHeight: 32 },
  monthTitle: { fontSize: 14, letterSpacing: 2, color: '#273946', fontWeight: '600' },
  calendarCard: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16, padding: 16, borderWidth: 1, borderColor: '#eee', marginVertical: 12 },
  dayHeaderRow: { flexDirection: 'row' },
  dayHeaderCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayHeaderText: { fontSize: 12, fontWeight: '500', color: '#8b939e' },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  daySelected: { backgroundColor: '#C8281E', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dayToday: { borderWidth: 1.5, borderColor: '#E8A020', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 14, color: '#1c1c1e' },
  dayTextSelected: { color: '#fff', fontWeight: '600' },
  dayTextToday: { color: '#C8281E', fontWeight: '600' },
  selectedDayLabel: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 20, marginBottom: 16, gap: 8 },
  selectedDayName: { fontSize: 14, letterSpacing: 2, color: '#273946', fontWeight: '600' },
  selectedDayMonth: { fontSize: 12, letterSpacing: 2, color: '#8b939e', fontWeight: '300' },
  scheduleSection: { paddingHorizontal: 16, marginTop: 12 },
  scheduleSectionTitle: { fontSize: 12, letterSpacing: 2, color: '#273946', fontWeight: '600', marginBottom: 12 },
  scheduleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  scheduleBar: { width: 3, height: 40, borderRadius: 2, marginRight: 12 },
  scheduleInfo: { flex: 1 },
  scheduleTitle: { fontSize: 14, fontWeight: '500', color: '#273946' },
  scheduleTeacher: { fontSize: 12, color: '#8b939e', fontWeight: '300', marginTop: 2 },
  emptyCard: { padding: 20, alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  emptyText: { fontSize: 14, color: '#8b939e' },
  bottomNav: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee', paddingVertical: 8, paddingBottom: 24 },
  navItem: { alignItems: 'center', gap: 2 },
  navIcon: { fontSize: 22, color: '#273946' },
  navLabel: { fontSize: 10, color: '#273946', fontWeight: '500' },
});
