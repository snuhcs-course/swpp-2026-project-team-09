// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { useQuery } from '@tanstack/react-query';
import { type ReactElement, useEffect, useState } from 'react';
import { Animated, type LayoutChangeEvent, Platform, StyleSheet, Text, View } from 'react-native';
import { friendsQuery } from '@/api/queries';
import type { Friend } from '@/api/types';
import { cardStyles, color, radius, space, SwitchRow, text } from '@/design-system';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useSending } from '@/position';
import { BackgroundRow } from './background-row';
import type { SharingSwitch } from './use-sharing-switch';

const FADE_MS = 600;

function countOf(friends: Friend[]): number {
  return friends.length;
}

// The outline the friend panel's "공유 설정" puts around the card. It fades once `on` is over, at once where the phone
// asks for less motion.
function Outline({ on }: { on: boolean }): ReactElement | null {
  const reduceMotion = useReduceMotion();
  const [opacity] = useState(() => new Animated.Value(1));
  const [drawn, setDrawn] = useState(on);
  if (on && !drawn) {
    setDrawn(true);
  }
  useEffect(() => {
    // The web has no native driver.
    const fade =
      on || reduceMotion
        ? null
        : Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: Platform.OS !== 'web' });
    if (on) {
      opacity.setValue(1);
    } else if (fade === null) {
      setDrawn(false);
    } else {
      fade.start(({ finished }) => {
        if (finished) {
          setDrawn(false);
        }
      });
    }
    return (): void => {
      fade?.stop();
    };
  }, [on, reduceMotion, opacity]);
  if (!drawn) {
    return null;
  }
  return <Animated.View style={[styles.outline, { opacity }]} testID="sharing-outline" />;
}

interface SharingCardProps {
  sharing: SharingSwitch;
  outlined: boolean;
  onLayout: (event: LayoutChangeEvent) => void;
}

// The 위치 공유 card: the Master Switch, with the number of Friends under it, the row for background sharing, and the
// line that says the User is not shared off campus.
export function SharingCard({ sharing, outlined, onLayout }: SharingCardProps): ReactElement {
  const friends = useQuery({ ...friendsQuery, select: countOf }).data;
  const { offCampus } = useSending();
  return (
    <View onLayout={onLayout} style={[cardStyles.card, styles.card]}>
      <Text accessibilityRole="header" style={styles.title}>
        위치 공유
      </Text>
      <SwitchRow
        description={friends === undefined ? undefined : `${friends}명`}
        label="친구와 위치 공유"
        onValueChange={sharing.change}
        value={sharing.on}
      />
      <BackgroundRow masterOn={sharing.on} />
      {sharing.on && offCampus ? <Text style={styles.offCampus}>캠퍼스 밖이라 위치가 공유되지 않아요</Text> : null}
      <Outline on={outlined} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space[2] },
  title: { ...text.title, marginTop: space[2], marginBottom: space[1], color: color.ink },
  offCampus: { ...text.caption, marginBottom: space[2], color: color.warning },
  outline: {
    position: 'absolute',
    top: -1,
    right: -1,
    bottom: -1,
    left: -1,
    borderRadius: radius.lg,
    boxShadow: `0 0 0 3px ${color.focusRing}`,
    pointerEvents: 'none',
  },
});
