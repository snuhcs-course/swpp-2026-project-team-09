/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useEffect, useMemo } from 'react';
import type { DimensionValue, StyleProp, ViewStyle } from 'react-native';
import Reanimated, { type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import type { TimeBand } from '@/api/assistant-types';
import { foldedRangeOf, shareOf, type Stretch } from '@/features/assistant/time-band';

// The time card's one axis (P04 ticket 61): folded, the track runs over the free time around the span; opened, over
// the band's whole range. Pulled by its grip, the track widens from one to the other as the finger goes, every bar on
// it at once, so that nothing jumps. A place on the track is worked out on the UI thread from how far it is opened, and
// React holds the place it rests at after it (`rested`), so that a commit of React's lays the right place again.

export interface Axis {
  whole: Stretch;
  folded: Stretch;
  // How far the track is opened: 0 folded, 1 the whole range.
  open: SharedValue<number>;
  // Where it rests: folded or opened.
  rests: 'folded' | 'open';
}

const asPercent = (share: number): DimensionValue => `${share * 100}%`;

function clamp01(share: number): number {
  'worklet';
  return Math.min(1, Math.max(0, share));
}

// The share of the track a share of the whole range lies at, opened `open` of the way from folded: the folded range's
// ends run from the track's ends to their own places in the whole range.
function onAxis(share: number, open: number, foldedFrom: number, foldedTo: number): number {
  'worklet';
  const length = foldedTo - foldedFrom;
  if (length <= 0) {
    return share;
  }
  return share * ((1 - open) / length + open) - ((1 - open) * foldedFrom) / length;
}

// The track's axis: opened as `open` says, or, given none, as `folded` says.
export function useAxis(band: TimeBand, folded: boolean, open?: SharedValue<number>): Axis {
  const own = useSharedValue(folded ? 0 : 1);
  useEffect(() => {
    own.value = folded ? 0 : 1;
  }, [folded, own]);
  const range = useMemo(() => foldedRangeOf(band), [band]);
  return { whole: band.range, folded: range, open: open ?? own, rests: folded ? 'folded' : 'open' };
}

function placeOn(stretch: Stretch, range: Stretch): { start: number; end: number } {
  return { start: shareOf(stretch.startAt, range), end: shareOf(stretch.endAt, range) };
}

type Moving = ReturnType<typeof useAnimatedStyle<ViewStyle>>;

// The style of a stretch on the track, or of a moment (`point`, its left alone): what moves it as the track opens, then
// where it rests.
function useOnTrack(stretch: Stretch, axis: Axis, point: boolean): [Moving, ViewStyle] {
  const { whole, folded, open, rests } = axis;
  const own = placeOn(stretch, whole);
  const ends = placeOn(folded, whole);
  const shut = placeOn(stretch, folded);
  const spanOf = (start: number, end: number): ViewStyle =>
    point ? { left: asPercent(start) } : { left: asPercent(start), width: asPercent(end - start) };
  const at = { folded: spanOf(shut.start, shut.end), open: spanOf(own.start, own.end) };
  const moving = useAnimatedStyle<ViewStyle>(() => {
    const share = open.value;
    if (share <= 0) {
      return at.folded;
    }
    if (share >= 1) {
      return at.open;
    }
    const left = clamp01(onAxis(own.start, share, ends.start, ends.end));
    const right = clamp01(onAxis(own.end, share, ends.start, ends.end));
    return point ? { left: `${left * 100}%` } : { left: `${left * 100}%`, width: `${(right - left) * 100}%` };
  });
  return [moving, at[rests]];
}

export function usePlaced(stretch: Stretch, axis: Axis): [Moving, ViewStyle] {
  return useOnTrack(stretch, axis, false);
}

export function usePoint(time: string, axis: Axis): [Moving, ViewStyle] {
  return useOnTrack({ startAt: time, endAt: time }, axis, true);
}

// The folded range's ends as shares of the whole range, for what stands beside the track (`shareOnAxis`).
export function foldedEndsOf(axis: Pick<Axis, 'whole' | 'folded'>): { start: number; end: number } {
  return placeOn(axis.folded, axis.whole);
}

// Where a share of the whole range lies on the track opened `open` of the way.
export function shareOnAxis(share: number, open: number, ends: { start: number; end: number }): number {
  'worklet';
  return clamp01(onAxis(share, open, ends.start, ends.end));
}

// A stretch drawn on the track, on its axis.
export function Placed(p: {
  stretch: Stretch;
  axis: Axis;
  style: StyleProp<ViewStyle>;
  testID?: string;
}): ReactElement {
  const [moving, rested] = usePlaced(p.stretch, p.axis);
  return <Reanimated.View style={[p.style, moving, rested]} testID={p.testID} />;
}
