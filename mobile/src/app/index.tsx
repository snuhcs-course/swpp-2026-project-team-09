import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, color, space, text } from '@/design-system';

export default function PlaceholderScreen(): ReactElement {
  return (
    <View style={styles.container}>
      <Text style={styles.name}>SNU Now</Text>
      {/* Until the app has screens of its own, a developer reaches the design system's catalogue from here. */}
      {__DEV__ ? (
        <Button
          onPress={() => {
            router.push('/catalogue');
          }}
          variant="secondary"
        >
          디자인 시스템 보기
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[4],
    backgroundColor: color.surface,
  },
  name: { ...text.titleLg, color: color.snuBlue },
});
