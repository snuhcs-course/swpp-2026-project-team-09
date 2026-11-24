/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback, useState } from 'react';
import type { PanGesture } from 'react-native-gesture-handler';
import type Reanimated from 'react-native-reanimated';
import { type AnimatedRef, type SharedValue, useSharedValue } from 'react-native-reanimated';
import { usePan, useListY } from './card-drag';
import { useRun } from './card-run';
import { useReduceMotionSetting } from '@/hooks/use-reduce-motion';
import { heightOf, type Level, type LevelHeights } from './card-levels';
import type { Raising } from './raise-handle';

// The answer sheet moving (P04 tickets 52 and 61). It is laid out once, at its highest step's height (`room`), and
// moved only by a translation on the UI thread, `offset`: how far below its laid-out place it stands, so that the step's
// height shows. Nothing inside is laid out again while it moves. A drag anywhere on the card moves it with the finger;
// at high its content scrolls first, and with the content at its top a drag down moves the card. A let-go lands as
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
  // The content's scroll view and how far it is scrolled.
  scroll: AnimatedRef<Reanimated.ScrollView>;
  scrollY: SharedValue<number>;
  // The content scrolls at the card's step now: it is taller than what shows, and the card stands at its highest step.
  scrolls: boolean;
  // How far the content scrolls there.
  maxScroll: number;
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
  back: (to: Level, velocity?: number) => void,
  heights: LevelHeights | null,
): (to: Level, velocity: number) => void {
  const { level, setLevel, layer = null } = raising;
  return useCallback(
    (to: Level, velocity: number) => {
      const lower = heights !== null && heightOf(to, heights) < heightOf(level, heights);
      if (lower && layer !== null) {
        layer();
        back(level, velocity);
        return;
      }
      back(to, velocity);
      if (to !== level) {
        setLevel(to);
      }
    },
    [level, setLevel, layer, back, heights],
  );
}

export function useCardMotion(input: MotionInput): CardMotion {
  const { raising, heights, room, extra, laid, header, scroll, scrollY, scrolls, maxScroll } = input;
  const { level } = raising;
  // Until the phone has said whether it asks for less motion, nothing runs.
  const reduce = useReduceMotionSetting() !== false;
  const { offset, rest, back } = useRun(input, level, reduce);
  const drop = useSharedValue(0);
  const { past, tellPast, closeNow } = useCloseSide(raising, drop);
  const letGo = useLetGo(raising, back, heights);
  const stepped = room !== null && heights !== null;
  const listY = useListY(scroll);
  const pan = usePan({
    level,
    heights: stepped ? heights : null,
    room: room ?? 0,
    offset,
    drop,
    closeAt: (stepped ? header + heights.low : laid - extra + header) / 2,
    closable: raising.close !== undefined,
    header,
    scroll,
    scrollY,
    scrolls,
    maxScroll,
    listY,
    reduce,
    onPast: tellPast,
    onClose: closeNow,
    onLetGo: (to: Level, velocity: number): void => {
      tellPast(false);
      letGo(to, velocity);
    },
    onStay: (): void => {
      tellPast(false);
    },
  });
  return { offset, rest, drop, pan, past };
}
