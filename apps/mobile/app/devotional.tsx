// Devotional screen — Row 41d wiring
// Dedicated view for today's devotional content via get_today_devotional() RPC.
// READ-ONLY: displays type + url_or_text; is_iframe opens URL in browser.
// Source: frozen Design (devotional-gate stub → live RPC)
// Pattern: matches index.tsx SectionLoader/SectionError/SectionEmpty

import { useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../src/services/supabase';
import { colors } from '../src/theme/colors';
import { spacing } from '../src/theme/spacing';
import { typography } from '../src/theme/typography';

interface DevotionalItem {
  id: string;
  type: string;
  day: number;
  url_or_text: string;
  is_iframe: boolean;
  created_at: string;
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

function SectionEmpty({ message }: { message: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.emptyText}>{message}</Text>
    </View>
  );
}

export default function DevotionalScreen() {
  const [devotional, setDevotional] = useState<DevotionalItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDevotional() {
      setLoading(true);
      setError(null);

      const { data, error: rpcErr } = await supabase.rpc('get_today_devotional');

      if (!cancelled) {
        if (rpcErr) setError(rpcErr.message);
        else setDevotional(data && data.length > 0 ? data[0] : null);
        setLoading(false);
      }
    }

    loadDevotional();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenUrl = (url: string) => {
    Linking.openURL(url);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today&apos;s Devotional</Text>
        {devotional && (
          <Text style={styles.subtitle}>Day {devotional.day}</Text>
        )}
      </View>

      {loading ? (
        <SectionLoader />
      ) : error ? (
        <SectionError message={error} />
      ) : devotional ? (
        <View style={styles.section}>
          <Text style={styles.type}>{devotional.type}</Text>
          {devotional.is_iframe ? (
            <TouchableOpacity
              onPress={() => handleOpenUrl(devotional.url_or_text)}
              style={styles.linkButton}
            >
              <Text style={styles.linkText}>{devotional.url_or_text}</Text>
              <Text style={styles.linkHint}>Tap to open in browser</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.content}>{devotional.url_or_text}</Text>
          )}
        </View>
      ) : (
        <SectionEmpty message="No devotional today" />
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
  subtitle: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: spacing.xs,
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
  type: {
    fontSize: typography.sizes.h3,
    fontWeight: typography.weights.semibold,
    color: colors.burgundy,
    marginBottom: spacing.sm,
  },
  content: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
    lineHeight: 24,
  },
  linkButton: {
    backgroundColor: '#fff',
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.ivoryDark,
  },
  linkText: {
    fontSize: typography.sizes.body,
    color: colors.navy,
    textDecorationLine: 'underline',
    marginBottom: spacing.xs,
  },
  linkHint: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: colors.charcoalLight,
  },
});
