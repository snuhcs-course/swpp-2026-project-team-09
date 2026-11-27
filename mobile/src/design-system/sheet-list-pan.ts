/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { PanGesture } from 'react-native-gesture-handler';
import type Reanimated from 'react-native-reanimated';
import {
  type AnimatedRef,
  cancelAnimation,
  Easing,
  scrollTo,
  type SharedValue,
  useAnimatedReaction,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AT_TOP, letSheetGo, MOVING, pullBy, pulledOf, sheetPan, type SheetPull } from './sheet-pull';

// The swipe of a list in a sheet (`SheetScrollView`, P06 ticket 35, after the user's phone check of 2026-11-28). The
// list's own scroll view takes no touch: on Android a native scroll view that takes the touch makes the gesture
// handler cancel every gesture, so this swipe scrolls the list, as the answer card's drag scrolls its content
// (`card-drag.ts`). Where the list stood as the finger landed decides the whole swipe: at its top, a swipe that first
// goes down pulls the sheet; any other swipe scrolls the list, and a let-go runs it on with the finger's speed.

// How far a let-go's speed carries a list that stops on rows, in seconds of that speed: a fast stop, as the wheel asks,
// or a slower one.
const AHEAD_FAST = 0.1;
const AHEAD = 0.3;
const SETTLE = { duration: 250, easing: Easing.out(Easing.cubic) };

// A scroll view's moments that a list's swipe tells, as a native scroll tells them.
export type ScrollMoment = 'begin' | 'end' | 'momentum';

export interface ListParts {
  // Where the list stands, and where the swipe puts it.
  scrollY: SharedValue<number>;
  listY: SharedValue<number>;
  // How far it scrolls: its content's height over its own, 0 until both are laid out.
  range: SharedValue<number>;
  // The rows it stops on, 0 for none, and whether it stops fast.
  snap: number;
  fast: boolean;
  // Tells a moment to the scroll view's caller, at `y` and `velocity` points a millisecond, on the JS thread.
  tell: (moment: ScrollMoment, y: number, velocity: number) => void;
}

// Where the swipe puts the list, scrolled there on the UI thread.
export function useListY(
  scroll: AnimatedRef<Reanimated.ScrollView>,
  start: number,
): Omit<ListParts, 'snap' | 'fast' | 'tell'> {
  const scrollY = useSharedValue(start);
  const listY = useSharedValue(start);
  const range = useSharedValue(0);
  useAnimatedReaction(
    () => listY.value,
    (y, last) => {
      if (last !== null && y !== last) {
        scrollTo(scroll, 0, y, false);
        scrollY.value = y;
      }
    },
  );
  return { scrollY, listY, range };
}

// A let-go that scrolled the list: on rows, it runs to the row the finger's speed points to; otherwise it runs on and
// slows to a stop within the list's ends.
function letListGo(list: ListParts, velocityY: number): void {
  'worklet';
  const { listY, range, snap, fast, tell } = list;
  const at = listY.value;
  // The way the content moves, down its length for a finger moving up.
  const speed = -velocityY;
  scheduleOnRN(tell, 'end', at, speed / 1000);
  if (snap > 0) {
    const ahead = at + speed * (fast ? AHEAD_FAST : AHEAD);
    const to = Math.min(Math.max(Math.round(ahead / snap) * snap, 0), Math.max(range.value, at));
    listY.value = withTiming(to, SETTLE, (finished) => {
      'worklet';
      if (finished === true) {
        scheduleOnRN(tell, 'momentum', to, 0);
      }
    });
  } else if (Math.abs(speed) > MOVING) {
    listY.value = withDecay({ velocity: speed, clamp: [0, Math.max(range.value, at)] }, (finished) => {
      'worklet';
      if (finished === true) {
        scheduleOnRN(tell, 'momentum', listY.value, 0);
      }
    });
  }
}

// The list's swipe. The sheet's own swipe waits while it decides.
export function useListPan(sheet: SheetPull, list: ListParts): PanGesture {
  const may = useSharedValue(false);
  const pulling = useSharedValue(false);
  const from = useSharedValue(0);
  const startY = useSharedValue(0);
  const pulled = pulledOf(sheet);
  const { scrollY, listY, range, tell } = list;
  return sheetPan('sheet-list-drag')
    .blocksExternalGesture(sheet.ref)
    .onBegin(() => {
      'worklet';
      // A touch stops a list running on, where it stands.
      cancelAnimation(listY);
      may.value = scrollY.value <= AT_TOP;
    })
    .onStart(({ translationY }) => {
      'worklet';
      pulling.value = may.value && translationY > 0;
      from.value = translationY;
      startY.value = scrollY.value;
      if (!pulling.value) {
        scheduleOnRN(tell, 'begin', startY.value, 0);
      }
    })
    .onUpdate(({ translationY }) => {
      'worklet';
      const by = translationY - from.value;
      if (pulling.value) {
        pullBy(pulled, by);
      } else {
        // A list not laid out yet still scrolls back toward its top.
        listY.value = Math.min(Math.max(startY.value - by, 0), Math.max(range.value, startY.value));
      }
    })
    .onEnd(({ translationY, velocityY }, success) => {
      'worklet';
      if (pulling.value) {
        pullBy(pulled, translationY - from.value);
        letSheetGo(pulled, velocityY, success);
      } else {
        letListGo(list, velocityY);
      }
    })
    .onFinalize(() => {
      'worklet';
      pulling.value = false;
    });
}
