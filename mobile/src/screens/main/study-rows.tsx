/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { openBrowserAsync } from 'expo-web-browser';
import type { ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { color, font, Icon, radius, space, text, useToast } from '@/design-system';
import type { StudyDetail, StudyRow } from '@/features/map/adapter';
import { type LiveSeats, useLiveSeats } from '@/features/study/use-study';

export const LOG_IN_FOR_SEATS = '로그인하면 좌석 현황을 볼 수 있어요';

// 관정관's seats: "남은 좌석 k / 전체 n" with a Library Session, the login line without one, and nothing after a
// failed read, so that the hours stand alone.
function seatWords(seats: LiveSeats): string | null {
  if (seats.state === 'loggedOut') {
    return LOG_IN_FOR_SEATS;
  }
  if (seats.state === 'loading') {
    return '좌석 현황을 읽고 있어요';
  }
  return seats.state === 'counted' ? `남은 좌석 ${seats.free} / 전체 ${seats.total}` : null;
}

function LiveSeatsLine({ seats }: { seats: LiveSeats }): ReactElement | null {
  const words = seatWords(seats);
  return words === null ? null : (
    <View style={styles.seats} testID="study-live-seats">
      <Icon color={color.svcStudy} name="book" size={16} />
      <Text style={styles.seatWords}>{words}</Text>
    </View>
  );
}

// A Study Space: its name and hours, and its page. One the User may not use is translucent grey, and a press on it
// says who may.
function Row({ row }: { row: StudyRow }): ReactElement {
  const showToast = useToast();
  const { name, hours, link, refusal } = row;
  return (
    <View style={[styles.row, refusal !== null && styles.muted]} testID={`study-row-${row.key}`}>
      <Pressable
        accessibilityLabel={refusal === null ? `${name} · ${hours}` : `${name} · ${hours} · ${refusal}`}
        accessibilityRole={refusal === null ? 'text' : 'button'}
        disabled={refusal === null}
        onPress={() => {
          if (refusal !== null) {
            showToast(refusal);
          }
        }}
        style={styles.words}
      >
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.hours}>{hours}</Text>
      </Pressable>
      {link === null ? null : (
        <Pressable
          accessibilityLabel={`${name} 안내 페이지 열기`}
          accessibilityRole="link"
          hitSlop={LINK_HIT_SLOP}
          onPress={() => {
            void openBrowserAsync(link).catch(() => null);
          }}
          style={styles.link}
        >
          <Icon color={color.inkMuted} name="chevronRight" size={18} />
        </Pressable>
      )}
    </View>
  );
}

// The Study Spaces of a building's card, after its 동, and for 관정관 its seats.
export function StudyRows({ study }: { study: StudyDetail }): ReactElement {
  const seats = useLiveSeats(study.sectors);
  return (
    <View style={styles.rows}>
      {seats === null ? null : <LiveSeatsLine seats={seats} />}
      {study.rows.map((row) => (
        <Row key={row.key} row={row} />
      ))}
    </View>
  );
}

const LINK = 36;
const LINK_HIT_SLOP = 4;

const styles = StyleSheet.create({
  rows: { gap: space[2] },
  seats: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  seatWords: { ...text.label, flexShrink: 1, color: color.svcStudy },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    borderRadius: radius.md,
    backgroundColor: color.svcStudySoft,
  },
  // A space the User may not use: grey, and see-through.
  muted: { backgroundColor: color.surfaceSubtle, opacity: 0.55 },
  words: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  name: { ...text.label, fontFamily: font.semiBold, color: color.ink },
  hours: { ...text.caption, color: color.inkMuted },
  link: { alignItems: 'center', justifyContent: 'center', width: LINK, height: LINK },
});
