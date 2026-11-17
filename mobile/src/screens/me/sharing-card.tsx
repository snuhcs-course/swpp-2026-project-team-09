/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-17  Opus 5.5   prompted by TaeHyun79
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useEffect, useState } from 'react';
import { Animated, type LayoutChangeEvent, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { cardStyles, color, font, Icon, radius, space, SwitchRow, text } from '@/design-system';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useSending } from '@/position';
import { BackgroundRow } from './background-row';
import type { SharingSwitch } from './use-sharing-switch';

const FADE_MS = 600;

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

// The way to the whole 위치 공유 screen, with each Friend's level and what is never kept.
function Whole(): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push('/me/location-sharing');
      }}
      style={({ pressed }) => [styles.whole, pressed && styles.pressed]}
    >
      <Text style={styles.wholeWords}>위치 공유 보기</Text>
      <Icon color={color.inkMuted} name="chevronRight" size={16} />
    </Pressable>
  );
}

// The 위치 공유 card on 내 정보, the only place with the Master Switch (P15 ticket 1).
export function SharingCard({ sharing, outlined, onLayout }: SharingCardProps): ReactElement {
  const { offCampus, privateZone } = useSending();
  return (
    <View onLayout={onLayout} style={[cardStyles.card, styles.card]}>
      <Text accessibilityRole="header" style={styles.title}>
        위치 공유
      </Text>
      <SwitchRow label="위치 공유" onValueChange={sharing.change} value={sharing.on} />
      <BackgroundRow masterOn={sharing.on} />
      {sharing.on && offCampus ? <Text style={styles.offCampus}>캠퍼스 밖이라 위치가 공유되지 않아요</Text> : null}
      {sharing.on && privateZone ? (
        <Text style={styles.privateZone}>비공개 구역 안 · 친구에게는 시간표만 보여요</Text>
      ) : null}
      <Whole />
      <Outline on={outlined} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: space[2] },
  title: { ...text.title, marginTop: space[2], marginBottom: space[1], color: color.ink },
  offCampus: { ...text.caption, marginBottom: space[2], color: color.warning },
  privateZone: { ...text.caption, marginBottom: space[2], color: color.private },
  whole: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 48,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  pressed: { backgroundColor: color.surfaceSubtle },
  wholeWords: { flex: 1, fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: color.ink },
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
