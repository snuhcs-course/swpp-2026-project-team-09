/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import type { MealInput, TimeBand } from '@/api/assistant-types';
import { color, radius, space, text } from '@/design-system';
import type { Stretch } from '@/features/assistant/time-band';
import { type Axis, Placed } from './band-axis';
import { redOf } from './band-body';
import { Red } from './band-track';

// The open time card's row for each person (P04 ticket 61, board p2, variant A): the name as a small caption over the
// left end of the person's own bar, and every bar with the same ends and scale as the bar of everyone above it, so that
// a time lies straight down through them all. Each bar shows its person's busy stretches and the band's outline.
// Folded, the rows take no room and a screen reader passes them by.

const BAR_HEIGHT = 8;
const LANE_HEIGHT = 12;

interface PersonRowsProps {
  band: TimeBand;
  axis: Axis;
  // Where the band is drawn now.
  shown: Stretch;
  fixed: MealInput['window'];
  moving: Stretch | null;
  hidden: boolean;
  // The rows' whole height, which the card grows by open.
  onHeight: (height: number) => void;
}

export function PersonRows(props: PersonRowsProps): ReactElement {
  const { band, axis, shown, fixed, moving, hidden, onHeight } = props;
  return (
    <View
      accessibilityElementsHidden={hidden}
      importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'}
      onLayout={({ nativeEvent }: LayoutChangeEvent) => {
        onHeight(nativeEvent.layout.height);
      }}
      style={styles.rows}
      testID="time-card-rows"
    >
      {band.lanes.map((lane) => (
        <View key={lane.userId} style={styles.row}>
          <Text numberOfLines={1} style={styles.name}>
            {lane.name}
          </Text>
          <View style={styles.lane}>
            <View style={styles.bar}>
              {lane.busy.map((stretch) => (
                <Placed axis={axis} key={`busy-${stretch.startAt}`} stretch={stretch} style={styles.busy} />
              ))}
              <Red axis={axis} stretches={redOf(lane, fixed, band, moving)} />
            </View>
            <Placed axis={axis} stretch={moving ?? shown} style={styles.outline} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Laid out at its own height wherever the card's room is, so that its height is known before the card opens.
  rows: { position: 'absolute', top: 0, right: 0, left: 0, gap: space[2], paddingTop: space[2] },
  row: { gap: space[1] },
  name: { ...text.caption, color: color.inkMuted },
  lane: { height: LANE_HEIGHT, justifyContent: 'center' },
  bar: { height: BAR_HEIGHT, borderRadius: radius.full, backgroundColor: color.surfaceSunken },
  busy: { position: 'absolute', top: 0, bottom: 0, borderRadius: radius.full, backgroundColor: color.borderStrong },
  outline: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderColor: color.quest,
    borderRadius: radius.sm,
    opacity: 0.5,
  },
});
