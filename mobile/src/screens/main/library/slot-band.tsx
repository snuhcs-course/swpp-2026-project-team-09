/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useMemo, useState } from 'react';
import { type DimensionValue, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import type { LibrarySpace } from '@/api/assistant-types';
import { now } from '@/clock';
import { color, radius, space as spacing, text } from '@/design-system';
import type { Slot } from '@/library/cards/payloads';
import {
  endMoved,
  limitsOf,
  minutesAcross,
  nowOn,
  shareOn,
  slotOf,
  type Span,
  type SpanEnd,
  type SpanLimits,
  spanOf,
  spanWords,
  wholeMoved,
} from '@/library/cards/slot-band';
import { clockOf } from '@/library/cards/times';
import { percent } from '../answer/band-body';

// The seat book card's time as a band (P15 ticket 57, the kit's time band as `AmStudy-a1` and `AmFrame-f14` draw it):
// a track from the space's opening to its closing time, the card's time on it with a handle at each end, and its words
// under it. A handle drags its end and a drag on the band moves it whole, by 30 minutes; a screen reader steps them.
// The card takes the new time only when the finger is let go, and reads the seats for it then.

interface SlotBandProps {
  slot: Slot;
  space: LibrarySpace;
  onChange: (slot: Slot) => void;
  // The words over the track instead of under it: the time bar's head.
  wordsFirst?: boolean;
}

// A move of the band, worked out against the limits at the moment it is used: during a drag, and again with `now` at
// the moment the finger lets go.
type Moved = (limits: SpanLimits) => Span | null;
type Move = (moved: Moved, letGo: boolean) => void;
type Kind = SpanEnd | 'whole';

const TRACK_HEIGHT = 28;
const RAIL_HEIGHT = 8;
const HANDLE_WIDTH = 16;
const HANDLE_TOUCH = 44;
const HANDLE_SLOP = (HANDLE_TOUCH - HANDLE_WIDTH) / 2;
const PAN_STARTS = 10;

function placeOf(span: Span, limits: SpanLimits): { left: DimensionValue; width: DimensionValue } {
  const start = shareOn(span.start, limits);
  return { left: percent(start), width: percent(shareOn(span.end, limits) - start) };
}

// Where a drag of `dx` points, or a screen reader's step, leaves the band.
function movedBy(kind: Kind, span: Span, by: number, limits: SpanLimits): Span | null {
  return kind === 'whole' ? wholeMoved(span, by, limits) : endMoved(span, kind, span[kind] + by, limits);
}

// A drag of the band (`whole`) or of one of its handles, which takes the touch from the band's drag.
function useSpanPan(
  kind: Kind,
  span: Span,
  limits: SpanLimits,
  width: number,
  move: Move,
  over?: PanGesture,
): PanGesture {
  return useMemo(() => {
    const at =
      (dx: number): Moved =>
      (fresh: SpanLimits) =>
        movedBy(kind, span, minutesAcross(dx / width, fresh), fresh);
    const pan = Gesture.Pan();
    if (over !== undefined) {
      pan.blocksExternalGesture(over).hitSlop({ left: HANDLE_SLOP, right: HANDLE_SLOP });
    }
    return pan
      .withTestId(`slot-band-${kind}`)
      .runOnJS(true)
      .enabled(width > 0)
      .activeOffsetX([-PAN_STARTS, PAN_STARTS])
      .failOffsetY([-PAN_STARTS, PAN_STARTS])
      .onUpdate(({ translationX }) => {
        move(at(translationX), false);
      })
      .onEnd(({ translationX }) => {
        move(at(translationX), true);
      });
  }, [kind, span, limits, width, move, over]);
}

interface PartProps {
  kind: Kind;
  span: Span;
  shown: Span;
  limits: SpanLimits;
  move: Move;
}

const NAMES: Record<Kind, string> = { start: '시작 시각', end: '끝 시각', whole: '시간 띠' };

// The screen reader's side of a handle or of the band: adjustable, a step of 30 minutes each way.
function stepsOf({ kind, span, shown, limits, move }: PartProps): object {
  return {
    accessible: true,
    accessibilityActions: [{ name: 'increment' }, { name: 'decrement' }],
    accessibilityLabel: NAMES[kind],
    accessibilityRole: 'adjustable',
    accessibilityValue: { text: kind === 'whole' ? spanWords(shown) : clockOf(shown[kind]) },
    onAccessibilityAction: ({ nativeEvent: { actionName } }: { nativeEvent: { actionName: string } }): void => {
      if (actionName === 'increment' || actionName === 'decrement') {
        const by = actionName === 'increment' ? limits.step : -limits.step;
        move((fresh) => movedBy(kind, span, by, fresh), true);
      }
    },
  };
}

function Handle(props: Omit<PartProps, 'kind'> & { which: SpanEnd; width: number; whole: PanGesture }): ReactElement {
  const { which, span, limits, width, move, whole, shown } = props;
  const pan = useSpanPan(which, span, limits, width, move, whole);
  return (
    <GestureDetector gesture={pan}>
      <View
        collapsable={false}
        {...stepsOf({ ...props, kind: which })}
        style={[styles.handle, { left: percent(shareOn(shown[which], limits)) }]}
        testID={`slot-band-handle-${which}`}
      />
    </GestureDetector>
  );
}

// The band while it is dragged, and where it was before, dashed.
function useMoving({ slot, space, onChange }: SlotBandProps): { moving: Span | null; move: Move } {
  const [moving, setMoving] = useState<Span | null>(null);
  const span = spanOf(slot);
  const move = (moved: Moved, letGo: boolean): void => {
    const next = moved(limitsOf(space, slot.date, now()));
    if (!letGo) {
      if (next !== null) {
        setMoving(next);
      }
      return;
    }
    setMoving(null);
    if (next !== null && (next.start !== span.start || next.end !== span.end)) {
      onChange(slotOf(slot.date, next));
    }
  };
  return { moving, move };
}

export function SlotBand(props: SlotBandProps): ReactElement {
  const { slot, space } = props;
  const [width, setWidth] = useState(0);
  // Read at each render, so that a card left open moves its earliest start on.
  const limits = limitsOf(space, slot.date, now());
  const span = useMemo(() => spanOf(slot), [slot]);
  const { moving, move } = useMoving(props);
  const shown = moving ?? span;
  const whole = useSpanPan('whole', span, limits, width, move);
  const part = { span, shown, limits, move };
  const nowAt = nowOn(slot.date, now(), limits);
  return (
    <View style={styles.band} testID="slot-band">
      {props.wordsFirst === true ? <Text style={[styles.words, styles.head]}>{spanWords(shown)}</Text> : null}
      <GestureDetector gesture={whole}>
        <View
          collapsable={false}
          onLayout={({ nativeEvent: { layout } }) => {
            setWidth(layout.width);
          }}
          style={styles.track}
          testID="slot-band-track"
        >
          <View style={styles.rail} />
          {moving === null ? null : <View style={[styles.ghost, placeOf(span, limits)]} testID="slot-band-ghost" />}
          <View {...stepsOf({ ...part, kind: 'whole' })} style={[styles.body, placeOf(shown, limits)]} />
          {nowAt === null ? null : <View style={[styles.now, { left: percent(shareOn(nowAt, limits)) }]} />}
          <Handle {...part} which="start" whole={whole} width={width} />
          <Handle {...part} which="end" whole={whole} width={width} />
        </View>
      </GestureDetector>
      <View style={styles.ends}>
        <Text style={styles.end}>{clockOf(limits.open)}</Text>
        <Text style={styles.end}>{clockOf(limits.close)}</Text>
      </View>
      {props.wordsFirst === true ? null : <Text style={styles.words}>{spanWords(shown)}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { gap: spacing[1], paddingHorizontal: HANDLE_WIDTH / 2 },
  track: { height: TRACK_HEIGHT, justifyContent: 'center' },
  rail: { height: RAIL_HEIGHT, borderRadius: radius.full, backgroundColor: color.surfaceSunken },
  ghost: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.quest,
    borderRadius: radius.sm,
  },
  body: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: color.quest,
    borderRadius: radius.sm,
    backgroundColor: color.questSoft,
  },
  now: { position: 'absolute', top: -2, bottom: -2, width: 2, marginLeft: -1, backgroundColor: color.me },
  handle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: HANDLE_WIDTH,
    marginLeft: -HANDLE_WIDTH / 2,
    borderWidth: 2,
    borderColor: color.quest,
    borderRadius: radius.sm,
    backgroundColor: color.surface,
  },
  ends: { flexDirection: 'row', justifyContent: 'space-between' },
  end: { ...text.caption, color: color.inkSubtle },
  words: { ...text.label, color: color.quest, textAlign: 'center' },
  // In the time bar's head, beside "←", as a meal's bar has its words (P01 ticket 03).
  head: { textAlign: 'left' },
});
