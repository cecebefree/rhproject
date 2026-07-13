import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
      <Tabs.Screen name="social" options={{ title: 'My Groups' }} />
      <Tabs.Screen name="teacher" options={{ title: 'Teacher' }} />
      <Tabs.Screen name="family" options={{ title: 'Family' }} />
      <Tabs.Screen name="report-card" options={{ title: 'Records' }} />
    </Tabs>
  );
}
