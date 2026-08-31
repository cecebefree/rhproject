// src/components/HamburgerMenu.tsx
// Hamburger menu overlay — Contact school, Settings, Log out

import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../services/supabase';

interface Props {
  onClose: () => void;
}

export function HamburgerMenu({ onClose }: Props) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.menuItems}>
        <TouchableOpacity style={styles.menuCard} onPress={() => Linking.openURL('mailto:support@redhouse.co.za')}>
          <View style={styles.menuIcon}>
            <Text style={styles.menuIconText}>✉</Text>
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>Contact school</Text>
            <Text style={styles.menuSubtitle}>Speak to Front-Desk</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard}>
          <View style={styles.menuIcon}>
            <Text style={styles.menuIconText}>⚙</Text>
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>Settings</Text>
            <Text style={styles.menuSubtitle}>Manage your app preferences</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuCard} onPress={handleLogout}>
          <View style={styles.menuIcon}>
            <Text style={styles.menuIconText}>↩</Text>
          </View>
          <View style={styles.menuText}>
            <Text style={styles.menuTitle}>Log out</Text>
            <Text style={styles.menuSubtitle}>Sign out of your account</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomLinks}>
        <TouchableOpacity style={styles.bottomLink} onPress={() => Linking.openURL('https://redhouse.co.za')}>
          <Text style={styles.bottomLinkText}>Website</Text>
          <Text style={styles.bottomLinkArrow}>↗</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.bottomLink}>
          <Text style={styles.bottomLinkText}>RedEStore</Text>
          <Text style={styles.bottomLinkArrow}>↗</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  closeIcon: {
    fontSize: 24,
    color: '#1c1c1e',
    fontWeight: '300',
  },
  menuItems: {
    paddingHorizontal: 16,
    gap: 12,
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 16,
    gap: 12,
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#273946',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconText: {
    fontSize: 20,
    color: '#fff',
  },
  menuText: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1c1e',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#8b939e',
    marginTop: 2,
  },
  bottomLinks: {
    marginTop: 'auto',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  bottomLink: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  bottomLinkText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1c1e',
  },
  bottomLinkArrow: {
    fontSize: 16,
    color: '#3a3a3e',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
});
