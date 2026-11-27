/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Reanimated, { type SharedValue, useAnimatedStyle } from 'react-native-reanimated';
import { color } from '@/design-system';
import { bandAt, FADE } from './card-caps';
import type { LevelHeights } from './card-levels';

// Over the footer at low, the room under the content's last whole row (`bandAt`): its rows as they are laid out
// (`cuts`, P01 ticket 32), else its last whole line of words (`Caps.band`), in the sheet's colour, so that nothing shows
// cut in half there wherever the content is scrolled (P04 ticket 63). It fades as the card rises from low toward middle, where the
// soft fade alone stands over the footer. Under it, the floor over the footer's room at the screen's bottom, under the
// input and the main button, which stays while the card goes under it to close (e2, e3).
export function LowBand({
  barRoom,
  card,
  cuts,
  offset,
  scrollY,
}: {
  barRoom: number;
  card: { band: number; heights: LevelHeights | null; room: number | null };
  cuts: readonly number[];
  offset: SharedValue<number>;
  scrollY: SharedValue<number>;
}): ReactElement {
  const { band, heights, room } = card;
  const atLow = heights === null || room === null ? 0 : room - heights.low;
  const atMid = heights === null || room === null ? 0 : room - heights.mid;
  const low = heights?.low ?? 0;
  const shown = useAnimatedStyle(() => {
    const span = atLow - atMid;
    return {
      height: bandAt(scrollY.value, low, cuts, band),
      opacity: span <= 0 ? 1 : Math.min(1, Math.max(0, (offset.value - atMid) / span)),
    };
  });
  const any = cuts.length > 0 || band > 0;
  return (
    <>
      {!any || heights === null ? null : (
        <Reanimated.View style={[styles.band, { bottom: barRoom }, shown]} testID="answer-card-band" />
      )}
      <View style={[styles.floor, { height: barRoom }]} />
    </>
  );
}

const FADED: ViewStyle = {
  experimental_backgroundImage: `linear-gradient(to bottom, rgba(255, 255, 255, 0), ${color.surface})`,
};

interface FooterCard {
  band: number;
  heights: LevelHeights | null;
  room: number | null;
  edges: { cuts: readonly number[] };
  scrollY: SharedValue<number>;
}

// Over the footer: the soft fade the content passes under, and at low the band under its last whole row.
export function OverFooter({
  barRoom,
  card,
  offset,
  testID,
}: {
  barRoom: number;
  card: FooterCard;
  offset: SharedValue<number>;
  testID: string;
}): ReactElement {
  return (
    <>
      <View style={[styles.fade, FADED, { bottom: barRoom }]} testID={`${testID}-fade`} />
      <LowBand barRoom={barRoom} card={card} cuts={card.edges.cuts} offset={offset} scrollY={card.scrollY} />
    </>
  );
}

const styles = StyleSheet.create({
  fade: { position: 'absolute', right: 0, left: 0, height: FADE, pointerEvents: 'none' },
  band: { position: 'absolute', right: 0, left: 0, pointerEvents: 'none', backgroundColor: color.surface },
  floor: { position: 'absolute', right: 0, bottom: 0, left: 0, pointerEvents: 'none', backgroundColor: color.surface },
});
