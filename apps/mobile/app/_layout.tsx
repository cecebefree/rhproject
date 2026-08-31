import { Stack } from 'expo-router';
import { Suspense } from 'react';
import { LoadingState } from '../src/components/LoadingState';

export default function RootLayout() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Stack>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="devotional" options={{ title: 'Devotional' }} />
        <Stack.Screen name="+not-found" options={{ title: 'Not Found' }} />
      </Stack>
    </Suspense>
  );
}
