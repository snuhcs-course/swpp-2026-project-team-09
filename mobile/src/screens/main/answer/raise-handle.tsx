/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type RefObject, useRef, useState } from 'react';
import { Animated, type LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import { color, radius, space, text } from '@/design-system';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { heightOf, type Level, type LevelHeights, levelAt, levelOf, rangeOf } from './card-levels';
import { GRIP_ROW, GRIP_SIDE } from './grip-row';

export const RAISE_LABEL = '답 크게 보기';
export const CLOSE_LABEL = '답 닫기';
export const CLOSE_HINT = '놓으면 지도 화면으로 돌아가요';

// A drag on the handle starts past this many points, so that a press stays a press.
const PAN_STARTS = 8;
// How far a fling carries the let-go point, in seconds of its speed.
export const FLING_S = 0.15;
export const SETTLE_MS = 180;

// The answer card's heights, lowered, raised, and full (`card-levels.ts`), and below them the answer closed (P04 tickets
// 12 and 52).
export interface Raising {
  raised: boolean;
  setRaised: (raised: boolean) => void;
  // The raised card taken one step further up, its top just under the status bar. Left out, the card has no such step.
  full?: boolean;
  setFull?: (full: boolean) => void;
  // Closes the answer as ✕ does: a drag down from the lowered card past half its height. Left out, none.
  close?: () => void;
  // The card is dragged below its lowered height, or no longer.
  onPast?: (past: boolean) => void;
  // What a drag down takes away first, as back does: the list of questions, a mark's card, or a restaurant's menu, one
  // layer a drag, before the raised card is lowered or the answer closed (P04 ticket 52). Left out or null, none.
  layer?: (() => void) | null;
}

// The handle's drag between the heights. `content` is the content's height while it is dragged or settling, null
// otherwise.
interface Drag {
  content: Animated.Value | null;
  onContentLayout: (height: number) => void;
  handle: ReactElement;
  // How far below its lowered height the card is dragged, while it is; null otherwise.
  drop: Animated.Value | null;
  onCardLayout: (event: LayoutChangeEvent) => void;
  // The card is dragged far enough that letting go closes the answer.
  past: boolean;
}

// The content's height as laid out, the lowered height, the height a drag started from, and the whole card's height.
interface Heights {
  shown: RefObject<number>;
  lowered: RefObject<number>;
  from: RefObject<number>;
  card: RefObject<number>;
}

// What a drag below the lowered height does: none while the card started raised, which a first drag only lowers.
interface Closing {
  drop: Animated.Value;
  // The drag started on the lowered card, and the answer can be closed.
  closable: RefObject<boolean>;
  onPast: (past: boolean) => void;
  onClose: () => void;
  // The card is below its lowered height now.
  past: boolean;
  // The card is raised: a drag from there only lowers it.
  raised: boolean;
}

// The raised and the full content's heights, null until the stage is laid out; `full` is null without that step.
export interface Steps {
  raised: number | null;
  full: number | null;
}

interface PanInput {
  heights: Heights;
  content: Animated.Value;
  steps: Steps;
  // Where the card stands as the drag starts.
  level: Level;
  onStart: () => void;
  onLetGo: (level: Level) => void;
  closing: Closing | null;
}

function levelHeights({ lowered, from }: Heights, { raised, full }: Steps): LevelHeights {
  return { lowered: lowered.current, raised: raised ?? from.current, full };
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

// A drag up or down on the handle: the content follows the finger one step either way from where it started
// (`rangeOf`), and the let-go point, a fling carried on, picks the nearer height (`levelAt`). Started on the lowered card,
// a drag down goes on below it: the card follows the finger, and let go past half its height the answer closes;
// before, it goes back (P04 ticket 12).
function panOf({ heights, content, steps, level, onStart, onLetGo, closing }: PanInput): PanGesture {
  const { shown, lowered, from, card } = heights;
  return Gesture.Pan()
    .withTestId('answer-card-handle')
    .runOnJS(true)
    .enabled(steps.raised !== null)
    .activeOffsetY([-PAN_STARTS, PAN_STARTS])
    .onStart(() => {
      from.current = shown.current;
      content.setValue(shown.current);
      if (closing !== null) {
        closing.closable.current = !closing.raised;
      }
      onStart();
    })
    .onUpdate(({ translationY }) => {
      const at = from.current - translationY;
      const { low, high } = rangeOf(level, levelHeights(heights, steps));
      content.setValue(clamp(at, low, high));
      if (closing?.closable.current === true) {
        const below = Math.max(0, lowered.current - at);
        closing.drop.setValue(below);
        closing.onPast(below > card.current / 2);
      }
    })
    .onEnd(({ translationY, velocityY }) => {
      const at = from.current - translationY - velocityY * FLING_S;
      if (closing?.closable.current === true && lowered.current - at > card.current / 2) {
        closing.onClose();
        return;
      }
      onLetGo(levelAt(level, at, levelHeights(heights, steps)));
    });
}

// A press raises the lowered card, and takes a raised or a full card one step down.
function Handle({ pan, raising }: { pan: PanGesture; raising: Raising }): ReactElement {
  const { raised, setRaised, full = false, setFull, close } = raising;
  return (
    <GestureDetector gesture={pan}>
      <Pressable
        accessibilityActions={close === undefined ? undefined : [{ name: 'close', label: CLOSE_LABEL }]}
        accessibilityLabel={RAISE_LABEL}
        accessibilityRole="button"
        accessibilityState={{ expanded: raised }}
        collapsable={false}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'close') {
            close?.();
          }
        }}
        onPress={() => {
          if (full && setFull !== undefined) {
            setFull(false);
            return;
          }
          setRaised(!raised);
        }}
        style={styles.handle}
        testID="answer-card-handle"
      >
        <View style={styles.grip} />
      </Pressable>
    </GestureDetector>
  );
}

// Where "놓으면 지도 화면으로 돌아가요" stands, from the stage's bottom: just above the card's top edge, following the card
// down as it is dragged, and stopping just above the AI input, whose room the card keeps (`barRoom`), so that it is
// never behind the input or below the screen (P04 ticket 29). `maxDrop` is how far it follows.
export const HINT_GAP = space[3];

export function closeHintPlace(cardHeight: number, barRoom: number): { bottom: number; maxDrop: number } {
  return { bottom: cardHeight + HINT_GAP, maxDrop: Math.max(0, cardHeight - barRoom) };
}

// The hint while letting go would close the answer, moved down with the card by `drop` as far as `maxDrop`.
export function CloseHint({
  drop,
  cardHeight,
  barRoom,
}: {
  drop: Animated.Value;
  cardHeight: number;
  barRoom: number;
}): ReactElement {
  const { bottom, maxDrop } = closeHintPlace(cardHeight, barRoom);
  const down =
    maxDrop > 0 ? drop.interpolate({ inputRange: [0, maxDrop], outputRange: [0, maxDrop], extrapolate: 'clamp' }) : 0;
  return (
    <Animated.View style={[styles.hint, { bottom, transform: [{ translateY: down }] }]} testID="answer-close-hint">
      <Text style={styles.hintWords}>{CLOSE_HINT}</Text>
    </Animated.View>
  );
}

// What a drag below the lowered card holds: how far it is, whether it is below at all, and the closing it passes on.
function useClosing(raising: Raising, setDragging: (dragging: boolean) => void): Closing | null {
  const drop = useRef(new Animated.Value(0)).current;
  const closable = useRef(false);
  const below = useRef(false);
  const [past, setPast] = useState(false);
  const { close, onPast, layer = null } = raising;
  if (close === undefined) {
    return null;
  }
  // Past half the card the hint says the answer closes; with a layer to take away, it does not.
  const tell = (next: boolean): void => {
    const shown = next && layer === null;
    if (below.current !== shown) {
      below.current = shown;
      setPast(shown);
      onPast?.(shown);
    }
  };
  return {
    drop,
    closable,
    onPast: tell,
    onClose: () => {
      tell(false);
      setDragging(false);
      drop.setValue(0);
      (layer ?? close)();
    },
    past,
    raised: raising.raised,
  };
}

export function useRaiseDrag(raising: Raising, steps: Steps): Drag {
  const reduceMotion = useReduceMotion();
  const [dragging, setDragging] = useState(false);
  const content = useRef(new Animated.Value(0)).current;
  const heights: Heights = { shown: useRef(0), lowered: useRef(0), from: useRef(0), card: useRef(0) };
  const closing = useClosing(raising, setDragging);
  const level = levelOf(raising.raised, raising.full === true);
  const settle = (letGo: Level): void => {
    // Let go lower on a raised card with a layer over it, the layer goes and the card stays raised.
    const layer = letGo === 'lowered' && level === 'raised' ? (raising.layer ?? null) : null;
    layer?.();
    const to = layer === null ? letGo : 'raised';
    const done = (): void => {
      raising.setRaised(to !== 'lowered');
      raising.setFull?.(to === 'full');
      setDragging(false);
      closing?.onPast(false);
    };
    closing?.drop.setValue(0);
    if (reduceMotion || steps.raised === null) {
      done();
      return;
    }
    const toValue = heightOf(to, levelHeights(heights, steps));
    Animated.timing(content, { toValue, duration: SETTLE_MS, useNativeDriver: false }).start(done);
  };
  const onStart = (): void => {
    setDragging(true);
  };
  const pan = panOf({ heights, content, steps, level, onStart, onLetGo: settle, closing });
  const past = closing?.past === true;
  return {
    content: dragging ? content : null,
    onContentLayout: (height) => {
      heights.shown.current = height;
      if (!raising.raised && !dragging) {
        heights.lowered.current = height;
      }
    },
    handle: <Handle pan={pan} raising={raising} />,
    drop: dragging && closing !== null ? closing.drop : null,
    onCardLayout: ({ nativeEvent }) => {
      heights.card.current = nativeEvent.layout.height;
    },
    past,
  };
}

const styles = StyleSheet.create({
  // Between ✕'s room at the right and as much at the left, so that the grip stays centred and never covers ✕.
  handle: {
    position: 'absolute',
    top: 0,
    right: GRIP_SIDE,
    left: GRIP_SIDE,
    alignItems: 'center',
    height: GRIP_ROW,
    paddingTop: space[2],
  },
  grip: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: color.border },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    pointerEvents: 'none',
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    borderRadius: radius.full,
    backgroundColor: color.ink,
  },
  hintWords: { ...text.label, color: color.surface },
});
