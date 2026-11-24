/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Reanimated from 'react-native-reanimated';
import type { TimeBand } from '@/api/assistant-types';
import { color, radius } from '@/design-system';
import { foldedRangeOf, type Stretch } from '@/features/assistant/time-band';
import { type Axis, Placed, usePoint } from './band-axis';

// Folded, the band's track runs over the free time around the Plan (`foldedRangeOf`, P04 ticket 14, board 1), and its
// handles, its lanes, and a drag read that range; unfolded, the band's whole range. What is drawn on it stands on the
// track's axis (`band-axis`), which widens from one to the other as the time card is pulled open (P04 ticket 61).
export function useShownBand(band: TimeBand, folded: boolean): TimeBand {
  return useMemo(() => (folded ? { ...band, range: foldedRangeOf(band) } : band), [band, folded]);
}

// Now on the track.
export function NowMark({ band, axis }: { band: TimeBand; axis: Axis }): ReactElement {
  const [moving, rested] = usePoint(band.now, axis);
  return <Reanimated.View style={[styles.now, moving, rested]} />;
}

// The busy stretches drawn red over a lane.
export function Red({ stretches, axis }: { stretches: readonly Stretch[]; axis: Axis }): ReactElement {
  return (
    <>
      {stretches.map((stretch) => (
        <Placed
          axis={axis}
          key={`clash-${stretch.startAt}`}
          stretch={stretch}
          style={styles.clash}
          testID="time-band-clash"
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  clash: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.full, backgroundColor: color.warning },
  now: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: color.me },
});
