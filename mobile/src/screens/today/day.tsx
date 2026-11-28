/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { now } from '@/clock';
import { cardStyles, color, ErrorState, font, Icon, LoadingState, SectionHeader, space, text } from '@/design-system';
import type { QuestRowView } from '@/features/quests/adapter';
import { useQuestRows } from '@/features/quests/use-quest-rows';
import type { ClassBlockView } from '@/features/timetable/adapter';
import { useWeek } from '@/features/timetable/use-week';
import { koreaClock, koreaMinutes, koreaWeekday } from '@/korea-time';

// 오늘's 오늘 일정 (A04 ticket 10), moved out of `today-screen.tsx`.

// A press on a row of 오늘 일정, as on the map's Quest row: a class to the map at its place and a booking party whose
// room request is out to that answer, each by the main screen's address, so that the map is in front in one move; any
// other row opens the Quest's room above the tabs.
function pressRow(row: QuestRowView): void {
  if (row.kind === 'class') {
    router.navigate({ pathname: '/main', params: { quest: row.id } });
  } else if (row.reopens === true) {
    router.navigate({ pathname: '/main', params: { card: `party:${row.id}` } });
  } else {
    router.push(`/room/${row.id}`);
  }
}

function DayRow({ row }: { row: QuestRowView }): ReactElement {
  const words = [row.time, row.label, row.title, row.place].filter((part) => part !== '');
  return (
    <Pressable
      accessibilityLabel={words.join(' · ')}
      accessibilityRole="button"
      onPress={() => {
        pressRow(row);
      }}
      style={({ pressed }) => [styles.dayRow, pressed && styles.pressed]}
    >
      <Text style={[styles.dayTime, row.over && styles.over]}>{row.time}</Text>
      <View style={styles.dayWords}>
        <Text numberOfLines={1} style={styles.dayKind}>
          {row.label}
        </Text>
        <Text numberOfLines={1} style={[styles.dayTitle, row.over && styles.over]}>
          {row.title}
        </Text>
        {row.place === '' ? null : (
          <Text numberOfLines={1} style={styles.dayPlace}>
            {row.place}
          </Text>
        )}
      </View>
      <Icon color={color.inkFaint} name="chevronRight" size={16} />
    </Pressable>
  );
}

const KIND_WORDS: Record<QuestRowView['kind'], string> = { class: '강의', party: '파티', quest: '퀘스트' };

const DAY_MS = 24 * 60 * 60 * 1000;

// "내일 2개 · 강의 1, 파티 1", or null with nothing tomorrow. The classes are counted from the timetable: the main
// server sends today's Class Quests only.
function tomorrowWords(rows: readonly QuestRowView[], classes: number): string | null {
  const counts: [string, number][] = [
    [KIND_WORDS.class, classes],
    [KIND_WORDS.party, rows.filter(({ kind }) => kind === 'party').length],
    [KIND_WORDS.quest, rows.filter(({ kind }) => kind === 'quest').length],
  ];
  const shown = counts.filter(([, count]) => count > 0);
  const total = shown.reduce((sum, [, count]) => sum + count, 0);
  const words = shown.map(([word, count]) => `${word} ${String(count)}`).join(', ');
  return total === 0 ? null : `내일 ${String(total)}개 · ${words}`;
}

// A class of today already over, from the timetable: the main server leaves out a Quest whose every step ended, so no
// Class Quest of it comes. It opens nothing.
function ClassRow({ block }: { block: ClassBlockView }): ReactElement {
  const [start] = block.time.split('–');
  const words = [start ?? '', KIND_WORDS.class, block.name, block.where].filter((part) => part !== '');
  return (
    <View accessibilityLabel={words.join(' · ')} accessible style={styles.dayRow}>
      <Text style={[styles.dayTime, styles.over]}>{start}</Text>
      <View style={styles.dayWords}>
        <Text style={styles.dayKind}>{KIND_WORDS.class}</Text>
        <Text numberOfLines={1} style={[styles.dayTitle, styles.over]}>
          {block.name}
        </Text>
        {block.where === '' ? null : <Text style={styles.dayPlace}>{block.where}</Text>}
      </View>
    </View>
  );
}

// The timetable's day of `instant`, 0 for Monday as its blocks have it.
function blockDay(instant: Date): number {
  return (koreaWeekday(instant) + 6) % 7;
}

interface PastItem {
  key: string;
  time: string;
  node: ReactElement;
}

// What is over today: the timetable's classes that ended, and any Quest row the main server still sends as over.
function pastItems(rows: readonly QuestRowView[], week: readonly ClassBlockView[], at: Date): PastItem[] {
  const hours = koreaMinutes(at) / 60;
  const classes = week
    .filter(({ day, end }) => day === blockDay(at) && end <= hours)
    .map((block) => ({ key: block.key, time: block.time, node: <ClassRow block={block} key={block.key} /> }));
  const quests = rows
    .filter(({ over, kind }) => over && kind !== 'class')
    .map((row) => ({ key: row.id, time: row.time, node: <DayRow key={row.id} row={row} /> }));
  return [...classes, ...quests].toSorted((one, other) => one.time.localeCompare(other.time));
}

// The rows over by now, folded into "지난 일정 N개 ▾", which opens them.
function PastRows({ items }: { items: readonly PastItem[] }): ReactElement | null {
  const [open, setOpen] = useState(false);
  if (items.length === 0) {
    return null;
  }
  const label = `지난 일정 ${String(items.length)}개`;
  return (
    <>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          setOpen(!open);
        }}
        style={({ pressed }) => [styles.fold, pressed && styles.pressed]}
      >
        <Text style={styles.foldWords}>{label}</Text>
        <Icon color={color.inkMuted} name={open ? 'chevronUp' : 'chevronDown'} size={16} />
      </Pressable>
      {open ? items.map(({ node }) => node) : null}
    </>
  );
}

// 오늘 일정: today's Quests, classes included, in time order, the rows over folded above "지금 HH:MM", and one line for
// tomorrow. The classes already over and tomorrow's classes come from the timetable (#800's review, decided
// 2026-11-29). The 새내기 튜토리얼's quests are none of the User's Quests, so they are not here, as on the map.
export function Day(): ReactElement {
  const { data: rows, isPending, refetch } = useQuestRows();
  const week = useWeek().data ?? [];
  const at = now();
  const today = (rows ?? []).filter(({ daysAway }) => daysAway === 0);
  const classesTomorrow = week.filter(({ day }) => day === blockDay(new Date(at.getTime() + DAY_MS))).length;
  const tomorrow = tomorrowWords(
    (rows ?? []).filter(({ daysAway, kind }) => daysAway === 1 && kind !== 'class'),
    classesTomorrow,
  );
  const past = pastItems(today, week, at);
  const coming = today.filter(({ over }) => !over);
  const empty = rows !== undefined && coming.length === 0 && past.length === 0;
  return (
    <View style={styles.section} testID="today-day">
      <SectionHeader>오늘 일정</SectionHeader>
      <View style={[cardStyles.card, styles.dayCard]}>
        {rows === undefined && isPending ? <LoadingState /> : null}
        {rows === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
        {empty ? <Text style={styles.none}>오늘 일정 없음</Text> : null}
        {rows === undefined || empty ? null : (
          <>
            <PastRows items={past} />
            <View style={styles.now}>
              <Text style={styles.nowWords}>{`지금 ${koreaClock(now().toISOString())}`}</Text>
              <View style={styles.nowLine} />
            </View>
            {coming.map((row) => (
              <DayRow key={row.id} row={row} />
            ))}
          </>
        )}
        {tomorrow === null || rows === undefined ? null : <Text style={styles.tomorrow}>{tomorrow}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space[2] },
  dayCard: { paddingHorizontal: 0, paddingVertical: space[1] },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingHorizontal: space[4], minHeight: 64 },
  pressed: { backgroundColor: color.surfaceSubtle },
  dayTime: { width: 44, fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: color.ink },
  dayWords: { flex: 1, gap: 1, paddingVertical: space[2] },
  dayKind: { fontFamily: font.bold, fontSize: 11, lineHeight: 14, color: color.snuBlue },
  dayTitle: { ...text.label, color: color.ink },
  dayPlace: { ...text.caption, color: color.inkMuted },
  over: { color: color.inkFaint },
  fold: { flexDirection: 'row', alignItems: 'center', gap: space[1], paddingHorizontal: space[4], minHeight: 44 },
  foldWords: { ...text.label, color: color.inkMuted },
  now: { flexDirection: 'row', alignItems: 'center', gap: space[2], paddingHorizontal: space[4], minHeight: 28 },
  nowWords: { ...text.caption, fontFamily: font.bold, color: color.danger },
  nowLine: { flex: 1, height: 1, backgroundColor: color.danger },
  none: { ...text.label, color: color.inkMuted, paddingHorizontal: space[4], paddingVertical: space[3] },
  tomorrow: {
    ...text.label,
    color: color.inkMuted,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
});
