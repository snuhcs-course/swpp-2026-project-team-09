/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, font, radius, space, text } from '@/design-system';
import { KIOSK_SENTENCE, type LibraryDone, RETURN_SENTENCE } from '@/library/cards/done';
import { Pill, Pills } from './library-parts';

// The done message of a booking (the MainChatLibReserved frame), under its "7193번 예약되었어요!": the rows of the
// booking, the kiosk sentence for a seat, the return sentence, and 좌석 현황 보기.
export function LibraryDoneRows({ done, onSeats }: { done: LibraryDone; onSeats: () => void }): ReactElement {
  return (
    <View style={styles.done} testID="library-done">
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
      {done.seat ? <Text style={styles.sentence}>{KIOSK_SENTENCE}</Text> : null}
      <Text style={styles.sentence}>{RETURN_SENTENCE}</Text>
      <Pills>
        <Pill label="좌석 현황 보기" onPress={onSeats} />
      </Pills>
    </View>
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
});
