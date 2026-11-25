/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { color } from '@/design-system';
import type { LevelHeights } from './card-levels';

// Over the footer at low, the room under the content's last whole line of words (`Caps.band`), in the sheet's colour,
// so that no line shows cut in half there (P04 ticket 63). It fades as the card rises from low toward middle, where the
// soft fade alone stands over the footer. Under it, the floor over the footer's room at the screen's bottom, under the
// input and the main button, which stays while the card goes under it to close (e2, e3).
export function LowBand({
  barRoom,
  card,
  offset,
}: {
  barRoom: number;
  card: { band: number; heights: LevelHeights | null; room: number | null };
  offset: SharedValue<number>;
}): ReactElement {
  const { band, heights, room } = card;
  const atLow = heights === null || room === null ? 0 : room - heights.low;
  const atMid = heights === null || room === null ? 0 : room - heights.mid;
  const shown = useAnimatedStyle(() => {
    const span = atLow - atMid;
    return { opacity: span <= 0 ? 1 : Math.min(1, Math.max(0, (offset.value - atMid) / span)) };
  });
  return (
    <>
      {band <= 0 || heights === null ? null : (
        <Reanimated.View style={[styles.band, { bottom: barRoom, height: band }, shown]} testID="answer-card-band" />
      )}
      <View style={[styles.floor, { height: barRoom }]} />
    </>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', right: 0, left: 0, pointerEvents: 'none', backgroundColor: color.surface },
  floor: { position: 'absolute', right: 0, bottom: 0, left: 0, pointerEvents: 'none', backgroundColor: color.surface },
});
