/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useIsFocused } from 'expo-router';
import { type ReactElement, useEffect, useState } from 'react';
import { AppState, type AppStateStatus, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import type { OfficialRecruiting } from '@/api/quest-parts-types';
import { color, font, Icon, type IconName, radius, space } from '@/design-system';
import { sidewaysSwipe, swipeStep, TURN_SWIPE } from '@/navigation/swipe-rule';
import { PhotoView } from './quest-photo';

// 찾기's banner of official recruiting, the `Party` frame's carousel: one at a time, turning every 4 seconds until the
// User pauses it, with ‹ ›, `n / N` and `+` for 전체 파티's `공식`. A swipe left or right over it turns it as ‹ › do,
// in place of the 파티 tab's swipe.

export const TURN_MS = 4000;
const HEIGHT = 156;
const ROUND = 28;

interface OfficialBannerProps {
  recruiting: readonly OfficialRecruiting[];
  onOpen: (recruiting: OfficialRecruiting) => void;
  onAll: () => void;
}

function RoundButton({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={10}
      onPress={onPress}
      style={styles.round}
    >
      <Icon color={color.onPrimary} name={icon} size={14} />
    </Pressable>
  );
}

interface Turning {
  index: number;
  playing: boolean;
  turn: (by: number) => void;
  togglePlaying: () => void;
}

function inFront(state: AppStateStatus | null): boolean {
  return state !== 'background' && state !== 'inactive';
}

// Whether the app is in front: neither in the background nor inactive, as AppState says. A state not known yet counts
// as in front.
function useAppActive(): boolean {
  const [active, setActive] = useState(inFront(AppState.currentState));
  useEffect(() => {
    const watch = AppState.addEventListener('change', (state) => {
      setActive(inFront(state));
    });
    return (): void => {
      watch.remove();
    };
  }, []);
  return active;
}

// Which one shows: the next every 4 seconds while playing, or the one the User turned to. It turns only while 찾기 is
// on screen and the app in front, so that it does not run where nobody sees it.
function useTurning(count: number): Turning {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const focused = useIsFocused();
  const active = useAppActive();
  const seen = focused && active;
  useEffect(() => {
    const timer =
      playing && seen && count > 1
        ? setInterval(() => {
            setIndex((shown) => (shown + 1) % count);
          }, TURN_MS)
        : null;
    return (): void => {
      if (timer !== null) {
        clearInterval(timer);
      }
    };
  }, [playing, seen, count]);
  return {
    index: count === 0 ? 0 : index % count,
    playing,
    turn: (by) => {
      setIndex((at) => (at + by + count) % count);
    },
    togglePlaying: () => {
      setPlaying((was) => !was);
    },
  };
}

// The one shown: `공식 · {org}`, the title, the subtitle and the photo. A press opens the join sheet.
function Slide({ shown, onOpen }: { shown: OfficialRecruiting; onOpen: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`${shown.org} · ${shown.title.replaceAll('\n', ' ')}`}
      accessibilityRole="button"
      onPress={onOpen}
      style={styles.body}
    >
      <View style={styles.words}>
        <View style={styles.org}>
          <Icon color={color.snuBlue} name="check" size={12} />
          <Text numberOfLines={1} style={styles.orgWords}>{`공식 · ${shown.org}`}</Text>
        </View>
        <Text numberOfLines={2} style={styles.title}>
          {shown.title}
        </Text>
        <Text numberOfLines={2} style={styles.subtitle}>
          {shown.subtitle}
        </Text>
      </View>
      <View style={styles.photo}>
        <PhotoView photo={shown.photo} size="full" style={styles.photoShape} />
      </View>
    </Pressable>
  );
}

// ‹ ›, play and pause, `n / N` and `+`.
function Controls({ turning, count, onAll }: { turning: Turning; count: number; onAll: () => void }): ReactElement {
  const { index, playing, turn, togglePlaying } = turning;
  const place = `${String(index + 1)} / ${String(count)}`;
  return (
    <View style={styles.controls}>
      <RoundButton
        icon="chevronLeft"
        label="이전 배너"
        onPress={() => {
          turn(-1);
        }}
      />
      <RoundButton
        icon="chevronRight"
        label="다음 배너"
        onPress={() => {
          turn(1);
        }}
      />
      <RoundButton
        icon={playing ? 'pause' : 'play'}
        label={playing ? '자동 넘김 멈춤' : '자동 넘김 재생'}
        onPress={togglePlaying}
      />
      <View accessibilityLabel={place} accessible style={styles.count}>
        <Text style={styles.countWords}>
          <Text style={styles.countNow}>{String(index + 1)}</Text>
          {` / ${String(count)}`}
        </Text>
      </View>
      <RoundButton icon="plus" label="공식 모집 전체 보기" onPress={onAll} />
    </View>
  );
}

export function OfficialBanner({ recruiting, onOpen, onAll }: OfficialBannerProps): ReactElement | null {
  const turning = useTurning(recruiting.length);
  const shown = recruiting[turning.index];
  if (shown === undefined) {
    return null;
  }
  const swipe = sidewaysSwipe('official-banner-swipe', TURN_SWIPE).onEnd(({ translationX, velocityX }) => {
    const step = swipeStep(translationX, velocityX, TURN_SWIPE);
    if (step !== 0) {
      turning.turn(step);
    }
  });
  return (
    <GestureDetector gesture={swipe}>
      <View accessibilityLabel="공식 모집" collapsable={false} style={styles.banner}>
        <Slide
          onOpen={() => {
            onOpen(shown);
          }}
          shown={shown}
        />
        <Controls count={recruiting.length} onAll={onAll} turning={turning} />
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  banner: {
    height: HEIGHT,
    marginHorizontal: space[4],
    marginTop: space[3],
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: color.officialSoft,
  },
  body: { flex: 1, flexDirection: 'row' },
  words: { flex: 1, gap: space[1], paddingTop: space[4], paddingLeft: space[4], paddingRight: space[2] },
  org: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
  orgWords: { flexShrink: 1, fontFamily: font.bold, fontSize: 11, lineHeight: 14, color: color.snuBlue },
  title: { fontFamily: font.bold, fontSize: 16, lineHeight: 22, color: color.ink },
  subtitle: { fontFamily: font.medium, fontSize: 11, lineHeight: 16, color: color.inkMuted },
  photo: { width: 138 },
  photoShape: { height: HEIGHT, borderRadius: 0 },
  controls: {
    position: 'absolute',
    left: space[3],
    bottom: space[3],
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  round: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ROUND,
    height: ROUND,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 19, 48, 0.35)',
  },
  count: {
    justifyContent: 'center',
    height: ROUND,
    paddingHorizontal: 10,
    borderRadius: radius.full,
    backgroundColor: 'rgba(14, 19, 48, 0.35)',
  },
  countWords: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.onPrimary },
  countNow: { fontFamily: font.bold },
});
