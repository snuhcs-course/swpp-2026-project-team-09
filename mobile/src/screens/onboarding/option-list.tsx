// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung
import type { ReactElement, ReactNode } from 'react';
import { Pressable, ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, font, radius, shadow, size, space, text } from '@/design-system';

// One choice of a list that opens under a field.
export function Option({
  children,
  selected,
  onPress,
  onPressIn,
  onPressOut,
}: {
  children: string;
  selected: boolean;
  onPress: () => void;
  // The press began, and ended: a field that closes its list when it loses the focus waits for the press between.
  onPressIn?: () => void;
  onPressOut?: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityLabel={children}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.option, (selected || pressed) && styles.optionOn]}
    >
      <Text style={[styles.optionWords, selected && styles.optionWordsOn]}>{children}</Text>
    </Pressable>
  );
}

// The name of a group of choices. It stays at the top while its choices pass under it.
export function OptionHeading({ children }: { children: string }): ReactElement {
  return (
    <View style={styles.heading}>
      <Text accessibilityRole="header" style={styles.headingWords}>
        {children}
      </Text>
    </View>
  );
}

// Said in the list's place when it holds no choice.
export function NoOption({ children }: { children: string }): ReactElement {
  return <Text style={styles.none}>{children}</Text>;
}

interface OptionListProps {
  // What a screen reader calls the list.
  label: string;
  // Where the headings are among the children.
  headings?: number[];
  children: ReactNode;
}

// The choices of a field, opened under it in the form. It scrolls inside the screen's own scroll.
export function OptionList({ label, headings, children }: OptionListProps): ReactElement {
  return (
    <View style={styles.list}>
      <ScrollView
        accessibilityLabel={label}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        stickyHeaderIndices={headings}
        style={styles.scroll}
      >
        {children}
      </ScrollView>
    </View>
  );
}

// Five choices and a half, so that the list shows there is more.
const TALLEST = 264;

const styles = StyleSheet.create({
  list: {
    overflow: 'hidden',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
  },
  scroll: { maxHeight: TALLEST },
  heading: {
    paddingTop: space[2],
    paddingBottom: space[1],
    paddingHorizontal: space[4],
    backgroundColor: color.surfaceSubtle,
  },
  headingWords: { ...text.micro, color: color.inkMuted },
  option: {
    minHeight: size.touchMin,
    justifyContent: 'center',
    paddingHorizontal: space[4],
    borderTopWidth: 1,
    borderTopColor: color.border,
    backgroundColor: color.surface,
  },
  optionOn: { backgroundColor: color.blue50 },
  optionWords: { ...text.body, color: color.ink },
  optionWordsOn: { fontFamily: font.bold, color: color.snuBlue },
  none: { ...text.label, padding: space[4], color: color.inkMuted },
});
