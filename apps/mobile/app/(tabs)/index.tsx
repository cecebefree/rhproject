// Home screen — Design 5 context
// greeting, devotional, coming_up, news

import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SEED_USER } from '../../src/seed/user';
import { colors } from '../../src/theme/colors';
import { spacing } from '../../src/theme/spacing';
import { typography } from '../../src/theme/typography';

export default function HomeScreen() {
  return (
    <ScrollView style={styles.container}>
      {/* Greeting */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>Good morning</Text>
        <Text style={styles.name}>{SEED_USER.name}</Text>
        <Text style={styles.tag}>
          {SEED_USER.curriculum} · {SEED_USER.stage} · Group A
        </Text>
      </View>

      {/* Devotional */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Today's Devotional</Text>
        <Text style={styles.verse}>John 10:10 TPT</Text>
        <Text style={styles.verseText}>
          "The thief comes to steal and kill and destroy; I came that they may have life, and have
          it abundantly."
        </Text>
      </View>

      {/* Coming up */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Coming Up</Text>
        <View style={styles.comingUpRow}>
          <View style={styles.comingUpLeft}>
            <Text style={styles.comingUpSubject}>Mathematics</Text>
            <Text style={styles.comingUpTeacher}>Mr. Olivier</Text>
          </View>
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>
      </View>

      {/* News */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>News</Text>
        <Text style={styles.newsHeadline}>Virtual Science Fair — Friday 2 May</Text>
        <Text style={styles.newsRecency}>2h ago</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ivory,
  },
  greetingSection: {
    backgroundColor: colors.navy,
    padding: spacing.lg,
  },
  greeting: {
    fontSize: typography.sizes.h3,
    color: '#fff',
    fontWeight: typography.weights.regular,
  },
  name: {
    fontSize: typography.sizes.h1,
    color: '#fff',
    fontWeight: typography.weights.bold,
    marginTop: spacing.xs,
  },
  tag: {
    fontSize: typography.sizes.body,
    color: '#fff',
    opacity: 0.8,
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
  verse: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.burgundy,
    marginBottom: spacing.xs,
  },
  verseText: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
    lineHeight: 24,
  },
  comingUpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  comingUpLeft: {
    flex: 1,
  },
  comingUpSubject: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.charcoal,
  },
  comingUpTeacher: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: spacing.xs,
  },
  liveBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: typography.sizes.badge,
    fontWeight: typography.weights.bold,
  },
  newsHeadline: {
    fontSize: typography.sizes.body,
    color: colors.charcoal,
  },
  newsRecency: {
    fontSize: typography.sizes.caption,
    color: colors.charcoalLight,
    marginTop: spacing.xs,
  },
});
