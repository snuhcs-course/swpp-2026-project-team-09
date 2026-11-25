/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { memo, type ReactElement, useMemo } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Line } from 'react-native-svg';
import { now } from '@/clock';
import { classColors, color, font, radius, space, text } from '@/design-system';
import { type ClassBlockView, DAY_LETTERS, weekDays, weekHours } from '@/features/timetable/adapter';
import { koreaWeekday } from '@/korea-time';

// The whole week shows at once, without scrolling inside the card: 09 to 22 is 416 high, as the Profile frame draws
// it, so an hour is 32. A class outside those hours widens the week (see `weekHours`), and the card grows with it.
const HOUR_HEIGHT = 32;
// The hours' column, as the frame draws it: off the design system's 4-point steps.
const LABEL_WIDTH = 28;
// A block stands under the line above it and fills its day's column.
const BLOCK_TOP = 1;
// At most this padding over and under a block's words: less when it would cost a line, so that a one-hour class still
// shows its name over its room.
const BLOCK_PADDING = 3;
// An hour's number sits just under its line, and the half hour's line is dotted 3 on, 3 off, as the frame draws them.
const LABEL_DROP = 3;
const HALF_HOUR_DASH = '3 3';

interface BlockProps {
  block: ClassBlockView;
  first: number;
  onOpenClass: (classId: string) => void;
}

function Block({ block, first, onOpenClass }: BlockProps): ReactElement {
  const height = (block.end - block.start) * HOUR_HEIGHT - BLOCK_TOP;
  const lines = Math.max(1, Math.floor(height / text.micro.lineHeight));
  const padding = Math.max(0, Math.min(BLOCK_PADDING, (height - lines * text.micro.lineHeight) / 2));
  return (
    <Pressable
      accessibilityLabel={[`${DAY_LETTERS[block.day] ?? ''}요일 ${block.time} ${block.name}`, block.where]
        .filter((part) => part !== '')
        .join(', ')}
      accessibilityHint="수업 수정"
      accessibilityRole="button"
      onPress={() => {
        onOpenClass(block.classId);
      }}
      style={({ pressed }): StyleProp<ViewStyle> => [
        styles.block,
        {
          top: (block.start - first) * HOUR_HEIGHT + BLOCK_TOP,
          height,
          paddingVertical: padding,
          backgroundColor: classColors[block.order % classColors.length],
        },
        pressed && styles.pressed,
      ]}
      testID="class-block"
    >
      <Text numberOfLines={lines} style={styles.blockWords}>
        {block.where === '' ? block.name : `${block.name}\n${block.where}`}
      </Text>
    </Pressable>
  );
}

// The lines behind the columns: a solid one across at each hour, and a light dotted one at each half hour over the
// days. The first hour's is the days' bottom line.
function Lines({ hours }: { hours: number }): ReactElement {
  return (
    <Svg height={hours * HOUR_HEIGHT} pointerEvents="none" style={StyleSheet.absoluteFill} width="100%">
      {Array.from({ length: hours }, (_, index) => {
        const half = (index + 0.5) * HOUR_HEIGHT;
        return [
          index === 0 ? null : (
            <Line
              key={`hour-${index}`}
              stroke={color.border}
              strokeWidth={1}
              x1="0"
              x2="100%"
              y1={index * HOUR_HEIGHT}
              y2={index * HOUR_HEIGHT}
            />
          ),
          <Line
            key={`half-${index}`}
            stroke={color.surfaceSunken}
            strokeDasharray={HALF_HOUR_DASH}
            strokeWidth={1}
            x1={LABEL_WIDTH}
            x2="100%"
            y1={half}
            y2={half}
          />,
        ];
      })}
    </Svg>
  );
}

// The index in the week of the day of `at`: 0 for Monday to 6 for Sunday.
function todayInWeek(at: Date = now()): number {
  return (koreaWeekday(at) + 6) % 7;
}

// The days' row over the hours, on light grey, with today in bold navy.
const Days = memo(function Days({ days }: { days: readonly string[] }): ReactElement {
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
});

// "09" for 9.
function twoDigits(hour: number): string {
  return String(hour).padStart(2, '0');
}

const Hours = memo(function Hours({
  blocks,
  days,
  first,
  hours,
  onOpenClass,
}: {
  blocks: readonly ClassBlockView[];
  days: readonly string[];
  first: number;
  hours: number;
  onOpenClass: (classId: string) => void;
}): ReactElement {
  return (
    <View style={[styles.row, { height: hours * HOUR_HEIGHT }]} testID="week-hours">
      <Lines hours={hours} />
      <View style={styles.labels}>
        {Array.from({ length: hours }, (_, index) => (
          <Text
            accessibilityLabel={`${first + index}시`}
            key={index}
            style={[styles.hour, { top: index * HOUR_HEIGHT + LABEL_DROP }]}
          >
            {twoDigits(first + index)}
          </Text>
        ))}
      </View>
      {days.map((letter, day) => (
        <View key={letter} style={styles.column}>
          {blocks
            .filter((block) => block.day === day)
            .map((block) => (
              <Block block={block} first={first} key={block.key} onOpenClass={onOpenClass} />
            ))}
        </View>
      ))}
    </View>
  );
});

// The week on 내 정보's 시간표 card, as a ruled table.
export function WeekGrid({
  blocks,
  onOpenClass,
}: {
  blocks: readonly ClassBlockView[];
  onOpenClass: (classId: string) => void;
}): ReactElement {
  const { first, last } = weekHours(blocks);
  const dayCount = weekDays(blocks);
  const days = useMemo(() => DAY_LETTERS.slice(0, dayCount), [dayCount]);
  return (
    <View style={styles.frame}>
      <Days days={days} />
      <Hours blocks={blocks} days={days} first={first} hours={last - first} onOpenClass={onOpenClass} />
    </View>
  );
}

const styles = StyleSheet.create({
  // The week on white inside an outer border, as a table: hour, day and header lines in the divider token `border`,
  // and the half hour's dotted line fainter, in `surfaceSunken`.
  frame: { overflow: 'hidden', borderWidth: 1, borderColor: color.border, borderRadius: radius.md },
  row: { flexDirection: 'row' },
  days: { borderBottomWidth: 1, borderBottomColor: color.border, backgroundColor: color.surfaceSubtle },
  labels: { width: LABEL_WIDTH },
  dayCell: { flex: 1, paddingVertical: space[1], borderLeftWidth: 1, borderLeftColor: color.border },
  day: { textAlign: 'center', ...text.caption, color: color.inkMuted },
  today: { fontFamily: font.bold, color: color.snuBlue },
  hour: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    ...text.caption,
    fontVariant: ['tabular-nums'],
    color: color.inkMuted,
  },
  column: { flex: 1, borderLeftWidth: 1, borderLeftColor: color.border },
  // Square-cornered, filling its column.
  block: { position: 'absolute', right: 0, left: 0, overflow: 'hidden', paddingHorizontal: space[1] },
  pressed: { opacity: 0.6 },
  blockWords: { ...text.micro, color: color.onPrimary },
});
