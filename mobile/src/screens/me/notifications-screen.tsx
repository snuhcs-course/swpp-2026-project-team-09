/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { router } from 'expo-router';
import type { ReactElement } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  cardStyles,
  color,
  EmptyState,
  ErrorState,
  FullScreenPanel,
  Icon,
  ListRow,
  LoadingState,
  noticeTone,
  RoundIcon,
  SectionHeader,
  space,
  text,
  useNotReadyToast,
} from '@/design-system';
import { openAddress } from '@/features/notifications/address';
import { now } from '@/clock';
import { type NoticeKind, type NoticeView, noticeDays, waitingNotices } from '@/features/notifications/adapter';
import { useDeleteNotice, useMarkShownRead, useNotices } from '@/features/notifications/use-notices';
import { PartyOnButton } from './party-on-button';
import { SwipedNotice } from './swiped-notice';

const TONE: Record<NoticeKind, keyof typeof noticeTone> = {
  party: 'navy',
  'friend-request': 'navy',
  invitation: 'invitation',
  'join-requests': 'request',
  accepted: 'invitation',
  declined: 'invitation',
  'join-accepted': 'invitation',
  'join-declined': 'muted',
  'join-asked': 'request',
  'party-ended': 'muted',
  'party-removed': 'muted',
  'join-cancelled': 'muted',
  'invitation-cancelled': 'muted',
  'became-leader': 'navy',
  'party-activated': 'navy',
  'leave-by': 'navy',
  'room-declined': 'invitation',
  'room-agreed': 'invitation',
  'room-ending': 'navy',
  'room-window': 'request',
  'interest-new': 'navy',
  'step-changed': 'invitation',
  arrived: 'navy',
  late: 'request',
  notice: 'invitation',
};

// Where a row leads.
function usePress(): (notice: NoticeView) => void {
  const showNotReady = useNotReadyToast();
  return ({ kind, questId, address }) => {
    if (address !== null) {
      openAddress(address);
    } else if (kind === 'friend-request') {
      router.push('/me/friends/requests');
    } else if (questId === null) {
      showNotReady();
    } else {
      router.push(`/room/${questId}`);
    }
  };
}

function Notice({ notice, onPress }: { notice: NoticeView; onPress: () => void }): ReactElement {
  const { ink, ground } = noticeTone[TONE[notice.kind]];
  return (
    <ListRow
      label={[notice.title, notice.sub, ...(notice.time === null ? [] : [notice.time])].join(' · ')}
      leading={<RoundIcon fill={ground} icon={notice.icon} ink={ink} />}
      lines={[notice.sub]}
      onPress={onPress}
      title={notice.title}
      trailing={
        notice.time === null ? (
          <Icon color={color.inkFaint} name="chevronRight" size={16} />
        ) : (
          <View style={styles.aside}>
            <Text style={styles.time}>{notice.time}</Text>
            {notice.kind === 'leave-by' && notice.questId !== null ? <PartyOnButton questId={notice.questId} /> : null}
          </View>
        )
      }
    />
  );
}

// A row of 알림. A kept Notification's swipes to the left to be deleted; a row of what waits does not.
function Row({ notice }: { notice: NoticeView }): ReactElement {
  const press = usePress();
  const deleteNotice = useDeleteNotice();
  const row = (
    <Notice
      notice={notice}
      onPress={() => {
        press(notice);
      }}
    />
  );
  const { keptId } = notice;
  if (keptId === null) {
    return row;
  }
  return (
    <SwipedNotice
      onDelete={() => {
        deleteNotice(keptId);
      }}
    >
      {row}
    </SwipedNotice>
  );
}

// The rows under 오늘, 어제 and 이전, each group in its own card.
function Notices({ notices }: { notices: readonly NoticeView[] }): ReactElement {
  if (notices.length === 0) {
    return (
      <View style={[cardStyles.card, styles.card]}>
        <EmptyState words="새 알림이 없어요" />
      </View>
    );
  }
  return (
    <View style={styles.days}>
      {noticeDays(notices, now()).map((day) => (
        <View key={day.title}>
          <SectionHeader>{day.title}</SectionHeader>
          <View style={[cardStyles.card, styles.card]}>
            {day.notices.map((notice) => (
              <Row key={notice.key} notice={notice} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

// 알림, the panel of the `Profile` frame: the Notifications the main server keeps, then what waits for the User, from
// the lists the main server serves. The count is of the rows that wait. The kept ones shown are then read.
export function NotificationsScreen(): ReactElement {
  const { data, isPending, refetch } = useNotices();
  useMarkShownRead(data !== undefined);
  const count = waitingNotices(data ?? []).length;
  return (
    <FullScreenPanel
      count={count === 0 ? undefined : count}
      leave={{ kind: 'back', onPress: router.back }}
      subtle
      title="알림"
    >
      <View style={styles.body}>
        {data === undefined ? null : <Notices notices={data} />}
        {data === undefined && isPending ? <LoadingState /> : null}
        {data === undefined && !isPending ? <ErrorState onRetry={refetch} /> : null}
      </View>
    </FullScreenPanel>
  );
}

const styles = StyleSheet.create({
  body: { padding: space[4] },
  card: { paddingVertical: 0 },
  days: { gap: space[2] },
  aside: { alignItems: 'flex-end', gap: space[1], paddingVertical: space[2] },
  time: { ...text.label, color: color.inkFaint },
});
