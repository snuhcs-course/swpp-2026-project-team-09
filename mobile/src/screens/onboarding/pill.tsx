// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, radius, space, text } from '@/design-system';

interface PillProps {
  // The words on the pill.
  children: string;
  // What a screen reader calls it, where the words alone do not say what a press does.
  label?: string;
  // One choice of several: a radio button, checked or not. Without it the pill is a button.
  checked?: boolean;
  onPress: () => void;
}

// A round choice, as the frame draws the gender's choices and the suggested interests. The pressed area is the pill
// and half of the space to its neighbours above and below: two rows stand closer than the smallest touch area is
// high, and an area that reached that height would lie over the next row's pills and take their presses.
export function Pill({ children, label, checked, onPress }: PillProps): ReactElement {
  const choice = checked !== undefined;
  return (
    <Pressable
      accessibilityLabel={label ?? children}
      accessibilityRole={choice ? 'radio' : 'button'}
      accessibilityState={choice ? { checked } : undefined}
      aria-checked={choice ? checked : undefined}
      onPress={onPress}
      style={[styles.touch, choice ? styles.choiceTouch : styles.offerTouch]}
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
// The frame's space between two rows of pills.
export const PILL_ROW_GAP = { choice: space[2], offer: 6 } as const;

const styles = StyleSheet.create({
  touch: { justifyContent: 'center' },
  choiceTouch: { minHeight: CHOICE_HEIGHT + PILL_ROW_GAP.choice },
  offerTouch: { minHeight: OFFER_HEIGHT + PILL_ROW_GAP.offer },
  pill: {
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  choice: { height: CHOICE_HEIGHT, paddingHorizontal: space[4] },
  offer: { height: OFFER_HEIGHT, paddingHorizontal: space[3], borderStyle: 'dashed', borderColor: color.borderStrong },
  checked: { borderColor: color.snuBlue, backgroundColor: color.blue100 },
  pressed: { opacity: 0.6 },
  words: { ...text.label, color: color.ink },
  keyWords: { color: color.snuBlue },
});
