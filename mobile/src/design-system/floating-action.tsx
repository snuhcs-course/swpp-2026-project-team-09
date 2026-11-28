/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createContext, type ReactElement, type ReactNode, use } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useKeyboardShown } from '@/hooks/use-keyboard-height';
import { Icon, type IconName } from './icon';
import { color, radius, shadow, space } from './tokens';

const SIZE = 56;
const ABOVE = space[3];

// What a list under a floating action keeps free at its end: the button, the room under it and as much again above
// it, so that the last row, its buttons included, scrolls wholly above the button.
export const FLOATING_ACTION_ROOM = SIZE + ABOVE + space[4];

const Room = createContext(0);

// The room a list keeps at its end: its own, or more under a floating action.
export function useListEnd(own: number): number {
  return Math.max(own, use(Room));
}

interface FloatingActionProps {
  icon: IconName;
  // What a screen reader says, such as "파티 만들기".
  label: string;
  onPress: () => void;
}

// The one thing to make on a screen of lists, floating over them at the bottom right: a navy rounded square of 56
// with a white icon and the navigation's action shadow, 16 from the right edge and 12 above the area's bottom. Every
// list inside that ends with `useListEnd` keeps `FLOATING_ACTION_ROOM` at its end. While the keyboard is up the button
// gives way, so that it covers neither the field nor what a search found.
export function FloatingActionArea({
  children,
  ...action
}: FloatingActionProps & { children: ReactNode }): ReactElement {
  const typing = useKeyboardShown();
  return (
    <Room value={FLOATING_ACTION_ROOM}>
      <View style={styles.area}>
        {children}
        {typing ? null : (
          <Pressable
            accessibilityLabel={action.label}
            accessibilityRole="button"
            onPress={action.onPress}
            style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            testID="floating-action"
          >
            <Icon color={color.onPrimary} name={action.icon} size={24} />
          </Pressable>
        )}
      </View>
    </Room>
  );
}

const styles = StyleSheet.create({
  area: { flex: 1 },
  action: {
    position: 'absolute',
    right: space[4],
    bottom: ABOVE,
    alignItems: 'center',
    justifyContent: 'center',
    width: SIZE,
    height: SIZE,
    borderRadius: radius.lg,
    backgroundColor: color.snuBlue,
    boxShadow: shadow.navAction,
  },
  pressed: { opacity: 0.85 },
});
