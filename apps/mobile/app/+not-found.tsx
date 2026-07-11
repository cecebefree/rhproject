import { Link } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <View>
      <Text>Page not found</Text>
      <Link href="/">Go home</Link>
    </View>
  );
}
