/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type ReactNode, useMemo } from 'react';
import { type DimensionValue, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, type PanGesture } from 'react-native-gesture-handler';
import type { MealInput, TimeBand } from '@/api/assistant-types';
import { color, radius } from '@/design-system';
import { bandMoved, bandStepped, clashesAt, movingWords } from '@/features/assistant/band-move';
import { clashes, clockOf, shareOf, type Stretch } from '@/features/assistant/time-band';

// The time band on its track, which a drag on its lanes moves whole (P02 ticket 25).

const PAN_STARTS = 10;

type Lane = TimeBand['lanes'][number];
type OnMove = (at: Stretch, letGo: boolean) => void;

export function percent(share: number): DimensionValue {
  return `${share * 100}%`;
}

// The part of the track a stretch covers, as its left and its width.
export function placeOf(stretch: Stretch, range: Stretch): { left: DimensionValue; width: DimensionValue } {
  const start = shareOf(stretch.startAt, range);
  return { left: percent(start), width: percent(shareOf(stretch.endAt, range) - start) };
}

// What a lane draws red: while the band is moved whole, the parts of its busy stretches the band covers; otherwise
// those inside the window the User fixed.
export function redOf(lane: Lane, fixed: MealInput['window'], band: TimeBand, moving: Stretch | null): Stretch[] {
  return moving === null ? clashes(lane.busy, fixed, band) : clashesAt([lane], moving);
}

// The words under the band: who cannot come while it is moved over someone's busy stretch, else its own.
export function wordsOf(band: TimeBand, moving: Stretch | null): string {
  return (moving === null ? null : movingWords(band.lanes, moving)?.text) ?? band.text;
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

const styles = StyleSheet.create({
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
