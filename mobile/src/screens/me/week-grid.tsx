/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, type RefObject, useRef, useState } from 'react';
import { type NativeScrollEvent, type NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { now } from '@/clock';
import { classColors, color, font, radius, space, text } from '@/design-system';
import { type ClassBlockView, DAY_LETTERS, openingHour, weekDays, weekHours } from '@/features/timetable/adapter';
import { koreaMinutes, koreaWeekday } from '@/korea-time';

// The week from 09 to 22, an hour 36 high, so that a one-hour class holds its name and room. The card shows eight
// hours of it at a time and scrolls the rest under the days.
const HOUR_HEIGHT = 36;
const VISIBLE_HOURS = 8;
const LABEL_WIDTH = 24;
// A block's words: `text.micro`'s line, inside its padding.
const BLOCK_LINE = 14;
const BLOCK_PADDING = 3;
// The fade over an edge of the hours that has more hours past it.
const FADE_HEIGHT = 24;

function Block({ block, first }: { block: ClassBlockView; first: number }): ReactElement {
  const height = (block.end - block.start) * HOUR_HEIGHT - 2;
  return (
    <View
      accessibilityLabel={[`${DAY_LETTERS[block.day] ?? ''}요일 ${block.time} ${block.name}`, block.where]
        .filter((part) => part !== '')
        .join(', ')}
      accessible
      style={[
        styles.block,
        {
          top: (block.start - first) * HOUR_HEIGHT + 1,
          height,
          backgroundColor: classColors[block.order % classColors.length],
        },
      ]}
      testID="class-block"
    >
      <Text
        numberOfLines={Math.max(1, Math.floor((height - 2 * BLOCK_PADDING) / BLOCK_LINE))}
        style={styles.blockWords}
      >
        {block.where === '' ? block.name : `${block.name}\n${block.where}`}
      </Text>
    </View>
  );
}

// The lines behind the columns: a clear one at each hour and a faint one at each half hour. The first hour's is the
// days' bottom line.
function Lines({ hours }: { hours: number }): ReactElement {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: hours }, (_, index) => (
        <View key={index}>
          {index === 0 ? null : <View style={[styles.line, styles.hourLine, { top: index * HOUR_HEIGHT }]} />}
          <View style={[styles.line, styles.halfLine, { top: (index + 0.5) * HOUR_HEIGHT }]} />
        </View>
      ))}
    </View>
  );
}

// Today's index in the week: 0 for Monday to 6 for Sunday.
function todayInWeek(): number {
  return (koreaWeekday(now()) + 6) % 7;
}

// The days' row over the scrolling hours.
function Days({ days }: { days: readonly string[] }): ReactElement {
  const today = todayInWeek();
  return (
    <View style={[styles.row, styles.days]}>
      <View style={styles.labels} />
      {days.map((letter, day) => (
        <View key={letter} style={styles.dayCell}>
          <Text style={[styles.day, day === today && styles.today]}>{letter}</Text>
        </View>
      ))}
    </View>
  );
}

// A fade from the card's white over the edge of the hours, while hours are hidden past that edge.
function Fade({ edge }: { edge: 'top' | 'bottom' }): ReactElement {
  const id = `week-fade-${edge}`;
  return (
    <Svg
      height={FADE_HEIGHT}
      pointerEvents="none"
      style={[styles.fade, edge === 'top' ? styles.fadeTop : styles.fadeBottom]}
      width="100%"
    >
      <Defs>
        <LinearGradient id={id} x1="0" x2="0" y1={edge === 'top' ? '0' : '1'} y2={edge === 'top' ? '1' : '0'}>
          <Stop offset="0" stopColor={color.surface} stopOpacity={1} />
          <Stop offset="1" stopColor={color.surface} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Rect fill={`url(#${id})`} height={FADE_HEIGHT} width="100%" />
    </Svg>
  );
}

interface HoursScroll {
  scroll: RefObject<ScrollView | null>;
  open: () => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  hiddenAbove: boolean;
  hiddenBelow: boolean;
}

// Opens the hours at today's current hour or running class, else at the week's earliest class, else at 09:00, as
// far as the week goes (see `openingHour`); again when that hour changes, as when another version is chosen, and not
// when the User has scrolled. Also says whether hours are hidden above or below, for the fades.
function useHoursScroll(blocks: readonly ClassBlockView[], first: number, hours: number): HoursScroll {
  const farthest = Math.max(0, (hours - VISIBLE_HOURS) * HOUR_HEIGHT);
  const opening = Math.min(
    (openingHour(blocks, first, { day: todayInWeek(), hours: koreaMinutes(now()) / 60 }) - first) * HOUR_HEIGHT,
    farthest,
  );
  const scroll = useRef<ScrollView>(null);
  const opened = useRef<number | null>(null);
  // Where the User scrolled to; null until then, when the hours sit at the opening.
  const [scrolled, setScrolled] = useState<number | null>(null);
  const offset = scrolled ?? opening;
  return {
    scroll,
    open: (): void => {
      if (opened.current !== opening) {
        opened.current = opening;
        setScrolled(null);
        scroll.current?.scrollTo({ y: opening, animated: false });
      }
    },
    onScroll: (event): void => {
      setScrolled(event.nativeEvent.contentOffset.y);
    },
    hiddenAbove: offset > 1,
    hiddenBelow: offset < farthest - 1,
  };
}

function Hours({
  blocks,
  days,
  first,
  hours,
}: {
  blocks: readonly ClassBlockView[];
  days: readonly string[];
  first: number;
  hours: number;
}): ReactElement {
  return (
    <View style={[styles.row, { height: hours * HOUR_HEIGHT }]}>
      <Lines hours={hours} />
      <View style={styles.labels}>
        {Array.from({ length: hours }, (_, index) => (
          <Text key={index} style={[styles.hour, { top: index * HOUR_HEIGHT + 2 }]}>
            {first + index}
          </Text>
        ))}
      </View>
      {days.map((letter, day) => (
        <View key={letter} style={styles.column}>
          {blocks
            .filter((block) => block.day === day)
            .map((block) => (
              <Block block={block} first={first} key={block.key} />
            ))}
        </View>
      ))}
    </View>
  );
}

// The hours scroll inside 내 정보, which scrolls too: nested scrolling for Android, and no bounce or over-scroll at
// the ends, so that a swipe there does not stretch the hours. Handing the swipe to the page at an end is the
// platform's (Android's nested scrolling; iOS does not chain them).
// The week on 내 정보's 시간표 card.
export function WeekGrid({ blocks }: { blocks: readonly ClassBlockView[] }): ReactElement {
  const { first, last } = weekHours(blocks);
  const hours = last - first;
  const days = DAY_LETTERS.slice(0, weekDays(blocks));
  const { scroll, open, onScroll, hiddenAbove, hiddenBelow } = useHoursScroll(blocks, first, hours);
  return (
    <View style={styles.frame}>
      <Days days={days} />
      <View>
        <ScrollView
          bounces={false}
          nestedScrollEnabled
          onContentSizeChange={open}
          onScroll={onScroll}
          overScrollMode="never"
          ref={scroll}
          scrollEventThrottle={16}
          style={{ height: Math.min(hours, VISIBLE_HOURS) * HOUR_HEIGHT }}
          testID="week-scroll"
        >
          <Hours blocks={blocks} days={days} first={first} hours={hours} />
        </ScrollView>
        {hiddenAbove ? <Fade edge="top" /> : null}
        {hiddenBelow ? <Fade edge="bottom" /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // The week on white inside the card's outline, as a table: hour, half-hour and day lines in the divider tokens.
  frame: { overflow: 'hidden', borderWidth: 1, borderColor: color.border, borderRadius: radius.md },
  row: { flexDirection: 'row' },
  days: { borderBottomWidth: 1, borderBottomColor: color.border },
  labels: { width: LABEL_WIDTH },
  dayCell: { flex: 1, paddingVertical: space[1], borderLeftWidth: 1, borderLeftColor: color.border },
  day: { textAlign: 'center', ...text.caption, color: color.inkMuted },
  today: { fontFamily: font.bold, color: color.snuBlue },
  hour: {
    position: 'absolute',
    right: space[1],
    ...text.caption,
    fontVariant: ['tabular-nums'],
    color: color.inkMuted,
  },
  line: { position: 'absolute', left: 0, right: 0, height: 1 },
  fade: { position: 'absolute', left: 0, right: 0 },
  fadeTop: { top: 0 },
  fadeBottom: { bottom: 0 },
  hourLine: { backgroundColor: color.border },
  halfLine: { backgroundColor: color.surfaceSubtle },
  column: { flex: 1, borderLeftWidth: 1, borderLeftColor: color.border },
  block: {
    position: 'absolute',
    right: 1,
    left: 1,
    overflow: 'hidden',
    paddingVertical: BLOCK_PADDING,
    paddingHorizontal: space[1],
    borderRadius: radius.sm,
  },
  blockWords: { ...text.micro, color: color.onPrimary },
});
