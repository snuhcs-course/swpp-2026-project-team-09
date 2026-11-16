/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useSegments } from 'expo-router';
import { type ReactElement, useEffect, useEffectEvent, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, color, font, Overlay, radius, space, text } from '@/design-system';
import { TOUR_STEPS } from '@/features/tab-tour/rules';
import { type TabTour as Tour, useTabTour } from '@/features/tab-tour/use-tab-tour';
import { NAV_HEIGHT, tabBarHeight } from './layout';
import { useTabBarHiddenOnMain } from './main-tab-bar';

// What each step of the tour says, and the slot of the tab bar it points at. The bar has five slots of one width, the
// third being 올리기, which the tour leaves out. It points only at the four tabs, never at what is inside a tab: the
// main screen's map, input and cards are being rebuilt (P06 spec, ticket 7).
const STEPS: readonly { slot: number; title: string; words: string }[] = [
  { slot: 0, title: '지도', words: '캠퍼스 지도에서 친구와 행사를 보고, 궁금한 걸 물어봐요.' },
  { slot: 1, title: '파티', words: '함께할 파티를 찾고, 내 파티와 초대를 모아 봐요.' },
  { slot: 3, title: '행사', words: '학교 행사를 모아 보고, 함께 갈 파티를 찾아요.' },
  { slot: 4, title: '내 정보', words: '시간표, 친구, 위치 공유를 관리해요. 이 안내도 여기서 다시 볼 수 있어요.' },
];

const SLOTS = 5;

// Darker than a sheet's scrim, so that the one bright tab stands out.
const DIM = 'rgba(14, 19, 48, 0.64)';
const ARROW = 12;

interface Size {
  width: number;
  height: number;
}

// Where the tab of `slot` lies on a screen of `size`, measured from outside the tab bar: the bar stands at the bottom
// of the screen, its slots are of one width, and its height is `tabBarHeight`, the phone's own bar under it.
function holeOf(slot: number, { width, height }: Size, inset: number): { left: number; top: number; width: number } {
  const slotWidth = width / SLOTS;
  return { left: slot * slotWidth, top: height - tabBarHeight(inset), width: slotWidth };
}

function Dimmed({ size, hole }: { size: Size; hole: ReturnType<typeof holeOf> }): ReactElement {
  const below = hole.top + NAV_HEIGHT;
  return (
    <>
      <View style={[styles.dim, { top: 0, left: 0, right: 0, height: hole.top }]} />
      <View style={[styles.dim, { top: hole.top, left: 0, width: hole.left, height: NAV_HEIGHT }]} />
      <View style={[styles.dim, { top: hole.top, left: hole.left + hole.width, right: 0, height: NAV_HEIGHT }]} />
      <View style={[styles.dim, { top: below, left: 0, right: 0, height: size.height - below }]} />
      <View
        style={[styles.ring, { top: hole.top, left: hole.left, width: hole.width, height: NAV_HEIGHT }]}
        testID="tab-tour-hole"
      />
    </>
  );
}

// The tour of the bottom tabs (HE H7, H8): the screen dimmed but for one tab, and a bubble above it that says what the
// tab is for, with 건너뛰기, 다시 보지 않기 and 다음. It is drawn above the screens and the tab bar, and a press
// anywhere but its buttons does nothing. It shows only while the tabs are in front with their bar, and Android's back
// button skips it.
export function TabTour(): ReactElement | null {
  const tour = useTabTour();
  const segments: readonly string[] = useSegments();
  const hiddenOnMain = useTabBarHiddenOnMain();
  const { bottom } = useSafeAreaInsets();
  const window = useWindowDimensions();
  // The window's size until the tour's own layer is measured: the layer covers the whole window.
  const [measured, setSize] = useState<Size | null>(null);
  const size = measured ?? { width: window.width, height: window.height };
  const inTabs = segments[1] === '(tabs)' && !(hiddenOnMain && (segments[2] ?? 'main') === 'main');
  const step = inTabs ? tour.step : null;
  const skip = useEffectEvent(tour.skip);
  const open = step !== null;
  useEffect(() => {
    const back = open
      ? BackHandler.addEventListener('hardwareBackPress', () => {
          skip();
          return true;
        })
      : null;
    return (): void => {
      back?.remove();
    };
  }, [open]);
  const shown = step === null ? undefined : STEPS[step];
  if (step === null || shown === undefined) {
    return null;
  }
  const hole = holeOf(shown.slot, size, bottom);
  return (
    <Overlay>
      <View
        onLayout={({ nativeEvent: { layout } }) => {
          setSize({ width: layout.width, height: layout.height });
        }}
        onStartShouldSetResponder={() => true}
        style={StyleSheet.absoluteFill}
        testID="tab-tour"
      >
        <Dimmed hole={hole} size={size} />
        <Bubble hole={hole} shown={shown} size={size} step={step} tour={tour} />
      </View>
    </Overlay>
  );
}

interface BubbleProps {
  step: number;
  shown: (typeof STEPS)[number];
  size: Size;
  hole: ReturnType<typeof holeOf>;
  tour: Tour;
}

// The bubble above the lit tab, its arrow over the tab's middle: the step, the tab's name, what it is for, and the
// buttons.
function Bubble({ step, shown, size, hole, tour }: BubbleProps): ReactElement {
  return (
    <View style={[styles.bubble, { bottom: size.height - hole.top + ARROW }]}>
      <View style={[styles.arrow, { left: hole.left + hole.width / 2 - space[4] - ARROW / 2 }]} />
      <Text style={styles.count}>{`${step + 1}/${TOUR_STEPS}`}</Text>
      <Text accessibilityRole="header" style={styles.title}>
        {shown.title}
      </Text>
      <Text style={styles.words}>{shown.words}</Text>
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" hitSlop={SLOP} onPress={tour.never} style={styles.never}>
          <Text style={styles.neverWords}>다시 보지 않기</Text>
        </Pressable>
        <View style={styles.right}>
          <Button onPress={tour.skip} variant="ghost">
            건너뛰기
          </Button>
          <Button onPress={tour.next}>{step === TOUR_STEPS - 1 ? '완료' : '다음'}</Button>
        </View>
      </View>
    </View>
  );
}

// The words of 다시 보지 않기 are 18 high; the slop makes its press 44 high.
const SLOP = { top: 13, bottom: 13 };

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: { position: 'absolute', borderWidth: 2, borderRadius: radius.md, borderColor: color.surface },
  bubble: {
    position: 'absolute',
    left: space[4],
    right: space[4],
    gap: space[1],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surface,
  },
  // A square turned on its corner under the bubble, half of it showing, over the tab.
  arrow: {
    position: 'absolute',
    bottom: -ARROW / 2,
    width: ARROW,
    height: ARROW,
    backgroundColor: color.surface,
    transform: [{ rotate: '45deg' }],
  },
  count: { ...text.caption, fontFamily: font.semiBold, color: color.snuBlue },
  title: { fontFamily: font.bold, fontSize: 18, lineHeight: 26, color: color.ink },
  words: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[2] },
  never: { paddingVertical: space[1] },
  neverWords: { ...text.caption, fontSize: 13, lineHeight: 18, color: color.inkSubtle },
  right: { flexDirection: 'row', alignItems: 'center', gap: space[1] },
});
