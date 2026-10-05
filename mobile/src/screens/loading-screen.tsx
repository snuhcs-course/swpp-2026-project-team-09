import { type ReactElement, useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, Text, View } from 'react-native';
import campusGate from '../../assets/images/campus-1.jpg';
import campusView from '../../assets/images/campus-2.jpg';
import { Button, color, font, onPhoto, radius, space, text } from '@/design-system';
import { useMotionAllowed } from '@/hooks/use-reduce-motion';
import { useSession } from '@/session/session';
import { stepOf, useLoading } from './use-loading';

const CROSSFADE_MS = 14_000;
// One round of the two photos: the first stays, gives way to the second, and comes back.
const ROUND = [0, 0.45, 0.55, 0.95, 1];

// The campus's two photos, slowly growing and giving way to each other. With reduced motion, and until the phone has
// said whether it asks for it, the first one stands still.
function Photos(): ReactElement {
  const moving = useMotionAllowed();
  const round = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(round, {
        toValue: 1,
        duration: CROSSFADE_MS,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: Platform.OS !== 'web',
      }),
    );
    if (moving) {
      loop.start();
    }
    return (): void => {
      loop.stop();
    };
  }, [moving, round]);
  const first = {
    opacity: round.interpolate({ inputRange: ROUND, outputRange: [1, 1, 0, 0, 1] }),
    transform: [{ scale: round.interpolate({ inputRange: [0, 1], outputRange: [1.08, 1.22] }) }],
  };
  const second = {
    opacity: round.interpolate({ inputRange: ROUND, outputRange: [0, 0, 1, 1, 0] }),
    transform: [{ scale: round.interpolate({ inputRange: [0, 1], outputRange: [1.2, 1.06] }) }],
  };
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={StyleSheet.absoluteFill}>
      <Animated.Image resizeMode="cover" source={campusGate} style={[styles.photo, moving ? first : null]} />
      {moving ? <Animated.Image resizeMode="cover" source={campusView} style={[styles.photo, second]} /> : null}
      <View style={styles.scrim} />
    </View>
  );
}

function Progress({ percent }: { percent: number }): ReactElement {
  return (
    <View
      accessibilityLabel="불러오는 중"
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}
      accessible
      style={styles.progress}
    >
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${percent}%` }]} />
      </View>
      <View style={styles.labels}>
        <Text style={styles.label}>{stepOf(percent)}</Text>
        <Text style={styles.label}>{`${percent}%`}</Text>
      </View>
    </View>
  );
}

function Failure({ onRetry }: { onRetry: () => void }): ReactElement {
  return (
    <View style={styles.failure}>
      <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.failed}>
        불러오지 못했어요
      </Text>
      <Button onPress={onRetry} variant="secondary">
        다시 시도
      </Button>
    </View>
  );
}

// What the User sees while the app gets ready, once, when it starts.
export function LoadingScreen(): ReactElement {
  const { open } = useSession();
  const { percent, failed, retry } = useLoading(open);
  return (
    <View style={styles.screen}>
      <Photos />
      <View style={styles.wordmark}>
        <Text accessibilityRole="header" style={styles.name}>
          SNU Now
        </Text>
        <Text style={styles.tagline}>관악캠퍼스의 지금</Text>
      </View>
      {failed ? <Failure onRetry={retry} /> : <Progress percent={percent} />}
    </View>
  );
}

const SIDE = 56;

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden', backgroundColor: color.ink },
  photo: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  // The web target draws no gradient from this style, and gets one even shade.
  scrim: {
    ...StyleSheet.absoluteFill,
    ...(Platform.OS === 'web' ? { backgroundColor: onPhoto.shade } : { experimental_backgroundImage: onPhoto.scrim }),
  },
  wordmark: {
    position: 'absolute',
    right: 0,
    bottom: 196,
    left: 0,
    alignItems: 'center',
    gap: 6,
  },
  // Larger than any text style: the wordmark's own size.
  name: {
    fontFamily: font.bold,
    fontSize: 40,
    lineHeight: 46,
    letterSpacing: -1.4,
    color: color.onPrimary,
    textShadowColor: onPhoto.textShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 16,
  },
  tagline: { ...text.body, fontFamily: font.medium, color: onPhoto.textMuted },
  progress: {
    position: 'absolute',
    right: SIDE,
    bottom: 112,
    left: SIDE,
    gap: 10,
  },
  track: {
    height: 4,
    overflow: 'hidden',
    borderRadius: radius.full,
    backgroundColor: onPhoto.track,
  },
  bar: { height: '100%', borderRadius: radius.full, backgroundColor: color.onPrimary },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { ...text.caption, fontFamily: font.semiBold, fontVariant: ['tabular-nums'], color: onPhoto.textSubtle },
  failure: {
    position: 'absolute',
    right: SIDE,
    bottom: 96,
    left: SIDE,
    alignItems: 'center',
    gap: space[3],
  },
  failed: { ...text.body, fontFamily: font.semiBold, color: color.onPrimary },
});
