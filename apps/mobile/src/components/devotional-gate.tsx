import { Text, View } from 'react-native';
import { isFeatureEnabled } from '../config/tenant';

export function DevotionalGate() {
  if (!isFeatureEnabled('devotional')) {
    return (
      <View>
        <Text>Devotional coming soon</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>Daily Devotional</Text>
    </View>
  );
}
