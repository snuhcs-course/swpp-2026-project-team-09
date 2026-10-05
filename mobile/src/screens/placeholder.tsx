import { router } from 'expo-router';
import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, color, space, text } from '@/design-system';

// Stands where a screen of a later ticket will be. In development it holds the ways on that the real screen will
// have, so that the flow between the screens can be walked, and the ways to the design system's catalogue and to the map's check.
export function Placeholder({ name, children }: { name: string; children?: ReactNode }): ReactElement {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.name}>
        {name}
      </Text>
      {__DEV__ ? (
        <>
          {children}
          <Button
            onPress={() => {
              router.push('/catalogue');
            }}
            variant="ghost"
          >
            디자인 시스템 보기
          </Button>
          <Button
            onPress={() => {
              router.push('/map-check');
            }}
            variant="ghost"
          >
            지도 보기
          </Button>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    backgroundColor: color.surface,
  },
  name: { ...text.titleLg, color: color.snuBlue },
});
