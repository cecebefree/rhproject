// notifications.ts — Push notification service for mobile
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register for push notifications and save token to Supabase
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Only works on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const existingPermissions = await Notifications.getPermissionsAsync();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalStatus = (existingPermissions as any).status;

  // Request permissions if not already granted
  if (finalStatus !== 'granted') {
    const newPermissions = await Notifications.requestPermissionsAsync();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    finalStatus = (newPermissions as any).status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permissions not granted');
    return null;
  }

  // Get push token
  const tokenData = await Notifications.getExpoPushTokenAsync();
  const pushToken = tokenData.data;

  // Save token to Supabase
  await savePushToken(pushToken);

  // Android-specific channel setup
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E8A020',
    });
  }

  return pushToken;
}

/**
 * Save push token to Supabase profiles table
 */
async function savePushToken(token: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  // Update profile with push token
  await supabase
    .from('profiles')
    .update({ push_token: token })
    .eq('id', user.id);
}

/**
 * Remove push token from Supabase on logout
 */
export async function removePushToken(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from('profiles')
    .update({ push_token: null })
    .eq('id', user.id);
}

/**
 * Listen for incoming notifications
 */
export function addNotificationListener(
  onReceive: (notification: Notifications.Notification) => void,
  onTap: (response: Notifications.NotificationResponse) => void
): () => void {
  const receiveSubscription = Notifications.addNotificationReceivedListener(onReceive);
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(onTap);

  return () => {
    receiveSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Send local notification (for testing or offline events)
 */
export async function sendLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: true,
    },
    trigger: null, // Send immediately
  });
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}
