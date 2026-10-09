// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import {
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
import { type ClassBlockView, DAY_LETTERS, FIRST_HOUR, LAST_HOUR } from '@/features/timetable/adapter';
import { useWeek } from '@/features/timetable/use-week';
import { koreaWeekday } from '@/korea-time';

// The `Profile` frame's week: 216 high from 09 to 18.
const GRID_HEIGHT = 216;
const HOUR_HEIGHT = GRID_HEIGHT / (LAST_HOUR - FIRST_HOUR);
const HOUR_LABELS = [9, 11, 13, 15, 17] as const;
const LABEL_WIDTH = 28;

// `직접 입력` opens the timetable; the other two say that they are not ready.
const TILES: readonly { icon: IconName; label: string; opens: boolean }[] = [
  { icon: 'calendar', label: '직접 입력', opens: true },
  { icon: 'plus', label: '이미지로 불러오기', opens: false },
  { icon: 'chat', label: '빈 시간 말하기', opens: false },
];

function openTimetable(): void {
  router.push('/me/timetable');
}

function Block({ block }: { block: ClassBlockView }): ReactElement {
  return (
    <View
      accessibilityLabel={[`${DAY_LETTERS[block.day] ?? ''}요일 ${block.time} ${block.name}`, block.where]
        .filter((part) => part !== '')
        .join(', ')}
      accessible
      style={[
        styles.block,
        {
          top: (block.start - FIRST_HOUR) * HOUR_HEIGHT,
          height: (block.end - block.start) * HOUR_HEIGHT - 2,
          backgroundColor: classColors[block.order % classColors.length],
        },
      ]}
      testID="class-block"
    >
      <Text numberOfLines={2} style={styles.blockWords}>
        {block.where === '' ? block.name : `${block.name}\n${block.where}`}
      </Text>
    </View>
  );
}

function Grid({ blocks }: { blocks: readonly ClassBlockView[] }): ReactElement {
  // Monday is 0; on Saturday and Sunday no column is today's.
  const today = koreaWeekday(now()) - 1;
  return (
    <View>
      <View style={styles.row}>
        <View style={styles.labels} />
        {DAY_LETTERS.map((letter, day) => (
          <Text key={letter} style={[styles.day, day === today && styles.today]}>
            {letter}
          </Text>
        ))}
      </View>
      <View style={[styles.row, styles.hours]}>
        <View style={styles.labels}>
          {HOUR_LABELS.map((hour) => (
            <Text key={hour} style={[styles.hour, { top: (hour - FIRST_HOUR) * HOUR_HEIGHT - 6 }]}>
              {hour}
            </Text>
          ))}
        </View>
        {DAY_LETTERS.map((letter, day) => (
          <View key={letter} style={styles.column}>
            {blocks
              .filter((block) => block.day === day)
              .map((block) => (
                <Block block={block} key={block.key} />
              ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// The 시간표 card: the User's week from the main server, and the three ways to fill it in.
export function WeekCard(): ReactElement {
  const { data, isPending, refetch } = useWeek();
  const showNotReady = useNotReadyToast();
  return (
    <View style={[cardStyles.card, styles.card]}>
      <Text accessibilityRole="header" style={styles.title}>
        시간표
      </Text>
      {data === undefined ? null : <Grid blocks={data} />}
      {data === undefined && isPending ? <LoadingState /> : null}
      {data === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      <View style={styles.tiles}>
        {TILES.map(({ icon, label, opens }) => (
          <Pressable
            accessibilityRole="button"
            key={label}
            onPress={opens ? openTimetable : showNotReady}
            style={({ pressed }): StyleProp<ViewStyle> => [styles.tile, pressed && styles.pressed]}
          >
            <Icon color={color.snuBlue} name={icon} size={20} />
            <Text style={styles.tileWords}>{label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: space[3] },
  title: { ...text.title, color: color.ink },
  row: { flexDirection: 'row', gap: space[1] },
  labels: { width: LABEL_WIDTH },
  day: { flex: 1, textAlign: 'center', ...text.caption, color: color.inkMuted },
  today: { fontFamily: font.bold, color: color.snuBlue },
  hours: { height: GRID_HEIGHT },
  hour: {
    position: 'absolute',
    right: 2,
    fontFamily: font.medium,
    fontSize: 10,
    lineHeight: 12,
    color: color.inkMuted,
  },
  column: { flex: 1, borderRadius: radius.sm + 2, backgroundColor: color.surfaceSubtle },
  block: {
    position: 'absolute',
    right: 2,
    left: 2,
    overflow: 'hidden',
    paddingVertical: 3,
    paddingHorizontal: space[1],
    borderRadius: radius.sm,
  },
  blockWords: { fontFamily: font.semiBold, fontSize: 10, lineHeight: 13, color: color.onPrimary },
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
});
