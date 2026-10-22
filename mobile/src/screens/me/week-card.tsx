/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, type RefObject, useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import {
  BottomSheet,
  cardStyles,
  classColors,
  color,
  ErrorState,
  font,
  Icon,
  type IconName,
  LoadingState,
  radius,
  space,
  text,
  useNotReadyToast,
} from '@/design-system';
import { now } from '@/clock';
import { type ClassBlockView, DAY_LETTERS, openingHour, weekDays, weekHours } from '@/features/timetable/adapter';
import { useTimetableVersions } from '@/features/timetable/use-versions';
import { READING, useImportFromImage } from '@/features/timetable-ocr/use-import-from-image';
import { useWeek } from '@/features/timetable/use-week';
import { koreaMinutes, koreaWeekday } from '@/korea-time';
import { UnfinishedSwitch } from './unfinished-switch';
import { VersionMenu } from './version-menu';

// The week from 09 to 22, an hour 36 high, so that a one-hour class holds its name and room. The card shows eight
// hours of it at a time and scrolls the rest under the days.
const HOUR_HEIGHT = 36;
const VISIBLE_HOURS = 8;
const LABEL_WIDTH = 24;
// A block's words: `text.micro`'s line, inside its padding.
const BLOCK_LINE = 14;
const BLOCK_PADDING = 3;

// `직접 입력` opens the timetable, `이미지로 불러오기` reads a screenshot (or says that it is not ready where the build
// cannot read one), and `빈 시간 말하기` says that it is not ready.
type TileAction = 'open' | 'import' | 'not-ready';
const TILES: readonly { icon: IconName; label: string; action: TileAction }[] = [
  { icon: 'calendar', label: '직접 입력', action: 'open' },
  { icon: 'plus', label: '이미지로 불러오기', action: 'import' },
  { icon: 'chat', label: '빈 시간 말하기', action: 'not-ready' },
];

function openTimetable(): void {
  router.push('/me/timetable');
}

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

// Opens the hours at today's current hour or running class, else at the week's earliest class, else at 09:00, as
// far as the week goes (see `openingHour`); again when that hour changes, as when another version is chosen, and not
// when the User has scrolled.
function useOpening(
  blocks: readonly ClassBlockView[],
  first: number,
  hours: number,
): { scroll: RefObject<ScrollView | null>; open: () => void } {
  const opening = Math.min(
    (openingHour(blocks, first, { day: todayInWeek(), hours: koreaMinutes(now()) / 60 }) - first) * HOUR_HEIGHT,
    Math.max(0, (hours - VISIBLE_HOURS) * HOUR_HEIGHT),
  );
  const scroll = useRef<ScrollView>(null);
  const opened = useRef<number | null>(null);
  return {
    scroll,
    open: (): void => {
      if (opened.current !== opening) {
        opened.current = opening;
        scroll.current?.scrollTo({ y: opening, animated: false });
      }
    },
  };
}

function Grid({ blocks }: { blocks: readonly ClassBlockView[] }): ReactElement {
  const { first, last } = weekHours(blocks);
  const hours = last - first;
  const days = DAY_LETTERS.slice(0, weekDays(blocks));
  const { scroll, open } = useOpening(blocks, first, hours);
  return (
    <View style={styles.frame}>
      <Days days={days} />
      <ScrollView
        nestedScrollEnabled
        onContentSizeChange={open}
        ref={scroll}
        style={{ height: Math.min(hours, VISIBLE_HOURS) * HOUR_HEIGHT }}
        testID="week-scroll"
      >
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
      </ScrollView>
    </View>
  );
}

// The 시간표 card: the User's week from the main server, the version it is, and the three ways to fill it in.
export function WeekCard(): ReactElement {
  const { data, isPending, refetch } = useWeek();
  const showNotReady = useNotReadyToast();
  const versions = useTimetableVersions();
  const importing = useImportFromImage(versions);
  const actions: Record<TileAction, () => void> = {
    open: openTimetable,
    import: importing.start,
    'not-ready': showNotReady,
  };
  return (
    <View style={[cardStyles.card, styles.card]}>
      <View style={styles.head}>
        <Text accessibilityRole="header" style={styles.title}>
          시간표
        </Text>
        <VersionMenu versions={versions} />
      </View>
      <UnfinishedSwitch versions={versions} />
      {data === undefined ? null : <Grid blocks={data} />}
      {data === undefined && isPending ? <LoadingState /> : null}
      {data === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      <View style={styles.tiles}>
        {TILES.map(({ icon, label, action }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: action === 'import' && importing.reading }}
            key={label}
            onPress={actions[action]}
            style={({ pressed }): StyleProp<ViewStyle> => [styles.tile, pressed && styles.pressed]}
          >
            <Icon color={color.snuBlue} name={icon} size={20} />
            <Text style={styles.tileWords}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <BottomSheet label="시간표 읽기" onClose={ignore} open={importing.reading}>
        <View style={styles.reading} testID="timetable-reading">
          <ActivityIndicator color={color.snuBlue} />
          <Text style={styles.readingWords}>{READING}</Text>
        </View>
      </BottomSheet>
    </View>
  );
}

// The reading cannot be stopped halfway: the sheet stays until it is done.
function ignore(): void {
  // Nothing.
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space[2] },
  title: { ...text.title, color: color.ink },
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
  tiles: { flexDirection: 'row', gap: space[2] },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: space[1],
    paddingVertical: 10,
    paddingHorizontal: space[1],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  pressed: { backgroundColor: color.blue50 },
  tileWords: { ...text.caption, fontFamily: font.semiBold, textAlign: 'center', color: color.snuBlue },
  reading: { alignItems: 'center', gap: space[3], paddingVertical: space[6] },
  readingWords: { ...text.bodyLg, fontFamily: font.semiBold, color: color.ink },
});
