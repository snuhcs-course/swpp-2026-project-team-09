/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { TimeBand } from '@/api/assistant-types';
import { color, radius } from '@/design-system';
import { foldedRangeOf, shareOf, type Stretch } from '@/features/assistant/time-band';
import { percent, placeOf } from './band-body';

// Folded, the band's track runs over the free time around the Plan (`foldedRangeOf`, P04 ticket 14, board 1), and its
// handles, its lanes, and a drag read that range; unfolded, the band's whole range.
export function useShownBand(band: TimeBand, folded: boolean): TimeBand {
  return useMemo(() => (folded ? { ...band, range: foldedRangeOf(band) } : band), [band, folded]);
}

// Now on the track, when it lies within the range shown.
export function NowMark({ band }: { band: TimeBand }): ReactElement | null {
  const share = shareOf(band.now, band.range);
  return share < 0 || share > 1 ? null : <View style={[styles.now, { left: percent(share) }]} />;
}

// The busy stretches drawn red over a lane.
export function Red({ stretches, range }: { stretches: readonly Stretch[]; range: Stretch }): ReactElement {
  return (
    <>
      {stretches.map((stretch) => (
        <View
          key={`clash-${stretch.startAt}`}
          style={[styles.clash, placeOf(stretch, range)]}
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
