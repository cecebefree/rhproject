// CertificatesScreen — ITEM-002
// Records tab: certificate list from seed

import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SEED_CERTS } from '../../src/seed/certs';
import { EmptyState } from '../../src/components/EmptyState';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function CertificatesScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Certificates</Text>
      </View>

      {SEED_CERTS.length > 0 ? (
        SEED_CERTS.map((cert) => (
          <View key={cert.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{cert.title}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{cert.status}</Text>
              </View>
            </View>
            <Text style={styles.class}>Class: {cert.class}</Text>
            <Text style={styles.signatory}>Signatory: {cert.signatory}</Text>
            <Text style={styles.date}>Issued: {cert.issuedAt}</Text>
          </View>
        ))
      ) : (
        <EmptyState
          title="No certificates yet"
          message="Your certificates will appear here"
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  header: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  title: {
    fontSize: typography.sizes.h2,
    fontWeight: typography.weights.bold,
    color: colors.charcoal,
  },
  card: {
    backgroundColor: '#fff',
    margin: spacing.md,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statusBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.medium,
    textTransform: 'capitalize',
  },
  class: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  signatory: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  date: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
});
