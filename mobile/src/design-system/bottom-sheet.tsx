import type { ReactElement, ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, radius, shadow, space, text } from './tokens';

interface BottomSheetProps {
  children: ReactNode;
  title?: string;
  // One ghost Button or an icon at the right of the header.
  trailing?: ReactNode;
}

// The sheet that rises over the map: a selected pin, a list of nearby things, or a step of a form. This is the
// sheet's body alone; the screen that shows it places it and moves it.
export function BottomSheet({ children, title, trailing }: BottomSheetProps): ReactElement {
  return (
    <View accessibilityLabel={title} style={styles.sheet}>
      <View style={styles.handle} />
      {title === undefined ? null : (
        <View style={styles.head}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {trailing}
        </View>
      )}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingTop: space[2],
    paddingHorizontal: space[5],
    paddingBottom: space[5],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    backgroundColor: color.surface,
    boxShadow: shadow.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    marginBottom: space[3],
    borderRadius: radius.full,
    backgroundColor: color.borderStrong,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space[3],
  },
  title: { ...text.title, flexShrink: 1, color: color.ink },
  body: { gap: space[3] },
});
