/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { TimeBand } from '@/api/assistant-types';
import { color, space, text } from '@/design-system';
import { hourMarksOf } from '@/features/assistant/hour-marks';
import type { Stretch } from '@/features/assistant/time-band';
import { Ends, percent } from './band-body';

// The hours between a time card's two end times (P01 ticket 44): a notch on the track at each, and under the track its
// time, so that a far time such as 07:00 can be found on a range from now to the place's closing.

// A mark's time stands centred over its notch in a box this wide, wider than "00:00" at the largest font.
const LABEL_WIDTH = 56;

interface MarksProps {
  range: Stretch;
  // Where the track's bar lies in its lane, from the lane's top.
  barTop: number;
  barHeight: number;
}

// The notches, over the first lane's bar and under the band, which a touch passes through.
export function HourNotches({ range, barTop, barHeight }: MarksProps): ReactElement {
  return (
    <View pointerEvents="none" style={[styles.notches, { top: barTop, height: barHeight }]}>
      {hourMarksOf(range).map(({ clock, share }) => (
        <View key={clock} style={[styles.notch, { left: percent(share) }]} />
      ))}
    </View>
  );
}

// The marks' times on one line under the track; nothing for a range with no whole hour inside it.
export function HourMarks({ range }: Pick<MarksProps, 'range'>): ReactElement | null {
  const marks = hourMarksOf(range);
  if (marks.length === 0) {
    return null;
  }
  return (
    <View style={styles.marks} testID="time-band-hours">
      {/* A line's height for the absolute times. */}
      <Text style={styles.hold}> </Text>
      {marks.map(({ clock, share }) => (
        <Text key={clock} numberOfLines={1} style={[styles.mark, { left: percent(share) }]}>
          {clock}
        </Text>
      ))}
    </View>
  );
}

// Under the track: the marks' times, then its two end times with what bounds the span (`Ends`).
export function UnderTrack({ band, folded }: { band: TimeBand; folded: boolean }): ReactElement {
  return (
    <>
      <HourMarks range={band.range} />
      <Ends band={band} folded={folded} />
    </>
  );
}

const styles = StyleSheet.create({
  notches: { position: 'absolute', right: 0, left: 0 },
  notch: { position: 'absolute', top: 0, bottom: 0, width: 2, marginLeft: -1, backgroundColor: color.surface },
  marks: { marginTop: -space[1] },
  hold: { ...text.caption, opacity: 0 },
  mark: {
    ...text.caption,
    position: 'absolute',
    top: 0,
    width: LABEL_WIDTH,
    marginLeft: -LABEL_WIDTH / 2,
    textAlign: 'center',
    color: color.inkSubtle,
  },
});
