/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router, useIsFocused, useNavigation } from 'expo-router';
import type { ReactElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { now } from '@/clock';
import {
  Button,
  cardStyles,
  color,
  EmptyState,
  ErrorState,
  LoadingState,
  RowCard,
  SectionHeader,
  space,
  text,
} from '@/design-system';
import { useQuery } from '@tanstack/react-query';
import { notificationsQuery } from '@/api/queries';
import type { KeptNotification } from '@/api/waiting-types';
import { keptKey, type NoticeView, unreadKept, waitingNotices } from '@/features/notifications/adapter';
import { useMarkShownRead, useNotices } from '@/features/notifications/use-notices';
import { koreaCalendar, WEEKDAYS } from '@/korea-time';
import { readCardAddress } from '@/push/card-address';
import { NoticeRow } from '../me/notifications-screen';
import { usePartyActions } from '../party/use-party-actions';
import { TabScreen } from '../shell/tab-screen';
import { Day } from './day';

// How many kept Notifications 지난 알림 shows, and how many rows 답할 것 shows, so that the page stays about one screen
// and a half on a usual day; "알림 모두 보기" and "답할 것 N개 모두 보기" open every row of 알림 (decided 2026-11-29).
const KEPT_SHOWN = 5;
const WAITING_SHOWN = 3;

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

function toAll(): void {
  router.push('/notifications');
}

// The invitations first, as they are answered here, then the rest in 알림's order.
function invitationsFirst(waiting: readonly NoticeView[]): NoticeView[] {
  return [
    ...waiting.filter((notice) => notice.kind === 'invitation'),
    ...waiting.filter((n) => n.kind !== 'invitation'),
  ];
}

// 답할 것: what waits for the User's answer, as 알림 lists it, the first three, and "답할 것 N개 모두 보기 ›" to every
// row. An invitation is answered on its row. Hidden when nothing waits.
function Waiting({ waiting }: { waiting: readonly NoticeView[] }): ReactElement | null {
  if (waiting.length === 0) {
    return null;
  }
  const shown = invitationsFirst(waiting).slice(0, WAITING_SHOWN);
  return (
    <View style={styles.section} testID="today-waiting">
      <SectionHeader>{`답할 것 ${String(waiting.length)}`}</SectionHeader>
      <RowCard>
        {shown.map((notice) => {
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
      {waiting.length > WAITING_SHOWN ? <AllLink label={`답할 것 ${String(waiting.length)}개 모두 보기`} /> : null}
    </View>
  );
}

// A link at a section's foot to every row of 알림 above the tabs.
function AllLink({ label }: { label: string }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={space[2]}
      onPress={toAll}
      style={styles.all}
    >
      <Text style={styles.allWords}>{`${label} ›`}</Text>
    </Pressable>
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
      <AllLink label="알림 모두 보기" />
    </View>
  );
}

function newestFirst(one: NoticeView, other: NoticeView): number {
  return Date.parse(other.at ?? '') - Date.parse(one.at ?? '');
}

// Whether every unread kept Notification is among those 지난 알림 shows: the main server marks them all read at once, so
// they are marked read only then, and otherwise when "알림 모두 보기" shows them.
function allUnreadShown(shown: readonly NoticeView[], kept: readonly KeptNotification[]): boolean {
  const keys = new Set(shown.map(({ key }) => key));
  return unreadKept(kept, now()).every(({ id }) => keys.has(keptKey(id)));
}

// The page while 오늘 is in front, drawn anew each time it comes to the front: the kept ones shown are then read, as
// 알림 marks them, and those that were unread stay marked new until the User leaves the tab.
function Page(): ReactElement {
  const { data, isPending, refetch } = useNotices();
  const notices = data ?? [];
  const kept = notices
    .filter(({ keptId }) => keptId !== null)
    .toSorted(newestFirst)
    .slice(0, KEPT_SHOWN);
  const all = useQuery(notificationsQuery).data ?? [];
  const fresh = useMarkShownRead(data !== undefined && allUnreadShown(kept, all));
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
  answers: { flexDirection: 'row', gap: space[1], paddingVertical: space[2] },
  all: { alignSelf: 'flex-end', paddingVertical: space[1] },
  allWords: { ...text.label, color: color.snuBlue },
  section: { gap: space[2] },
});
