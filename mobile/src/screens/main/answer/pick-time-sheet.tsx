/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PickTimeOffer } from '@/api/pick-types';
import { now } from '@/clock';
import { BottomSheet, Button, color, font, radius, space, text } from '@/design-system';
import { isFreeAt, wheelTimes } from '@/features/assistant/use-picking';
import { koreaClock, koreaDateKey, koreaDayWord, koreaWeekdayName } from '@/korea-time';

const ROW = 44;
// Rows above and below the middle one, so that the first and the last time can stand in the middle.
const PAD = 2;

// "오늘(일)", "내일(월)": the day of the wheel, from its date at noon in Korea.
function dayWords(date: string): string {
  const noon = `${date}T12:00:00+09:00`;
  const day = koreaDayWord(noon, now());
  return day === '' ? `오늘(${koreaWeekdayName(new Date(noon))})` : day;
}

interface WheelProps {
  times: readonly string[];
  free: PickTimeOffer['free'];
  first: number;
  index: number;
  onIndex: (index: number) => void;
}

// The rows, which stop with one in the middle band.
function Wheel({ times, free, first, index, onIndex }: WheelProps): ReactElement {
  const settle = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>): void => {
    onIndex(Math.min(Math.max(Math.round(nativeEvent.contentOffset.y / ROW), 0), times.length - 1));
  };
  return (
    <View style={styles.wheel}>
      <View pointerEvents="none" style={styles.middle} />
      <ScrollView
        contentContainerStyle={styles.rows}
        contentOffset={{ x: 0, y: first * ROW }}
        decelerationRate="fast"
        onMomentumScrollEnd={settle}
        onScrollEndDrag={settle}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW}
      >
        {times.map((clock, row) => {
          const open = isFreeAt(clock, free);
          return (
            <View
              accessibilityLabel={open ? `${clock} 빈 시간` : clock}
              accessibilityState={{ selected: row === index }}
              key={clock}
              style={styles.row}
            >
              <Text style={[styles.clock, open ? styles.free : styles.busy, row === index && styles.chosen]}>
                {clock}
              </Text>
              {open ? <Text style={styles.freeTag}>빈 시간</Text> : null}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface PickTimeSheetProps {
  offer: PickTimeOffer;
  onPick: (clock: string) => void;
  onClose: () => void;
}

// 시간 고르기 (P04 ticket 26): a wheel of the day's times every 10 minutes, which stops on a row; the asker's Free Time is
// in the Quest blue with "빈 시간", the rest grey and still pickable. It opens on the first free time, and its button
// sends the time in the middle as "HH:MM에".
export function PickTimeSheet({ offer, onPick, onClose }: PickTimeSheetProps): ReactElement {
  const at = now();
  const times = wheelTimes(offer.date, koreaDateKey(at), koreaClock(at.toISOString()));
  const first = Math.max(
    times.findIndex((clock) => isFreeAt(clock, offer.free)),
    0,
  );
  const [index, setIndex] = useState(first);
  const chosen = times[index] ?? null;
  return (
    <BottomSheet label="시간 고르기" onClose={onClose} open>
      <View style={styles.sheet} testID="pick-time-sheet">
        <Text accessibilityRole="header" style={styles.title}>
          {`${dayWords(offer.date)} 몇 시에?`}
        </Text>
        <Wheel first={first} free={offer.free} index={index} onIndex={setIndex} times={times} />
        <Button
          disabled={chosen === null}
          full
          onPress={() => {
            if (chosen !== null) {
              onPick(chosen);
            }
          }}
          size="lg"
        >
          {chosen === null ? '고를 시간이 없어요' : `${chosen}에`}
        </Button>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheet: { gap: space[3], paddingHorizontal: space[4], paddingBottom: space[4] },
  title: { ...text.bodyLg, fontFamily: font.semiBold, color: color.ink },
  wheel: { height: ROW * (PAD * 2 + 1) },
  middle: {
    position: 'absolute',
    top: ROW * PAD,
    left: 0,
    right: 0,
    height: ROW,
    borderRadius: radius.md,
    backgroundColor: color.blue50,
  },
  rows: { paddingVertical: ROW * PAD },
  row: { height: ROW, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space[2] },
  clock: { ...text.bodyLg },
  free: { color: color.snuBlue },
  busy: { color: color.inkMuted },
  chosen: { fontFamily: font.semiBold },
  freeTag: { ...text.caption, color: color.snuBlue },
});
