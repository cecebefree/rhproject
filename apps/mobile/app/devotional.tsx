import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchTodayDevotional, type DevotionalData } from '../src/lib/devotionalClient';
import { isFeatureEnabled } from '../src/config/tenant';
import { spacing } from '../src/theme/spacing';
import { typography } from '../src/theme/typography';

const BRAND_NAVY = '#273946';
const BRAND_RED = '#C8281E';
const TEXT_SECONDARY = '#8b939e';
const ACCENT_ORANGE = '#E8A020';
const CARD_BG = '#384f5f';

type TileKey = 'verse' | 'biblePlan' | 'music' | 'vlog';

const TILE_META: Record<TileKey, { icon: string; label: string; color: string }> = {
  verse: { icon: '✝', label: 'Verse of the Day', color: ACCENT_ORANGE },
  biblePlan: { icon: '📖', label: 'Bible Plan', color: '#6CB4EE' },
  music: { icon: '♫', label: 'Music', color: '#A78BFA' },
  vlog: { icon: '▶', label: 'Vlog', color: '#F472B6' },
};

export default function DevotionalScreen() {
  const [data, setData] = useState<DevotionalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const devotionalEnabled = isFeatureEnabled('devotional');

  useEffect(() => {
    if (!devotionalEnabled) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await fetchTodayDevotional();
      if (cancelled) return;

      if (result.error) {
        setError(result.error);
      } else {
        setData(result.data);
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [devotionalEnabled]);

  if (!devotionalEnabled) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>Devotional is not available</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={BRAND_RED} />
        <Text style={styles.loadingText}>Loading devotional…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const hasContent = data && (data.verse || data.biblePlan || data.music || data.vlog);

  if (!hasContent) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No devotional content today</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Verse tile */}
      {data.verse && <VerseTile ref_={data.verse.ref} content={data.verse.content} title={data.verse.title} />}

      {/* Bible Plan tile */}
      {data.biblePlan && <BiblePlanTile ref_={data.biblePlan.ref} title={data.biblePlan.title} day={data.biblePlan.day} />}

      {/* Music tile */}
      {data.music && <MediaTile icon={TILE_META.music.icon} label={TILE_META.music.label} ref_={data.music.ref} title={data.music.title} />}

      {/* Vlog tile */}
      {data_vlog(data.vlog)}
    </ScrollView>
  );
}

// ─── TILE COMPONENTS ──────────────────────────────────────────

function VerseTile({ ref_, content, title }: { ref_: string | null; content: string | null; title: string | null }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHeader}>
        <Text style={styles.tileIcon}>{TILE_META.verse.icon}</Text>
        <Text style={[styles.tileLabel, { color: TILE_META.verse.color }]}>{TILE_META.verse.label}</Text>
      </View>
      {ref_ ? <Text style={styles.tileRef}>{ref_}</Text> : null}
      {content ? <Text style={styles.tileContent}>{content}</Text> : null}
      {title ? <Text style={styles.tileTitle}>{title}</Text> : null}
    </View>
  );
}

function BiblePlanTile({ ref_, title, day }: { ref_: string | null; title: string | null; day: number | null }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHeader}>
        <Text style={styles.tileIcon}>{TILE_META.biblePlan.icon}</Text>
        <Text style={[styles.tileLabel, { color: TILE_META.biblePlan.color }]}>{TILE_META.biblePlan.label}</Text>
      </View>
      {day != null ? <Text style={styles.tileDay}>Day {day}</Text> : null}
      {ref_ ? <Text style={styles.tileRef}>{ref_}</Text> : null}
      {title ? <Text style={styles.tileTitle}>{title}</Text> : null}
    </View>
  );
}

function MediaTile({ icon, label, ref_, title }: { icon: string; label: string; ref_: string | null; title: string | null }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHeader}>
        <Text style={styles.tileIcon}>{icon}</Text>
        <Text style={styles.tileLabel}>{label}</Text>
      </View>
      {title ? <Text style={styles.tileRef}>{title}</Text> : null}
      {ref_ ? (
        <Text style={styles.tileMediaRef} numberOfLines={2}>{ref_}</Text>
      ) : null}
    </View>
  );
}

// ─── HELPERS ──────────────────────────────────────────────────

function data_vlog(vlog: DevotionalData['vlog']) {
  if (!vlog) return null;
  return (
    <View style={styles.tile}>
      <View style={styles.tileHeader}>
        <Text style={styles.tileIcon}>{TILE_META.vlog.icon}</Text>
        <Text style={[styles.tileLabel, { color: TILE_META.vlog.color }]}>{TILE_META.vlog.label}</Text>
      </View>
      {vlog.title ? <Text style={styles.tileRef}>{vlog.title}</Text> : null}
      {vlog.ref ? (
        <Text style={styles.tileMediaRef} numberOfLines={2}>{vlog.ref}</Text>
      ) : null}
    </View>
  );
}

// ─── STYLES ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_NAVY,
  },
  content: {
    padding: spacing.md,
    gap: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRAND_NAVY,
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: typography.sizes.body,
    color: TEXT_SECONDARY,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: typography.sizes.body,
    color: '#e74c3c',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: typography.sizes.body,
    color: TEXT_SECONDARY,
    textAlign: 'center',
  },
  tile: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: spacing.md,
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  tileIcon: {
    fontSize: 18,
  },
  tileLabel: {
    fontSize: 10,
    letterSpacing: 2,
    color: TEXT_SECONDARY,
    textTransform: 'uppercase',
    fontWeight: typography.weights.regular,
  },
  tileDay: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    marginBottom: spacing.xs,
  },
  tileRef: {
    fontSize: 14,
    color: ACCENT_ORANGE,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.xs,
  },
  tileContent: {
    fontSize: 16,
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    color: '#ccc',
    lineHeight: 24,
    marginBottom: spacing.sm,
  },
  tileTitle: {
    fontSize: 12,
    color: TEXT_SECONDARY,
    fontWeight: typography.weights.regular,
  },
  tileMediaRef: {
    fontSize: 12,
    color: '#6CB4EE',
    marginTop: spacing.xs,
  },
});
