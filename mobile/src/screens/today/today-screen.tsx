/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router, useIsFocused, useNavigation } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { now } from '@/clock';
import {
  Button,
  cardStyles,
  color,
  EmptyState,
  ErrorState,
  font,
  Icon,
  LoadingState,
  RowCard,
  SectionHeader,
  space,
  text,
} from '@/design-system';
import { type NoticeView, waitingNotices } from '@/features/notifications/adapter';
import { useMarkShownRead, useNotices } from '@/features/notifications/use-notices';
import type { QuestRowView } from '@/features/quests/adapter';
import { useQuestRows } from '@/features/quests/use-quest-rows';
import { koreaCalendar, koreaClock, WEEKDAYS } from '@/korea-time';
import { readCardAddress } from '@/push/card-address';
import { NoticeRow } from '../me/notifications-screen';
import { usePartyActions } from '../party/use-party-actions';
import { TabScreen } from '../shell/tab-screen';

// How many kept Notifications 지난 알림 shows; "알림 모두 보기" opens every one.
const KEPT_SHOWN = 5;

// "12월 1일 화요일"
function dateWords(instant: Date): string {
  const { month, date, weekday } = koreaCalendar(instant);
  return `${String(month)}월 ${String(date)}일 ${WEEKDAYS[weekday] ?? ''}요일`;
}

// Whether 오늘 is the tab chosen in the bar, also while a screen above the tabs that it opened, such as a room, covers
// it: 뒤로 then comes back to it as it was. The focus is read for its changes, which draw this again.
function useChosenTab(): boolean {
  const navigation = useNavigation();
  useIsFocused();
  const state = navigation.getState();
  return state?.routes[state.index]?.name === 'today';
}

// 거절 and 수락 of an invitation, through the calls 파티 > 초대 makes, so that answering in either place updates both.
function InvitationAnswers({ id }: { id: string }): ReactElement {
  const actions = usePartyActions();
  return (
    <View style={styles.answers}>
      <Button onPress={() => void actions.decline({ id })} size="md" variant="secondary">
        거절
      </Button>
      <Button onPress={() => void actions.accept({ id })} size="md">
        수락
      </Button>
    </View>
  );
}

// The identity of the invitation a row of what waits asks about, or null for another row.
function invitationOf({ kind, address }: NoticeView): string | null {
  const card = kind === 'invitation' ? readCardAddress(address) : null;
  return card?.kind === 'invitation' ? card.id : null;
}

// 답할 것: what waits for the User's answer, as 알림 lists it. An invitation is answered on its row. Hidden when nothing
// waits.
function Waiting({ waiting }: { waiting: readonly NoticeView[] }): ReactElement | null {
  if (waiting.length === 0) {
    return null;
  }
  return (
    <View style={styles.section} testID="today-waiting">
      <SectionHeader>{`답할 것 ${String(waiting.length)}`}</SectionHeader>
      <RowCard>
        {waiting.map((notice) => {
          const invitation = invitationOf(notice);
          return (
            <NoticeRow
              fresh={false}
              key={notice.key}
              notice={notice}
              trailing={invitation === null ? undefined : <InvitationAnswers id={invitation} />}
            />
          );
        })}
      </RowCard>
    </View>
  );
}

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
// tomorrow. The 새내기 튜토리얼's quests are none of the User's Quests, so they are not here, as on the map.
function Day(): ReactElement {
  const { data: rows, isPending, refetch } = useQuestRows();
  const today = (rows ?? []).filter(({ daysAway }) => daysAway === 0);
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

// 지난 알림: the newest kept Notifications, and "알림 모두 보기 ›" to every row of 알림 above the tabs.
function Kept({ kept, fresh }: { kept: readonly NoticeView[]; fresh: ReadonlySet<string> }): ReactElement {
  return (
    <View style={styles.section} testID="today-kept">
      <SectionHeader>지난 알림</SectionHeader>
      {kept.length === 0 ? (
        <View style={cardStyles.card}>
          <EmptyState words="새 알림이 없어요" />
        </View>
      ) : (
        <RowCard>
          {kept.map((notice) => (
            <NoticeRow fresh={fresh.has(notice.key)} key={notice.key} notice={notice} />
          ))}
        </RowCard>
      )}
      <Pressable
        accessibilityLabel="알림 모두 보기"
        accessibilityRole="button"
        hitSlop={space[2]}
        onPress={() => {
          router.push('/notifications');
        }}
        style={styles.all}
      >
        <Text style={styles.allWords}>알림 모두 보기 ›</Text>
      </Pressable>
    </View>
  );
}

function newestFirst(one: NoticeView, other: NoticeView): number {
  return Date.parse(other.at ?? '') - Date.parse(one.at ?? '');
}

// The page while 오늘 is in front, drawn anew each time it comes to the front: the kept ones shown are then read, as
// 알림 marks them, and those that were unread stay marked new until the User leaves the tab.
function Page(): ReactElement {
  const { data, isPending, refetch } = useNotices();
  const fresh = useMarkShownRead(data !== undefined);
  const notices = data ?? [];
  const kept = notices
    .filter(({ keptId }) => keptId !== null)
    .toSorted(newestFirst)
    .slice(0, KEPT_SHOWN);
  return (
    <ScrollView contentContainerStyle={styles.body}>
      <Waiting waiting={waitingNotices(notices)} />
      <Day />
      {data === undefined && isPending ? <LoadingState /> : null}
      {data === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      {data === undefined ? null : <Kept fresh={fresh} kept={kept} />}
    </ScrollView>
  );
}

// 오늘 (A04 ticket 10), the bar's fourth slot: 답할 것, 오늘 일정 and 지난 알림 on one page that scrolls once, under the
// title and the date. Ticket 11 puts 예약 between 오늘 일정 and 지난 알림. Behind another tab it shows nothing, so that
// nothing is marked read unseen.
export function TodayScreen(): ReactElement {
  const chosen = useChosenTab();
  return (
    <TabScreen aside={dateWords(now())} title="오늘">
      {chosen ? <Page /> : null}
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  body: { gap: space[4], padding: space[4], paddingBottom: space[6] },
  section: { gap: space[2] },
  answers: { flexDirection: 'row', gap: space[1], paddingVertical: space[2] },
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
  all: { alignSelf: 'flex-end', paddingVertical: space[1] },
  allWords: { ...text.label, color: color.snuBlue },
});
