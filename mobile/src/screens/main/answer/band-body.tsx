/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useMemo } from 'react';
import { type DimensionValue, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import type { MealInput, TimeBand } from '@/api/assistant-types';
import { color, radius, space, text } from '@/design-system';
import { bandMoved, bandStepped, movingWords } from '@/features/assistant/band-move';
import { type BandWordsPart, shownWordsOf } from '@/features/assistant/band-words';
import {
  type BandBound,
  bandEdgesOf,
  clashes,
  clockOf,
  edgeSharesOf,
  shareOf,
  type Stretch,
} from '@/features/assistant/time-band';

// The time band on its track, which a drag on its lanes moves whole (P02 ticket 25).

const PAN_STARTS = 10;

type Lane = TimeBand['lanes'][number];
type OnMove = (at: Stretch, letGo: boolean) => void;

export function percent(share: number): DimensionValue {
  return `${share * 100}%`;
}

const onTrack = (share: number): number => Math.min(1, Math.max(0, share));

// The part of the track a stretch covers, as its left and its width; a part outside the range, as on a folded track
// (P04 ticket 14), is not drawn.
export function placeOf(stretch: Stretch, range: Stretch): { left: DimensionValue; width: DimensionValue } {
  const start = onTrack(shareOf(stretch.startAt, range));
  return { left: percent(start), width: percent(onTrack(shareOf(stretch.endAt, range)) - start) };
}

// What a lane draws red under the band: the parts of its busy stretches inside the window the User fixed, and none
// while the band is moved whole, when the parts it covers are drawn over it.
export function redOf(lane: Lane, fixed: MealInput['window'], band: TimeBand, moving: Stretch | null): Stretch[] {
  return moving === null ? clashes(lane.busy, fixed, band) : [];
}

// The band where a handle has it, while dragged or held after it is let go, and that handle; the Plan's band and none
// otherwise.
export interface HeldBand {
  shown: Stretch;
  bound: BandBound | null;
}

// The words over the band: while it is moved whole, who cannot come over someone's busy stretch, else its own (P02
// ticket 25); else its words where a handle has it (P04 ticket 30).
export function wordsOf(band: TimeBand, moving: Stretch | null, held: HeldBand): BandWordsPart[] {
  if (moving === null) {
    return shownWordsOf(band, held.shown, held.bound);
  }
  return [{ text: movingWords(band.lanes, moving)?.text ?? band.text, strong: false }];
}

// The track's drag, which moves the band whole by the finger's distance in steps of five minutes and says where the
// band is while it is dragged, and where it is let go. It starts anywhere on the lanes, the body included, outside the
// handles' touch areas, which block it: a band narrower than the two touch areas is moved from beside it. Without
// `onMove` it takes nothing, as for a Lookup's band.
export function useWholeMove(
  band: TimeBand,
  trackWidth: number,
  disabled: boolean,
  onMove: OnMove | undefined,
): PanGesture {
  return useMemo(() => {
    const at = (translationX: number): Stretch => bandMoved(band, translationX / trackWidth);
    return Gesture.Pan()
      .withTestId('time-band-lanes')
      .runOnJS(true)
      .enabled(onMove !== undefined && !disabled && trackWidth > 0)
      .activeOffsetX([-PAN_STARTS, PAN_STARTS])
      .failOffsetY([-PAN_STARTS, PAN_STARTS])
      .onUpdate(({ translationX }) => {
        onMove?.(at(translationX), false);
      })
      .onEnd(({ translationX }) => {
        onMove?.(at(translationX), true);
      });
  }, [band, trackWidth, disabled, onMove]);
}

interface TrackProps {
  whole: PanGesture;
  onWidth: (width: number) => void;
  children: ReactNode;
}

// The track the lanes, the band, and its handles lie on, which takes the drag that moves the band whole.
export function Track({ whole, onWidth, children }: TrackProps): ReactElement {
  return (
    <GestureDetector gesture={whole}>
      <View
        collapsable={false}
        onLayout={({ nativeEvent: { layout } }) => {
          onWidth(layout.width);
        }}
        style={styles.track}
        testID="time-band-track"
      >
        {children}
      </View>
    </GestureDetector>
  );
}

interface BandProps {
  band: TimeBand;
  // Where the band is drawn.
  shown: Stretch;
  // Where the band was before the last drag, drawn as a dashed outline.
  ghost: Stretch | null;
  // The band's place while it is moved whole, or null.
  moving: Stretch | null;
  disabled: boolean;
  // Without it the body takes no step, as for a Lookup's band.
  onMove?: OnMove;
}

// The body between the handles, which a screen reader's step moves whole by five minutes and lets go there.
function Body({ band, shown, disabled, onMove }: BandProps & { onMove: OnMove }): ReactElement {
  return (
    <View
      accessible
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      accessibilityLabel="시간 띠"
      accessibilityRole="adjustable"
      accessibilityState={{ disabled }}
      accessibilityValue={{ text: `${clockOf(shown.startAt)}–${clockOf(shown.endAt)}` }}
      onAccessibilityAction={({ nativeEvent: { actionName } }) => {
        if (!disabled && (actionName === 'increment' || actionName === 'decrement')) {
          onMove(bandStepped(band, actionName === 'increment' ? 1 : -1), true);
        }
      }}
      style={[styles.band, placeOf(shown, band.range)]}
    />
  );
}

// The band where it is drawn, and the dashed outline of where it was before a drag: while it is moved whole, its own
// place.
export function BandOnTrack(props: BandProps): ReactElement {
  const { band, ghost, moving, shown, onMove } = props;
  const outline = moving === null ? ghost : { startAt: band.startAt, endAt: band.endAt };
  return (
    <>
      {outline === null ? null : <View style={[styles.ghost, placeOf(outline, band.range)]} testID="time-band-ghost" />}
      {onMove === undefined ? (
        <View style={[styles.band, placeOf(shown, band.range)]} />
      ) : (
        <Body {...props} onMove={onMove} />
      )}
    </>
  );
}

// What stands at one end of the bar in place of its label: the day's other meal (P04 ticket 16, board 26).
export interface BandTick {
  side: 'left' | 'right';
  node: ReactNode;
}

interface EndsProps {
  band: TimeBand;
  folded: boolean;
  tick?: BandTick;
}

// The ends under the track: the range's, or folded the busy stretches that bound the span, each under its own time
// (P04 ticket 14); a tick stands in place of its side's.
export function Ends({ band, folded, tick }: EndsProps): ReactElement {
  const { before, after } = folded
    ? bandEdgesOf(band)
    : { before: clockOf(band.range.startAt), after: clockOf(band.range.endAt) };
  const at = folded ? edgeSharesOf(band, band.range) : { before: 0, after: 1 };
  const end = (words: string): ReactElement => (
    <Text numberOfLines={1} style={styles.end}>
      {words}
    </Text>
  );
  return (
    <View style={[styles.ends, folded && { paddingLeft: percent(at.before), paddingRight: percent(1 - at.after) }]}>
      {tick?.side === 'left' ? tick.node : end(before)}
      {tick?.side === 'right' ? tick.node : end(after)}
    </View>
  );
}

const styles = StyleSheet.create({
  ends: { flexDirection: 'row', justifyContent: 'space-between', gap: space[2] },
  end: { ...text.caption, color: color.inkSubtle },
  track: { flex: 1 },
  ghost: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: color.quest,
    borderRadius: radius.sm,
  },
  band: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: color.quest,
    borderRadius: radius.sm,
    backgroundColor: color.questSoft,
  },
});
