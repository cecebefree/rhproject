import { Tabs } from 'expo-router';
import { Suspense } from 'react';
import { LoadingState } from '../../src/components/LoadingState';
import { colors } from '../../src/theme/colors';
import Svg, { Path } from 'react-native-svg';

function HomeIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M3 10.5L12 3l9 7.5V21H15v-6H9v6H3V10.5z" fill={color} />
    </Svg>
  );
}

function ClassIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 21V9l8-6 8 6v12H4zm2-2h12V10l-6-4.5L6 10v9zm2-1h2v-4h4v4h2V11l-4-3-4 3v8z"
        fill={color}
      />
    </Svg>
  );
}

function ProfileIcon({ color, size }: { color: string; size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z"
        fill={color}
      />
    </Svg>
  );
}

export default function TabLayout() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.burgundy,
          tabBarInactiveTintColor: colors.charcoalLight,
          headerShown: false,
          tabBarStyle: {
            borderTopColor: colors.ivoryDark,
            backgroundColor: '#fff',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <HomeIcon color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="class"
          options={{
            title: 'Class',
            tabBarIcon: ({ color, size }) => <ClassIcon color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <ProfileIcon color={color} size={size} />,
          }}
        />
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
        <Tabs.Screen name="certificates" options={{
          href: null,
          title: 'Certificates',
          tabBarIcon: ({ color, size }) => (
            <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
              <Path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </Svg>
          ),
        }} />
        <Tabs.Screen name="class-detail" options={{ href: null }} />
        <Tabs.Screen name="hub-detail" options={{ href: null }} />
        <Tabs.Screen name="invoice-detail" options={{ href: null }} />
      </Tabs>
    </Suspense>
  );
}
