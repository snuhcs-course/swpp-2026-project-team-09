/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useState } from 'react';
import type { PanGesture } from 'react-native-gesture-handler';
import type Reanimated from 'react-native-reanimated';
import {
  type AnimatedRef,
  scrollTo,
  type SharedValue,
  useAnimatedReaction,
  useSharedValue,
} from 'react-native-reanimated';
import { rangeAt, usePan, useListY } from './card-drag';
import { useRun } from './card-run';
import { useReduceMotionSetting } from '@/hooks/use-reduce-motion';
import { heightOf, type Level, type LevelHeights } from './card-levels';
import type { Raising } from './raise-handle';

// The answer sheet moving (P04 tickets 52 and 61). It is laid out once, at its highest step's height (`room`), and
// moved only by a translation on the UI thread, `offset`: how far below its laid-out place it stands, so that the step's
// height shows. Nothing inside is laid out again while it moves. A drag on the header moves it with the finger; on the
// content it scrolls the content first, at every step, and moves the card only at the content's ends. A let-go lands as
// `landingOf` says, carried by the finger's speed; every change of step runs to it, none with reduced motion. The camera
// hears the low card's height once it has settled.

export interface CardMotion {
  // How far below its laid-out place the card stands for its step, and where it rests, which React holds for the view.
  offset: SharedValue<number>;
  rest: number;
  // How far below low the card is dragged.
  drop: SharedValue<number>;
  // The card's drag, anywhere on it, which also scrolls the content where it scrolls.
  pan: PanGesture;
  // Letting go now closes the answer.
  past: boolean;
}

interface MotionInput {
  raising: Raising;
  // The content's height at each step, null until the stage and the content are laid out.
  heights: LevelHeights | null;
  // The scrolling part's laid-out height: its highest step's. Null until the stage is laid out.
  room: number | null;
  // What the card shows over and under its scrolling part: its header and the footer's room, so that its whole height
  // is known.
  extra: number;
  // The header's height: a drag that starts on it moves the card whatever the content's scroll.
  header: number;
  // The whole card's laid-out height, which a drag down measures against before the stage is laid out.
  laid: number;
  // The content's scroll view and how far it is scrolled. It keeps its place when the card changes step.
  scroll: AnimatedRef<Reanimated.ScrollView>;
  scrollY: SharedValue<number>;
  // The content's whole height with the fade's room under it, 0 until laid out: it scrolls by what it has more than
  // shows at the card's height.
  whole: number;
  // Told the whole card's height that shows once it has settled at low.
  onHeight: (height: number) => void;
}

// Past the close point, letting go closes the answer, and the hint says so; with a layer to take away first, it does
// not.
function useCloseSide(
  raising: Raising,
  drop: SharedValue<number>,
): { past: boolean; tellPast: (past: boolean) => void; closeNow: () => void } {
  const [past, setPast] = useState(false);
  const { onPast, close, layer = null } = raising;
  const tellPast = useCallback(
    (next: boolean) => {
      const shown = next && layer === null;
      setPast(shown);
      onPast?.(shown);
    },
    [layer, onPast],
  );
  const closeNow = useCallback(() => {
    tellPast(false);
    drop.value = 0;
    (layer ?? close)?.();
  }, [tellPast, drop, layer, close]);
  return { past, tellPast, closeNow };
}

// What a let-go does: runs to the step it lands on; lower than where it started with a layer over the card, the layer is
// taken away and the card stays (back's order).
function useLetGo(
  raising: Raising,
  back: (to: Level, velocity?: number, started?: boolean, arrive?: () => void) => void,
  heights: LevelHeights | null,
): (to: Level, velocity: number, started: boolean) => void {
  const { level, setLevel, layer = null } = raising;
  return useCallback(
    (to: Level, velocity: number, started: boolean) => {
      const lower = heights !== null && heightOf(to, heights) < heightOf(level, heights);
      if (lower && layer !== null) {
        layer();
        back(level, velocity);
        return;
      }
      // React hears the new step when the run arrives there, so that no commit of its comes while the card runs: the
      // view stood still through each and then jumped on (the user's phone check of a toss).
      back(
        to,
        velocity,
        started,
        to === level
          ? undefined
          : (): void => {
              setLevel(to);
            },
      );
    },
    [level, setLevel, layer, back, heights],
  );
}

interface KeptEnd {
  room: number | null;
  whole: number;
  scroll: AnimatedRef<Reanimated.ScrollView>;
  scrollY: SharedValue<number>;
  listY: SharedValue<number>;
}

// Raised by a run, the card shows more of the content: scrolled further than it then scrolls, the content comes back
// with it, so that its end stays clear of the footer and its fade.
function useKeptEnd(offset: SharedValue<number>, { room, whole, scroll, scrollY, listY }: KeptEnd): void {
  useAnimatedReaction(
    () => offset.value,
    (at) => {
      if (room === null) {
        return;
      }
      const limit = rangeAt(whole, room - at);
      if (scrollY.value > limit + 0.5) {
        scrollTo(scroll, 0, limit, false);
        scrollY.value = limit;
        listY.value = limit;
      }
    },
    [room, whole],
  );
}

export function useCardMotion(input: MotionInput): CardMotion {
  const { raising, heights, room, extra, laid, header, scroll, scrollY, whole } = input;
  const { level } = raising;
  // Until the phone has said whether it asks for less motion, nothing runs.
  const reduce = useReduceMotionSetting() !== false;
  const { offset, rest, back, landed } = useRun(input, level, reduce);
  const drop = useSharedValue(0);
  const { past, tellPast, closeNow } = useCloseSide(raising, drop);
  const letGo = useLetGo(raising, back, heights);
  const stepped = room !== null && heights !== null;
  const listY = useListY(scroll, scrollY);
  useKeptEnd(offset, { room, whole, scroll, scrollY, listY });
  const pan = usePan({
    level,
    heights: stepped ? heights : null,
    room: room ?? 0,
    offset,
    drop,
    closeAt: (stepped ? header + heights.low : laid - extra + header) / 2,
    closable: raising.close !== undefined,
    header,
    whole,
    scrollY,
    listY,
    reduce,
    onPast: tellPast,
    onClose: closeNow,
    onLetGo: (to: Level, velocity: number, started: boolean): void => {
      tellPast(false);
      letGo(to, velocity, started);
    },
    onLanded: landed,
    onStay: (): void => {
      tellPast(false);
    },
  });
  return { offset, rest, drop, pan, past };
}
