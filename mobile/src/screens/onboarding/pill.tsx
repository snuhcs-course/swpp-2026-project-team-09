import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, size, space, text } from '@/design-system';

interface PillProps {
  // The words on the pill.
  children: string;
  // What a screen reader calls it, where the words alone do not say what a press does.
  label?: string;
  // One choice of several: a radio button, checked or not. Without it the pill is a button.
  checked?: boolean;
  onPress: () => void;
}

// A round choice, as the frame draws the gender's choices and the suggested interests. The pill is lower than the
// smallest touch area, so the pressed area around it has that height itself.
export function Pill({ children, label, checked, onPress }: PillProps): ReactElement {
  const choice = checked !== undefined;
  return (
    <Pressable
      accessibilityLabel={label ?? children}
      accessibilityRole={choice ? 'radio' : 'button'}
      accessibilityState={choice ? { checked } : undefined}
      onPress={onPress}
      style={styles.touch}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.pill,
            choice ? styles.choice : styles.offer,
            checked === true && styles.checked,
            pressed && styles.pressed,
          ]}
        >
          <Text numberOfLines={1} style={[styles.words, (checked === true || !choice) && styles.keyWords]}>
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const CHOICE_HEIGHT = 36;
const OFFER_HEIGHT = 28;

const styles = StyleSheet.create({
  touch: { minHeight: size.touchMin, justifyContent: 'center' },
  pill: {
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  choice: { height: CHOICE_HEIGHT, paddingHorizontal: space[4] },
  offer: { height: OFFER_HEIGHT, paddingHorizontal: space[3], borderStyle: 'dashed' },
  checked: { borderColor: color.snuBlue, backgroundColor: color.blue100 },
  pressed: { opacity: 0.6 },
  words: { ...text.label, color: color.ink },
  keyWords: { color: color.snuBlue },
});
