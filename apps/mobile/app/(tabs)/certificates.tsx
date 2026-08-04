// CertificatesScreen — Row 35 wiring
// READ-ONLY per ITEM-002: certificates are immutable once issued,
// visible in the Certificate tab. No INSERT/UPDATE/DELETE on this screen.
// Source: Ruling ITEM-002-certificates.md

import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../../src/components/EmptyState';
import { supabase } from '../../src/services/supabase';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

interface Certificate {
  id: string;
  cert_class: string;
  title: string;
  description: string | null;
  signatory: string;
  issued_at: string;
  status: string;
  file_url: string | null;
}

function SectionLoader() {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Loading…</Text>
    </View>
  );
}

function SectionError({ message }: { message: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Unable to load</Text>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function CertificatesScreen() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadCerts() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (!cancelled) {
          setError('Not authenticated');
          setLoading(false);
        }
        return;
      }

      // READ-ONLY: learner sees only their own 'issued' certificates.
      // RLS (cert_self_select) restricts to user_id = auth.uid().
      // Explicit eq(status, 'issued') is defense-in-depth — excludes
      // superseded/revoked from display.
      const { data, error: certsErr } = await supabase
        .from('certificates')
        .select('id, cert_class, title, description, signatory, issued_at, status, file_url')
        .eq('user_id', user.id)
        .eq('status', 'issued')
        .order('issued_at', { ascending: false });

      if (!cancelled) {
        if (certsErr) setError(certsErr.message);
        else setCerts(data ?? []);
        setLoading(false);
      }
    }

    loadCerts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Certificates</Text>
      </View>

      {loading ? (
        <SectionLoader />
      ) : error ? (
        <SectionError message={error} />
      ) : certs.length === 0 ? (
        <EmptyState title="No certificates yet" message="Your certificates will appear here" />
      ) : (
        certs.map((cert) => (
          <View key={cert.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{cert.title}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{cert.status}</Text>
              </View>
            </View>
            <Text style={styles.certClass}>Class: {cert.cert_class}</Text>
            {cert.description ? <Text style={styles.certDesc}>{cert.description}</Text> : null}
            <Text style={styles.signatory}>Signatory: {cert.signatory}</Text>
            <Text style={styles.date}>Issued: {new Date(cert.issued_at).toLocaleDateString()}</Text>
          </View>
        ))
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
  section: {
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ivoryDark,
  },
  sectionTitle: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
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
  certClass: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
    marginBottom: spacing.xs,
  },
  certDesc: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
    marginBottom: spacing.xs,
    lineHeight: 20,
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
});
