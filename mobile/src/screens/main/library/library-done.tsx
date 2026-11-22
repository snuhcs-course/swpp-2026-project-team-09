/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PlacePoint } from '@/api/assistant-types';
import { now } from '@/clock';
import { color, font, radius, space, text } from '@/design-system';
import { KIOSK_SENTENCE, kioskWalkWords, type LibraryDone, RETURN_SENTENCE } from '@/library/cards/done';
import { useRowFourActions } from '../answer/row-four-actions';
import { Pill, Pills } from './library-parts';

// The walk to the booking on the map: its minutes, null without the User's position, and its building.
type Walk = { minutes: number | null; to: PlacePoint } | null;

// The done message of a booking (the MainChatLibReserved frame), under its "7193번 예약되었어요!": the rows of the
// booking, the kiosk sentence for a seat, the return sentence, and 좌석 현황 보기.
export function LibraryDoneRows({
  done,
  onSeats,
  walk = null,
}: {
  done: LibraryDone;
  onSeats: () => void;
  // A booking on the map: its kiosk line says the walk, and 길 안내 stands beside 좌석 현황 보기 (P01 ticket 06).
  walk?: Walk;
}): ReactElement {
  const kiosk = kioskWalkWords(done.deadline, walk?.minutes ?? null, now()) ?? done.kiosk ?? KIOSK_SENTENCE;
  return (
    <View style={styles.done} testID="library-done">
      {done.line === undefined ? null : <Text style={styles.sentence}>{done.line}</Text>}
      <View style={styles.rows}>
        {done.rows.map(({ label, value }, index) => (
          <View
            accessibilityLabel={`${label} ${value}`}
            accessible
            key={label}
            style={[styles.row, index === done.rows.length - 1 && styles.last]}
          >
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>
      {done.seat ? <Text style={styles.sentence}>{kiosk}</Text> : null}
      <Text style={styles.sentence}>{RETURN_SENTENCE}</Text>
      <DoneButtons onSeats={onSeats} walk={walk} />
    </View>
  );
}

// 좌석 현황 보기, and 길 안내 to a booking on the map as a meal's booked card has it: disabled while the guidance cannot
// start, with the reason under it.
function DoneButtons({ onSeats, walk }: { onSeats: () => void; walk: Walk }): ReactElement {
  const { guide, cannotGuide } = useRowFourActions();
  return (
    <>
      <Pills>
        <Pill label="좌석 현황 보기" onPress={onSeats} />
        {walk === null ? null : (
          <Pill
            disabled={cannotGuide !== null}
            label="길 안내"
            onPress={() => {
              guide(walk.to);
            }}
          />
        )}
      </Pills>
      {walk === null || cannotGuide === null ? null : <Text style={styles.why}>{cannotGuide}</Text>}
    </>
  );
}

const styles = StyleSheet.create({
  done: { gap: space[2], marginTop: space[2] },
  rows: { paddingVertical: space[1], paddingHorizontal: 14, borderRadius: radius.md, backgroundColor: color.surface },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 36,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  last: { borderBottomWidth: 0 },
  label: { width: 56, fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  value: {
    flex: 1,
    minWidth: 0,
    textAlign: 'right',
    fontFamily: font.semiBold,
    fontSize: 14,
    lineHeight: 20,
    color: color.ink,
  },
  sentence: { ...text.body, color: color.ink },
  why: { ...text.caption, color: color.inkMuted },
});
