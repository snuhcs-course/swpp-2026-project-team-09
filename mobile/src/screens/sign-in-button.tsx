import type { ReactElement } from 'react';
import { Animated, Easing, Image, Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import emblem from '../../assets/images/sign-in-emblem.png';
import pointing from '../../assets/images/sign-in-pointing.png';
import refusedDrawing from '../../assets/images/sign-in-refused.png';
import { color, radius, signInButton } from '@/design-system';
import { useLoop } from '@/hooks/use-loop';
import { useMotionAllowed } from '@/hooks/use-reduce-motion';

const BUTTON = 140;
const SPINNER = 40;
const RING_MS = 2200;
const SPIN_MS = 800;
const POKE_MS = 1600;

const easeOut = Easing.out(Easing.ease);
const easeInOut = Easing.inOut(Easing.ease);

// A ring that grows out of the button and fades, to draw the eye to the one thing to press. With reduced motion
// there is none: standing still it would hide behind the button.
function Ring(): ReactElement | null {
  const moving = useMotionAllowed();
  const round = useLoop(moving, RING_MS, easeOut);
  if (!moving) {
    return null;
  }
  const grow = {
    opacity: round.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    transform: [{ scale: round.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
  };
  return <Animated.View style={[styles.ring, grow]} />;
}

// Shows that the account is being checked. With reduced motion the ring stands still with its dark quarter at the
// top: the headline and the button's busy state say that work is going on.
function Spinner(): ReactElement {
  const moving = useMotionAllowed();
  const round = useLoop(moving, SPIN_MS, Easing.linear);
  const turn = { transform: [{ rotate: round.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] };
  return <Animated.View style={[styles.spinner, moving ? turn : null]} testID="sign-in-spinner" />;
}

interface SignInButtonProps {
  checking: boolean;
  onPress: () => void;
}

// The screen's one button: round, with the picture the frame gives it. While the account is checked it stays
// enabled, so that a screen reader still reads it as busy; the press itself is ignored by the screen.
export function SignInButton({ checking, onPress }: SignInButtonProps): ReactElement {
  return (
    <View style={styles.place}>
      <Ring />
      <Pressable
        accessibilityLabel="서울대학교 구글 계정(@snu.ac.kr)으로 로그인"
        accessibilityRole="button"
        accessibilityState={{ busy: checking }}
        onPress={onPress}
        style={({ pressed }): StyleProp<ViewStyle> => [styles.button, pressed && !checking && styles.pressed]}
      >
        {checking ? <Spinner /> : <Image source={emblem} style={styles.emblem} />}
      </Pressable>
    </View>
  );
}

// The drawing that points at the button, nudging towards it. In the refused state another drawing stands still.
export function Drawing({ refused }: { refused: boolean }): ReactElement {
  const moving = useMotionAllowed() && !refused;
  const round = useLoop(moving, POKE_MS, easeInOut);
  const poke = { transform: [{ translateX: round.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -6, 0] }) }] };
  return (
    <Animated.Image
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      source={refused ? refusedDrawing : pointing}
      style={[styles.drawing, moving ? poke : null]}
    />
  );
}

const styles = StyleSheet.create({
  place: { position: 'absolute', top: 280, left: 80, width: BUTTON, height: BUTTON },
  ring: { ...StyleSheet.absoluteFill, borderRadius: radius.full, borderWidth: 2, borderColor: color.snuBlue },
  button: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    boxShadow: signInButton.shadow,
  },
  pressed: { transform: [{ scale: 0.97 }] },
  emblem: { width: 78, height: 81 },
  spinner: {
    width: SPINNER,
    height: SPINNER,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: color.blue100,
    borderTopColor: color.snuBlue,
  },
  drawing: { position: 'absolute', top: 264, left: 230, width: 170, height: 274 },
});
