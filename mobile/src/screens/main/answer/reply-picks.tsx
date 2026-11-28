/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PickOffer } from '@/api/pick-types';
import { now } from '@/clock';
import { color, space, text } from '@/design-system';
import { turnOf } from '@/features/assistant/turn';
import { koreaDateKey } from '@/korea-time';
import type { ChatSheetControl } from '../chat-sheet';
import { restOf } from './answer-rest';
import { DockChip } from './dock-chips';

// A question back's pickers (P04 ticket 26), "지도에서 고르기" and "시간 고르기", as the chips the dock had, under the
// reply's words in the open card now that the dock is gone (P04 ticket 61); while a Place is picked, the line says what
// to do and its chip stops the picking. The time's wheel opens over the card, from `OpenAnswer`.

const PICKING_PLACE = '지도에서 건물을 눌러 주세요';

// The pickers act only on the conversation's latest turn, whose question they answer, and offer no day that has
// passed (P04 ticket 26).
function livePicks(control: ChatSheetControl): readonly PickOffer[] {
  const rest = restOf(control, turnOf(control.chat.bubbles)?.after ?? []);
  if (!control.latest || rest?.kind !== 'words') {
    return [];
  }
  const today = koreaDateKey(now());
  return (rest.words.picks ?? []).filter((offer) => offer.kind !== 'pick-time' || offer.date >= today);
}

export function ReplyPicks({ control }: { control: ChatSheetControl }): ReactElement | null {
  const picks = livePicks(control);
  const { pick, chat } = control;
  if (picks.length === 0 && pick.time === null) {
    return null;
  }
  return (
    <View style={styles.picks} testID="reply-picks">
      {pick.place === null ? null : <Text style={styles.line}>{PICKING_PLACE}</Text>}
      <ScrollView
        contentContainerStyle={styles.chips}
        horizontal
        keyboardShouldPersistTaps="handled"
        showsHorizontalScrollIndicator={false}
      >
        {picks.map((offer) => (
          <DockChip
            disabled={chat.waiting}
            key={offer.kind}
            onPress={() => {
              if (offer.kind === 'pick-place' && pick.place !== null) {
                pick.stop();
              } else {
                pick.start(offer);
              }
            }}
            words={offer.kind === 'pick-place' && pick.place !== null ? '그만 고르기' : offer.label}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  picks: { gap: space[2] },
  line: { ...text.body, color: color.inkMuted },
  chips: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
