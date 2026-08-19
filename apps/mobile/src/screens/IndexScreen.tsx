// src/screens/IndexScreen.tsx
// Class browsing + enrollment flow (Row 96)
// Fetches classes with enrollment status, handles enroll, refreshes on success

import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { ClassCard } from '../components/ClassCard';
import { EmptyState } from '../components/EmptyState';
import { LoadingState } from '../components/LoadingState';
import { fetchClassesWithEnrollment } from '../lib/classesClient';
import { enrollStudent } from '../lib/enrollmentClient';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { ClassItem } from '../types/classes';

interface Toast {
  message: string;
  type: 'success' | 'error';
}

export function IndexScreen() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const loadClasses = useCallback(async () => {
    const { classes: data, error } = await fetchClassesWithEnrollment();
    if (error) {
      setToast({ message: error, type: 'error' });
    }
    setClasses(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  // Auto-dismiss toast after 3s
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleEnroll = async (classId: string) => {
    setEnrollingId(classId);

    const { data, error } = await enrollStudent(classId);

    setEnrollingId(null);

    if (error) {
      // Map error codes to user-friendly messages
      let message = error;
      if (error.includes('Already enrolled')) {
        message = 'Already enrolled in this class';
      } else if (error.includes('not available') || error.includes('not found')) {
        message = 'Class not available for enrollment';
      } else if (error.includes('Not eligible') || error.includes('not eligible')) {
        message = 'Not eligible for this class';
      } else if (error.includes('Server') || error.includes('Failed')) {
        message = 'Server error, please retry';
      } else if (error.includes('Connection') || error.includes('network')) {
        message = 'Connection failed — check your internet';
      }

      setToast({ message, type: 'error' });
      return;
    }

    // Success — update local state immediately + refresh in background
    setClasses((prev) =>
      prev.map((c) => (c.id === classId ? { ...c, enrollment_status: 'enrolled' as const } : c))
    );
    setToast({ message: 'Enrolled!', type: 'success' });

    // Background refresh to sync with server
    loadClasses();
  };

  const handleClassPress = (classId: string) => {
    // Navigate to class detail — placeholder for now
    Alert.alert('Class Detail', `Opening class ${classId}`);
  };

  if (loading) {
    return <LoadingState />;
  }

  return (
    <View style={styles.container}>
      {/* Toast banner */}
      {toast && (
        <View
          style={[styles.toast, toast.type === 'success' ? styles.toastSuccess : styles.toastError]}
        >
          <Text style={styles.toastText}>{toast.message}</Text>
        </View>
      )}

      {classes.length === 0 ? (
        <EmptyState
          icon="📚"
          title="No Classes Available"
          message="Check back later for available classes."
        />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ClassCard
              classItem={item}
              onPress={handleClassPress}
              onEnroll={item.enrollment_status === 'available' ? handleEnroll : undefined}
              enrolling={enrollingId === item.id}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  list: {
    paddingVertical: spacing.md,
  },
  toast: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    zIndex: 100,
  },
  toastSuccess: {
    backgroundColor: '#dcfce7',
  },
  toastError: {
    backgroundColor: '#fee2e2',
  },
  toastText: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    textAlign: 'center',
  },
});
