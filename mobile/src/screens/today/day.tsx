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
import { koreaClock } from '@/korea-time';

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

// "내일 2개 · 강의 1, 파티 1", or null without a Quest tomorrow.
function tomorrowWords(rows: readonly QuestRowView[]): string | null {
  if (rows.length === 0) {
    return null;
  }
  const kinds = (['class', 'party', 'quest'] as const)
    .map((kind) => [KIND_WORDS[kind], rows.filter((row) => row.kind === kind).length] as const)
    .filter(([, count]) => count > 0)
    .map(([word, count]) => `${word} ${String(count)}`);
  return `내일 ${String(rows.length)}개 · ${kinds.join(', ')}`;
}

// The rows over by now, folded into "지난 일정 N개 ▾", which opens them.
function PastRows({ rows }: { rows: readonly QuestRowView[] }): ReactElement | null {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) {
    return null;
  }
  const label = `지난 일정 ${String(rows.length)}개`;
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
      {open ? rows.map((row) => <DayRow key={row.id} row={row} />) : null}
    </>
  );
}

// 오늘 일정: today's Quests, classes included, in time order, the rows over folded above "지금 HH:MM", and one line for
// tomorrow. The 새내기 튜토리얼's quests are none of the User's Quests, so they are not here, as on the map. A seat's
// stay whose booking 예약 lists is left out (`listed`, A04 ticket 11).
export function Day({ listed }: { listed: ReadonlySet<string> }): ReactElement {
  const { data: rows, isPending, refetch } = useQuestRows();
  const today = (rows ?? []).filter(({ id, daysAway }) => daysAway === 0 && !listed.has(id));
  const tomorrow = tomorrowWords((rows ?? []).filter(({ daysAway }) => daysAway === 1));
  const past = today.filter(({ over }) => over);
  const coming = today.filter(({ over }) => !over);
  return (
    <View style={styles.section} testID="today-day">
      <SectionHeader>오늘 일정</SectionHeader>
      <View style={[cardStyles.card, styles.dayCard]}>
        {rows === undefined && isPending ? <LoadingState /> : null}
        {rows === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
        {rows !== undefined && today.length === 0 ? <Text style={styles.none}>오늘 일정 없음</Text> : null}
        {today.length === 0 ? null : (
          <>
            <PastRows rows={past} />
            <View style={styles.now}>
              <Text style={styles.nowWords}>{`지금 ${koreaClock(now().toISOString())}`}</Text>
              <View style={styles.nowLine} />
            </View>
            {coming.map((row) => (
              <DayRow key={row.id} row={row} />
            ))}
          </>
        )}
        {tomorrow === null ? null : <Text style={styles.tomorrow}>{tomorrow}</Text>}
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
