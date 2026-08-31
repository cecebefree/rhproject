import { Tabs } from 'expo-router';
import { Suspense } from 'react';
import { LoadingState } from '../../src/components/LoadingState';
import { colors } from '../../src/theme/colors';

export default function TabLayout() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.burgundy,
          tabBarInactiveTintColor: colors.charcoalLight,
          headerTintColor: colors.navy,
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Home' }} />
        <Tabs.Screen name="class" options={{ title: 'Classes' }} />
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="front-desk" options={{ href: null }} />
        <Tabs.Screen name="office-desk" options={{ href: null }} />
        {/* Phase 2+ tabs — hidden */}
        <Tabs.Screen name="social" options={{ href: null }} />
        <Tabs.Screen name="browse-classes" options={{ href: null }} />
        <Tabs.Screen name="hub" options={{ href: null }} />
        <Tabs.Screen name="report-card" options={{ href: null }} />
        <Tabs.Screen name="teacher" options={{ href: null }} />
        <Tabs.Screen name="family" options={{ href: null }} />
        <Tabs.Screen name="group-chat" options={{ href: null }} />
        <Tabs.Screen name="group-info" options={{ href: null }} />
        <Tabs.Screen name="certificates" options={{ href: null }} />
        <Tabs.Screen name="class-detail" options={{ href: null }} />
        <Tabs.Screen name="hub-detail" options={{ href: null }} />
      </Tabs>
    </Suspense>
  );
}
