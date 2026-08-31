// src/screens/ProfileScreen.tsx
// Adult Profile — children, groups, documents, accounts, service desk
// Converted from stitch family_profile_standardized_design
// Uses fetchAdultProfile for RLS-filtered data

import { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LoadingState } from '../components/LoadingState';
import { fetchAdultProfile } from '../lib/profileClient';
import { supabase } from '../services/supabase';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { ChildRecord, FamilyAccountDetail } from '../types/profile';

const BRAND_NAVY = '#273946';
const BRAND_RED = '#C8281E';
const BRAND_ORANGE = '#f3a641';
const BRAND_CREAM = '#F8F7F4';
const TEXT_MUTED = '#9ca3af';
const BORDER_SUBTLE = '#EAEAEA';

interface ProfileHeader {
  name: string | null;
  surname: string | null;
  role: string;
}

interface Section {
  title: string;
  headerColor: string;
  items: { label: string; subtitle?: string; onPress?: () => void }[];
}

export function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [profileHeader, setProfileHeader] = useState<ProfileHeader | null>(null);
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [familyAccount, setFamilyAccount] = useState<FamilyAccountDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    const result = await fetchAdultProfile();

    if (result.error) {
      setError(result.error);
    } else {
      setProfileHeader(result.data);
      setChildren(result.children);
      setFamilyAccount(result.familyAccount);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  if (loading) {
    return <LoadingState />;
  }

  const initials = profileHeader
    ? `${profileHeader.name?.charAt(0) ?? ''}${profileHeader.surname?.charAt(0) ?? ''}`
    : '?';

  // Build sections
  const sections: Section[] = [
    // Students
    {
      title: 'Students',
      headerColor: BRAND_NAVY,
      items: children.map((child) => ({
        label: child.name ?? 'Child',
        subtitle: [child.curriculum, child.current_stage].filter(Boolean).join(' · '),
        onPress: () => {},
      })),
    },
    // Documents
    {
      title: 'Documents',
      headerColor: BRAND_RED,
      items: [
        { label: 'Family ID', onPress: () => {} },
        { label: 'Contracts', onPress: () => {} },
      ],
    },
    // Accounts
    {
      title: 'Accounts',
      headerColor: BRAND_RED,
      items: [
        { label: 'Ledger', onPress: () => {} },
        { label: 'Statements', subtitle: 'Debit, contract', onPress: () => {} },
      ],
    },
    // Service Desk Activity
    {
      title: 'Service Desk Activity',
      headerColor: BRAND_NAVY,
      items: [
        { label: 'School Desk', onPress: () => {} },
        { label: 'Office Desk', onPress: () => {} },
      ],
    },
    // General
    {
      title: 'General',
      headerColor: BRAND_ORANGE,
      items: [
        { label: 'User Profile', onPress: () => {} },
        { label: 'Booklist 2026', subtitle: 'View booklist', onPress: () => {} },
        {
          label: 'Status',
          subtitle: familyAccount?.status ?? 'Unknown',
        },
        {
          label: 'Expiry',
          subtitle: familyAccount?.created_at
            ? new Date(familyAccount.created_at).toLocaleDateString('default', {
                month: 'short',
                year: 'numeric',
              })
            : 'N/A',
        },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        ListHeaderComponent={
          <View>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              </View>
              <Text style={styles.profileName}>Adult Profile</Text>
              <Text style={styles.profileSubtitle}>
                {[profileHeader?.name, profileHeader?.surname]
                  .filter(Boolean)
                  .join(' ')}{' '}
                · {familyAccount?.status ?? 'Active'}
              </Text>
            </View>
          </View>
        }
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <View style={[styles.sectionHeader, { backgroundColor: section.headerColor }]}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
            <View style={styles.sectionBody}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={`${section.title}-${idx}`}
                  style={[
                    styles.sectionItem,
                    idx < section.items.length - 1 && styles.sectionItemBorder,
                  ]}
                  onPress={item.onPress}
                  disabled={!item.onPress}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionItemLabel}>{item.label}</Text>
                    {item.subtitle ? (
                      <Text style={styles.sectionItemSubtitle}>{item.subtitle}</Text>
                    ) : null}
                  </View>
                  <Text style={styles.sectionItemChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_CREAM,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  profileHeader: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xxl + spacing.sm,
    paddingBottom: spacing.md,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BRAND_NAVY,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 28,
    fontFamily: 'Georgia',
  },
  profileName: {
    fontSize: 32,
    fontFamily: 'Georgia',
    color: BRAND_NAVY,
    fontWeight: typography.weights.regular,
    marginBottom: spacing.xs,
  },
  profileSubtitle: {
    fontSize: 12,
    color: TEXT_MUTED,
    fontWeight: typography.weights.regular,
  },
  section: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER_SUBTLE,
  },
  sectionHeader: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  sectionHeaderText: {
    color: '#fff',
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: typography.weights.semibold,
    textTransform: 'uppercase',
  },
  sectionBody: {},
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 56,
  },
  sectionItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER_SUBTLE,
  },
  sectionItemLabel: {
    fontSize: 14,
    fontWeight: typography.weights.medium,
    color: BRAND_NAVY,
  },
  sectionItemSubtitle: {
    fontSize: 11,
    color: TEXT_MUTED,
    fontWeight: typography.weights.regular,
    marginTop: 2,
  },
  sectionItemChevron: {
    fontSize: 20,
    color: BORDER_SUBTLE,
    marginLeft: spacing.sm,
  },
});
