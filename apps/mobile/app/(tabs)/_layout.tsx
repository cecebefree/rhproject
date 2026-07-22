import { Tabs } from 'expo-router';
import { Suspense } from 'react';
import { colors } from '../../src/theme/colors';
import { LoadingState } from '../../src/components/LoadingState';

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
        <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
        <Tabs.Screen name="social" options={{ title: 'My Groups' }} />
        <Tabs.Screen name="class" options={{ title: 'Class' }} />
        <Tabs.Screen name="hub" options={{ title: 'Enrichment' }} />
        <Tabs.Screen name="report-card" options={{ title: 'Records' }} />
        <Tabs.Screen name="teacher" options={{ title: 'Teacher' }} />
        <Tabs.Screen name="family" options={{ title: 'Family' }} />
        <Tabs.Screen name="group-chat" options={{ title: 'Chat', href: null }} />
        <Tabs.Screen name="group-info" options={{ title: 'Group Info', href: null }} />
        <Tabs.Screen name="certificates" options={{ title: 'Certificates', href: null }} />
        <Tabs.Screen name="class-detail" options={{ title: 'Class', href: null }} />
        <Tabs.Screen name="hub-detail" options={{ title: 'Enrichment', href: null }} />
      </Tabs>
    </Suspense>
  );
}
