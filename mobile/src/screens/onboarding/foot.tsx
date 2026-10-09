/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, color, radius, shadow, size, space, text, useToastAbove } from '@/design-system';
import { useKeyboardShown } from './reveal';

interface FootProps {
  // A name and a department are there.
  ready: boolean;
  // A save or a sign-out is at work: neither button takes a press.
  working: boolean;
  onSave: () => void;
  onOut: () => void;
}

// The two buttons fixed under the form. A toast sits above them. While the phone's keyboard is up they give their
// place to the form, which has little of the screen left then; they are back when the keyboard closes.
export function Foot({ ready, working, onSave, onOut }: FootProps): ReactElement | null {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const hidden = useKeyboardShown();
  // The toast counts the phone's own bar itself.
  useToastAbove(hidden ? 0 : Math.max(0, height - insets.bottom));
  if (hidden) {
    return null;
  }
  return (
    <View
      onLayout={(event) => {
        setHeight(event.nativeEvent.layout.height);
      }}
      style={[styles.foot, { paddingBottom: insets.bottom + space[3] }]}
      testID="onboarding-foot"
    >
      <Button disabled={working || !ready} full onPress={onSave} size="lg">
        저장하고 시작하기
      </Button>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: working }}
        disabled={working}
        onPress={onOut}
        style={({ pressed }): StyleProp<ViewStyle> => [styles.out, pressed && styles.outPressed]}
      >
        <Text style={styles.outWords}>로그아웃</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  foot: {
    gap: space[1],
    paddingTop: space[3],
    paddingHorizontal: space[4],
    backgroundColor: color.surface,
    boxShadow: shadow.sheet,
  },
  // The frame's quiet way out, in grey: the design system's ghost Button is blue.
  out: {
    alignSelf: 'center',
    justifyContent: 'center',
    height: size.touchMin,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
  },
  outPressed: { backgroundColor: color.surfaceSubtle },
  outWords: { ...text.label, color: color.inkMuted },
});
